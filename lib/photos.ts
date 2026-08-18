// Миниатюры фото хранятся рядом с оригиналом по конвенции имени:
// <uuid>.jpg → <uuid>_thumb.webp (см. загрузку в app/api/reports/route.ts).
// Схема БД не меняется; у старых фото миниатюры нет — клиент делает
// fallback на оригинал через onError (components/PhotoThumb.tsx).

export function thumbUrl(photoUrl: string): string {
  return photoUrl.replace(/\.(jpe?g|png|webp)$/i, "_thumb.webp");
}
