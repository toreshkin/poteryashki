import { NextResponse } from "next/server";
import { telegramEnabled } from "@/lib/telegram-auth";

export const runtime = "nodejs";

// UI прячет «Мои заявки» и закрытие без кода, когда на сервере нет бот-токена.
export async function GET() {
  return NextResponse.json({ enabled: telegramEnabled() });
}
