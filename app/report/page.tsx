import Link from "next/link";
import ReportForm from "@/components/ReportForm";
import { ChevronLeftIcon } from "@/components/Icons";
import { ReportType } from "@/lib/types";

export const metadata = { title: "Сообщить о животном — Потеряшки" };

export default async function ReportPage({
  searchParams,
}: PageProps<"/report">) {
  const params = await searchParams;
  const type: ReportType = params.type === "found" ? "found" : "lost";
  const lost = type === "lost";

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-3.5">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/"
          className="flex h-[38px] w-[38px] items-center justify-center rounded-xl border-[1.5px] border-line bg-surface"
          aria-label="Назад к карте"
        >
          <ChevronLeftIcon size={18} />
        </Link>
        <div className="flex flex-1 flex-col">
          <h1 className="text-base font-semibold tracking-tight">
            {lost ? "Потерялся питомец" : "Нашёл животное"}
          </h1>
          <span className="text-[12.5px] text-ink-3">
            {lost ? "Появится на карте сразу" : "Хозяин сможет вас найти"}
          </span>
        </div>
        <span
          className={`flex h-[26px] shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ${
            lost ? "bg-lost-tint text-lost" : "bg-found-tint text-found"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${lost ? "bg-lost" : "bg-found"}`}
          />
          {lost ? "Пропажа" : "Находка"}
        </span>
      </div>

      <ReportForm initialType={type} />
    </main>
  );
}
