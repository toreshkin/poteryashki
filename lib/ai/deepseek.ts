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
  importPrompt,
  SEARCH_PROMPT,
  parseJsonResponse,
} from "@/lib/ai/prompts";
import {
  normalizeAnnouncement,
  normalizeMatch,
  normalizeSearch,
} from "@/lib/ai/normalize";

// DeepSeek — OpenAI-совместимый API, изображения не поддерживает.
const MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
const ENDPOINT = "https://api.deepseek.com/chat/completions";

async function complete(prompt: string): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new AiError("Не задан DEEPSEEK_API_KEY", 503);

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("DeepSeek error", res.status, body.slice(0, 500));
    throw new AiError(
      res.status === 429 ? "Лимит запросов исчерпан" : "ИИ временно недоступен"
    );
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new AiError("Пустой ответ от ИИ");
  return text;
}

export const deepseekProvider: AiProvider = {
  name: "deepseek",
  vision: false,

  async describePhoto(): Promise<PhotoDescription> {
    throw new AiError(
      "Выбранный ИИ не умеет распознавать фотографии. Опишите животное вручную.",
      501
    );
  },

  async compareReports(a: ReportSummary, b: ReportSummary): Promise<MatchResult> {
    // Сравниваем только по тексту — фото этот провайдер не видит.
    return normalizeMatch(parseJsonResponse(await complete(comparePrompt(a, b))));
  },

  async parseSearchQuery(query: string): Promise<SearchFilters> {
    const text = await complete(`${SEARCH_PROMPT}\n\nЗапрос: ${query}`);
    return normalizeSearch(parseJsonResponse(text));
  },

  async parseAnnouncement(text: string): Promise<ParsedAnnouncement> {
    return normalizeAnnouncement(
      parseJsonResponse(await complete(importPrompt(text)))
    );
  },
};
