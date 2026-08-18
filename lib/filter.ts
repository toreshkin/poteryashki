import { FilterState } from "@/components/Filters";
import { Report } from "@/lib/types";

/** Общая фильтрация для карты и ленты — одинаковое поведение на обоих экранах. */
export function matchesFilters(report: Report, f: FilterState): boolean {
  if (report.status === "resolved" && !f.showResolved) return false;
  if (f.type !== "all" && report.report_type !== f.type) return false;
  if (f.animal !== "all" && report.animal_type !== f.animal) return false;
  if (f.days > 0) {
    const cutoff = Date.now() - f.days * 86400000;
    if (new Date(report.created_at).getTime() < cutoff) return false;
  }
  return true;
}

export function matchesQuery(report: Report, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack =
    `${report.name ?? ""} ${report.description} ${report.landmarks ?? ""}`.toLowerCase();
  return haystack.includes(q);
}

/** Сколько прошло с даты события (пропажи или находки), а не с момента публикации. */
export function timeAgo(iso: string): string {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "сегодня";
  if (days === 1) return "вчера";
  if (days < 5) return `${days} дня назад`;
  if (days < 31) return `${days} дней назад`;
  return new Date(iso).toLocaleDateString("ru-RU");
}
