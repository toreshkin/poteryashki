import Link from "next/link";
import { PawIcon } from "@/components/Icons";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted-tint text-ink-3">
        <PawIcon size={32} />
      </span>
      <h1 className="font-serif text-2xl font-semibold tracking-tight">
        Страница не найдена
      </h1>
      <p className="text-balance text-sm text-ink-2">
        Возможно, заявка была закрыта или удалена.
      </p>
      <Link
        href="/"
        className="rounded-[15px] bg-ink px-6 py-3.5 text-sm font-semibold text-on-accent"
      >
        К карте
      </Link>
    </main>
  );
}
