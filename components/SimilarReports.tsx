"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ANIMAL_TYPE_LABELS, Report } from "@/lib/types";
import { formatDistance } from "@/lib/geo";
import AiButton from "@/components/AiButton";
import { useAiStatus } from "@/components/useAiStatus";
import { ImageIcon, SparkleIcon } from "@/components/Icons";

export interface SimilarReport extends Report {
  distance: number;
}

interface MatchScore {
  report_id: string;
  score: number;
  reason: string;
}

/** Кольцо прогресса для сильного совпадения. */
function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 14.5;
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
      <circle cx="17" cy="17" r="14.5" fill="none" stroke="#CFE3D6" strokeWidth="4" />
      <circle
        cx="17"
        cy="17"
        r="14.5"
        fill="none"
        stroke="#1B7F4E"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - score / 100)}
        transform="rotate(-90 17 17)"
      />
    </svg>
  );
}

export default function SimilarReports({
  reportId,
  similar,
}: {
  reportId: string;
  similar: SimilarReport[];
}) {
  const ai = useAiStatus();
  const [busy, setBusy] = useState(false);
  const [scores, setScores] = useState<MatchScore[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ordered = useMemo(() => {
    if (!scores) return similar;
    const byId = new Map(scores.map((s) => [s.report_id, s]));
    return [...similar].sort(
      (a, b) => (byId.get(b.id)?.score ?? -1) - (byId.get(a.id)?.score ?? -1)
    );
  }, [similar, scores]);

  async function checkMatches() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${reportId}/match`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "ИИ недоступен");
      setScores(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ИИ недоступен");
    } finally {
      setBusy(false);
    }
  }

  if (similar.length === 0) return null;
  const scoreFor = (id: string) => scores?.find((s) => s.report_id === id);

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-lg font-semibold tracking-tight">
          Похожие рядом
        </h2>
        {scores && (
          <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ai">
            <SparkleIcon size={14} />
            Сверено ИИ
          </span>
        )}
      </div>

      {ai.enabled && !scores && (
        <AiButton onClick={checkMatches} busy={busy} className="w-full">
          Проверить совпадение
        </AiButton>
      )}
      {error && <p className="text-sm text-lost">{error}</p>}

      {ordered.map((s) => {
        const match = scoreFor(s.id);
        const strong = match && match.score >= 60;
        return (
          <Link
            key={s.id}
            href={`/pet/${s.id}`}
            className="block overflow-hidden rounded-[18px] border border-line-soft bg-surface"
          >
            <div className="flex gap-3 p-2.5">
              {s.photos.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.photos[0]}
                  alt=""
                  className="shrink-0 rounded-[13px] object-cover"
                  style={{ width: 82, height: 82 }}
                />
              ) : (
                <div
                  className="flex shrink-0 items-center justify-center rounded-[13px] bg-muted-tint text-ink-3"
                  style={{ width: 82, height: 82 }}
                >
                  <ImageIcon size={28} />
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[15.5px] font-semibold">
                    {s.name ?? ANIMAL_TYPE_LABELS[s.animal_type]}
                  </span>
                  <span className="shrink-0 text-[12.5px] font-semibold text-ink-2">
                    {formatDistance(s.distance)}
                  </span>
                </div>
                <p className="clamp-2 text-[13px] leading-snug text-ink-2">
                  {s.description}
                </p>
                {match && !strong && (
                  <span className="text-[12.5px] text-ink-3">
                    Совпадение {match.score}% — {match.reason}
                  </span>
                )}
              </div>
            </div>

            {strong && (
              <div className="flex items-center gap-2.5 border-t border-[#DCEADF] bg-found-tint px-3.5 py-3">
                <ScoreRing score={match.score} />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13.5px] font-bold text-[#146039]">
                    Совпадение {match.score}%
                  </span>
                  <span className="text-pretty text-[12.5px] text-[#35704F]">
                    {match.reason}
                  </span>
                </div>
              </div>
            )}
          </Link>
        );
      })}

      {scores && (
        <p className="text-pretty text-xs text-ink-3">
          Оценка ИИ — подсказка, а не доказательство. Свяжитесь и уточните.
        </p>
      )}
    </section>
  );
}
