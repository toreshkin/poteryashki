import { describe, expect, it } from "vitest";
import { normalizeAnnouncement } from "@/lib/ai/normalize";
import { findDistrict, districtCenter, DISTRICTS } from "@/lib/districts";
import { textHash } from "@/lib/import-draft";
import { reportInputSchema } from "@/lib/validation";

const good = {
  report_type: "lost",
  animal_type: "cat",
  name: "Мурка",
  description: "Рыжая кошка с белыми лапами, на шее красный ошейник",
  landmarks: "возле школы №38",
  district: "vostok-5",
  event_date: new Date().toISOString().slice(0, 10),
  contact_phone: "+996 555 123456",
  contact_telegram: "@vladelec",
  confidence: "high",
};

describe("normalizeAnnouncement", () => {
  it("пропускает корректный разбор", () => {
    const r = normalizeAnnouncement(good);
    expect(r.report_type).toBe("lost");
    expect(r.animal_type).toBe("cat");
    expect(r.district).toBe("vostok-5");
    expect(r.contact_phone).toBe("+996 555 123456");
    expect(r.confidence).toBe("high");
  });

  it("не доверяет неизвестным значениям типов", () => {
    const r = normalizeAnnouncement({
      ...good,
      report_type: "мимо",
      animal_type: "дракон",
    });
    expect(r.report_type).toBeNull();
    expect(r.animal_type).toBe("other");
  });

  it("отбрасывает дату из будущего и кривой формат", () => {
    expect(normalizeAnnouncement({ ...good, event_date: "9999-12-31" }).event_date).toBeNull();
    expect(normalizeAnnouncement({ ...good, event_date: "вчера" }).event_date).toBeNull();
  });

  it("отбрасывает мусорные контакты", () => {
    const r = normalizeAnnouncement({
      ...good,
      contact_phone: "звоните в любое время",
      contact_telegram: "../evil?x=1",
    });
    expect(r.contact_phone).toBeNull();
    expect(r.contact_telegram).toBeNull();
  });

  it("добавляет @ к telegram без собачки", () => {
    expect(
      normalizeAnnouncement({ ...good, contact_telegram: "vladelec" })
        .contact_telegram
    ).toBe("@vladelec");
  });

  it("находит район по тексту ориентира, если ключ не распознан", () => {
    const r = normalizeAnnouncement({
      ...good,
      district: "неизвестно",
      landmarks: "в районе Ошского рынка",
    });
    expect(r.district).toBe("osh-bazaar");
  });

  it("понижает confidence при коротком описании", () => {
    expect(normalizeAnnouncement({ ...good, description: "кот" }).confidence).toBe(
      "low"
    );
  });

  it("переживает полностью пустой ответ модели", () => {
    const r = normalizeAnnouncement(null);
    expect(r.animal_type).toBe("other");
    expect(r.description).toBe("");
    expect(r.confidence).toBe("low");
  });

  it("режет слишком длинные строки по лимитам схемы заявки", () => {
    const r = normalizeAnnouncement({
      ...good,
      name: "к".repeat(200),
      description: "о".repeat(3000),
      landmarks: "м".repeat(500),
    });
    expect(r.name?.length).toBe(80);
    expect(r.description.length).toBe(2000);
    expect(r.landmarks?.length).toBe(300);
  });

  it("выдаёт данные, которые принимает reportInputSchema", () => {
    const r = normalizeAnnouncement(good);
    const district = findDistrict(r.district);
    const [lat, lng] = districtCenter(district)!;
    const parsed = reportInputSchema.safeParse({
      report_type: r.report_type,
      animal_type: r.animal_type,
      name: r.name ?? "",
      description: r.description,
      landmarks: r.landmarks ?? "",
      lat,
      lng,
      contact_phone: r.contact_phone ?? "",
      contact_telegram: r.contact_telegram ?? "",
      event_date: r.event_date ?? "",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("findDistrict", () => {
  it("находит по ключу и по алиасу в любом регистре", () => {
    expect(findDistrict("jal")?.key).toBe("jal");
    expect(findDistrict("Джал")?.key).toBe("jal");
    expect(findDistrict("где-то в районе ДОРДОЯ")?.key).toBe("dordoi");
  });

  it("предпочитает более длинный алиас", () => {
    expect(findDistrict("ошский рынок")?.key).toBe("osh-bazaar");
  });

  it("возвращает null на пустое и незнакомое", () => {
    expect(findDistrict(null)).toBeNull();
    expect(findDistrict("")).toBeNull();
    expect(findDistrict("Москва, Тверская")).toBeNull();
  });

  it("не подставляет координаты для нераспознанного места", () => {
    // Иначе объявление из другого города молча уедет на карту Бишкека
    expect(districtCenter(null)).toBeNull();
    expect(districtCenter(findDistrict("tokmok"))).toEqual([42.8421, 75.29]);
  });

  it("узнаёт города Кыргызстана, а не только районы Бишкека", () => {
    expect(findDistrict("г. Токмок")?.key).toBe("tokmok");
    expect(findDistrict("Кара-Балта")?.key).toBe("kara-balta");
    expect(findDistrict("в Канте нашли собаку")?.key).toBe("kant");
    expect(findDistrict("город Ош")?.key).toBe("osh");
  });

  it("не путает короткие названия с обычными словами", () => {
    // «ош» не должно совпасть с «ошейником», «кант» — с «кантри»
    expect(findDistrict("на нём был красный ошейник")).toBeNull();
    expect(findDistrict("слушает кантри")).toBeNull();
  });

  it("находит город в реальном объявлении из Токмока", () => {
    const text = `г. Токмок

В ночь на 18 августа на ул. Бабаева потерялся щенок питбуля.
На нем был красный поводок. Помогите найти. 0995544944`;
    expect(findDistrict(text)?.key).toBe("tokmok");
  });

  it("у всех мест уникальные ключи и координаты внутри Кыргызстана", () => {
    const keys = DISTRICTS.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const d of DISTRICTS) {
      expect(d.center[0]).toBeGreaterThan(39.1);
      expect(d.center[0]).toBeLessThan(43.3);
      expect(d.center[1]).toBeGreaterThan(69.2);
      expect(d.center[1]).toBeLessThan(80.3);
    }
  });
});

describe("textHash", () => {
  it("не зависит от регистра и обрамляющих пробелов", () => {
    expect(textHash("  Пропал Кот  ")).toBe(textHash("пропал кот"));
  });

  it("различает разные тексты", () => {
    expect(textHash("пропал кот")).not.toBe(textHash("пропала собака"));
  });
});
