"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ViewToggle from "@/components/ViewToggle";
import StatusBadge from "@/components/StatusBadge";
import { ANIMAL_TYPE_LABELS, Report } from "@/lib/types";
import { SITE_NAME } from "@/lib/config";
import { getInitData, initTelegram } from "@/lib/telegram";
import { timeAgo } from "@/lib/filter";
import { CheckIcon, ImageIcon, PawIcon } from "@/components/Icons";
import PhotoThumb from "@/components/PhotoThumb";

// «Мои заявки»: доступно только внутри Telegram — авторство подтверждается
// подписью initData, поэтому ни кода, ни пароля не нужно.
export default function MyReportsView() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outsideTelegram, setOutsideTelegram] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    initTelegram();
    const initData = getInitData();
    if (!initData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOutsideTelegram(true);
      return;
    }
    fetch("/api/my-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ init_data: initData }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? "Не удалось загрузить заявки");
        setReports(data as Report[]);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Не удалось загрузить заявки")
      );
  }, []);

  async function resolve(id: string) {
    const initData = getInitData();
    if (!initData) return;
    setResolvingId(id);
    try {
      const res = await fetch(`/api/reports/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ init_data: initData }),
      });
      if (res.ok) {
        setReports(
          (prev) =>
            prev?.map((r) =>
              r.id === id ? { ...r, status: "resolved" as const } : r
            ) ?? null
        );
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Не удалось закрыть заявку");
      }
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg pb-10">
      <div className="sticky top-0 z-10 border-b border-line-soft bg-paper pt-3.5">
        <div className="flex items-center justify-between gap-2.5 px-3.5 pb-2.5">
          <span className="flex items-center gap-1.5">
            <PawIcon size={19} />
            <span className="font-serif text-[15px] font-semibold tracking-tight">
              {SITE_NAME}
            </span>
          </span>
          <ViewToggle />
        </div>
      </div>

      <h1 className="px-3.5 pt-4 font-serif text-2xl font-semibold tracking-tight">
        Мои заявки
      </h1>

      <div className="space-y-2.5 px-3.5 pt-3">
        {outsideTelegram && (
          <p className="text-balance py-10 text-center text-ink-3">
            Раздел доступен внутри Telegram: откройте «Потеряшки» через бота.
          </p>
        )}
        {error && <p className="py-10 text-center text-lost">{error}</p>}
        {!outsideTelegram && !error && reports === null && (
          <p className="py-10 text-center text-ink-3">Загружаем…</p>
        )}
        {reports !== null && reports.length === 0 && (
          <p className="text-balance py-10 text-center text-ink-3">
            Заявок из этого Telegram-аккаунта пока нет
          </p>
        )}

        {reports?.map((r) => (
          <div
            key={r.id}
            className="space-y-2.5 rounded-[18px] border border-line-soft bg-surface p-2.5 shadow-[0_1px_2px_rgba(35,32,28,.04)]"
          >
            <Link href={`/pet/${r.id}`} className="flex gap-3">
              {r.photos.length > 0 ? (
                <PhotoThumb
                  src={r.photos[0]}
                  alt={`Фото: ${r.name ?? ANIMAL_TYPE_LABELS[r.animal_type]}`}
                  className="shrink-0 rounded-[13px] object-cover"
                  style={{ width: 72, height: 72 }}
                />
              ) : (
                <div
                  className="flex shrink-0 items-center justify-center rounded-[13px] bg-muted-tint text-ink-3"
                  style={{ width: 72, height: 72 }}
                >
                  <ImageIcon size={26} />
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <StatusBadge report={r} size="sm" />
                  <span className="text-[11.5px] text-ink-3">
                    {timeAgo(r.event_date)}
                  </span>
                </div>
                <div className="truncate text-[16.5px] font-semibold tracking-tight">
                  {r.name ?? ANIMAL_TYPE_LABELS[r.animal_type]}
                </div>
                <p className="clamp-2 text-[13px] leading-snug text-ink-2">
                  {r.description}
                </p>
              </div>
            </Link>

            {r.status === "active" && (
              <button
                onClick={() => resolve(r.id)}
                disabled={resolvingId === r.id}
                className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-found-tint py-3 text-sm font-semibold text-found disabled:opacity-50"
              >
                <CheckIcon size={17} />
                {resolvingId === r.id ? "Закрываем…" : "Питомец дома — закрыть"}
              </button>
            )}
            {r.status === "hidden" && (
              <p className="rounded-[14px] bg-lost-tint px-3 py-2 text-xs text-lost">
                Заявка скрыта по жалобам. Если это ошибка, напишите модератору.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
