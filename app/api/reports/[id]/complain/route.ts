import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getClientIp, rateLimit, sha256 } from "@/lib/rate-limit";
import { AUTO_HIDE_COMPLAINTS } from "@/lib/config";

export const runtime = "nodejs";

const VALID_REASONS = ["spam", "fraud", "wrong", "other"];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ip = getClientIp(req);
  if (!rateLimit(`complain:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Слишком много жалоб. Попробуйте позже." },
      { status: 429 }
    );
  }

  try {
    const body = (await req.json()) as { reason?: string; comment?: string };
    if (!body.reason || !VALID_REASONS.includes(body.reason)) {
      return NextResponse.json({ error: "Укажите причину" }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { error } = await supabase.from("complaints").insert({
      report_id: id,
      reason: body.reason,
      comment: body.comment?.slice(0, 500) ?? null,
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
      await supabase
        .from("reports")
        .update({ status: "hidden" })
        .eq("id", id)
        .eq("status", "active");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
