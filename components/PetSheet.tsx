"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ANIMAL_TYPE_LABELS,
  COMPLAINT_REASONS,
  Report,
  REPORT_TYPE_LABELS,
} from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import ShareButton from "@/components/ShareButton";
import PhotoThumb from "@/components/PhotoThumb";
import SourceNotice from "@/components/SourceNotice";
import { useDialog } from "@/components/useDialog";
import {
  ChevronRightIcon,
  CloseIcon,
  ImageIcon,
  MapPinIcon,
  PhoneIcon,
  SendIcon,
} from "@/components/Icons";

// Тот же формат, что в lib/validation.ts: ссылку t.me строим только
// из безопасного значения, иначе в href уедет произвольная строка.
const TELEGRAM_USERNAME_REGEX = /^@?[A-Za-z0-9_]{5,32}$/;

export function ContactLinks({
  report,
  compact = false,
}: {
  report: Report;
  compact?: boolean;
}) {
  const phone = report.contact_phone;
  const telegram =
    report.contact_telegram &&
    TELEGRAM_USERNAME_REGEX.test(report.contact_telegram)
      ? report.contact_telegram.replace(/^@/, "")
      : null;
  return (
    <>
      {phone && (
        <a
          href={`tel:${phone}`}
          className="flex flex-1 items-center justify-center gap-2 rounded-[15px] bg-ink px-4 text-[15px] font-semibold text-white"
          style={{ height: compact ? 52 : 56 }}
        >
          <PhoneIcon size={19} />
          Позвонить
        </a>
      )}
      {telegram && (
        <a
          href={`https://t.me/${encodeURIComponent(telegram)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center justify-center gap-2 rounded-[15px] border-[1.5px] border-line bg-surface px-4 text-[14.5px] font-semibold ${
            phone ? "" : "flex-1"
          }`}
          style={{ height: compact ? 52 : 56 }}
        >
          <SendIcon size={18} />
          {phone ? "" : "Telegram"}
        </a>
      )}
      {phone && (
        <a
          href={`https://wa.me/${phone.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center rounded-[15px] border-[1.5px] border-line bg-surface px-4 text-[14.5px] font-semibold"
          style={{ height: compact ? 52 : 56 }}
        >
          WA
        </a>
      )}
    </>
  );
}

export function ReportBadges({ report }: { report: Report }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge report={report} />
      <span className="text-[12.5px] text-ink-3">
        {ANIMAL_TYPE_LABELS[report.animal_type]} ·{" "}
        {new Date(report.event_date).toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "long",
        })}
      </span>
    </div>
  );
}

function ComplaintForm({
  reportId,
  onDone,
}: {
  reportId: string;
  onDone: () => void;
}) {
  const [reason, setReason] = useState<string>(COMPLAINT_REASONS[0].value);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    setSending(true);
    const res = await fetch(`/api/reports/${reportId}/complain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setSending(false);
    if (res.ok) {
      setMessage("Жалоба отправлена. Спасибо!");
      setTimeout(onDone, 1500);
    } else {
      const data = await res.json().catch(() => null);
      setMessage(data?.error ?? "Не удалось отправить жалобу");
    }
  }

  if (message) return <p className="text-sm text-ink-2">{message}</p>;

  return (
    <div className="space-y-2.5 rounded-2xl border border-line-soft p-3.5">
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full rounded-[14px] border-[1.5px] border-line bg-surface px-3.5 py-3 text-sm"
      >
        {COMPLAINT_REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={sending}
          className="flex-1 rounded-[14px] bg-lost px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          Отправить жалобу
        </button>
        <button
          onClick={onDone}
          className="rounded-[14px] border-[1.5px] border-line px-4 py-3 text-sm font-semibold text-ink-2"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}

type Contacts = Pick<Report, "contact_phone" | "contact_telegram">;

export default function PetSheet({
  report,
  onClose,
}: {
  report: Report | null;
  onClose: () => void;
}) {
  const [complaining, setComplaining] = useState(false);
  // В массовой выдаче /api/reports контактов нет — дотягиваем их
  // по одной заявке при открытии шторки.
  const [contactsById, setContactsById] = useState<Record<string, Contacts>>({});
  const [contactsErrorById, setContactsErrorById] = useState<
    Record<string, string>
  >({});
  const dialogRef = useDialog<HTMLDivElement>(report != null, onClose);
  const reportId = report?.id;
  const needContacts =
    report != null &&
    report.contact_phone === undefined &&
    report.contact_telegram === undefined;

  useEffect(() => {
    if (!reportId || !needContacts) return;
    let cancelled = false;
    fetch(`/api/reports/${reportId}/contacts`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && data) {
          setContactsById((prev) => ({ ...prev, [reportId]: data }));
        } else {
          setContactsErrorById((prev) => ({
            ...prev,
            [reportId]:
              res.status === 429
                ? "Слишком много запросов, попробуйте позже"
                : "Не удалось загрузить контакты",
          }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setContactsErrorById((prev) => ({
            ...prev,
            [reportId]: "Не удалось загрузить контакты",
          }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reportId, needContacts]);

  if (!report) return null;

  const contacts = contactsById[report.id];
  const contactsError = contactsErrorById[report.id];
  const reportWithContacts = contacts ? { ...report, ...contacts } : report;
  const contactsLoading = needContacts && !contacts && !contactsError;

  const title =
    report.name ??
    `${ANIMAL_TYPE_LABELS[report.animal_type]} — ${REPORT_TYPE_LABELS[report.report_type].toLowerCase()}`;

  return (
    <>
      <div className="fixed inset-0 z-[1000] bg-ink/25" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-[1001] max-h-[82dvh] overflow-y-auto rounded-t-[26px] bg-surface px-[18px] pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-8px_32px_rgba(35,32,28,.18)] outline-none"
      >
        <div className="mx-auto mb-3.5 h-1 w-[42px] rounded-full bg-line" />

        <div className="space-y-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <ReportBadges report={report} />
              <h2 className="font-serif text-[25px] font-semibold leading-tight tracking-tight">
                {title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted-tint text-ink-2"
              aria-label="Закрыть"
            >
              <CloseIcon size={17} />
            </button>
          </div>

          {report.photos.length > 0 ? (
            <div className="flex gap-2.5 overflow-x-auto [scrollbar-width:none]">
              {report.photos.map((url) => (
                <PhotoThumb
                  key={url}
                  src={url}
                  alt="Фото животного"
                  className="h-[132px] w-[152px] shrink-0 rounded-2xl object-cover"
                />
              ))}
            </div>
          ) : (
            <div className="flex h-[110px] items-center justify-center rounded-2xl bg-muted-tint text-ink-3">
              <ImageIcon size={30} />
            </div>
          )}

          <p className="text-pretty text-[14.5px] leading-relaxed">
            {report.description}
          </p>

          {report.landmarks && (
            <div className="flex items-start gap-2 text-[13.5px] text-ink-2">
              <MapPinIcon size={16} className="mt-0.5" />
              <span className="text-pretty">{report.landmarks}</span>
            </div>
          )}

          <SourceNotice report={report} />

          <div className="flex gap-2.5">
            {contactsLoading ? (
              <div
                className="flex flex-1 items-center justify-center rounded-[15px] bg-muted-tint text-[14px] text-ink-3"
                style={{ height: 52 }}
              >
                Загрузка контактов…
              </div>
            ) : contactsError ? (
              <div
                className="flex flex-1 items-center justify-center rounded-[15px] bg-muted-tint px-4 text-center text-[13.5px] text-ink-3"
                style={{ height: 52 }}
              >
                {contactsError}
              </div>
            ) : (
              <ContactLinks report={reportWithContacts} compact />
            )}
            <ShareButton report={report} iconOnly />
          </div>

          <div className="flex items-center justify-between">
            <Link
              href={`/pet/${report.id}`}
              className="flex items-center gap-1 text-sm font-semibold text-ink"
            >
              Вся информация
              <ChevronRightIcon size={16} />
            </Link>
            {!complaining && (
              <button
                onClick={() => setComplaining(true)}
                className="p-2 text-sm text-ink-3"
              >
                Пожаловаться
              </button>
            )}
          </div>

          {complaining && (
            <ComplaintForm
              reportId={report.id}
              onDone={() => setComplaining(false)}
            />
          )}
        </div>
      </div>
    </>
  );
}
