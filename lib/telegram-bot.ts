// Отправка уведомлений через Telegram-бота. Только «после» успешной записи
// в БД и только в лог при ошибке: сбой уведомления не должен ломать ответ API.

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");

/** Абсолютная ссылка на страницу заявки для текста уведомления (если задан NEXT_PUBLIC_SITE_URL). */
export function reportUrl(id: string): string | null {
  return SITE_URL ? `${SITE_URL}/pet/${id}` : null;
}

export async function sendTelegramMessage(
  chatId: number | null | undefined,
  text: string
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Без parse_mode: в тексте могут быть пользовательские строки
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error("Telegram sendMessage:", res.status, await res.text());
    }
  } catch (err) {
    console.error("Telegram sendMessage:", err);
  }
}
