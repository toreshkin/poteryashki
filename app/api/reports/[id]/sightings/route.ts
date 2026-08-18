import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { sightingInputSchema, firstIssue } from "@/lib/validation";
import { sendTelegramMessage, reportUrl } from "@/lib/telegram-bot";
import { withErrorHandling } from "@/lib/api-helpers";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withErrorHandling(async (_req: Request, { params }: Ctx) => {
  const { id } = await params;
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("sightings")
    .select("id, lat, lng, comment, seen_at, created_at")
    .eq("report_id", id)
    .order("seen_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return NextResponse.json(data);
});

export const POST = withErrorHandling(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const ip = getClientIp(req);
  if (!rateLimit(`sighting:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Слишком много отметок. Попробуйте позже." },
      { status: 429 }
    );
  }

  const parsed = sightingInputSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed) }, { status: 400 });
  }
  const body = parsed.data;

  const supabase = getServiceClient();
  const { data: report } = await supabase
    .from("reports")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (!report || report.status !== "active") {
    return NextResponse.json(
      { error: "Заявка не найдена или уже закрыта" },
      { status: 404 }
    );
  }

  const { data, error } = await supabase
    .from("sightings")
    .insert({
      report_id: id,
      lat: body.lat,
      lng: body.lng,
      comment: body.comment || null,
      seen_at: body.seen_at || new Date().toISOString().slice(0, 10),
    })
    .select("id, lat, lng, comment, seen_at, created_at")
    .single();
  if (error) throw error;

  // Уведомляем автора заявки. Колонки tg_chat_id может не быть
  // (не выполнен supabase/telegram.sql) — тогда просто пропускаем.
  try {
    const { data: author } = await supabase
      .from("reports")
      .select("tg_chat_id, name")
      .eq("id", id)
      .maybeSingle();
    if (author?.tg_chat_id) {
      const url = reportUrl(id);
      await sendTelegramMessage(
        author.tg_chat_id,
        [
          `Кто-то отметил, что видел вашего питомца${author.name ? ` (${author.name})` : ""}.`,
          url ?? "Откройте свою заявку в «Потеряшках», чтобы посмотреть место.",
        ].join("\n")
      );
    }
  } catch (notifyErr) {
    console.error("Уведомление о встрече:", notifyErr);
  }

  return NextResponse.json(data);
});
