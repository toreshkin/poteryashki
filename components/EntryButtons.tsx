import Link from "next/link";
import { PlusIcon } from "@/components/Icons";

/**
 * Две точки входа вместо одной кнопки: тип заявки выбирается здесь,
 * цветом, который дальше совпадает с меткой на карте.
 */
export default function EntryButtons({ onPaper = false }: { onPaper?: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-[500] flex gap-2.5 px-3.5 pb-[calc(1.125rem+env(safe-area-inset-bottom))] ${
        onPaper ? "pt-6" : "pt-3"
      }`}
      style={{
        background: onPaper
          ? "linear-gradient(to top, var(--paper) 62%, transparent)"
          : "linear-gradient(to top, var(--paper-fade) 55%, transparent)",
      }}
    >
      <Link
        href="/report?type=lost"
        className="pointer-events-auto flex h-[54px] flex-1 items-center justify-center gap-2 rounded-2xl bg-lost text-[15px] font-semibold text-on-accent shadow-[0_4px_16px_rgba(200,69,47,.3)] active:scale-[.98]"
      >
        <PlusIcon size={19} />
        Потерялся
      </Link>
      <Link
        href="/report?type=found"
        className="pointer-events-auto flex h-[54px] flex-1 items-center justify-center gap-2 rounded-2xl bg-found text-[15px] font-semibold text-on-accent shadow-[0_4px_16px_rgba(27,127,78,.3)] active:scale-[.98]"
      >
        <PlusIcon size={19} />
        Нашёл
      </Link>
    </div>
  );
}
