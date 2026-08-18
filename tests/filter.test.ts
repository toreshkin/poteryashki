import { describe, expect, it } from "vitest";
import { matchesFilters, matchesQuery } from "@/lib/filter";
import { DEFAULT_FILTERS } from "@/components/Filters";
import { Report } from "@/lib/types";
import { distanceKm } from "@/lib/geo";
import { thumbUrl } from "@/lib/photos";

const report: Report = {
  id: "1",
  created_at: new Date().toISOString(),
  report_type: "lost",
  animal_type: "dog",
  name: "Рекс",
  description: "Рыжий пёс, отзывается на кличку",
  landmarks: "Парк Панфилова",
  lat: 42.87,
  lng: 74.59,
  photos: [],
  status: "active",
  event_date: new Date().toISOString().slice(0, 10),
};

describe("matchesFilters", () => {
  it("скрывает решённые по умолчанию", () => {
    expect(
      matchesFilters({ ...report, status: "resolved" }, DEFAULT_FILTERS)
    ).toBe(false);
    expect(
      matchesFilters(
        { ...report, status: "resolved" },
        { ...DEFAULT_FILTERS, showResolved: true }
      )
    ).toBe(true);
  });

  it("фильтрует по типу и виду", () => {
    expect(matchesFilters(report, { ...DEFAULT_FILTERS, type: "found" })).toBe(
      false
    );
    expect(matchesFilters(report, { ...DEFAULT_FILTERS, animal: "cat" })).toBe(
      false
    );
  });

  it("фильтрует по давности", () => {
    const old = {
      ...report,
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    };
    expect(matchesFilters(old, { ...DEFAULT_FILTERS, days: 7 })).toBe(false);
    expect(matchesFilters(old, { ...DEFAULT_FILTERS, days: 30 })).toBe(true);
  });
});

describe("matchesQuery", () => {
  it("ищет по кличке, описанию и ориентирам без учёта регистра", () => {
    expect(matchesQuery(report, "рекс")).toBe(true);
    expect(matchesQuery(report, "рыжий")).toBe(true);
    expect(matchesQuery(report, "панфилова")).toBe(true);
    expect(matchesQuery(report, "чёрный кот")).toBe(false);
  });
});

describe("distanceKm", () => {
  it("считает расстояние с разумной точностью", () => {
    // Бишкек — Алматы ≈ 190 км по прямой
    const d = distanceKm(42.8746, 74.5698, 43.222, 76.8512);
    expect(d).toBeGreaterThan(180);
    expect(d).toBeLessThan(210);
  });

  it("нулевое расстояние до той же точки", () => {
    expect(distanceKm(42.87, 74.59, 42.87, 74.59)).toBe(0);
  });
});

describe("thumbUrl", () => {
  it("заменяет расширение на _thumb.webp", () => {
    expect(thumbUrl("https://x/storage/abc.jpg")).toBe(
      "https://x/storage/abc_thumb.webp"
    );
    expect(thumbUrl("https://x/storage/abc.webp")).toBe(
      "https://x/storage/abc_thumb.webp"
    );
  });

  it("не трогает URL без известного расширения", () => {
    expect(thumbUrl("https://x/storage/abc")).toBe("https://x/storage/abc");
  });
});
