import { afterEach, describe, expect, it, vi } from "vitest";
import { geocodeLandmark } from "@/lib/geocode";

// Сеть подменяем: тесты не должны ходить в Nominatim.
const realFetch = globalThis.fetch;

function mockFetch(payload: unknown, ok = true) {
  const fn = vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 503,
    json: async () => payload,
  });
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
}

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

const NOMINATIM_ANSWER = [
  {
    lat: "42.8181511",
    lon: "74.6162902",
    display_name:
      '"Итальянский Квартал" ТЖК, Асанбай кичирайону, Октябрь району, Бишкек шаары, Кыргызстан',
  },
];

describe("geocodeLandmark", () => {
  it("возвращает координаты и короткую подпись", async () => {
    mockFetch(NOMINATIM_ANSWER);
    const result = await geocodeLandmark("Итальянский квартал", "Бишкек");
    expect(result?.lat).toBeCloseTo(42.81815, 4);
    expect(result?.lng).toBeCloseTo(74.61629, 4);
    expect(result?.label).toBe('"Итальянский Квартал" ТЖК, Асанбай кичирайону');
  });

  it("ограничивает поиск Кыргызстаном и подставляет город", async () => {
    const fn = mockFetch(NOMINATIM_ANSWER);
    await geocodeLandmark("проспект Чуй 100", "Бишкек");
    const url = String(fn.mock.calls[0][0]);
    expect(url).toContain("countrycodes=kg");
    expect(url).toContain(encodeURIComponent("проспект Чуй 100, Бишкек"));
  });

  it("шлёт User-Agent — этого требует политика Nominatim", async () => {
    const fn = mockFetch(NOMINATIM_ANSWER);
    await geocodeLandmark("улица Байтик Баатыра", "Бишкек");
    const init = fn.mock.calls[0][1] as { headers: Record<string, string> };
    expect(init.headers["User-Agent"]).toContain("poteryashki");
  });

  it("возвращает null на пустой ответ, ошибку сети и короткий запрос", async () => {
    mockFetch([]);
    expect(await geocodeLandmark("несуществующее место 12345")).toBeNull();

    mockFetch(null, false);
    expect(await geocodeLandmark("другое несуществующее место")).toBeNull();

    // Слишком короткий запрос не должен уходить в сеть вовсе
    const fn = mockFetch(NOMINATIM_ANSWER);
    expect(await geocodeLandmark("дв")).toBeNull();
    expect(await geocodeLandmark(null)).toBeNull();
    expect(fn).not.toHaveBeenCalled();
  });

  it("повторный запрос берётся из кэша, без обращения к сети", async () => {
    const fn = mockFetch(NOMINATIM_ANSWER);
    const first = await geocodeLandmark("Ошский рынок кэш-тест", "Бишкек");
    const second = await geocodeLandmark("Ошский рынок кэш-тест", "Бишкек");
    expect(second).toEqual(first);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
