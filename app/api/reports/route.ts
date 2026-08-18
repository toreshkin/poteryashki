import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getClientIp, rateLimit, sha256 } from "@/lib/rate-limit";
import { MAX_PHOTOS } from "@/lib/config";

export const runtime = "nodejs";

const PUBLIC_FIELDS =
  "id, created_at, report_type, animal_type, name, description, landmarks, lat, lng, photos, contact_phone, contact_telegram, status, event_date";

export async function GET() {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("reports")
      .select(PUBLIC_FIELDS)
      .neq("status", "hidden")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Не удалось загрузить заявки" },
      { status: 500 }
    );
  }
}

function generateSecretCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 6 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join("");
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!rateLimit(`report:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Слишком много заявок. Попробуйте позже." },
      { status: 429 }
    );
  }

  try {
    const form = await req.formData();

    // Honeypot: скрытое поле, которое заполняют только боты
    if (form.get("website")) {
      return NextResponse.json({ error: "Ошибка" }, { status: 400 });
    }

    const reportType = String(form.get("report_type") ?? "");
    const animalType = String(form.get("animal_type") ?? "");
    const description = String(form.get("description") ?? "").trim();
    const lat = Number(form.get("lat"));
    const lng = Number(form.get("lng"));
    const contactPhone = String(form.get("contact_phone") ?? "").trim();
    const contactTelegram = String(form.get("contact_telegram") ?? "").trim();

    if (!["lost", "found"].includes(reportType))
      return NextResponse.json({ error: "Неверный тип заявки" }, { status: 400 });
    if (!["dog", "cat", "other"].includes(animalType))
      return NextResponse.json({ error: "Неверный вид животного" }, { status: 400 });
    if (description.length < 10)
      return NextResponse.json(
        { error: "Опишите животное подробнее (минимум 10 символов)" },
        { status: 400 }
      );
    if (!Number.isFinite(lat) || !Number.isFinite(lng))
      return NextResponse.json(
        { error: "Укажите место на карте" },
        { status: 400 }
      );
    if (!contactPhone && !contactTelegram)
      return NextResponse.json(
        { error: "Укажите телефон или Telegram" },
        { status: 400 }
      );

    const supabase = getServiceClient();
    const secretCode = generateSecretCode();

    // Загрузка фото в Storage
    const photoFiles = form
      .getAll("photos")
      .filter((f): f is File => f instanceof File && f.size > 0)
      .slice(0, MAX_PHOTOS);
    const photoUrls: string[] = [];
    for (const file of photoFiles) {
      if (file.size > 5 * 1024 * 1024) continue;
      const path = `${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("pet-photos")
        .upload(path, file, { contentType: file.type || "image/jpeg" });
      if (uploadError) throw uploadError;
      photoUrls.push(
        supabase.storage.from("pet-photos").getPublicUrl(path).data.publicUrl
      );
    }

    const name = String(form.get("name") ?? "").trim();
    const landmarks = String(form.get("landmarks") ?? "").trim();
    const eventDate = String(form.get("event_date") ?? "");

    const { data, error } = await supabase
      .from("reports")
      .insert({
        report_type: reportType,
        animal_type: animalType,
        name: name || null,
        description,
        landmarks: landmarks || null,
        lat,
        lng,
        photos: photoUrls,
        contact_phone: contactPhone || null,
        contact_telegram: contactTelegram || null,
        secret_code_hash: sha256(secretCode),
        event_date: /^\d{4}-\d{2}-\d{2}$/.test(eventDate)
          ? eventDate
          : new Date().toISOString().slice(0, 10),
      })
      .select("id")
      .single();
    if (error) throw error;

    return NextResponse.json({ id: data.id, secret_code: secretCode });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Не удалось создать заявку" },
      { status: 500 }
    );
  }
}
