import { NextResponse } from "next/server";
import { getAiProvider } from "@/lib/ai";
import { AiError } from "@/lib/ai/types";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const provider = getAiProvider();
  if (!provider) {
    return NextResponse.json({ error: "ИИ отключён" }, { status: 503 });
  }

  const ip = getClientIp(req);
  if (!rateLimit(`ai-search:${ip}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Слишком много запросов к ИИ. Попробуйте позже." },
      { status: 429 }
    );
  }

  try {
    const { query } = (await req.json()) as { query?: string };
    const text = query?.trim().slice(0, 200);
    if (!text) {
      return NextResponse.json({ error: "Пустой запрос" }, { status: 400 });
    }
    return NextResponse.json(await provider.parseSearchQuery(text));
  } catch (err) {
    if (err instanceof AiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Не удалось разобрать запрос" },
      { status: 500 }
    );
  }
}
