import { CITY_CENTER } from "@/lib/config";

// Районы и ориентиры Бишкека с координатами центра.
// Нужны для импорта объявлений из пабликов: модели плохо воспроизводят
// координаты числами, поэтому ИИ выбирает район из этого списка, а координаты
// берём отсюда. Точность ~1–2 км — метка встаёт в нужную часть города,
// дальше место уточняется вручную.

export interface District {
  key: string;
  label: string;
  center: [number, number];
  /** Написания, встречающиеся в объявлениях. Все в нижнем регистре. */
  aliases: string[];
}

export const DISTRICTS: District[] = [
  {
    key: "center",
    label: "Центр",
    center: [42.8756, 74.6034],
    aliases: ["центр", "площадь ала-тоо", "ала-тоо", "цум", "филармония"],
  },
  {
    key: "vostok-5",
    label: "Восток-5",
    center: [42.8779, 74.6521],
    aliases: ["восток-5", "восток 5", "восток5", "восток"],
  },
  {
    key: "jal",
    label: "Джал",
    center: [42.8262, 74.5686],
    aliases: ["джал", "жал", "джал-23", "джал 23", "нижний джал"],
  },
  {
    key: "asanbay",
    label: "Асанбай",
    center: [42.8236, 74.5901],
    aliases: ["асанбай", "асанбое"],
  },
  {
    key: "alamedin-1",
    label: "Аламедин-1",
    center: [42.8814, 74.6285],
    aliases: ["аламедин-1", "аламедин 1", "аламидин-1", "аламедин"],
  },
  {
    key: "osh-bazaar",
    label: "Ошский рынок",
    center: [42.8742, 74.5772],
    aliases: ["ошский рынок", "ош базар", "ошский базар", "ош-базар"],
  },
  {
    key: "dordoi",
    label: "Дордой",
    center: [42.9105, 74.6288],
    aliases: ["дордой", "дордой базар", "дордой рынок"],
  },
  {
    key: "yug-2",
    label: "Юг-2",
    center: [42.8395, 74.5747],
    aliases: ["юг-2", "юг 2", "юг2"],
  },
  {
    key: "tunguch",
    label: "Тунгуч",
    center: [42.8901, 74.6134],
    aliases: ["тунгуч", "тунгуч мкр"],
  },
  {
    key: "ulan",
    label: "Улан",
    center: [42.8846, 74.6011],
    aliases: ["улан", "мкр улан"],
  },
  {
    key: "kok-jar",
    label: "Кок-Жар",
    center: [42.8095, 74.6155],
    aliases: ["кок-жар", "кок жар", "кокжар"],
  },
  {
    key: "archa-beshik",
    label: "Арча-Бешик",
    center: [42.9146, 74.5606],
    aliases: ["арча-бешик", "арча бешик", "арчабешик"],
  },
  {
    key: "kelechek",
    label: "Келечек",
    center: [42.9002, 74.6608],
    aliases: ["келечек", "келечик"],
  },
  {
    key: "ak-orgo",
    label: "Ак-Орго",
    center: [42.9089, 74.5346],
    aliases: ["ак-орго", "ак орго", "акорго"],
  },
  {
    key: "orto-sai",
    label: "Орто-Сай",
    center: [42.8385, 74.6019],
    aliases: ["орто-сай", "орто сай", "ортосай", "ортосайский рынок"],
  },
  {
    key: "vefa",
    label: "Вефа",
    center: [42.8497, 74.6089],
    aliases: ["вефа", "vefa", "вефа центр"],
  },
  {
    key: "politeh",
    label: "Политех",
    center: [42.8664, 74.6242],
    aliases: ["политех", "кгту", "фрунзе политех"],
  },
  {
    key: "mederova",
    label: "Медерова",
    center: [42.8595, 74.6412],
    aliases: ["медерова", "медерова улица"],
  },
  {
    key: "botanika",
    label: "Ботанический сад",
    center: [42.8218, 74.6244],
    aliases: ["ботанический сад", "ботсад", "ботаника"],
  },
  {
    key: "kara-jygach",
    label: "Кара-Жыгач",
    center: [42.8951, 74.5464],
    aliases: ["кара-жыгач", "кара жыгач", "карагачевая роща", "карагач"],
  },
];

/** Список для промпта: ключ — подпись, чтобы модель выбрала из известных. */
export function districtListForPrompt(): string {
  return DISTRICTS.map((d) => `${d.key} (${d.label})`).join(", ");
}

const STEM_LENGTH = 4;

/**
 * Основы слова: в объявлениях районы склоняют («на Дордое», «у Ошского рынка»).
 * Второй вариант — на случай беглой гласной («рынок» → «рынка»).
 */
function stems(word: string): string[] {
  const base = word.slice(0, STEM_LENGTH);
  if (/[оеё][кцнрлм]$/.test(word)) {
    const dropped = word.slice(0, -2) + word.slice(-1);
    return [base, dropped.slice(0, STEM_LENGTH)];
  }
  return [base];
}

function words(text: string): string[] {
  return text.toLowerCase().split(/[^0-9a-zа-яё]+/i).filter(Boolean);
}

/**
 * Ищет район по ключу или по любому написанию из текста, с учётом падежей:
 * каждое слово алиаса должно начинать какое-нибудь слово текста.
 * Возвращает null, если ничего не совпало — тогда место считаем неточным.
 */
export function findDistrict(text: string | null | undefined): District | null {
  if (!text) return null;
  const value = text.trim().toLowerCase();
  if (!value) return null;

  const byKey = DISTRICTS.find((d) => d.key === value);
  if (byKey) return byKey;

  const textWords = words(value);
  if (textWords.length === 0) return null;

  // Сначала более длинные алиасы: «джал-23» точнее, чем «джал»
  const candidates = DISTRICTS.flatMap((d) =>
    d.aliases.map((alias) => ({ district: d, parts: words(alias) }))
  )
    .filter((c) => c.parts.length > 0)
    .sort(
      (a, b) =>
        b.parts.length - a.parts.length ||
        b.parts.join("").length - a.parts.join("").length
    );

  const match = candidates.find(({ parts }) =>
    parts.every((part) =>
      stems(part).some((s) => textWords.some((word) => word.startsWith(s)))
    )
  );
  return match?.district ?? null;
}

/** Координаты района, либо центр города, если район не определён. */
export function districtCenter(district: District | null): [number, number] {
  return district?.center ?? CITY_CENTER;
}
