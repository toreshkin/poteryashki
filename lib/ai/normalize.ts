import {
  MatchResult,
  PhotoDescription,
  SearchFilters,
} from "@/lib/ai/types";
import { AnimalType, ReportType } from "@/lib/types";

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
