import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getClientIp, sha256 } from "@/lib/rate-limit";
import { PUBLIC_FIELDS_WITH_CONTACTS } from "@/lib/report-fields";
import { withErrorHandling } from "@/lib/api-helpers";

export const runtime = "nodejs";

// Лимит только на неудачные попытки входа, чтобы не блокировать
// легитимного админа, который шлёт заголовок в каждом запросе.
const FAILED_LIMIT = 10;
const FAILED_WINDOW_MS = 15 * 60 * 1000;
const failedAttempts = new Map<string, number[]>();

function tooManyFailures(ip: string): boolean {
  const now = Date.now();
  const list = (failedAttempts.get(ip) ?? []).filter(
    (t) => now - t < FAILED_WINDOW_MS
  );
  failedAttempts.set(ip, list);
  return list.length >= FAILED_LIMIT;
}

function registerFailure(ip: string) {
  const list = failedAttempts.get(ip) ?? [];
  list.push(Date.now());
  failedAttempts.set(ip, list);
}

/** Сравнение по sha256-дайджестам: constant-time и одинаковая длина буферов. */
function passwordMatches(provided: string, expected: string): boolean {
  return timingSafeEqual(
    Buffer.from(sha256(provided)),
    Buffer.from(sha256(expected))
  );
}

function checkAuth(req: Request): NextResponse | null {
  const ip = getClientIp(req);
  if (tooManyFailures(ip)) {
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте позже." },
      { status: 429 }
    );
  }
  const expected = process.env.ADMIN_PASSWORD;
  const provided = req.headers.get("x-admin-password") ?? "";
  if (!expected || !passwordMatches(provided, expected)) {
    registerFailure(ip);
    return NextResponse.json({ error: "Неверный пароль" }, { status: 401 });
  }
  return null;
}

export const GET = withErrorHandling(async (req: Request) => {
  const authError = checkAuth(req);
  if (authError) return authError;
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("reports")
    // Явный список полей: secret_code_hash не должен уходить на клиент
    .select(
      `${PUBLIC_FIELDS_WITH_CONTACTS}, complaints(id, reason, comment, created_at)`
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return NextResponse.json(data);
});

export const POST = withErrorHandling(async (req: Request) => {
  const authError = checkAuth(req);
  if (authError) return authError;
  {
    const { id, action } = (await req.json()) as {
      id?: string;
      action?: "hide" | "restore" | "delete";
    };
    if (!id || !["hide", "restore", "delete"].includes(action ?? "")) {
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
  }
});
