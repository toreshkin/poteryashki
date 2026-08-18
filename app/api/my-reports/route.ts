import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { PUBLIC_FIELDS_WITH_CONTACTS } from "@/lib/report-fields";
import { telegramEnabled, verifyInitData } from "@/lib/telegram-auth";
import { withErrorHandling } from "@/lib/api-helpers";

export const runtime = "nodejs";

// POST, а не GET: initData передаётся в теле, чтобы не светить его в URL и логах.
export const POST = withErrorHandling(async (req: Request) => {
  if (!telegramEnabled()) {
    return NextResponse.json({ error: "Telegram отключён" }, { status: 503 });
  }
  const ip = getClientIp(req);
  if (!rateLimit(`my-reports:${ip}`, 30, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Слишком много запросов. Попробуйте позже." },
      { status: 429 }
    );
  }

  {
    const { init_data } = (await req.json()) as { init_data?: string };
    const tg = verifyInitData(init_data);
    if (!tg) {
      return NextResponse.json(
        { error: "Не удалось подтвердить Telegram" },
        { status: 401 }
      );
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("reports")
      // Автор видит и свои скрытые заявки — вместе со статусом
      .select(PUBLIC_FIELDS_WITH_CONTACTS)
      .eq("tg_user_id", tg.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      // Нет колонки tg_user_id — не выполнен supabase/telegram.sql
      console.error("Мои заявки:", error.message);
      return NextResponse.json([]);
    }
    return NextResponse.json(data);
  }
});
