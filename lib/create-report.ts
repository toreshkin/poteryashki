import { getServiceClient } from "@/lib/supabase";
import { sha256 } from "@/lib/rate-limit";
import { distanceKm } from "@/lib/geo";
import { sendTelegramMessage, reportUrl } from "@/lib/telegram-bot";
import { ANIMAL_TYPE_LABELS, AnimalType, ReportType } from "@/lib/types";

// Единая точка создания заявки: используется и формой (POST /api/reports),
// и импортом из паблика через бота. Логика уведомлений и секретного кода
// не должна расходиться между этими путями.

const NOTIFY_RADIUS_KM = 3;

export interface CreateReportInput {
  report_type: ReportType;
  animal_type: AnimalType;
  name: string | null;
  description: string;
  landmarks: string | null;
  lat: number;
  lng: number;
  photos: string[];
  contact_phone: string | null;
  contact_telegram: string | null;
  event_date: string;
}

export interface CreateReportOptions {
  /** Telegram-автор: заявка попадёт в «Мои» и закроется без кода. */
  tgUserId?: number | null;
  tgChatId?: number | null;
  /** 'import' — перенесено из паблика, в карточке будет плашка. */
  source?: "user" | "import";
  sourceNote?: string | null;
}

function generateSecretCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 6 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join("");
}

/** Авторам активных lost-заявок того же вида в радиусе — сообщение о находке. */
async function notifyNearbyLostAuthors(
  supabase: ReturnType<typeof getServiceClient>,
  animalType: AnimalType,
  lat: number,
  lng: number,
  foundReportId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("reports")
    .select("id, lat, lng, tg_chat_id")
    .eq("status", "active")
    .eq("report_type", "lost")
    .eq("animal_type", animalType)
    .not("tg_chat_id", "is", null)
    .limit(200);
  // Колонок tg_* может не быть, если не выполнен supabase/telegram.sql
  if (error || !data) return;

  const url = reportUrl(foundReportId);
  const label = ANIMAL_TYPE_LABELS[animalType].toLowerCase();
  const text = [
    `Рядом с местом пропажи нашли животное (${label}) — возможно, это ваш питомец.`,
    url ?? "Откройте «Потеряшки», чтобы посмотреть заявку.",
  ].join("\n");

  const nearby = data.filter(
    (r) => distanceKm(lat, lng, r.lat, r.lng) <= NOTIFY_RADIUS_KM
  );
  for (const r of nearby) {
    await sendTelegramMessage(r.tg_chat_id, text);
  }
}

export async function createReport(
  input: CreateReportInput,
  options: CreateReportOptions = {}
): Promise<{ id: string; secretCode: string }> {
  const supabase = getServiceClient();
  const secretCode = generateSecretCode();

  const row: Record<string, unknown> = {
    ...input,
    secret_code_hash: sha256(secretCode),
  };
  // Необязательные колонки добавляем отдельно: если соответствующий
  // .sql не выполнен, повторим вставку без них (см. ниже).
  const optional: Record<string, unknown> = {};
  if (options.tgUserId) {
    optional.tg_user_id = options.tgUserId;
    optional.tg_chat_id = options.tgChatId ?? options.tgUserId;
  }
  if (options.source) {
    optional.source = options.source;
    optional.source_note = options.sourceNote ?? null;
  }

  let inserted =
    Object.keys(optional).length > 0
      ? await supabase
          .from("reports")
          .insert({ ...row, ...optional })
          .select("id")
          .single()
      : null;
  if (inserted?.error) {
    // Частая причина — не выполнен supabase/telegram.sql или import.sql
    console.error(
      "Не удалось сохранить необязательные колонки заявки (выполнены ли telegram.sql и import.sql?):",
      inserted.error.message
    );
    inserted = null;
  }
  if (!inserted) {
    inserted = await supabase.from("reports").insert(row).select("id").single();
  }
  if (inserted.error) throw inserted.error;

  const id = inserted.data.id as string;

  // Найдено животное — сообщаем авторам «потеряшек» рядом.
  // Ошибка уведомления не должна ломать создание заявки.
  if (input.report_type === "found") {
    await notifyNearbyLostAuthors(
      supabase,
      input.animal_type,
      input.lat,
      input.lng,
      id
    ).catch((err) => console.error("Уведомление о находке:", err));
  }

  return { id, secretCode };
}
