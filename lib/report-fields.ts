// Единый список полей заявки для выборок из БД.
// Контакты намеренно вынесены отдельно: в массовых выдачах их быть не должно,
// они отдаются только по одной заявке (страница /pet/[id] и /api/reports/[id]/contacts).

/** Поля, которые есть в схеме всегда (supabase/schema.sql). */
const BASE_FIELDS =
  "id, created_at, report_type, animal_type, name, description, landmarks, lat, lng, photos, status, event_date";

/** source появляется только после supabase/import.sql — см. selectWithFallback. */
export const PUBLIC_FIELDS = `${BASE_FIELDS}, source`;

export const CONTACT_FIELDS = "contact_phone, contact_telegram";

export const PUBLIC_FIELDS_WITH_CONTACTS = `${PUBLIC_FIELDS}, ${CONTACT_FIELDS}`;

/** Код Postgres для «нет такой колонки». */
const UNDEFINED_COLUMN = "42703";

/**
 * Выполняет выборку с необязательными колонками и повторяет её без них,
 * если соответствующий .sql ещё не выполнен. Так новая колонка не ломает
 * работающий сайт до применения скрипта.
 */
export async function selectWithFallback<T>(
  run: (fields: string) => PromiseLike<{ data: T | null; error: { code?: string; message: string } | null }>,
  fields: string = PUBLIC_FIELDS
): Promise<{ data: T | null; error: { code?: string; message: string } | null }> {
  const result = await run(fields);
  if (result.error?.code !== UNDEFINED_COLUMN) return result;

  console.error(
    "Нет необязательной колонки (выполнен ли supabase/import.sql?):",
    result.error.message
  );
  const legacy = fields
    .split(",")
    .map((f) => f.trim())
    .filter((f) => f !== "source")
    .join(", ");
  return run(legacy);
}
