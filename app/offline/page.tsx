import { PawIcon } from "@/components/Icons";
import { SITE_NAME } from "@/lib/config";

export const metadata = { title: `Нет сети — ${SITE_NAME}` };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted-tint text-ink-3">
        <PawIcon size={32} />
      </span>
      <h1 className="font-serif text-2xl font-semibold tracking-tight">
        Нет подключения
      </h1>
      <p className="text-pretty text-ink-2">
        Карта заявок обновляется только онлайн. Проверьте связь и обновите
        страницу — данные подтянутся сами.
      </p>
    </main>
  );
}
