import { z } from "zod";

// Схемы входных данных API. Сообщения об ошибках показываются пользователю,
// поэтому они на русском и без технических деталей.

const PHONE_REGEX = /^\+?[\d\s()-]{5,20}$/;
export const TELEGRAM_REGEX = /^@?[A-Za-z0-9_]{5,32}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Дата события: не в будущем и не старше 5 лет. */
function isReasonableDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  return (
    date.getTime() <= now + dayMs &&
    date.getTime() >= now - 5 * 365 * dayMs
  );
}

export const latSchema = z
  .number()
  .min(-90, "Укажите место на карте")
  .max(90, "Укажите место на карте");
export const lngSchema = z
  .number()
  .min(-180, "Укажите место на карте")
  .max(180, "Укажите место на карте");

export const reportInputSchema = z
  .object({
    report_type: z.enum(["lost", "found"], "Неверный тип заявки"),
    animal_type: z.enum(["dog", "cat", "other"], "Неверный вид животного"),
    name: z.string().trim().max(80, "Слишком длинная кличка (до 80 символов)"),
    description: z
      .string()
      .trim()
      .min(10, "Опишите животное подробнее (минимум 10 символов)")
      .max(2000, "Слишком длинное описание (до 2000 символов)"),
    landmarks: z
      .string()
      .trim()
      .max(300, "Слишком длинные ориентиры (до 300 символов)"),
    lat: latSchema,
    lng: lngSchema,
    contact_phone: z
      .string()
      .trim()
      .refine((v) => v === "" || PHONE_REGEX.test(v), "Проверьте номер телефона"),
    contact_telegram: z
      .string()
      .trim()
      .refine(
        (v) => v === "" || TELEGRAM_REGEX.test(v),
        "Проверьте имя пользователя Telegram"
      ),
    event_date: z
      .string()
      .refine(
        (v) => v === "" || (DATE_REGEX.test(v) && isReasonableDate(v)),
        "Проверьте дату"
      ),
  })
  .refine((data) => data.contact_phone !== "" || data.contact_telegram !== "", {
    message: "Укажите телефон или Telegram",
  });

export const sightingInputSchema = z.object({
  lat: latSchema,
  lng: lngSchema,
  comment: z
    .string()
    .trim()
    .max(300, "Слишком длинный комментарий (до 300 символов)")
    .optional(),
  seen_at: z
    .string()
    .refine(
      (v) => v === "" || (DATE_REGEX.test(v) && isReasonableDate(v)),
      "Проверьте дату"
    )
    .optional(),
});

export const complaintInputSchema = z.object({
  reason: z.enum(["spam", "fraud", "wrong", "other"], "Укажите причину"),
  comment: z
    .string()
    .trim()
    .max(500, "Слишком длинный комментарий (до 500 символов)")
    .optional(),
});

export const resolveInputSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Введите код")
    .max(20, "Неверный код"),
});

/** Первое сообщение об ошибке из результата разбора — для ответа 400. */
export function firstIssue(result: { error?: z.ZodError }): string {
  return result.error?.issues[0]?.message ?? "Неверный запрос";
}
