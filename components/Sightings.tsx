"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Report } from "@/lib/types";
import { CalendarIcon, EyeIcon } from "@/components/Icons";

export interface Sighting {
  id: string;
  lat: number;
  lng: number;
  comment: string | null;
  seen_at: string;
  created_at: string;
}

const SightingsMap = dynamic(() => import("@/components/SightingsMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[190px] items-center justify-center rounded-[18px] border border-line-soft text-ink-3">
      Загрузка карты…
    </div>
  ),
});

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center rounded-2xl border border-line text-ink-3">
      Загрузка карты…
    </div>
  ),
});

const inputClass =
  "w-full rounded-[15px] border-[1.5px] border-line bg-surface px-[15px] py-3.5 text-[15px] outline-none focus:border-ink";

export default function Sightings({ report }: { report: Report }) {
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [adding, setAdding] = useState(false);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [comment, setComment] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const [seenAt, setSeenAt] = useState(today);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/reports/${report.id}/sightings`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setSightings)
      .catch(() => {});
  }, [report.id]);

  async function submit() {
    if (!position) return setError("Отметьте место на карте");
    setSending(true);
    setError(null);
    const res = await fetch(`/api/reports/${report.id}/sightings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat: position[0],
        lng: position[1],
        comment,
        seen_at: seenAt,
      }),
    });
    setSending(false);
    if (res.ok) {
      const created: Sighting = await res.json();
      setSightings((prev) => [created, ...prev]);
      setAdding(false);
      setPosition(null);
      setComment("");
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Не удалось сохранить отметку");
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-lg font-semibold tracking-tight">
          Где его видели
        </h2>
        <span className="text-[13px] text-ink-3">
          {sightings.length > 0 ? `${sightings.length} отметок` : "пока нет отметок"}
        </span>
      </div>

      <SightingsMap report={report} sightings={sightings} />

      {sightings.length > 0 && (
        <ul className="space-y-2">
          {sightings.map((s) => (
            <li
              key={s.id}
              className="flex gap-3 rounded-[14px] border border-line-soft bg-surface px-3.5 py-3"
            >
              <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-sight-tint text-sight">
                <EyeIcon size={15} />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold">
                  {new Date(s.seen_at).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                  })}
                </span>
                {s.comment && (
                  <span className="text-pretty text-[13px] text-ink-2">
                    {s.comment}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {report.status === "active" && !adding && (
        <button
          onClick={() => setAdding(true)}
          className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[15px] bg-sight text-[15px] font-semibold text-white"
        >
          <EyeIcon size={18} />
          Я его видел
        </button>
      )}

      {adding && (
        <div className="space-y-3 rounded-[18px] border border-line-soft p-3.5">
          <p className="text-pretty text-sm text-ink-2">
            Отметьте на карте, где вы видели животное:
          </p>
          <LocationPicker value={position} onChange={setPosition} />
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Куда побежал, как выглядел… (необязательно)"
            maxLength={300}
            className={inputClass}
          />
          <label className="flex items-center gap-2.5 rounded-[15px] border-[1.5px] border-line bg-surface px-[15px] py-3.5 text-[15px]">
            <CalendarIcon size={18} className="text-ink-3" />
            <input
              type="date"
              value={seenAt}
              max={today}
              onChange={(e) => setSeenAt(e.target.value)}
              className="w-full bg-transparent outline-none"
            />
          </label>
          {error && <p className="text-sm text-lost">{error}</p>}
          <div className="flex gap-2.5">
            <button
              onClick={submit}
              disabled={sending}
              className="flex-1 rounded-[15px] bg-ink py-3.5 font-semibold text-white disabled:opacity-50"
            >
              {sending ? "Сохраняем…" : "Сохранить"}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="rounded-[15px] border-[1.5px] border-line px-5 py-3.5 font-semibold text-ink-2"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
