import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getClientIp, rateLimit, sha256 } from "@/lib/rate-limit";
import { AUTO_HIDE_COMPLAINTS } from "@/lib/config";
import { complaintInputSchema, firstIssue } from "@/lib/validation";
import { sendTelegramMessage } from "@/lib/telegram-bot";
import { withErrorHandling } from "@/lib/api-helpers";

export const runtime = "nodejs";

export const POST = withErrorHandling(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const ip = getClientIp(req);
    if (!rateLimit(`complain:${ip}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Слишком много жалоб. Попробуйте позже." },
        { status: 429 }
      );
    }

    const parsed = complaintInputSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed) }, { status: 400 });
    }
    const body = parsed.data;

    const supabase = getServiceClient();
    const { error } = await supabase.from("complaints").insert({
      report_id: id,
      reason: body.reason,
      comment: body.comment || null,
      ip_hash: sha256(`${ip}:poteryashki`),
    });
    if (error) {
      // 23505 — вторая жалоба с того же IP на ту же заявку
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Вы уже жаловались на эту заявку" },
          { status: 409 }
        );
      }
      throw error;
    }

    // Автоскрытие при достижении порога жалоб
    const { count } = await supabase
      .from("complaints")
      .select("id", { count: "exact", head: true })
      .eq("report_id", id);
    if ((count ?? 0) >= AUTO_HIDE_COMPLAINTS) {
      const { data: hidden } = await supabase
        .from("reports")
        .update({ status: "hidden" })
        .eq("id", id)
        .eq("status", "active")
        .select("id");

      // Автора стоит предупредить: без этого заявка тихо исчезает с карты.
      if (hidden && hidden.length > 0) {
        try {
          const { data: author } = await supabase
            .from("reports")
            .select("tg_chat_id")
            .eq("id", id)
            .maybeSingle();
          if (author?.tg_chat_id) {
            await sendTelegramMessage(
              author.tg_chat_id,
              "Ваша заявка в «Потеряшках» скрыта из-за жалоб. Если это ошибка, напишите модератору."
            );
          }
        } catch (notifyErr) {
          console.error("Уведомление о скрытии:", notifyErr);
        }
      }
    }

    return NextResponse.json({ ok: true });
  }
);
