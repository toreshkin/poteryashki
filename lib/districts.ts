// Места с координатами центра: районы Бишкека и другие города Кыргызстана.
// Нужны для импорта объявлений из пабликов: модели плохо воспроизводят
// координаты числами, поэтому ИИ выбирает место из этого списка, а координаты
// берём отсюда. Точность ~1–2 км — метка встаёт в нужную часть города,
// дальше место уточняется вручную.
//
// Города обязательны: в пабликах Чуйской области попадаются объявления из
// Токмока, Канта, Кара-Балты. Если такое место не распознать, заявка молча
// уедет в центр Бишкека — поэтому нераспознанное место считается ошибкой,
// а не поводом подставить центр (см. findDistrict → null).

export interface District {
  key: string;
  label: string;
  center: [number, number];
  /** Написания, встречающиеся в объявлениях. Все в нижнем регистре. */
  aliases: string[];
  /** Показывать ли кнопкой при уточнении места (иначе только распознавание). */
  common?: boolean;
}

/** Районы и ориентиры Бишкека — все показываются кнопками при уточнении. */
const BISHKEK_DISTRICTS: District[] = ([
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
] as District[]).map((d) => ({ ...d, common: true }));

/**
 * Другие города и посёлки Кыргызстана. Города Чуйской области помечены
 * common — они чаще всего попадаются в бишкекских пабликах.
 */
const OTHER_CITIES: District[] = [
  {
    key: "tokmok",
    label: "Токмок",
    center: [42.8421, 75.29],
    aliases: ["токмок", "токмак"],
    common: true,
  },
  {
    key: "kant",
    label: "Кант",
    center: [42.8917, 74.8508],
    aliases: ["кант"],
    common: true,
  },
  {
    key: "kara-balta",
    label: "Кара-Балта",
    center: [42.8167, 73.8481],
    aliases: ["кара-балта", "кара балта", "карабалта"],
    common: true,
  },
  {
    key: "sokuluk",
    label: "Сокулук",
    center: [42.8631, 74.2917],
    aliases: ["сокулук"],
    common: true,
  },
  {
    key: "lebedinovka",
    label: "Лебединовка",
    center: [42.8783, 74.7139],
    aliases: ["лебединовка", "лебедёновка"],
    common: true,
  },
  {
    key: "belovodskoe",
    label: "Беловодское",
    center: [42.8253, 73.9942],
    aliases: ["беловодское", "беловодск"],
  },
  {
    key: "kemin",
    label: "Кемин",
    center: [42.7853, 75.6889],
    aliases: ["кемин"],
  },
  {
    key: "osh",
    label: "Ош",
    center: [40.5283, 72.7985],
    aliases: ["ош"],
  },
  {
    key: "jalal-abad",
    label: "Джалал-Абад",
    center: [40.9333, 73.0],
    aliases: ["джалал-абад", "джалал абад", "жалал-абад", "жалалабад"],
  },
  {
    key: "karakol",
    label: "Каракол",
    center: [42.4907, 78.3936],
    aliases: ["каракол"],
  },
  {
    key: "balykchy",
    label: "Балыкчы",
    center: [42.4606, 76.1856],
    aliases: ["балыкчы", "балыкчи", "рыбачье"],
  },
  {
    key: "cholpon-ata",
    label: "Чолпон-Ата",
    center: [42.65, 77.0833],
    aliases: ["чолпон-ата", "чолпон ата"],
  },
  {
    key: "naryn",
    label: "Нарын",
    center: [41.4287, 75.9911],
    aliases: ["нарын"],
  },
  {
    key: "talas",
    label: "Талас",
    center: [42.5228, 72.2422],
    aliases: ["талас"],
  },
  {
    key: "batken",
    label: "Баткен",
    center: [40.0619, 70.8194],
    aliases: ["баткен"],
  },
  {
    key: "uzgen",
    label: "Узген",
    center: [40.7708, 73.3006],
    aliases: ["узген", "өзгөн"],
  },
  {
    key: "kyzyl-kiya",
    label: "Кызыл-Кия",
    center: [40.2578, 72.1281],
    aliases: ["кызыл-кия", "кызыл кия"],
  },
];

export const DISTRICTS: District[] = [...BISHKEK_DISTRICTS, ...OTHER_CITIES];

/** Список для промпта: ключ — подпись, чтобы модель выбрала из известных. */
export function districtListForPrompt(): string {
  return DISTRICTS.map((d) => `${d.key} (${d.label})`).join(", ");
}

/** Места для кнопок уточнения: районы Бишкека и города Чуйской области. */
export function commonDistricts(): District[] {
  return DISTRICTS.filter((d) => d.common);
}

/** Русские окончания, которые может принимать название места. */
const ENDINGS = new Set([
  "", "а", "е", "и", "й", "о", "у", "ы", "ь", "ю", "я",
  "ам", "ах", "ая", "ев", "ей", "ем", "ий", "им", "их", "ка", "ке", "ки",
  "ко", "ку", "ов", "ое", "ой", "ок", "ом", "ою", "ые", "ый", "ым", "ых",
  "ья", "ье", "ами", "ого", "ому", "ыми", "ими", "ках", "кам",
]);

const MIN_PREFIX = 3;

function commonPrefixLength(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

/**
 * Слово текста и слово названия — формы одного слова: совпадает основа,
 * а расходятся только окончания. Так «на Дордое» находит «дордой»,
 * «у Ошского рынка» — «ошский рынок», но «ошейник» не находит город Ош,
 * а «кантри» — город Кант.
 */
function wordsMatch(textWord: string, aliasWord: string): boolean {
  const prefix = commonPrefixLength(textWord, aliasWord);
  if (prefix < Math.min(MIN_PREFIX, aliasWord.length)) return false;
  return (
    ENDINGS.has(textWord.slice(prefix)) && ENDINGS.has(aliasWord.slice(prefix))
  );
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
    parts.every((part) => textWords.some((word) => wordsMatch(word, part)))
  );
  return match?.district ?? null;
}

/**
 * Координаты места или null, если оно не распознано.
 * Подставлять центр Бишкека здесь нельзя: объявление из Токмока молча
 * оказалось бы на карте Бишкека. Нераспознанное место уточняет человек.
 */
export function districtCenter(district: District | null): [number, number] | null {
  return district?.center ?? null;
}
