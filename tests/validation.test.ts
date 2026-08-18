import { describe, expect, it } from "vitest";
import {
  complaintInputSchema,
  reportInputSchema,
  resolveInputSchema,
  sightingInputSchema,
  firstIssue,
} from "@/lib/validation";

const validReport = {
  report_type: "lost",
  animal_type: "dog",
  name: "Барсик",
  description: "Рыжий пёс с белой грудкой",
  landmarks: "Возле парка",
  lat: 42.87,
  lng: 74.59,
  contact_phone: "+996 555 123-456",
  contact_telegram: "@user_name",
  event_date: new Date().toISOString().slice(0, 10),
};

describe("reportInputSchema", () => {
  it("принимает корректную заявку", () => {
    expect(reportInputSchema.safeParse(validReport).success).toBe(true);
  });

  it("отклоняет координаты вне диапазона", () => {
    expect(
      reportInputSchema.safeParse({ ...validReport, lat: 999 }).success
    ).toBe(false);
    expect(
      reportInputSchema.safeParse({ ...validReport, lng: -4000 }).success
    ).toBe(false);
  });

  it("требует хотя бы один контакт", () => {
    const result = reportInputSchema.safeParse({
      ...validReport,
      contact_phone: "",
      contact_telegram: "",
    });
    expect(result.success).toBe(false);
    expect(firstIssue(result)).toBe("Укажите телефон или Telegram");
  });

  it("отклоняет мусор в telegram-имени", () => {
    expect(
      reportInputSchema.safeParse({
        ...validReport,
        contact_telegram: "../evil?x=1",
      }).success
    ).toBe(false);
  });

  it("отклоняет дату из далёкого будущего", () => {
    expect(
      reportInputSchema.safeParse({ ...validReport, event_date: "9999-12-31" })
        .success
    ).toBe(false);
  });

  it("отклоняет слишком длинное описание", () => {
    expect(
      reportInputSchema.safeParse({
        ...validReport,
        description: "х".repeat(2001),
      }).success
    ).toBe(false);
  });
});

describe("sightingInputSchema", () => {
  it("принимает координаты и пустую дату", () => {
    expect(
      sightingInputSchema.safeParse({ lat: 42.8, lng: 74.6, seen_at: "" })
        .success
    ).toBe(true);
  });

  it("отклоняет lat вне диапазона", () => {
    expect(sightingInputSchema.safeParse({ lat: 91, lng: 0 }).success).toBe(
      false
    );
  });
});

describe("complaintInputSchema", () => {
  it("принимает известную причину", () => {
    expect(complaintInputSchema.safeParse({ reason: "spam" }).success).toBe(
      true
    );
  });

  it("отклоняет неизвестную причину", () => {
    expect(complaintInputSchema.safeParse({ reason: "hack" }).success).toBe(
      false
    );
  });
});

describe("resolveInputSchema", () => {
  it("требует код", () => {
    expect(resolveInputSchema.safeParse({ code: "" }).success).toBe(false);
    expect(resolveInputSchema.safeParse({ code: "A7K2M9" }).success).toBe(true);
  });
});
