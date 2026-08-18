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

const cache = new Map<string, GeocodeResult | null>();
let lastRequestAt = 0;

function userAgent(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://poteryashki.local";
  return `poteryashki/1.0 (${site})`;
}

/** Короткая подпись места: полный display_name слишком длинный для чата. */
function shortLabel(displayName: string): string {
  return displayName.split(",").slice(0, 2).join(",").trim();
}

/**
 * Ищет координаты ориентира в Кыргызстане.
 * null — не нашли или сервис недоступен; тогда место указывает человек.
 */
export async function geocodeLandmark(
  query: string | null | undefined,
  cityHint?: string | null
): Promise<GeocodeResult | null> {
  const base = (query ?? "").trim();
  if (base.length < 3) return null;

  const search = [base, cityHint].filter(Boolean).join(", ");
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
