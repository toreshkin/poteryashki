// Геокодирование ориентиров через Nominatim (OpenStreetMap).
// Словарь в lib/districts.ts знает районы и города, но не ЖК, улицы и
// локальные ориентиры («Итальянский квартал», «ул. Бабаева») — их знает OSM.
//
// Политика Nominatim: не больше 1 запроса в секунду и обязательный
// User-Agent с контактом. Импорт ручной и редкий, поэтому укладываемся;
// повторные запросы берём из кэша процесса.

const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const TIMEOUT_MS = 8000;
const MIN_INTERVAL_MS = 1100;
const CACHE_LIMIT = 200;

export interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
}

const MAX_ATTEMPTS = 3;

/**
 * Основы слов, которые сами по себе ничего не значат: по запросу «квартал»
 * Nominatim выдаёт случайный объект на другом конце страны.
 * Сравниваем по началу слова, чтобы ловить падежи («во дворе», «с домом»).
 */
const GENERIC_STEMS = [
  "квартал", "дом", "двор", "район", "мкр", "микрорайон", "жк", "тжк",
  "город", "улиц", "ул", "переул", "проспект", "рядом", "около", "возле",
  "напротив", "территор", "остановк", "магазин",
];

function isGeneric(word: string): boolean {
  return GENERIC_STEMS.some((stem) => word.startsWith(stem));
}

const cache = new Map<string, GeocodeResult | null>();
let lastRequestAt = 0;

function isMeaningful(query: string): boolean {
  // Нужно хотя бы одно собственное название: «Итальянский», «Чуй», «Бабаева».
  // Номер дома тоже годится — «проспект Чуй 100».
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .some((w) => !isGeneric(w) && (w.length >= 3 || /\d/.test(w)));
}

/**
 * Варианты запроса из одного ориентира. В объявлениях место часто пишут
 * перечислением («Итальянский, Французский, Английский квартал») — целиком
 * такой запрос не находится, а по частям находится. Одиночным названиям
 * возвращаем тип объекта из последней части: «Итальянский» → «Итальянский квартал».
 */
export function candidateQueries(landmarks: string): string[] {
  const cleaned = landmarks.replace(/["«»]/g, " ").trim();
  const parts = cleaned
    .split(/[,;/]| и /i)
    .map((p) => p.trim())
    .filter(Boolean);

  const lastWords = parts[parts.length - 1]?.split(/\s+/) ?? [];
  const lastWord = lastWords[lastWords.length - 1] ?? "";
  const kind =
    lastWords.length > 1 && isGeneric(lastWord.toLowerCase()) ? lastWord : null;

  const queries = [cleaned];
  for (const part of parts) {
    queries.push(
      kind && part.split(/\s+/).length === 1 ? `${part} ${kind}` : part
    );
  }
  return [...new Set(queries)].filter(isMeaningful);
}

function userAgent(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://poteryashki.local";
  return `poteryashki/1.0 (${site})`;
}

/** Короткая подпись места: полный display_name слишком длинный для чата. */
function shortLabel(displayName: string): string {
  return displayName.split(",").slice(0, 2).join(",").trim();
}

/**
 * Ищет координаты ориентира в Кыргызстане, пробуя несколько формулировок.
 * null — не нашли или сервис недоступен; тогда место указывает человек.
 */
export async function geocodeLandmark(
  query: string | null | undefined,
  cityHint?: string | null
): Promise<GeocodeResult | null> {
  const base = (query ?? "").trim();
  if (base.length < 4) return null;

  for (const candidate of candidateQueries(base).slice(0, MAX_ATTEMPTS)) {
    const result = await searchOnce(candidate, cityHint);
    if (result) return result;
  }
  return null;
}

async function searchOnce(
  query: string,
  cityHint?: string | null
): Promise<GeocodeResult | null> {
  const search = [query, cityHint].filter(Boolean).join(", ");
  const cacheKey = search.toLowerCase();
  if (cache.has(cacheKey)) return cache.get(cacheKey) ?? null;

  // Уважаем лимит Nominatim: не чаще одного запроса в секунду
  const wait = MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();

  try {
    const url = `${ENDPOINT}?q=${encodeURIComponent(search)}&format=json&limit=1&countrycodes=kg&accept-language=ru`;
    const res = await fetch(url, {
      headers: { "User-Agent": userAgent() },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error("Nominatim:", res.status);
      return null;
    }
    const data = (await res.json()) as {
      lat?: string;
      lon?: string;
      display_name?: string;
    }[];
    const first = data[0];
    const lat = Number(first?.lat);
    const lng = Number(first?.lon);
    const result: GeocodeResult | null =
      Number.isFinite(lat) && Number.isFinite(lng)
        ? { lat, lng, label: shortLabel(first?.display_name ?? search) }
        : null;

    if (cache.size >= CACHE_LIMIT) cache.clear();
    cache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.error("Nominatim:", err);
    return null;
  }
}
