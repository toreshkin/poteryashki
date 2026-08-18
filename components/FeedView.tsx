"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Filters, { DEFAULT_FILTERS, extraFilterCount } from "@/components/Filters";
import ViewToggle from "@/components/ViewToggle";
import EntryButtons from "@/components/EntryButtons";
import StatusBadge from "@/components/StatusBadge";
import { ANIMAL_TYPE_LABELS } from "@/lib/types";
import { SITE_NAME } from "@/lib/config";
import { initTelegram } from "@/lib/telegram";
import { daysSince, FRESH_DAYS, shortAge } from "@/lib/filter";
import { distanceKm, formatDistance } from "@/lib/geo";
import { useAiStatus } from "@/components/useAiStatus";
import { useNearby } from "@/components/useNearby";
import { useReports } from "@/components/useReports";
import PhotoThumb from "@/components/PhotoThumb";
import ShareButton from "@/components/ShareButton";
import {
  CloseIcon,
  EyeIcon,
  ImageIcon,
  MapPinIcon,
  PawIcon,
  PlusIcon,
  SearchIcon,
  SparkleIcon,
} from "@/components/Icons";

/** Фото — главная примета, поэтому в ленте оно крупнее строки текста. */
const PHOTO = 116;

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
  const here = useNearby();
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);

  // Пустой экран объясняет причину по-разному: сузили фильтры или в городе тихо
  const filtersNarrowed =
    query.trim() !== "" || extraFilterCount(filters) > 0 || filters.type !== "all";

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
          {/* Название прячется, когда трём вкладкам не хватает ширины */}
          <span className="flex min-w-0 items-center gap-1.5">
            <PawIcon size={19} />
            <span className="truncate font-serif text-[15px] font-semibold tracking-tight">
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
        {/* Пустая лента — частый первый экран у молодого сервиса,
            поэтому объясняем причину и даём выход, а не сообщаем о пустоте */}
        {!loading && !error && visible.length === 0 && (
          <div className="flex flex-col items-center gap-3.5 px-4 py-10 text-center">
            <span className="flex h-[62px] w-[62px] items-center justify-center rounded-[20px] bg-muted-tint text-ink-3">
              <PawIcon size={30} />
            </span>
            <div className="space-y-1.5">
              <h2 className="font-serif text-[19px] font-semibold tracking-tight">
                Здесь пока пусто
              </h2>
              <p className="text-pretty text-[13.5px] leading-relaxed text-ink-2">
                {filtersNarrowed
                  ? "По выбранным условиям заявок нет. Попробуйте снять часть фильтров."
                  : "Заявок пока нет — это хорошая новость. Если ищете питомца, начните первым."}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href="/report?type=lost"
                className="flex h-11 items-center gap-2 rounded-[14px] bg-lost px-[18px] text-sm font-semibold text-on-accent"
              >
                <PlusIcon size={17} />
                Подать заявку
              </Link>
              {filtersNarrowed && (
                <button
                  onClick={() => {
                    setFilters(DEFAULT_FILTERS);
                    setQuery("");
                  }}
                  className="flex h-11 items-center rounded-[14px] border-[1.5px] border-line bg-surface px-[18px] text-sm font-semibold"
                >
                  Сбросить фильтры
                </button>
              )}
            </div>
          </div>
        )}

        {visible.map((r) => {
          const resolved = r.status === "resolved";
          const fresh = !resolved && daysSince(r.event_date) <= FRESH_DAYS;
          const distance = here
            ? distanceKm(here[0], here[1], r.lat, r.lng)
            : null;

          return (
            <div
              key={r.id}
              className={`overflow-hidden rounded-[18px] border ${
                resolved
                  ? "border-line-soft bg-muted-card"
                  : "border-line-soft bg-surface shadow-[0_1px_2px_rgba(35,32,28,.04)]"
              }`}
            >
              <Link href={`/pet/${r.id}`} className="flex gap-3 p-2.5">
                <div className="relative shrink-0" style={{ width: PHOTO, height: PHOTO }}>
                  {r.photos.length > 0 ? (
                    <PhotoThumb
                      src={r.photos[0]}
                      alt={`Фото: ${r.name ?? ANIMAL_TYPE_LABELS[r.animal_type]}`}
                      className={`rounded-[14px] object-cover ${resolved ? "opacity-70" : ""}`}
                      style={{ width: PHOTO, height: PHOTO }}
                    />
                  ) : (
                    <div
                      className="flex items-center justify-center rounded-[14px] bg-muted-tint text-ink-3"
                      style={{ width: PHOTO, height: PHOTO }}
                    >
                      <ImageIcon size={32} />
                    </div>
                  )}
                  {/* Давность прямо на фото: свежее выделяем, старое приглушаем */}
                  {!resolved && (
                    // Плашка лежит на фотографии, а не на фоне приложения,
                    // поэтому остаётся тёмной в обеих темах
                    <span
                      className={`absolute bottom-1.5 left-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold text-white ${
                        fresh ? "bg-[#171614]/85" : "bg-[#171614]/60"
                      }`}
                    >
                      {fresh && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#ff8f6b]" />
                      )}
                      {shortAge(r.event_date)}
                    </span>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <StatusBadge report={r} size="sm" />
                    {/* Без клички заголовком служит вид — не повторяем его рядом */}
                    {r.name && (
                      <span className="text-[11.5px] text-ink-3">
                        {ANIMAL_TYPE_LABELS[r.animal_type]}
                      </span>
                    )}
                  </div>
                  <div
                    className={`truncate text-[17px] font-semibold tracking-tight ${
                      resolved ? "text-ink-2" : ""
                    }`}
                  >
                    {r.name ?? ANIMAL_TYPE_LABELS[r.animal_type]}
                  </div>
                  <p className="clamp-2 text-[13px] leading-snug text-ink-2">
                    {r.description}
                  </p>
                  {(r.landmarks || distance !== null) && (
                    <div className="flex items-center gap-1.5 text-xs text-ink-2">
                      <MapPinIcon size={14} className="shrink-0 text-ink-3" />
                      <span className="truncate">{r.landmarks ?? "Место на карте"}</span>
                      {distance !== null && (
                        <>
                          <span className="text-ink-3">·</span>
                          <span className="shrink-0 font-semibold text-ink">
                            {formatDistance(distance)}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </Link>

              {/* Отметка о встрече — главное действие прохожего, в один тап */}
              {!resolved && (
                <div className="flex gap-2 px-2.5 pb-2.5">
                  <Link
                    href={`/pet/${r.id}?seen=1`}
                    className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[13px] border-[1.5px] border-line bg-surface text-[13.5px] font-semibold"
                  >
                    <EyeIcon size={16} />
                    Я его видел
                  </Link>
                  <ShareButton report={r} iconOnly />
                </div>
              )}
            </div>
          );
        })}

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
