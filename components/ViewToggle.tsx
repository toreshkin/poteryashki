"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListIcon, MapPinIcon } from "@/components/Icons";

export default function ViewToggle({ floating = false }: { floating?: boolean }) {
  const pathname = usePathname();
  const isFeed = pathname === "/feed";
  const active = "bg-ink text-white";
  const idle = "text-ink-2";

  return (
    <div
      className={`flex items-center gap-[3px] rounded-full p-[3px] ${
        floating ? "bg-white/95 shadow-[0_2px_10px_rgba(35,32,28,.12)]" : "bg-muted-tint"
      }`}
    >
      <Link
        href="/"
        className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${
          isFeed ? idle : active
        }`}
      >
        <MapPinIcon size={15} />
        Карта
      </Link>
      <Link
        href="/feed"
        className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${
          isFeed ? active : idle
        }`}
      >
        <ListIcon size={15} />
        Лента
      </Link>
    </div>
  );
}
