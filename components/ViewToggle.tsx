"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListIcon, MapPinIcon, PawIcon } from "@/components/Icons";
import { useTelegramStatus } from "@/components/useTelegramStatus";

export default function ViewToggle({ floating = false }: { floating?: boolean }) {
  const pathname = usePathname();
  const isFeed = pathname === "/feed";
  const isMy = pathname === "/my";
  const telegram = useTelegramStatus();
  const active = "bg-ink text-on-accent";
  const idle = "text-ink-2";

  return (
    <div
      className={`flex shrink-0 items-center gap-[3px] rounded-full p-[3px] ${
        floating ? "bg-surface-glass shadow-[0_2px_10px_rgba(35,32,28,.12)]" : "bg-muted-tint"
      }`}
    >
      <Link
        href="/"
        className={`flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-semibold ${
          isFeed || isMy ? idle : active
        }`}
      >
        <MapPinIcon size={15} />
        Карта
      </Link>
      <Link
        href="/feed"
        className={`flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-semibold ${
          isFeed ? active : idle
        }`}
      >
        <ListIcon size={15} />
        Лента
      </Link>
      {telegram.available && (
        <Link
          href="/my"
          className={`flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-semibold ${
            isMy ? active : idle
          }`}
        >
          <PawIcon size={15} />
          Мои
        </Link>
      )}
    </div>
  );
}
