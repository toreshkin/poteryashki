// Единый список полей заявки для выборок из БД.
// Контакты намеренно вынесены отдельно: в массовых выдачах их быть не должно,
// они отдаются только по одной заявке (страница /pet/[id] и /api/reports/[id]/contacts).
export const PUBLIC_FIELDS =
  "id, created_at, report_type, animal_type, name, description, landmarks, lat, lng, photos, status, event_date";

export const CONTACT_FIELDS = "contact_phone, contact_telegram";

export const PUBLIC_FIELDS_WITH_CONTACTS = `${PUBLIC_FIELDS}, ${CONTACT_FIELDS}`;
