import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getClientIp, rateLimit, sha256 } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ip = getClientIp(req);
  if (!rateLimit(`resolve:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте позже." },
      { status: 429 }
    );
  }

  try {
    const { code } = (await req.json()) as { code?: string };
    if (!code) {
      return NextResponse.json({ error: "Введите код" }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("reports")
      .update({ status: "resolved" })
      .eq("id", id)
      .eq("secret_code_hash", sha256(code.trim().toUpperCase()))
      .eq("status", "active")
      .select("id");
    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Неверный код или заявка уже закрыта" },
        { status: 403 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
