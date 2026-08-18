import {
  AiProvider,
  MatchResult,
  ParsedAnnouncement,
  PhotoDescription,
  ReportSummary,
  SearchFilters,
} from "@/lib/ai/types";
import { normalizeAnnouncement } from "@/lib/ai/normalize";
import { findDistrict } from "@/lib/districts";

/**
 * Тестовый провайдер: отвечает без сети и без затрат.
 * Нужен, чтобы проверять интерфейс до подключения настоящего ИИ.
 */
export const mockProvider: AiProvider = {
  name: "mock",
  vision: true,

  async describePhoto(): Promise<PhotoDescription> {
    await delay();
    return {
      animal_type: "dog",
      breed: "дворняга",
      colors: "рыжий с белой грудкой",
      description:
        "Собака среднего размера, рыжая с белым пятном на груди, стоячие уши, на шее синий ошейник. (Тестовый ответ — настоящий ИИ пока не подключён.)",
    };
  },

  async compareReports(a: ReportSummary, b: ReportSummary): Promise<MatchResult> {
    await delay();
    // Оценка зависит от расстояния — так видно, что данные доходят до провайдера.
    const score = Math.max(20, Math.round(90 - b.distance_km * 15));
    return {
      score,
      reason: `Совпадает вид (${a.animal_type}), расстояние ${b.distance_km.toFixed(1)} км. (Тестовый ответ.)`,
    };
  },

  async parseSearchQuery(query: string): Promise<SearchFilters> {
    await delay();
    const q = query.toLowerCase();
    return {
      animal_type: q.includes("кош") || q.includes("кот")
        ? "cat"
        : q.includes("соба") || q.includes("пёс") || q.includes("пес")
          ? "dog"
          : undefined,
      report_type: q.includes("нашл") || q.includes("найден")
        ? "found"
        : q.includes("потер") || q.includes("пропа")
          ? "lost"
          : undefined,
      days: q.includes("недел") ? 7 : q.includes("сегодня") ? 1 : undefined,
      keywords: query
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .slice(0, 5),
    };
  },

  async parseAnnouncement(text: string): Promise<ParsedAnnouncement> {
    await delay();
    const t = text.toLowerCase();
    // Простые эвристики вместо модели — чтобы гонять сценарий импорта
    // целиком без сети и без затрат.
    const phone = text.match(/(\+?996|0)\s?\d{3}[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2}/);
    const telegram = text.match(/@[A-Za-z0-9_]{5,32}/);
    return normalizeAnnouncement({
      report_type: /нашл|найден|подобра|прибил/.test(t)
        ? "found"
        : /потер|пропа|убежал|сбежал/.test(t)
          ? "lost"
          : null,
      animal_type: /кош|кот|кыс/.test(t)
        ? "cat"
        : /соба|пёс|пес|щен/.test(t)
          ? "dog"
          : "other",
      name: null,
      description: `${text.slice(0, 300)} (Тестовый разбор — настоящий ИИ пока не подключён.)`,
      landmarks: null,
      district: findDistrict(t)?.key ?? null,
      event_date: null,
      contact_phone: phone?.[0] ?? null,
      contact_telegram: telegram?.[0] ?? null,
      confidence: "high",
    });
  },
};

function delay(ms = 400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
