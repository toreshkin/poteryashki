import { AnimalType, ReportType } from "@/lib/types";

export interface PhotoDescription {
  animal_type: AnimalType;
  breed: string | null;
  colors: string | null;
  description: string;
}

export interface MatchResult {
  score: number; // 0..100
  reason: string;
}

export interface SearchFilters {
  animal_type?: AnimalType;
  report_type?: ReportType;
  days?: number;
  keywords: string[];
}

/**
 * Разбор объявления из паблика. Всё, чего нет в тексте, — null:
 * додумывать за автора нельзя, недостающее заполняет человек.
 */
export interface ParsedAnnouncement {
  report_type: ReportType | null;
  animal_type: AnimalType;
  name: string | null;
  description: string;
  landmarks: string | null;
  /** Ключ района из lib/districts.ts — по нему берём координаты. */
  district: string | null;
  event_date: string | null;
  contact_phone: string | null;
  contact_telegram: string | null;
  /** low — текст не похож на объявление или данных мало; публикуем осторожно. */
  confidence: "high" | "low";
}

/** Краткая карточка заявки для сравнения. */
export interface ReportSummary {
  report_type: ReportType;
  animal_type: AnimalType;
  name: string | null;
  description: string;
  landmarks: string | null;
  event_date: string;
  distance_km: number;
  photo?: { base64: string; mime: string } | null;
}

export interface AiProvider {
  readonly name: string;
  /** Умеет ли провайдер работать с изображениями. */
  readonly vision: boolean;
  describePhoto(image: { base64: string; mime: string }): Promise<PhotoDescription>;
  compareReports(a: ReportSummary, b: ReportSummary): Promise<MatchResult>;
  parseSearchQuery(query: string): Promise<SearchFilters>;
  /** Текст объявления из паблика → поля заявки. */
  parseAnnouncement(text: string): Promise<ParsedAnnouncement>;
}

/** Ошибка, текст которой можно показать пользователю. */
export class AiError extends Error {
  constructor(
    message: string,
    readonly status = 502
  ) {
    super(message);
  }
}
