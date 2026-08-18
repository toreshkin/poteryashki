import {
  AiError,
  AiProvider,
  MatchResult,
  ParsedAnnouncement,
  PhotoDescription,
  ReportSummary,
  SearchFilters,
} from "@/lib/ai/types";
import {
  comparePrompt,
  DESCRIBE_PROMPT,
  importPrompt,
  SEARCH_PROMPT,
  parseJsonResponse,
} from "@/lib/ai/prompts";
import {
  normalizeAnnouncement,
  normalizeDescription,
  normalizeMatch,
  normalizeSearch,
} from "@/lib/ai/normalize";

// Anthropic Messages API напрямую по HTTP — чтобы не тянуть SDK,
// пока провайдер не выбран окончательно.
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";
const ENDPOINT = "https://api.anthropic.com/v1/messages";

type Block =
  | { type: "text"; text: string }
  | {
      type: "image";
      source: { type: "base64"; media_type: string; data: string };
    };

async function complete(blocks: Block[]): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiError("Не задан ANTHROPIC_API_KEY", 503);

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: blocks }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("Anthropic error", res.status, body.slice(0, 500));
    throw new AiError(
      res.status === 429 ? "Лимит запросов исчерпан" : "ИИ временно недоступен"
    );
  }

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
    stop_reason?: string;
  };
  if (data.stop_reason === "refusal") {
    throw new AiError("ИИ отказался обрабатывать этот запрос");
  }
  const text = data.content
    ?.filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
  if (!text) throw new AiError("Пустой ответ от ИИ");
  return text;
}

function imageBlock(image: { base64: string; mime: string }): Block {
  return {
    type: "image",
    source: { type: "base64", media_type: image.mime, data: image.base64 },
  };
}

export const claudeProvider: AiProvider = {
  name: "claude",
  vision: true,

  async describePhoto(image): Promise<PhotoDescription> {
    const text = await complete([
      { type: "text", text: DESCRIBE_PROMPT },
      imageBlock(image),
    ]);
    return normalizeDescription(parseJsonResponse(text));
  },

  async compareReports(a: ReportSummary, b: ReportSummary): Promise<MatchResult> {
    const blocks: Block[] = [{ type: "text", text: comparePrompt(a, b) }];
    if (a.photo) {
      blocks.push({ type: "text", text: "Фото из объявления 1:" });
      blocks.push(imageBlock(a.photo));
    }
    if (b.photo) {
      blocks.push({ type: "text", text: "Фото из объявления 2:" });
      blocks.push(imageBlock(b.photo));
    }
    return normalizeMatch(parseJsonResponse(await complete(blocks)));
  },

  async parseSearchQuery(query: string): Promise<SearchFilters> {
    const text = await complete([
      { type: "text", text: `${SEARCH_PROMPT}\n\nЗапрос: ${query}` },
    ]);
    return normalizeSearch(parseJsonResponse(text));
  },

  async parseAnnouncement(text: string): Promise<ParsedAnnouncement> {
    const answer = await complete([
      { type: "text", text: importPrompt(text) },
    ]);
    return normalizeAnnouncement(parseJsonResponse(answer));
  },
};
