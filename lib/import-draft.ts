import { getServiceClient } from "@/lib/supabase";
import { sha256 } from "@/lib/rate-limit";
import { ParsedAnnouncement } from "@/lib/ai/types";
import {
  ANIMAL_TYPE_LABELS,
  REPORT_TYPE_LABELS,
} from "@/lib/types";
import { commonDistricts, findDistrict } from "@/lib/districts";

// Черновики импорта: между разбором текста и нажатием кнопки «Опубликовать»
// проходит отдельный запрос от Telegram, поэтому состояние храним в БД
// (таблица import_drafts, supabase/import.sql).

export interface ImportDraft {
  id: string;
  tg_user_id: number;
  tg_chat_id: number;
  raw_text: string;
  parsed: ParsedAnnouncement;
  photo_file_ids: string[];
  source_note: string | null;
  lat: number | null;
  lng: number | null;
  status: "draft" | "published" | "discarded";
}

export function textHash(text: string): string {
  return sha256(text.trim().toLowerCase());
}

/** Сохранить черновик. null — таблицы нет (не выполнен supabase/import.sql). */
export async function saveDraft(input: {
  tgUserId: number;
  tgChatId: number;
  rawText: string;
  parsed: ParsedAnnouncement;
  photoFileIds: string[];
  sourceNote: string | null;
  lat: number | null;
  lng: number | null;
}): Promise<ImportDraft | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("import_drafts")
    .insert({
      tg_user_id: input.tgUserId,
      tg_chat_id: input.tgChatId,
      raw_text: input.rawText,
      text_hash: textHash(input.rawText),
      parsed: input.parsed,
      photo_file_ids: input.photoFileIds,
      source_note: input.sourceNote,
      lat: input.lat,
      lng: input.lng,
    })
    .select("*")
    .single();
  if (error) {
    console.error(
      "Черновик импорта не сохранён (выполнен ли supabase/import.sql?):",
      error.message
    );
    return null;
  }
  return data as ImportDraft;
}

export async function getDraft(id: string): Promise<ImportDraft | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("import_drafts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("Черновик импорта не найден:", error.message);
    return null;
  }
  return (data as ImportDraft) ?? null;
}

export async function updateDraft(
  id: string,
  patch: Partial<{
    parsed: ParsedAnnouncement;
    lat: number;
    lng: number;
    status: ImportDraft["status"];
    report_id: string;
  }>
): Promise<void> {
  const supabase = getServiceClient();
  const { error } = await supabase
    .from("import_drafts")
    .update(patch)
    .eq("id", id);
  if (error) console.error("Черновик импорта не обновлён:", error.message);
}

/** Публиковалось ли уже такое объявление — защита от повторной пересылки. */
export async function findPublishedDuplicate(
  tgUserId: number,
  rawText: string
): Promise<{ report_id: string | null } | null> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("import_drafts")
    .select("report_id")
    .eq("tg_user_id", tgUserId)
    .eq("text_hash", textHash(rawText))
    .eq("status", "published")
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return (data as { report_id: string | null }) ?? null;
}

/** Карточка разбора для чата: человек должен увидеть, что понял ИИ. */
export function draftToText(
  parsed: ParsedAnnouncement,
  position: { hasPlace: boolean; districtKey: string | null }
): string {
  const district = findDistrict(position.districtKey);
  const place = !position.hasPlace
    ? "Место: не определено — укажите кнопкой ниже"
    : district
      ? `Место: ${district.label} (примерно — можно уточнить)`
      : "Место: указано вручную";

  const lines = [
    parsed.report_type
      ? `Тип: ${REPORT_TYPE_LABELS[parsed.report_type]}`
      : "Тип: не определён — выберите ниже",
    `Вид: ${ANIMAL_TYPE_LABELS[parsed.animal_type]}`,
    parsed.name ? `Кличка: ${parsed.name}` : null,
    `Описание: ${parsed.description || "— не распознано"}`,
    parsed.landmarks ? `Ориентир: ${parsed.landmarks}` : null,
    place,
    `Дата: ${parsed.event_date ?? "сегодня"}`,
    parsed.contact_phone ? `Телефон: ${parsed.contact_phone}` : null,
    parsed.contact_telegram ? `Telegram: ${parsed.contact_telegram}` : null,
  ].filter(Boolean);

  if (!parsed.contact_phone && !parsed.contact_telegram) {
    lines.push("");
    lines.push("Контактов в тексте нет — без них опубликовать нельзя.");
  }
  if (!position.hasPlace) {
    lines.push("");
    lines.push(
      "Место не распознано — пришлите геолокацию или выберите его кнопкой, иначе заявка попадёт не туда."
    );
  }
  if (parsed.confidence === "low") {
    lines.push("");
    lines.push("ИИ не уверен, что это объявление о животном. Проверьте внимательно.");
  }
  return lines.join("\n");
}

/** Кнопки выбора места: по три в ряд, чтобы помещались на телефоне. */
export function districtButtons(draftId: string) {
  const places = commonDistricts();
  const rows: { text: string; callback_data: string }[][] = [];
  for (let i = 0; i < places.length; i += 3) {
    rows.push(
      places.slice(i, i + 3).map((d) => ({
        text: d.label,
        callback_data: `d:${draftId}:${d.key}`,
      }))
    );
  }
  return rows;
}
