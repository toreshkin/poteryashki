import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getAiProvider } from "@/lib/ai";
import { AiError, ParsedAnnouncement } from "@/lib/ai/types";
import { getServiceClient } from "@/lib/supabase";
import { sniffImageType, IMAGE_EXTENSIONS } from "@/lib/images";
import { MAX_PHOTOS } from "@/lib/config";
import { districtCenter, findDistrict } from "@/lib/districts";
import { createReport } from "@/lib/create-report";
import {
  answerCallbackQuery,
  clearButtons,
  getFileUrl,
  InlineButton,
  reportUrl,
  sendTelegramMessage,
} from "@/lib/telegram-bot";
import {
  districtButtons,
  draftToText,
  findPublishedDuplicate,
  getDraft,
  ImportDraft,
  saveDraft,
  updateDraft,
} from "@/lib/import-draft";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 4000;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** Кто может импортировать: TELEGRAM_ADMIN_IDS через запятую. */
function isAllowed(userId: number): boolean {
  const ids = (process.env.TELEGRAM_ADMIN_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.includes(String(userId));
}

/** Секрет из setWebhook: без него запрос пришёл не от Telegram. */
function secretValid(req: Request): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return false;
  const provided = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

interface TgMessage {
  message_id: number;
  chat: { id: number };
  from?: { id: number };
  text?: string;
  caption?: string;
  photo?: { file_id: string; file_size?: number }[];
  location?: { latitude: number; longitude: number };
  forward_origin?: {
    type: string;
    chat?: { title?: string; username?: string };
    sender_user_name?: string;
    sender_user?: { first_name?: string };
  };
}

interface TgUpdate {
  message?: TgMessage;
  callback_query?: {
    id: string;
    from: { id: number };
    message?: { message_id: number; chat: { id: number } };
    data?: string;
  };
}

/** Откуда переслано — сохраняем как пометку источника. */
function sourceNoteOf(message: TgMessage): string | null {
  const origin = message.forward_origin;
  if (!origin) return null;
  const chat = origin.chat;
  if (chat?.title) return chat.username ? `${chat.title} (@${chat.username})` : chat.title;
  if (origin.sender_user_name) return origin.sender_user_name;
  if (origin.sender_user?.first_name) return origin.sender_user.first_name;
  return null;
}

function publishButtons(draft: ImportDraft): InlineButton[][] {
  const parsed = draft.parsed;
  const rows: InlineButton[][] = [];

  // Тип обязателен: без него заявка не пройдёт валидацию
  if (!parsed.report_type) {
    rows.push([
      { text: "Потерялся", callback_data: `t:${draft.id}:lost` },
      { text: "Нашли", callback_data: `t:${draft.id}:found` },
    ]);
  }

  const hasContact = Boolean(parsed.contact_phone || parsed.contact_telegram);
  const ready = parsed.report_type && hasContact && parsed.description.length >= 10;
  if (ready) {
    rows.push([{ text: "Опубликовать", callback_data: `p:${draft.id}` }]);
  }
  rows.push([
    { text: "Уточнить место", callback_data: `l:${draft.id}` },
    { text: "Отменить", callback_data: `x:${draft.id}` },
  ]);
  return rows;
}

async function sendDraftCard(draft: ImportDraft, prefix?: string): Promise<void> {
  const position = {
    lat: draft.lat ?? 0,
    lng: draft.lng ?? 0,
    districtKey: draft.parsed.district,
    exact: false,
  };
  const text = [prefix, draftToText(draft.parsed, position)]
    .filter(Boolean)
    .join("\n\n");
  await sendTelegramMessage(draft.tg_chat_id, text, publishButtons(draft));
}

/** Фото из пересланного поста → в бакет pet-photos. */
async function uploadPhotos(fileIds: string[]): Promise<string[]> {
  const supabase = getServiceClient();
  const urls: string[] = [];
  for (const fileId of fileIds.slice(0, MAX_PHOTOS)) {
    try {
      const url = await getFileUrl(fileId);
      if (!url) continue;
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) continue;
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength > MAX_PHOTO_BYTES) continue;
      // Файл пришёл извне — тип определяем по содержимому, как при обычной загрузке
      const mime = sniffImageType(bytes);
      if (!mime) continue;
      const path = `${crypto.randomUUID()}.${IMAGE_EXTENSIONS[mime]}`;
      const { error } = await supabase.storage
        .from("pet-photos")
        .upload(path, bytes, { contentType: mime });
      if (error) {
        console.error("Фото из Telegram не загружено:", error.message);
        continue;
      }
      urls.push(
        supabase.storage.from("pet-photos").getPublicUrl(path).data.publicUrl
      );
    } catch (err) {
      console.error("Фото из Telegram не загружено:", err);
    }
  }
  return urls;
}

async function handleMessage(message: TgMessage): Promise<void> {
  const chatId = message.chat.id;
  const userId = message.from?.id;
  if (!userId) return;

  if (!isAllowed(userId)) {
    await sendTelegramMessage(
      chatId,
      "Чтобы подать заявку о питомце, откройте «Потеряшки» через меню бота — там форма с картой."
    );
    return;
  }

  // Присланная геолокация уточняет место последнего черновика
  if (message.location) {
    await applyLocation(userId, chatId, message.location);
    return;
  }

  const text = (message.text ?? message.caption ?? "").trim();
  if (!text) {
    await sendTelegramMessage(
      chatId,
      "Пришлите текст объявления — я разберу его на поля заявки."
    );
    return;
  }
  if (text.startsWith("/")) {
    await sendTelegramMessage(
      chatId,
      "Перешлите сюда объявление из паблика — я разберу его и предложу опубликовать на карте."
    );
    return;
  }

  const provider = getAiProvider();
  if (!provider) {
    await sendTelegramMessage(
      chatId,
      "ИИ сейчас отключён, разобрать объявление не получится (AI_PROVIDER=off)."
    );
    return;
  }

  const duplicate = await findPublishedDuplicate(userId, text);
  if (duplicate) {
    const url = duplicate.report_id ? reportUrl(duplicate.report_id) : null;
    await sendTelegramMessage(
      chatId,
      `Это объявление уже публиковалось.${url ? `\n${url}` : ""}\nЕсли нужно всё равно добавить, измените текст и пришлите снова.`
    );
    return;
  }

  await sendTelegramMessage(chatId, "Разбираю объявление…");

  let parsed: ParsedAnnouncement;
  try {
    parsed = await provider.parseAnnouncement(text.slice(0, MAX_TEXT_LENGTH));
  } catch (err) {
    const reason =
      err instanceof AiError ? err.message : "ИИ не смог разобрать текст";
    console.error("Разбор объявления:", err);
    await sendTelegramMessage(chatId, `Не получилось: ${reason}`);
    return;
  }

  const district = findDistrict(parsed.district);
  const [lat, lng] = districtCenter(district);
  const draft = await saveDraft({
    tgUserId: userId,
    tgChatId: chatId,
    rawText: text,
    parsed,
    photoFileIds: message.photo?.length
      ? [message.photo[message.photo.length - 1].file_id]
      : [],
    sourceNote: sourceNoteOf(message),
    lat,
    lng,
  });

  if (!draft) {
    await sendTelegramMessage(
      chatId,
      "Разбор готов, но черновик не сохранился — похоже, не выполнен supabase/import.sql."
    );
    return;
  }
  await sendDraftCard(draft, "Вот что получилось:");
}

/** Геолокация уточняет место последнего черновика в этом чате. */
async function applyLocation(
  userId: number,
  chatId: number,
  location: { latitude: number; longitude: number }
): Promise<void> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("import_drafts")
    .select("*")
    .eq("tg_user_id", userId)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    await sendTelegramMessage(chatId, "Нет черновика, к которому привязать место.");
    return;
  }
  const draft = data as ImportDraft;
  await updateDraft(draft.id, {
    lat: location.latitude,
    lng: location.longitude,
  });
  await sendDraftCard(
    { ...draft, lat: location.latitude, lng: location.longitude },
    "Место обновлено."
  );
}

async function publishDraft(draft: ImportDraft, chatId: number): Promise<void> {
  const parsed = draft.parsed;
  if (!parsed.report_type) {
    await sendTelegramMessage(chatId, "Сначала выберите тип заявки.");
    return;
  }

  const photos = await uploadPhotos(draft.photo_file_ids ?? []);
  const { id } = await createReport(
    {
      report_type: parsed.report_type,
      animal_type: parsed.animal_type,
      name: parsed.name,
      description: parsed.description,
      landmarks: parsed.landmarks,
      lat: draft.lat ?? 0,
      lng: draft.lng ?? 0,
      photos,
      contact_phone: parsed.contact_phone,
      contact_telegram: parsed.contact_telegram,
      event_date: parsed.event_date ?? new Date().toISOString().slice(0, 10),
    },
    {
      // Импортёр становится владельцем: заявка попадёт в «Мои заявки»
      // и закрывается без секретного кода.
      tgUserId: draft.tg_user_id,
      tgChatId: draft.tg_chat_id,
      source: "import",
      sourceNote: draft.source_note,
    }
  );

  await updateDraft(draft.id, { status: "published", report_id: id });
  const url = reportUrl(id);
  await sendTelegramMessage(
    chatId,
    `Заявка опубликована.${url ? `\n${url}` : ""}${
      photos.length === 0 && draft.photo_file_ids?.length
        ? "\nФото перенести не удалось — добавьте вручную."
        : ""
    }`
  );
}

async function handleCallback(query: NonNullable<TgUpdate["callback_query"]>) {
  const chatId = query.message?.chat.id;
  const data = query.data ?? "";
  if (!chatId || !isAllowed(query.from.id)) {
    await answerCallbackQuery(query.id);
    return;
  }

  const [action, draftId, extra] = data.split(":");
  const draft = draftId ? await getDraft(draftId) : null;
  if (!draft || draft.tg_user_id !== query.from.id) {
    await answerCallbackQuery(query.id, "Черновик не найден");
    return;
  }
  if (draft.status !== "draft") {
    await answerCallbackQuery(query.id, "Этот черновик уже обработан");
    return;
  }

  await answerCallbackQuery(query.id);

  switch (action) {
    case "t": {
      const type = extra === "found" ? "found" : "lost";
      const parsed = { ...draft.parsed, report_type: type as "lost" | "found" };
      await updateDraft(draft.id, { parsed });
      await sendDraftCard({ ...draft, parsed }, "Тип заявки выбран.");
      break;
    }
    case "d": {
      const district = findDistrict(extra);
      if (!district) break;
      const [lat, lng] = district.center;
      const parsed = { ...draft.parsed, district: district.key };
      await updateDraft(draft.id, { lat, lng, parsed });
      await sendDraftCard(
        { ...draft, lat, lng, parsed },
        `Район: ${district.label}.`
      );
      break;
    }
    case "l":
      await sendTelegramMessage(
        chatId,
        "Пришлите геолокацию (скрепка → Geolocation) или выберите район:",
        districtButtons(draft.id)
      );
      break;
    case "p":
      if (query.message) await clearButtons(chatId, query.message.message_id);
      await publishDraft(draft, chatId);
      break;
    case "x":
      await updateDraft(draft.id, { status: "discarded" });
      if (query.message) await clearButtons(chatId, query.message.message_id);
      await sendTelegramMessage(chatId, "Черновик отменён.");
      break;
  }
}

// Telegram повторяет доставку, пока не получит 200, поэтому отвечаем 200
// всегда — об ошибках сообщаем в чат и пишем в лог.
export async function POST(req: Request) {
  if (!secretValid(req)) {
    return NextResponse.json({ error: "Неверный секрет" }, { status: 401 });
  }
  try {
    const update = (await req.json()) as TgUpdate;
    if (update.callback_query) {
      await handleCallback(update.callback_query);
    } else if (update.message) {
      await handleMessage(update.message);
    }
  } catch (err) {
    console.error("Telegram webhook:", err);
  }
  return NextResponse.json({ ok: true });
}
