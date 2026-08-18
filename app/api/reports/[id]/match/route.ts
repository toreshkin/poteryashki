import { NextResponse } from "next/server";
import { getAiProvider } from "@/lib/ai";
import { AiError, ReportSummary } from "@/lib/ai/types";
import { getServiceClient } from "@/lib/supabase";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { Report } from "@/lib/types";
import { selectWithFallback } from "@/lib/report-fields";
import { findSimilarNearby } from "@/lib/similar";

export const runtime = "nodejs";

const MAX_CANDIDATES = 3;

/** Фото по URL → base64 для отправки в модель. Ошибку глотаем: сравним по тексту. */
async function fetchPhoto(
  url: string | undefined
): Promise<{ base64: string; mime: string } | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > 3 * 1024 * 1024) return null;
    return {
      base64: buffer.toString("base64"),
      mime: res.headers.get("content-type")?.startsWith("image/")
        ? res.headers.get("content-type")!
        : "image/jpeg",
    };
  } catch {
    return null;
  }
}

function toSummary(
  report: Report,
  distance: number,
  photo: { base64: string; mime: string } | null
): ReportSummary {
  return {
    report_type: report.report_type,
    animal_type: report.animal_type,
    name: report.name,
    description: report.description,
    landmarks: report.landmarks,
    event_date: report.event_date,
    distance_km: distance,
    photo,
  };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const provider = getAiProvider();
  if (!provider) {
    return NextResponse.json({ error: "ИИ отключён" }, { status: 503 });
  }

  const ip = getClientIp(req);
  if (!rateLimit(`ai-match:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Слишком много запросов к ИИ. Попробуйте позже." },
      { status: 429 }
    );
  }

  try {
    const supabase = getServiceClient();
    const { data: report } = await selectWithFallback<Report>((fields) =>
      supabase
        .from("reports")
        .select(fields)
        .eq("id", id)
        .eq("status", "active")
        .maybeSingle<Report>()
    );
    if (!report) {
      return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
    }

    const candidates = (
      await findSimilarNearby(supabase, report, MAX_CANDIDATES)
    ).map(({ distance, ...r }) => ({ report: r as Report, distance }));

    if (candidates.length === 0) {
      return NextResponse.json([]);
    }

    const mainPhoto = provider.vision
      ? await fetchPhoto(report.photos[0])
      : null;

    const results = [];
    for (const { report: candidate, distance } of candidates) {
      const [a, b] =
        report.id < candidate.id ? [report.id, candidate.id] : [candidate.id, report.id];

      // Кэш: пара сравнивается один раз.
      const { data: cached } = await supabase
        .from("ai_matches")
        .select("score, reason")
        .eq("report_a", a)
        .eq("report_b", b)
        .maybeSingle();

      if (cached) {
        results.push({ report_id: candidate.id, ...cached, cached: true });
        continue;
      }

      const candidatePhoto = provider.vision
        ? await fetchPhoto(candidate.photos[0])
        : null;
      const match = await provider.compareReports(
        toSummary(report, 0, mainPhoto),
        toSummary(candidate, distance, candidatePhoto)
      );

      // Сбой кэша не должен ломать ответ — но должен быть виден в логах
      // (частая причина: не выполнен supabase/ai.sql).
      const { error: cacheError } = await supabase.from("ai_matches").insert({
        report_a: a,
        report_b: b,
        score: match.score,
        reason: match.reason,
        provider: provider.name,
      });
      if (cacheError) {
        console.error("Не удалось сохранить оценку в ai_matches:", cacheError.message);
      }

      results.push({ report_id: candidate.id, ...match, cached: false });
    }

    results.sort((x, y) => y.score - x.score);
    return NextResponse.json(results);
  } catch (err) {
    if (err instanceof AiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
