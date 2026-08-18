import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { MAX_PHOTOS } from "@/lib/config";
import { selectWithFallback } from "@/lib/report-fields";
import { sniffImageType, IMAGE_EXTENSIONS } from "@/lib/images";
import { reportInputSchema, firstIssue } from "@/lib/validation";
import { withErrorHandling } from "@/lib/api-helpers";
import { verifyInitData } from "@/lib/telegram-auth";
import { createReport } from "@/lib/create-report";

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
  const { data, error } = await selectWithFallback((fields) => {
    let query = supabase
      .from("reports")
      .select(fields)
      .neq("status", "hidden")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (before) query = query.lt("created_at", before);
    return query;
  });
  if (error) throw error;
  return NextResponse.json(data);
}, "Не удалось загрузить заявки");

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

    const { id, secretCode } = await createReport(
      {
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
        event_date: input.event_date || new Date().toISOString().slice(0, 10),
      },
      { tgUserId: tg?.userId, tgChatId: tg?.chatId, source: "user" }
    );

    return NextResponse.json({ id, secret_code: secretCode });
  }
}, "Не удалось создать заявку");
