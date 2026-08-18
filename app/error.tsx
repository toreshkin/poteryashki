"use client";

import { PawIcon } from "@/components/Icons";

// Глобальный экран ошибки: без него необработанное исключение
// в серверном компоненте показывает технический экран Next.
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted-tint text-ink-3">
        <PawIcon size={32} />
      </span>
      <h1 className="font-serif text-2xl font-semibold tracking-tight">
        Что-то пошло не так
      </h1>
      <p className="text-balance text-sm text-ink-2">
        Не получилось показать страницу. Попробуйте ещё раз — обычно помогает.
      </p>
      <button
        onClick={reset}
        className="rounded-[15px] bg-ink px-6 py-3.5 text-sm font-semibold text-white"
      >
        Попробовать снова
      </button>
    </main>
  );
}
