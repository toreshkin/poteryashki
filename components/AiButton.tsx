"use client";

import { SparkleIcon } from "@/components/Icons";

export default function AiButton({
  onClick,
  busy,
  children,
  className = "",
}: {
  onClick: () => void;
  busy: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`flex items-center justify-center gap-2 rounded-[14px] bg-ai-tint px-4 py-3 text-[14.5px] font-semibold text-ai disabled:opacity-60 ${className}`}
    >
      <SparkleIcon size={16} />
      {busy ? "ИИ думает…" : children}
    </button>
  );
}
