"use client";

import { useState } from "react";
import { ANIMAL_TYPE_LABELS, AnimalType, ReportType } from "@/lib/types";
import { CloseIcon, FiltersIcon } from "@/components/Icons";
import { useDialog } from "@/components/useDialog";

export interface FilterState {
  type: ReportType | "all";
  animal: AnimalType | "all";
  days: number | 0; // 0 — за всё время
  showResolved: boolean;
}

export const DEFAULT_FILTERS: FilterState = {
  type: "all",
  animal: "all",
  days: 0,
  showResolved: false,
};

/** Сколько фильтров сверх умолчаний — для счётчика на кнопке. */
export function extraFilterCount(f: FilterState): number {
  return (
    (f.animal !== "all" ? 1 : 0) + (f.days !== 0 ? 1 : 0) + (f.showResolved ? 1 : 0)
  );
}

function Chip({
  active,
  onClick,
  children,
  floating,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  floating: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors ${
        active
          ? "bg-ink text-on-accent"
          : floating
            ? "bg-surface-glass text-ink shadow-[0_2px_8px_rgba(35,32,28,.1)]"
            : "border-[1.5px] border-line bg-surface text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export default function Filters({
  value,
  onChange,
  counts,
  floating = false,
}: {
  value: FilterState;
  onChange: (next: FilterState) => void;
  counts?: { all: number; lost: number; found: number };
  floating?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useDialog<HTMLDivElement>(open, () => setOpen(false));
  const extra = extraFilterCount(value);

  return (
    <>
      <div className="flex gap-2 overflow-x-auto px-3.5 py-1 [scrollbar-width:none]">
        <Chip
          floating={floating}
          active={value.type === "all"}
          onClick={() => onChange({ ...value, type: "all" })}
        >
          Все
          {counts && (
            <span className={value.type === "all" ? "opacity-70" : "text-ink-3"}>
              {counts.all}
            </span>
          )}
        </Chip>
        <Chip
          floating={floating}
          active={value.type === "lost"}
          onClick={() =>
            onChange({ ...value, type: value.type === "lost" ? "all" : "lost" })
          }
        >
          <span className="h-[7px] w-[7px] rounded-full bg-lost" />
          Потерялись
          {counts && (
            <span className={value.type === "lost" ? "opacity-70" : "text-ink-3"}>
              {counts.lost}
            </span>
          )}
        </Chip>
        <Chip
          floating={floating}
          active={value.type === "found"}
          onClick={() =>
            onChange({ ...value, type: value.type === "found" ? "all" : "found" })
          }
        >
          <span className="h-[7px] w-[7px] rounded-full bg-found" />
          Найдены
          {counts && (
            <span className={value.type === "found" ? "opacity-70" : "text-ink-3"}>
              {counts.found}
            </span>
          )}
        </Chip>
        <Chip floating={floating} active={extra > 0} onClick={() => setOpen(true)}>
          <FiltersIcon size={15} />
          Фильтры
          {extra > 0 && <span className="opacity-70">{extra}</span>}
        </Chip>
      </div>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[1200] bg-ink/25"
            onClick={() => setOpen(false)}
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Фильтры"
            tabIndex={-1}
            className="fixed inset-x-0 bottom-0 z-[1201] rounded-t-[26px] bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(35,32,28,.18)] outline-none"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-xl font-semibold tracking-tight">
                Фильтры
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-muted-tint text-ink-2"
                aria-label="Закрыть"
              >
                <CloseIcon size={17} />
              </button>
            </div>

            <div className="space-y-5">
              <div className="space-y-2.5">
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-ink-3">
                  Вид животного
                </span>
                <div className="flex flex-wrap gap-2">
                  <Chip
                    floating={false}
                    active={value.animal === "all"}
                    onClick={() => onChange({ ...value, animal: "all" })}
                  >
                    Любой
                  </Chip>
                  {(Object.keys(ANIMAL_TYPE_LABELS) as AnimalType[]).map((a) => (
                    <Chip
                      key={a}
                      floating={false}
                      active={value.animal === a}
                      onClick={() => onChange({ ...value, animal: a })}
                    >
                      {ANIMAL_TYPE_LABELS[a]}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-ink-3">
                  Когда
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { days: 0, label: "За всё время" },
                    { days: 1, label: "Сегодня" },
                    { days: 7, label: "Неделя" },
                    { days: 30, label: "Месяц" },
                  ].map((o) => (
                    <Chip
                      key={o.days}
                      floating={false}
                      active={value.days === o.days}
                      onClick={() => onChange({ ...value, days: o.days })}
                    >
                      {o.label}
                    </Chip>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-between gap-4 rounded-2xl bg-muted-tint px-4 py-3.5">
                <span className="text-[15px] font-medium">
                  Показывать решённые
                </span>
                <input
                  type="checkbox"
                  checked={value.showResolved}
                  onChange={(e) =>
                    onChange({ ...value, showResolved: e.target.checked })
                  }
                  className="h-6 w-6 accent-ink"
                />
              </label>

              <div className="flex gap-2.5">
                <button
                  onClick={() => onChange(DEFAULT_FILTERS)}
                  className="h-13 flex-1 rounded-2xl border-[1.5px] border-line py-3.5 font-semibold text-ink-2"
                >
                  Сбросить
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-2xl bg-ink py-3.5 font-semibold text-on-accent"
                >
                  Показать
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
