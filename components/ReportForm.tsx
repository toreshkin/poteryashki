"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import imageCompression from "browser-image-compression";
import { ANIMAL_TYPE_LABELS, AnimalType, ReportType } from "@/lib/types";
import { MAX_PHOTOS } from "@/lib/config";
import { getInitData, initTelegram } from "@/lib/telegram";
import AiButton from "@/components/AiButton";
import LocationPicker from "@/components/LocationPickerLazy";
import { useAiStatus } from "@/components/useAiStatus";
import {
  AnimalIcon,
  CalendarIcon,
  CameraIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  SparkleIcon,
} from "@/components/Icons";

const STEPS = ["Фото", "Приметы", "Где", "Контакты"] as const;

const inputClass =
  "w-full rounded-[15px] border-[1.5px] border-line bg-surface px-[15px] py-3.5 text-[15.5px] outline-none focus:border-ink";

const labelClass =
  "text-[12px] font-semibold uppercase tracking-[0.04em] text-ink-3";

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[78px] flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl text-[13.5px] font-semibold transition-colors ${
        active
          ? "bg-ink text-white"
          : "border-[1.5px] border-line bg-surface text-ink-2"
      }`}
    >
      {children}
    </button>
  );
}

export default function ReportForm({ initialType }: { initialType: ReportType }) {
  const [step, setStep] = useState(0);
  const [animalType, setAnimalType] = useState<AnimalType>("dog");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [landmarks, setLandmarks] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();
  const [eventDate, setEventDate] = useState(today);
  const [photos, setPhotos] = useState<File[]>([]);
  // Миниатюры для ленты/карты генерируем здесь же, при добавлении фото
  const [thumbs, setThumbs] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [phone, setPhone] = useState("");
  const [telegram, setTelegram] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; secret_code: string } | null>(
    null
  );
  const [codeCopied, setCodeCopied] = useState(false);
  const ai = useAiStatus();
  const [aiBusy, setAiBusy] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);

  const lost = initialType === "lost";

  useEffect(() => {
    // Мост Telegram WebApp существует только в браузере, поэтому читаем его
    // после монтирования и подставляем @username в контакты.
    const username = initTelegram();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (username) setTelegram(username);
  }, []);

  async function addPhotos(files: FileList | null) {
    if (!files) return;
    const compressed: File[] = [];
    const compressedThumbs: File[] = [];
    for (const file of Array.from(files).slice(0, MAX_PHOTOS - photos.length)) {
      compressed.push(
        await imageCompression(file, {
          maxSizeMB: 0.6,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
        })
      );
      compressedThumbs.push(
        await imageCompression(file, {
          maxSizeMB: 0.05,
          maxWidthOrHeight: 320,
          useWebWorker: true,
          fileType: "image/webp",
        })
      );
    }
    setPhotos((prev) => [...prev, ...compressed]);
    setThumbs((prev) => [...prev, ...compressedThumbs]);
    setPreviews((prev) => [...prev, ...compressed.map((f) => URL.createObjectURL(f))]);
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setThumbs((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function describeByPhoto() {
    if (photos.length === 0) {
      setError("Сначала добавьте фотографию");
      return;
    }
    setAiBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("photo", photos[0], "photo.jpg");
      const res = await fetch("/api/ai/describe", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "ИИ не смог разобрать фото");
      setAnimalType(data.animal_type);
      setDescription(
        [data.description, data.breed && `Порода: ${data.breed}.`]
          .filter(Boolean)
          .join(" ")
      );
      setAiFilled(true);
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ИИ недоступен");
    } finally {
      setAiBusy(false);
    }
  }

  function validateStep(): string | null {
    if (step === 1 && description.trim().length < 10)
      return "Опишите животное подробнее (минимум 10 символов)";
    if (step === 2 && !position) return "Отметьте место на карте";
    if (step === 3 && !phone.trim() && !telegram.trim())
      return "Укажите телефон или Telegram";
    return null;
  }

  function next() {
    const err = validateStep();
    if (err) return setError(err);
    setError(null);
    setStep((s) => s + 1);
  }

  async function submit() {
    const err = validateStep();
    if (err) return setError(err);
    setError(null);
    setSending(true);

    const form = new FormData();
    form.set("report_type", initialType);
    form.set("animal_type", animalType);
    form.set("name", name);
    form.set("description", description);
    form.set("landmarks", landmarks);
    form.set("event_date", eventDate);
    form.set("lat", String(position![0]));
    form.set("lng", String(position![1]));
    form.set("contact_phone", phone);
    form.set("contact_telegram", telegram);
    // Подпись Telegram: сервер проверит её и привяжет заявку к автору
    const initData = getInitData();
    if (initData) form.set("init_data", initData);
    for (const photo of photos) form.append("photos", photo, "photo.jpg");
    for (const thumb of thumbs) form.append("thumbs", thumb, "thumb.webp");

    try {
      const res = await fetch("/api/reports", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Не удалось создать заявку");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось создать заявку");
    } finally {
      setSending(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-5 pt-6 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-found-tint text-found">
          <CheckIcon size={32} />
        </span>
        <h2 className="font-serif text-2xl font-semibold tracking-tight">
          Заявка опубликована
        </h2>
        <div className="space-y-3 rounded-2xl bg-muted-tint p-4 text-left">
          <p className="text-pretty text-sm text-ink-2">
            Сохраните секретный код — только по нему можно будет закрыть заявку,
            когда {lost ? "питомец найдётся" : "хозяин найдётся"}.
          </p>
          <div className="flex items-center gap-2.5">
            <div className="flex-1 rounded-xl bg-surface py-3 text-center font-mono text-2xl font-bold tracking-[0.2em]">
              {result.secret_code}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(result.secret_code);
                setCodeCopied(true);
                setTimeout(() => setCodeCopied(false), 2000);
              }}
              className="rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white"
            >
              {codeCopied ? "Скопирован" : "Копировать"}
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          <Link
            href={`/pet/${result.id}`}
            className="rounded-2xl bg-ink py-3.5 font-semibold text-white"
          >
            Открыть заявку
          </Link>
          <Link
            href="/"
            className="rounded-2xl border-[1.5px] border-line py-3.5 font-semibold text-ink-2"
          >
            Вернуться к карте
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-28">
      <div className="flex gap-1.5">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1">
            <div
              className={`h-1 rounded-full ${i <= step ? "bg-ink" : "bg-line"}`}
            />
            <div
              className={`mt-1.5 text-center text-[11.5px] ${
                i === step ? "font-semibold text-ink" : "text-ink-3"
              }`}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-3">
          <p className="text-pretty text-sm text-ink-2">
            Фотография — самое важное: по ней животное узнают на улице. Можно до{" "}
            {MAX_PHOTOS} снимков.
          </p>
          <div className="flex flex-wrap gap-2.5">
            {previews.map((src, i) => (
              <div key={src} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt="Предпросмотр добавленного фото"
                  className="h-28 w-28 rounded-2xl object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  aria-label="Удалить фото"
                  className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink text-white"
                >
                  <CloseIcon size={14} />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className="flex h-28 w-28 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-line text-ink-3">
                <CameraIcon size={26} />
                <span className="text-xs font-medium">Добавить</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => addPhotos(e.target.files)}
                />
              </label>
            )}
          </div>
          {ai.enabled && ai.vision && photos.length > 0 && (
            <AiButton onClick={describeByPhoto} busy={aiBusy} className="w-full">
              Заполнить описание по фото
            </AiButton>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <div className="space-y-2.5">
            <span className={labelClass}>{lost ? "Кто пропал" : "Кого нашли"}</span>
            <div className="flex gap-2">
              {(Object.keys(ANIMAL_TYPE_LABELS) as AnimalType[]).map((a) => (
                <Choice
                  key={a}
                  active={animalType === a}
                  onClick={() => setAnimalType(a)}
                >
                  <AnimalIcon animal={a} size={24} />
                  {ANIMAL_TYPE_LABELS[a]}
                </Choice>
              ))}
            </div>
          </div>

          {lost && (
            <div className="space-y-2.5">
              <span className={labelClass}>
                Кличка{" "}
                <span className="font-medium normal-case tracking-normal text-ink-3">
                  — если есть
                </span>
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Барсик"
                className={inputClass}
              />
            </div>
          )}

          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className={labelClass}>Приметы</span>
              {aiFilled && (
                <span className="flex h-7 items-center gap-1.5 rounded-full bg-ai-tint px-2.5 text-xs font-semibold text-ai">
                  <SparkleIcon size={14} />
                  Черновик ИИ
                </span>
              )}
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Порода, размер, окрас, особые приметы, ошейник…"
              rows={4}
              className={inputClass}
            />
            {aiFilled && (
              <p className="text-pretty text-xs text-ink-3">
                Составлено по вашей фотографии — проверьте и допишите, что важно.
              </p>
            )}
          </div>

          <div className="space-y-2.5">
            <span className={labelClass}>
              {lost ? "Когда пропал" : "Когда нашли"}
            </span>
            <div className="flex gap-2">
              {[
                { value: today, label: "Сегодня" },
                { value: yesterday, label: "Вчера" },
              ].map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setEventDate(o.value)}
                  className={`flex h-11 items-center justify-center rounded-[13px] px-4 text-sm font-semibold ${
                    eventDate === o.value
                      ? "bg-ink text-white"
                      : "border-[1.5px] border-line bg-surface text-ink-2"
                  }`}
                >
                  {o.label}
                </button>
              ))}
              <label className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[13px] border-[1.5px] border-line bg-surface px-3 text-sm font-semibold text-ink-2">
                <CalendarIcon size={17} />
                {eventDate !== today && eventDate !== yesterday
                  ? new Date(eventDate).toLocaleDateString("ru-RU")
                  : "Дата"}
                <input
                  type="date"
                  value={eventDate}
                  max={today}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="sr-only"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p className="text-pretty text-sm text-ink-2">
            {lost
              ? "Отметьте место, где питомца видели в последний раз."
              : "Отметьте место, где вы нашли животное."}
          </p>
          <LocationPicker value={position} onChange={setPosition} />
          <input
            value={landmarks}
            onChange={(e) => setLandmarks(e.target.value)}
            placeholder="Ориентиры: двор, магазин, остановка…"
            className={inputClass}
          />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <p className="text-pretty text-sm text-ink-2">
            Как с вами связаться? Достаточно одного контакта.
          </p>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+996 555 123 456"
            className={inputClass}
          />
          <input
            value={telegram}
            onChange={(e) => setTelegram(e.target.value)}
            placeholder="@username в Telegram"
            className={inputClass}
          />
          {/* Honeypot против ботов */}
          <input
            name="website"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />
        </div>
      )}

      {error && <p className="text-sm text-lost">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line-soft bg-paper">
        <div className="mx-auto flex max-w-lg gap-2.5 px-4 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))]">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex h-[54px] w-[54px] items-center justify-center rounded-2xl border-[1.5px] border-line text-ink-2"
              aria-label="Назад"
            >
              <ChevronLeftIcon size={20} />
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="flex h-[54px] flex-1 items-center justify-center gap-2 rounded-2xl bg-ink text-[15px] font-semibold text-white"
            >
              {step === 0 && photos.length === 0 ? "Пропустить фото" : "Далее"}
              <ChevronRightIcon size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={sending}
              className="flex h-[54px] flex-1 items-center justify-center rounded-2xl bg-ink text-[15px] font-semibold text-white disabled:opacity-50"
            >
              {sending ? "Публикуем…" : "Опубликовать"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
