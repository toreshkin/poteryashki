export type ReportType = "lost" | "found";
export type AnimalType = "dog" | "cat" | "other";
export type ReportStatus = "active" | "resolved" | "hidden";

export interface Report {
  id: string;
  created_at: string;
  report_type: ReportType;
  animal_type: AnimalType;
  name: string | null;
  description: string;
  landmarks: string | null;
  lat: number;
  lng: number;
  photos: string[];
  // Контактов нет в массовых выдачах — только на /pet/[id]
  // и в /api/reports/[id]/contacts (см. lib/report-fields.ts).
  contact_phone?: string | null;
  contact_telegram?: string | null;
  status: ReportStatus;
  event_date: string;
}

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  lost: "Потерялся",
  found: "Найден",
};

export const ANIMAL_TYPE_LABELS: Record<AnimalType, string> = {
  dog: "Собака",
  cat: "Кошка",
  other: "Другое",
};

export const ANIMAL_EMOJI: Record<AnimalType, string> = {
  dog: "🐕",
  cat: "🐈",
  other: "🐾",
};

export const COMPLAINT_REASONS = [
  { value: "spam", label: "Спам или реклама" },
  { value: "fraud", label: "Мошенничество" },
  { value: "wrong", label: "Неверные данные" },
  { value: "other", label: "Другое" },
] as const;
