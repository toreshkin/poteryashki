"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_FILTERS, FilterState } from "@/components/Filters";
import { Report } from "@/lib/types";
import { matchesFilters, matchesQuery } from "@/lib/filter";

// Общая логика карты и ленты: загрузка заявок, фильтры, поиск, счётчики.
// Правки поведения делайте здесь, чтобы экраны не разъезжались.
export function useReports(pageSize = 100) {
  const [reports, setReports] = useState<Report[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/reports?limit=${pageSize}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data: Report[]) => {
        if (cancelled) return;
        setReports(data);
        setHasMore(data.length === pageSize);
      })
      .catch(() => {
        if (!cancelled)
          setError("Не удалось загрузить заявки. Проверьте настройки Supabase.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pageSize]);

  async function loadMore() {
    const last = reports[reports.length - 1];
    if (!last || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/reports?limit=${pageSize}&before=${encodeURIComponent(last.created_at)}`
      );
      if (!res.ok) throw new Error();
      const data: Report[] = await res.json();
      setReports((prev) => [...prev, ...data]);
      setHasMore(data.length === pageSize);
    } catch {
      setError("Не удалось загрузить заявки");
    } finally {
      setLoadingMore(false);
    }
  }

  const visible = useMemo(
    () =>
      reports.filter(
        (r) => matchesFilters(r, filters) && matchesQuery(r, query)
      ),
    [reports, filters, query]
  );

  const counts = useMemo(() => {
    const active = reports.filter((r) => r.status !== "resolved");
    return {
      all: active.length,
      lost: active.filter((r) => r.report_type === "lost").length,
      found: active.filter((r) => r.report_type === "found").length,
    };
  }, [reports]);

  return {
    visible,
    counts,
    filters,
    setFilters,
    query,
    setQuery,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    error,
  };
}
