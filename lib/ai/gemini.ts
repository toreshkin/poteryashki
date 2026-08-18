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

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

async function generate(parts: Part[]): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AiError("Не задан GEMINI_API_KEY", 503);

  const res = await fetch(`${ENDPOINT}/${MODEL}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("Gemini error", res.status, body.slice(0, 500));
    throw new AiError(
      res.status === 429
        ? "Лимит бесплатных запросов исчерпан, попробуйте позже"
        : "ИИ временно недоступен"
    );
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("");
  if (!text) throw new AiError("Пустой ответ от ИИ");
  return text;
}

export const geminiProvider: AiProvider = {
  name: "gemini",
  vision: true,

  async describePhoto(image): Promise<PhotoDescription> {
    const text = await generate([
      { text: DESCRIBE_PROMPT },
      { inline_data: { mime_type: image.mime, data: image.base64 } },
    ]);
    return normalizeDescription(parseJsonResponse(text));
  },

  async compareReports(a: ReportSummary, b: ReportSummary): Promise<MatchResult> {
    const parts: Part[] = [{ text: comparePrompt(a, b) }];
    if (a.photo) {
      parts.push({ text: "Фото из объявления 1:" });
      parts.push({
        inline_data: { mime_type: a.photo.mime, data: a.photo.base64 },
      });
    }
    if (b.photo) {
      parts.push({ text: "Фото из объявления 2:" });
      parts.push({
        inline_data: { mime_type: b.photo.mime, data: b.photo.base64 },
      });
    }
    return normalizeMatch(parseJsonResponse(await generate(parts)));
  },

  async parseSearchQuery(query: string): Promise<SearchFilters> {
    const text = await generate([
      { text: `${SEARCH_PROMPT}\n\nЗапрос: ${query}` },
    ]);
    return normalizeSearch(parseJsonResponse(text));
  },

  async parseAnnouncement(text: string): Promise<ParsedAnnouncement> {
    const answer = await generate([{ text: importPrompt(text) }]);
    return normalizeAnnouncement(parseJsonResponse(answer));
  },
};
