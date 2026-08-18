"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, ChevronRightIcon } from "@/components/Icons";

export default function ResolveForm({
  reportId,
  name,
}: {
  reportId: string;
  name: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSending(true);
    setError(null);
    const res = await fetch(`/api/reports/${reportId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    setSending(false);
    if (res.ok) {
      router.refresh();
      setOpen(false);
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Не удалось закрыть заявку");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-[18px] bg-muted-tint p-4 text-left"
      >
        <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-surface text-found">
          <CheckIcon size={20} />
        </span>
        <span className="flex flex-1 flex-col gap-0.5">
          <span className="text-[14.5px] font-semibold">{name} уже дома?</span>
          <span className="text-[12.5px] text-ink-2">
            Закройте заявку своим кодом
          </span>
        </span>
        <ChevronRightIcon size={18} className="text-ink-3" />
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-[18px] border border-line-soft p-4">
      <p className="text-pretty text-sm text-ink-2">
        Введите секретный код, который вы получили при создании заявки:
      </p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="A7K2M9"
        maxLength={6}
        className="w-full rounded-[15px] border-[1.5px] border-line bg-surface px-4 py-3.5 text-center font-mono text-lg uppercase tracking-[0.2em] outline-none focus:border-ink"
      />
      {error && <p className="text-sm text-lost">{error}</p>}
      <div className="flex gap-2.5">
        <button
          onClick={submit}
          disabled={sending || code.length < 6}
          className="flex-1 rounded-[15px] bg-ink py-3.5 text-sm font-semibold text-on-accent disabled:opacity-50"
        >
          {sending ? "Проверяем…" : "Закрыть заявку"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-[15px] border-[1.5px] border-line px-5 py-3.5 text-sm font-semibold text-ink-2"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}
