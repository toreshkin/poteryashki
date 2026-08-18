import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getClientIp, rateLimit, sha256 } from "@/lib/rate-limit";
import { resolveInputSchema, firstIssue } from "@/lib/validation";
import { verifyInitData } from "@/lib/telegram-auth";
import { withErrorHandling } from "@/lib/api-helpers";

export const runtime = "nodejs";

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const ip = getClientIp(req);
    if (!rateLimit(`resolve:${ip}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Слишком много попыток. Попробуйте позже." },
        { status: 429 }
      );
    }

    const body = (await req.json()) as { code?: string; init_data?: string };
    const supabase = getServiceClient();

    // Два способа закрыть заявку: секретный код или валидная подпись
    // Telegram-автора (из «моих заявок», без кода).
    let query = supabase
      .from("reports")
      .update({ status: "resolved" })
      .eq("id", id)
      .eq("status", "active");
    if (typeof body.init_data === "string" && body.init_data) {
      const tg = verifyInitData(body.init_data);
      if (!tg) {
        return NextResponse.json(
          { error: "Не удалось подтвердить Telegram" },
          { status: 401 }
        );
      }
      query = query.eq("tg_user_id", tg.userId);
    } else {
      const parsed = resolveInputSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: firstIssue(parsed) }, { status: 400 });
      }
      query = query.eq(
        "secret_code_hash",
        sha256(parsed.data.code.toUpperCase())
      );
    }

    const { data, error } = await query.select("id");
    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Неверный код или заявка уже закрыта" },
        { status: 403 }
      );
    }
    return NextResponse.json({ ok: true });
  }
);
