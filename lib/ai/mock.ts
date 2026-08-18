import {
  AiProvider,
  MatchResult,
  PhotoDescription,
  ReportSummary,
  SearchFilters,
} from "@/lib/ai/types";

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
};

function delay(ms = 400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
