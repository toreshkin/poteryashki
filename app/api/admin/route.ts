import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const runtime = "nodejs";

function checkAuth(req: Request): boolean {
  const password = process.env.ADMIN_PASSWORD;
  return Boolean(password) && req.headers.get("x-admin-password") === password;
}

export async function GET(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Неверный пароль" }, { status: 401 });
  }
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("reports")
      .select("*, complaints(id, reason, comment, created_at)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Неверный пароль" }, { status: 401 });
  }
  try {
    const { id, action } = (await req.json()) as {
      id?: string;
      action?: "hide" | "restore" | "delete";
    };
    if (!id || !action) {
      return NextResponse.json({ error: "Неверный запрос" }, { status: 400 });
    }

    const supabase = getServiceClient();
    if (action === "delete") {
      const { error } = await supabase.from("reports").delete().eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("reports")
        .update({ status: action === "hide" ? "hidden" : "active" })
        .eq("id", id);
      if (error) throw error;
      if (action === "restore") {
        // Сбрасываем жалобы, чтобы заявка не скрылась снова автоматически
        await supabase.from("complaints").delete().eq("report_id", id);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
