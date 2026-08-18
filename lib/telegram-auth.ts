import { createHmac, timingSafeEqual } from "crypto";

// Серверная проверка подписи initData из Telegram Mini App.
// Алгоритм из документации Bot API: secret = HMAC_SHA256("WebAppData", bot_token),
// подпись — HMAC_SHA256(data_check_string, secret).
// Без TELEGRAM_BOT_TOKEN весь телеграм-слой выключен (как AI_PROVIDER=off).

export interface TelegramIdentity {
  userId: number;
  chatId: number;
  username: string | null;
}

const INIT_DATA_MAX_AGE_SEC = 24 * 60 * 60;

export function telegramEnabled(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

export function verifyInitData(
  initData: string | null | undefined
): TelegramIdentity | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !initData) return null;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;
    params.delete("hash");

    const dataCheckString = [...params.entries()]
      .map(([key, value]) => `${key}=${value}`)
      .sort()
      .join("\n");
    const secret = createHmac("sha256", "WebAppData").update(token).digest();
    const expected = createHmac("sha256", secret)
      .update(dataCheckString)
      .digest("hex");

    const a = Buffer.from(expected);
    const b = Buffer.from(hash);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const authDate = Number(params.get("auth_date"));
    if (
      !Number.isFinite(authDate) ||
      Date.now() / 1000 - authDate > INIT_DATA_MAX_AGE_SEC
    ) {
      return null;
    }

    const user = JSON.parse(params.get("user") ?? "null") as {
      id?: number;
      username?: string;
    } | null;
    if (!user?.id) return null;

    // Mini App открывается из личного чата с ботом — chat_id совпадает с user.id
    return { userId: user.id, chatId: user.id, username: user.username ?? null };
  } catch {
    return null;
  }
}
