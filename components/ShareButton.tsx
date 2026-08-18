"use client";

import { useState } from "react";
import { ANIMAL_TYPE_LABELS, Report, REPORT_TYPE_LABELS } from "@/lib/types";
import { SITE_NAME } from "@/lib/config";
import { CheckIcon, ShareIcon } from "@/components/Icons";

export default function ShareButton({
  report,
  iconOnly = false,
}: {
  report: Report;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/pet/${report.id}`;
    const title = `${REPORT_TYPE_LABELS[report.report_type]}: ${
      report.name ?? ANIMAL_TYPE_LABELS[report.animal_type].toLowerCase()
    } — ${SITE_NAME}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text: title, url });
      } catch {
        // пользователь закрыл диалог
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (iconOnly) {
    return (
      <button
        onClick={share}
        aria-label="Поделиться"
        className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[15px] border-[1.5px] border-line bg-surface text-ink"
      >
        {copied ? <CheckIcon size={19} /> : <ShareIcon size={19} />}
      </button>
    );
  }

  return (
    <button
      onClick={share}
      className="flex flex-1 items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-line bg-surface py-3 text-[14.5px] font-semibold"
    >
      {copied ? <CheckIcon size={18} /> : <ShareIcon size={18} />}
      {copied ? "Ссылка скопирована" : "Поделиться"}
    </button>
  );
}
