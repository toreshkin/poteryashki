import { ReportSummary } from "@/lib/ai/types";
import { ANIMAL_TYPE_LABELS, REPORT_TYPE_LABELS } from "@/lib/types";

export const DESCRIBE_PROMPT = `Ты помогаешь заполнить объявление о потерявшемся или найденном животном в Бишкеке.
Опиши животное на фотографии так, чтобы его можно было узнать на улице.

Ответь JSON-объектом без пояснений:
{
  "animal_type": "dog" | "cat" | "other",
  "breed": "порода или null, если непонятно",
  "colors": "окрас",
  "description": "2-3 предложения на русском: вид, размер, окрас, приметы, ошейник. Без домыслов о кличке и характере."
}

Если на фото нет животного, верни animal_type "other" и description "На фотографии не видно животного".`;

export const COMPARE_PROMPT = `Ты сравниваешь два объявления о животных: одно о пропаже, другое о находке.
Оцени вероятность, что это одно и то же животное.

Ответь JSON-объектом без пояснений:
{
  "score": число от 0 до 100,
  "reason": "одно короткое предложение на русском, почему такая оценка"
}

Учитывай вид, породу, окрас, приметы, расстояние между точками и даты.
Если данных мало, ставь оценку около 50 и скажи об этом. Не завышай оценку из вежливости.`;

export const SEARCH_PROMPT = `Ты превращаешь поисковый запрос пользователя в фильтры для карты потерявшихся животных.

Ответь JSON-объектом без пояснений:
{
  "animal_type": "dog" | "cat" | "other" | null,
  "report_type": "lost" | "found" | null,
  "days": число дней назад или null,
  "keywords": ["ключевые слова для поиска по тексту: окрас, порода, район"]
}

report_type: "lost" — если ищут пропавшего, "found" — если ищут информацию о найденном.
keywords — только значимые слова в начальной форме, без предлогов.`;

export function reportToText(r: ReportSummary): string {
  return [
    `Тип: ${REPORT_TYPE_LABELS[r.report_type]}`,
    `Вид: ${ANIMAL_TYPE_LABELS[r.animal_type]}`,
    r.name ? `Кличка: ${r.name}` : null,
    `Описание: ${r.description}`,
    r.landmarks ? `Место: ${r.landmarks}` : null,
    `Дата: ${r.event_date}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function comparePrompt(a: ReportSummary, b: ReportSummary): string {
  return `${COMPARE_PROMPT}

--- Объявление 1 ---
${reportToText(a)}

--- Объявление 2 ---
${reportToText(b)}

Расстояние между точками: ${b.distance_km.toFixed(1)} км.`;
}

/** Достаёт JSON из ответа модели, даже если он обёрнут в ```json. */
export function parseJsonResponse<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Ответ модели не содержит JSON");
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}
