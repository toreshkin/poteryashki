"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Filters from "@/components/Filters";
import PetSheet from "@/components/PetSheet";
import ViewToggle from "@/components/ViewToggle";
import EntryButtons from "@/components/EntryButtons";
import { PawIcon, SearchIcon } from "@/components/Icons";
import { Report } from "@/lib/types";
import { initTelegram } from "@/lib/telegram";
import { SITE_NAME } from "@/lib/config";
import { useReports } from "@/components/useReports";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-ink-3">
      Загрузка карты…
    </div>
  ),
});

export default function MapView() {
  // Карте нужна вся картина сразу — берём максимум одной страницей
  const { visible, counts, filters, setFilters, query, setQuery, error } =
    useReports(500);
  const [selected, setSelected] = useState<Report | null>(null);

  useEffect(() => {
    initTelegram();
  }, []);

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <div className="absolute inset-0">
        <Map reports={visible} onSelect={setSelected} />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex flex-col gap-2.5 pt-3.5">
        <div className="pointer-events-auto flex items-center justify-between gap-2.5 px-3.5">
          <span className="flex h-[34px] items-center gap-1.5 rounded-full bg-white/95 pl-2.5 pr-3.5 shadow-[0_2px_10px_rgba(35,32,28,.12)]">
            <PawIcon size={19} />
            <span className="font-serif text-[15px] font-semibold tracking-tight">
              {SITE_NAME}
            </span>
          </span>
          <ViewToggle floating />
        </div>

        {error && (
          <div className="pointer-events-auto mx-3.5 rounded-xl bg-lost-tint px-3.5 py-2 text-xs text-lost shadow">
            {error}
          </div>
        )}

        <label className="pointer-events-auto mx-3.5 flex h-[46px] items-center gap-2.5 rounded-[15px] bg-surface px-3.5 shadow-[0_2px_10px_rgba(35,32,28,.12)]">
          <SearchIcon size={19} className="text-ink-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Кличка, порода, район…"
            className="w-full bg-transparent text-[14.5px] outline-none placeholder:text-ink-3"
          />
        </label>

        <div className="pointer-events-auto">
          <Filters value={filters} onChange={setFilters} counts={counts} floating />
        </div>
      </div>

      <EntryButtons />

      <PetSheet report={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
