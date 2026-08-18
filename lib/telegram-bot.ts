// Работа с Bot API: уведомления авторам и диалог импорта объявлений.
// Ошибки только логируются — сбой отправки не должен ломать ответ API.

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
const TIMEOUT_MS = 10_000;

/** Абсолютная ссылка на страницу заявки для текста уведомления (если задан NEXT_PUBLIC_SITE_URL). */
export function reportUrl(id: string): string | null {
  return SITE_URL ? `${SITE_URL}/pet/${id}` : null;
}

export interface InlineButton {
  text: string;
  callback_data: string;
}

/** Общий вызов Bot API. Возвращает поле result или null при любой ошибке. */
async function callBotApi<T>(
  method: string,
  payload: Record<string, unknown>
): Promise<T | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const data = (await res.json()) as { ok?: boolean; result?: T };
    if (!res.ok || !data.ok) {
      console.error(`Telegram ${method}:`, res.status, JSON.stringify(data).slice(0, 300));
      return null;
    }
    return data.result ?? null;
  } catch (err) {
    console.error(`Telegram ${method}:`, err);
    return null;
  }
}

export async function sendTelegramMessage(
  chatId: number | null | undefined,
  text: string,
  // Ряды кнопок: каждый вложенный массив — строка кнопок под сообщением
  buttons?: InlineButton[][]
): Promise<void> {
  if (!chatId) return;
  // Без parse_mode: в тексте бывают пользовательские строки со спецсимволами
  await callBotApi("sendMessage", {
    chat_id: chatId,
    text,
    ...(buttons?.length ? { reply_markup: { inline_keyboard: buttons } } : {}),
  });
}

/** Убирает «часики» на нажатой кнопке; без этого Telegram показывает ошибку. */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<void> {
  await callBotApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  });
}

/** Убирает кнопки у уже отправленного сообщения — чтобы не нажали дважды. */
export async function clearButtons(
  chatId: number,
  messageId: number
): Promise<void> {
  await callBotApi("editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: [] },
  });
}

/** Прямая ссылка на файл Telegram по file_id (действует около часа). */
export async function getFileUrl(fileId: string): Promise<string | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  const result = await callBotApi<{ file_path?: string }>("getFile", {
    file_id: fileId,
  });
  return result?.file_path
    ? `https://api.telegram.org/file/bot${token}/${result.file_path}`
    : null;
}
