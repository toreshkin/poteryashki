import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getClientIp, rateLimit, sha256 } from "@/lib/rate-limit";
import { MAX_PHOTOS } from "@/lib/config";
import { PUBLIC_FIELDS } from "@/lib/report-fields";
import { sniffImageType, IMAGE_EXTENSIONS } from "@/lib/images";
import { reportInputSchema, firstIssue } from "@/lib/validation";
import { withErrorHandling } from "@/lib/api-helpers";
import { verifyInitData } from "@/lib/telegram-auth";
import { sendTelegramMessage, reportUrl } from "@/lib/telegram-bot";
import { distanceKm } from "@/lib/geo";
import { ANIMAL_TYPE_LABELS, AnimalType } from "@/lib/types";

export const runtime = "nodejs";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// ?limit= (до 500) и ?before= (курсор created_at последней записи страницы):
// лента подгружает частями, карта берёт сразу много.
export const GET = withErrorHandling(async (req: Request) => {
  const url = new URL(req.url);
  const limitParam = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(Math.trunc(limitParam), 1), 500)
    : 100;
  const before = url.searchParams.get("before");

  const supabase = getServiceClient();
  let query = supabase
    .from("reports")
    .select(PUBLIC_FIELDS)
    .neq("status", "hidden")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (before) query = query.lt("created_at", before);
  const { data, error } = await query;
  if (error) throw error;
  return NextResponse.json(data);
}, "Не удалось загрузить заявки");

const NOTIFY_RADIUS_KM = 3;

/** Авторам активных lost-заявок того же вида в радиусе — сообщение о находке. */
async function notifyNearbyLostAuthors(
  supabase: ReturnType<typeof getServiceClient>,
  animalType: AnimalType,
  lat: number,
  lng: number,
  foundReportId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("reports")
    .select("id, lat, lng, tg_chat_id")
    .eq("status", "active")
    .eq("report_type", "lost")
    .eq("animal_type", animalType)
    .not("tg_chat_id", "is", null)
    .limit(200);
  // Колонки tg_* может не быть, если не выполнен supabase/telegram.sql
  if (error || !data) return;

  const url = reportUrl(foundReportId);
  const label = ANIMAL_TYPE_LABELS[animalType].toLowerCase();
  const text = [
    `Рядом с местом пропажи нашли животное (${label}) — возможно, это ваш питомец.`,
    url ?? "Откройте «Потеряшки», чтобы посмотреть заявку.",
  ].join("\n");

  const nearby = data.filter(
    (r) => distanceKm(lat, lng, r.lat, r.lng) <= NOTIFY_RADIUS_KM
  );
  for (const r of nearby) {
    await sendTelegramMessage(r.tg_chat_id, text);
  }
}

function generateSecretCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 6 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join("");
}

export const POST = withErrorHandling(async (req: Request) => {
  const ip = getClientIp(req);
  if (!rateLimit(`report:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Слишком много заявок. Попробуйте позже." },
      { status: 429 }
    );
  }

  {
    const form = await req.formData();

    // Honeypot: скрытое поле, которое заполняют только боты
    if (form.get("website")) {
      return NextResponse.json({ error: "Ошибка" }, { status: 400 });
    }

    const parsed = reportInputSchema.safeParse({
      report_type: String(form.get("report_type") ?? ""),
      animal_type: String(form.get("animal_type") ?? ""),
      name: String(form.get("name") ?? ""),
      description: String(form.get("description") ?? ""),
      landmarks: String(form.get("landmarks") ?? ""),
      lat: Number(form.get("lat")),
      lng: Number(form.get("lng")),
      contact_phone: String(form.get("contact_phone") ?? ""),
      contact_telegram: String(form.get("contact_telegram") ?? ""),
      event_date: String(form.get("event_date") ?? ""),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed) }, { status: 400 });
    }
    const input = parsed.data;

    const supabase = getServiceClient();
    const secretCode = generateSecretCode();

    // Загрузка фото в Storage. Тип определяем по содержимому файла:
    // file.type приходит от клиента, а бакет публичный.
    const photoFiles = form
      .getAll("photos")
      .filter((f): f is File => f instanceof File && f.size > 0)
      .slice(0, MAX_PHOTOS);
    // Миниатюры генерирует клиент; пары строятся по индексу
    const thumbFiles = form
      .getAll("thumbs")
      .filter((f): f is File => f instanceof File && f.size > 0)
      .slice(0, MAX_PHOTOS);
    const photoUrls: string[] = [];
    for (const [index, file] of photoFiles.entries()) {
      if (file.size > MAX_PHOTO_BYTES) {
        return NextResponse.json(
          { error: "Фото не подходит (JPEG/PNG/WebP до 5 МБ)" },
          { status: 400 }
        );
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const mime = sniffImageType(bytes);
      if (!mime) {
        return NextResponse.json(
          { error: "Фото не подходит (JPEG/PNG/WebP до 5 МБ)" },
          { status: 400 }
        );
      }
      const uuid = crypto.randomUUID();
      const path = `${uuid}.${IMAGE_EXTENSIONS[mime]}`;
      const { error: uploadError } = await supabase.storage
        .from("pet-photos")
        .upload(path, bytes, { contentType: mime });
      if (uploadError) throw uploadError;
      photoUrls.push(
        supabase.storage.from("pet-photos").getPublicUrl(path).data.publicUrl
      );

      // Миниатюра опциональна: при любой проблеме клиент откатится на оригинал
      const thumb = thumbFiles[index];
      if (thumb && thumb.size <= 512 * 1024) {
        const thumbBytes = new Uint8Array(await thumb.arrayBuffer());
        if (sniffImageType(thumbBytes) === "image/webp") {
          const { error: thumbError } = await supabase.storage
            .from("pet-photos")
            .upload(`${uuid}_thumb.webp`, thumbBytes, {
              contentType: "image/webp",
            });
          if (thumbError) {
            console.error("Не удалось сохранить миниатюру:", thumbError.message);
          }
        }
      }
    }

    // Автор из Telegram Mini App: подпись initData проверяется на сервере,
    // без валидной подписи заявка просто остаётся без привязки.
    const tg = verifyInitData(String(form.get("init_data") ?? "") || null);

    const row = {
      report_type: input.report_type,
      animal_type: input.animal_type,
      name: input.name || null,
      description: input.description,
      landmarks: input.landmarks || null,
      lat: input.lat,
      lng: input.lng,
      photos: photoUrls,
      contact_phone: input.contact_phone || null,
      contact_telegram: input.contact_telegram || null,
      secret_code_hash: sha256(secretCode),
      event_date: input.event_date || new Date().toISOString().slice(0, 10),
    };

    let inserted = tg
      ? await supabase
          .from("reports")
          .insert({ ...row, tg_user_id: tg.userId, tg_chat_id: tg.chatId })
          .select("id")
          .single()
      : null;
    if (inserted?.error) {
      // Частая причина — не выполнен supabase/telegram.sql: повторяем без tg-полей
      console.error(
        "Не удалось сохранить tg-поля (выполнен ли supabase/telegram.sql?):",
        inserted.error.message
      );
      inserted = null;
    }
    if (!inserted) {
      inserted = await supabase.from("reports").insert(row).select("id").single();
    }
    if (inserted.error) throw inserted.error;
    const reportId = inserted.data.id as string;

    // Найдено животное — сообщаем авторам активных «потеряшек» того же вида рядом.
    // Ошибки не должны ломать ответ: заявка уже создана.
    if (input.report_type === "found") {
      await notifyNearbyLostAuthors(
        supabase,
        input.animal_type,
        input.lat,
        input.lng,
        reportId
      ).catch((err) => console.error("Уведомление о находке:", err));
    }

    return NextResponse.json({ id: reportId, secret_code: secretCode });
  }
}, "Не удалось создать заявку");
