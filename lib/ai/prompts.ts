import { ReportSummary } from "@/lib/ai/types";
import { ANIMAL_TYPE_LABELS, REPORT_TYPE_LABELS } from "@/lib/types";
import { districtListForPrompt } from "@/lib/districts";

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

/** Промпт зависит от текущей даты и списка районов, поэтому это функция. */
export function importPrompt(text: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `Ты превращаешь объявление из городского паблика Бишкека в карточку заявки о животном.

Ответь JSON-объектом без пояснений:
{
  "report_type": "lost" | "found" | null,
  "animal_type": "dog" | "cat" | "other",
  "name": "кличка или null",
  "description": "2-4 предложения на русском: вид, окрас, размер, приметы, ошейник, обстоятельства",
  "landmarks": "место словами, как в объявлении, или null",
  "district": "ключ района из списка ниже или null",
  "event_date": "YYYY-MM-DD или null",
  "contact_phone": "телефон или null",
  "contact_telegram": "@username или null",
  "confidence": "high" | "low"
}

Места — районы Бишкека и другие города Кыргызстана (выбирай ключ, который соответствует месту): ${districtListForPrompt()}

Правила:
- district: если в объявлении назван другой город (не Бишкек), выбирай ключ этого города, а не района Бишкека. Если подходящего ключа в списке нет — верни null, не подставляй ближайший.
- report_type: "lost" — животное пропало у хозяина, "found" — его нашли на улице. Если непонятно, верни null.
- Ничего не выдумывай. Если сведений в тексте нет, ставь null. Не придумывай кличку, если её не назвали.
- Сегодня ${today}. Относительные даты («вчера», «3 дня назад», «в субботу») переведи в YYYY-MM-DD. Дата не может быть в будущем.
- description пиши своими словами, спокойным тоном, без заглавных букв целиком и без «СРОЧНО!!!». Не переноси в него телефоны.
- confidence: "low", если текст не об потерянном или найденном животном, либо данных почти нет.

Текст объявления:
"""
${text}
"""`;
}

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
