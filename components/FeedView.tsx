"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Filters from "@/components/Filters";
import ViewToggle from "@/components/ViewToggle";
import EntryButtons from "@/components/EntryButtons";
import StatusBadge from "@/components/StatusBadge";
import { ANIMAL_TYPE_LABELS } from "@/lib/types";
import { SITE_NAME } from "@/lib/config";
import { initTelegram } from "@/lib/telegram";
import { timeAgo } from "@/lib/filter";
import { useAiStatus } from "@/components/useAiStatus";
import { useReports } from "@/components/useReports";
import PhotoThumb from "@/components/PhotoThumb";
import {
  CloseIcon,
  ImageIcon,
  PawIcon,
  SearchIcon,
  SparkleIcon,
} from "@/components/Icons";

export default function FeedView() {
  const {
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
  } = useReports(100);
  const ai = useAiStatus();
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);

  useEffect(() => {
    initTelegram();
  }, []);

  async function aiSearch() {
    const text = query.trim();
    if (!text) return;
    setAiBusy(true);
    setAiNote(null);
    try {
      const res = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "ИИ недоступен");
      setFilters({
        type: data.report_type ?? "all",
        animal: data.animal_type ?? "all",
        days: data.days ?? 0,
        showResolved: false,
      });
      setQuery(data.keywords?.[0] ?? "");
      const parts = [
        data.report_type === "lost"
          ? "потерялись"
          : data.report_type === "found"
            ? "найдены"
            : null,
        data.animal_type ? ANIMAL_TYPE_LABELS[data.animal_type as never] : null,
        data.days ? `за ${data.days} дн.` : null,
        data.keywords?.length ? `слова: ${data.keywords.join(", ")}` : null,
      ].filter(Boolean);
      setAiNote(
        parts.length ? `Применено: ${parts.join(" · ")}` : "Фильтры не изменились"
      );
    } catch (e) {
      setAiNote(e instanceof Error ? e.message : "ИИ недоступен");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg pb-28">
      <div className="sticky top-0 z-10 border-b border-line-soft bg-paper pt-3.5">
        <div className="flex items-center justify-between gap-2.5 px-3.5">
          <span className="flex items-center gap-1.5">
            <PawIcon size={19} />
            <span className="font-serif text-[15px] font-semibold tracking-tight">
              {SITE_NAME}
            </span>
          </span>
          <ViewToggle />
        </div>

        <div className="flex gap-2 px-3.5 pt-2.5">
          <label className="flex h-[46px] flex-1 items-center gap-2.5 rounded-[15px] border-[1.5px] border-line bg-surface px-3.5">
            <SearchIcon size={19} className="text-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                ai.enabled ? "Например: рыжая кошка в Джале" : "Кличка, порода, район…"
              }
              className="w-full bg-transparent text-[14.5px] outline-none placeholder:text-ink-3"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="-mr-1 p-1 text-ink-3"
                aria-label="Очистить поиск"
              >
                <CloseIcon size={16} />
              </button>
            )}
          </label>
          {ai.enabled && (
            <button
              onClick={aiSearch}
              disabled={aiBusy || !query.trim()}
              aria-label="Разобрать запрос через ИИ"
              className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[15px] bg-ai-tint text-ai disabled:opacity-50"
            >
              <SparkleIcon size={20} />
            </button>
          )}
        </div>
        {aiNote && <p className="px-3.5 pt-1 text-xs text-ink-3">{aiNote}</p>}

        <Filters value={filters} onChange={setFilters} counts={counts} />
      </div>

      <div className="space-y-2.5 px-3.5 pt-3">
        {loading && (
          <p className="py-10 text-center text-ink-3">Загружаем…</p>
        )}
        {error && <p className="py-10 text-center text-lost">{error}</p>}
        {!loading && !error && visible.length === 0 && (
          <p className="text-balance py-10 text-center text-ink-3">
            По выбранным условиям заявок нет
          </p>
        )}

        {visible.map((r) => (
          <Link
            key={r.id}
            href={`/pet/${r.id}`}
            className={`flex gap-3 rounded-[18px] border p-2.5 ${
              r.status === "resolved"
                ? "border-line-soft bg-[#F7F4EF]"
                : "border-line-soft bg-surface shadow-[0_1px_2px_rgba(35,32,28,.04)]"
            }`}
          >
            {r.photos.length > 0 ? (
              <PhotoThumb
                src={r.photos[0]}
                alt={`Фото: ${r.name ?? ANIMAL_TYPE_LABELS[r.animal_type]}`}
                className={`shrink-0 rounded-[13px] object-cover ${
                  r.status === "resolved" ? "opacity-70" : ""
                }`}
                style={{ width: 88, height: 88 }}
              />
            ) : (
              <div
                className="flex shrink-0 items-center justify-center rounded-[13px] bg-muted-tint text-ink-3"
                style={{ width: 88, height: 88 }}
              >
                <ImageIcon size={30} />
              </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <StatusBadge report={r} size="sm" />
                <span className="text-[11.5px] text-ink-3">
                  {ANIMAL_TYPE_LABELS[r.animal_type]}
                </span>
              </div>
              <div
                className={`truncate text-[16.5px] font-semibold tracking-tight ${
                  r.status === "resolved" ? "text-ink-2" : ""
                }`}
              >
                {r.name ?? ANIMAL_TYPE_LABELS[r.animal_type]}
              </div>
              <p className="clamp-2 text-[13px] leading-snug text-ink-2">
                {r.description}
              </p>
              <div className="flex items-center justify-between gap-2 text-xs text-ink-3">
                <span className="truncate">{r.landmarks ?? ""}</span>
                <span className="shrink-0">{timeAgo(r.event_date)}</span>
              </div>
            </div>
          </Link>
        ))}

        {hasMore && !loading && !error && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full rounded-[15px] border-[1.5px] border-line bg-surface py-3.5 text-sm font-semibold text-ink-2 disabled:opacity-50"
          >
            {loadingMore ? "Загружаем…" : "Показать ещё"}
          </button>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg">
        <div className="relative h-[86px]">
          <EntryButtons onPaper />
        </div>
      </div>
    </div>
  );
}
