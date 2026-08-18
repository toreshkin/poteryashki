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

/** Дней с даты события. Отрицательные (дата будущего) считаем нулём. */
export function daysSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400000));
}

/** До этого срока заявка считается свежей и выделяется в ленте и на карте. */
export const FRESH_DAYS = 3;

/** Короткая давность для плашки на фото: место есть только на пару слов. */
export function shortAge(iso: string): string {
  const days = daysSince(iso);
  if (days === 0) return "сегодня";
  if (days === 1) return "вчера";
  if (days < 7) return `${days} дня назад`;
  if (days < 14) return "неделя";
  if (days < 31) return `${Math.round(days / 7)} нед.`;
  if (days < 365) return `${Math.round(days / 30)} мес.`;
  return "больше года";
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
