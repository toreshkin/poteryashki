import {
  MatchResult,
  ParsedAnnouncement,
  PhotoDescription,
  SearchFilters,
} from "@/lib/ai/types";
import { AnimalType, ReportType } from "@/lib/types";
import { findDistrict } from "@/lib/districts";

const ANIMAL_TYPES: AnimalType[] = ["dog", "cat", "other"];
const REPORT_TYPES: ReportType[] = ["lost", "found"];

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Ответы моделей нестабильны — приводим их к нашим типам. */
export function normalizeDescription(raw: unknown): PhotoDescription {
  const o = (raw ?? {}) as Record<string, unknown>;
  const animal = str(o.animal_type)?.toLowerCase();
  return {
    animal_type: ANIMAL_TYPES.includes(animal as AnimalType)
      ? (animal as AnimalType)
      : "other",
    breed: str(o.breed),
    colors: str(o.colors),
    description: str(o.description) ?? "Не удалось описать животное по фото",
  };
}

export function normalizeMatch(raw: unknown): MatchResult {
  const o = (raw ?? {}) as Record<string, unknown>;
  const score = Number(o.score);
  return {
    score: Number.isFinite(score) ? Math.min(100, Math.max(0, Math.round(score))) : 50,
    reason: str(o.reason) ?? "Недостаточно данных для точной оценки",
  };
}

/** Телефон и telegram — теми же правилами, что в lib/validation.ts. */
const PHONE_REGEX = /^\+?[\d\s()-]{5,20}$/;
const TELEGRAM_REGEX = /^@?[A-Za-z0-9_]{5,32}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function cut(value: string | null, max: number): string | null {
  return value ? value.slice(0, max) : null;
}

/** Дата из ответа модели: только формат YYYY-MM-DD, не в будущем, не древняя. */
function normalizeDate(value: string | null): string | null {
  if (!value || !DATE_REGEX.test(value)) return null;
  const time = new Date(`${value}T00:00:00Z`).getTime();
  if (Number.isNaN(time)) return null;
  const dayMs = 86400000;
  if (time > Date.now() + dayMs) return null;
  if (time < Date.now() - 5 * 365 * dayMs) return null;
  return value;
}

/**
 * Разбор объявления. Модель ошибается и выдумывает, поэтому каждое поле
 * проверяется отдельно: непрошедшее проверку становится null, а не мусором.
 */
export function normalizeAnnouncement(raw: unknown): ParsedAnnouncement {
  const o = (raw ?? {}) as Record<string, unknown>;

  const animal = str(o.animal_type)?.toLowerCase();
  const report = str(o.report_type)?.toLowerCase();

  const phone = str(o.contact_phone);
  const telegramRaw = str(o.contact_telegram);
  const telegram = telegramRaw?.startsWith("@")
    ? telegramRaw
    : telegramRaw
      ? `@${telegramRaw}`
      : null;

  // Район ищем и по ключу от модели, и по тексту ориентира — на случай,
  // если модель написала название вместо ключа.
  const landmarks = cut(str(o.landmarks), 300);
  const district =
    findDistrict(str(o.district)) ?? findDistrict(landmarks) ?? null;

  const description = str(o.description);

  return {
    report_type: REPORT_TYPES.includes(report as ReportType)
      ? (report as ReportType)
      : null,
    animal_type: ANIMAL_TYPES.includes(animal as AnimalType)
      ? (animal as AnimalType)
      : "other",
    name: cut(str(o.name), 80),
    description: cut(description, 2000) ?? "",
    landmarks,
    district: district?.key ?? null,
    event_date: normalizeDate(str(o.event_date)),
    contact_phone: phone && PHONE_REGEX.test(phone) ? phone : null,
    contact_telegram:
      telegram && TELEGRAM_REGEX.test(telegram) ? telegram : null,
    // Короткое описание — тоже повод для ручной проверки: заявку с таким
    // текстом всё равно не примет reportInputSchema (минимум 10 символов).
    confidence:
      str(o.confidence)?.toLowerCase() === "high" &&
      (description?.length ?? 0) >= 10
        ? "high"
        : "low",
  };
}

export function normalizeSearch(raw: unknown): SearchFilters {
  const o = (raw ?? {}) as Record<string, unknown>;
  const animal = str(o.animal_type)?.toLowerCase();
  const report = str(o.report_type)?.toLowerCase();
  const days = Number(o.days);
  return {
    animal_type: ANIMAL_TYPES.includes(animal as AnimalType)
      ? (animal as AnimalType)
      : undefined,
    report_type: REPORT_TYPES.includes(report as ReportType)
      ? (report as ReportType)
      : undefined,
    days: Number.isFinite(days) && days > 0 ? Math.round(days) : undefined,
    keywords: Array.isArray(o.keywords)
      ? o.keywords
          .map((k) => str(k))
          .filter((k): k is string => Boolean(k))
          .slice(0, 8)
      : [],
  };
}
