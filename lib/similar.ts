import type { SupabaseClient } from "@supabase/supabase-js";
import { distanceKm } from "@/lib/geo";
import { PUBLIC_FIELDS } from "@/lib/report-fields";
import { Report, ReportType } from "@/lib/types";

// «Похожие рядом»: активные заявки противоположного типа того же вида
// в радиусе. Основной путь — RPC similar_reports (supabase/geo.sql, индекс
// по ll_to_earth); пока скрипт не выполнен — fallback с расчётом в JS.

export type SimilarReport = Report & { distance: number };

export const SIMILAR_RADIUS_KM = 3;

export async function findSimilarNearby(
  supabase: SupabaseClient,
  report: Pick<Report, "report_type" | "animal_type" | "lat" | "lng">,
  limit = 5
): Promise<SimilarReport[]> {
  const targetType: ReportType =
    report.report_type === "lost" ? "found" : "lost";

  const { data, error } = await supabase.rpc("similar_reports", {
    p_lat: report.lat,
    p_lng: report.lng,
    p_report_type: targetType,
    p_animal_type: report.animal_type,
    p_radius_km: SIMILAR_RADIUS_KM,
    p_limit: limit,
  });
  if (!error && data) {
    return (data as (Report & { distance_km: number })[]).map(
      ({ distance_km, ...r }) => ({ ...r, distance: distance_km })
    );
  }
  if (error) {
    console.error(
      "RPC similar_reports (выполнен ли supabase/geo.sql?):",
      error.message
    );
  }

  const { data: rows } = await supabase
    .from("reports")
    .select(PUBLIC_FIELDS)
    .eq("status", "active")
    .eq("report_type", targetType)
    .eq("animal_type", report.animal_type)
    .limit(200);
  return ((rows as unknown as Report[]) ?? [])
    .map((r) => ({
      ...r,
      distance: distanceKm(report.lat, report.lng, r.lat, r.lng),
    }))
    .filter((r) => r.distance <= SIMILAR_RADIUS_KM)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}
