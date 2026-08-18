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
  if (!provider.vision) {
    return NextResponse.json(
      { error: "Выбранный ИИ не умеет распознавать фотографии" },
      { status: 501 }
    );
  }

  const ip = getClientIp(req);
  if (!rateLimit(`ai-describe:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Слишком много запросов к ИИ. Попробуйте через час." },
      { status: 429 }
    );
  }

  try {
    const form = await req.formData();
    const file = form.get("photo");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Нет фотографии" }, { status: 400 });
    }
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Фотография слишком большая" },
        { status: 400 }
      );
    }

    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const result = await provider.describePhoto({
      base64,
      mime: file.type || "image/jpeg",
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json(
      { error: "Не удалось разобрать фотографию" },
      { status: 500 }
    );
  }
}
