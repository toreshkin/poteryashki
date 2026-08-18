import { Report } from "@/lib/types";
import { FlagIcon } from "@/components/Icons";

/**
 * Заявка перенесена из городского паблика: контакты чужие и непроверенные.
 * Предупреждение обязательно — в теме потерянных животных водятся мошенники.
 */
export default function SourceNotice({ report }: { report: Report }) {
  if (report.source !== "import") return null;
  return (
    <div className="flex items-start gap-2.5 rounded-2xl bg-muted-tint px-3.5 py-3 text-[13px] leading-snug text-ink-2">
      <FlagIcon size={16} className="mt-0.5 shrink-0" />
      <span className="text-pretty">
        Объявление перенесено из городского паблика — контакты не проверены.
        Не переводите деньги вперёд и встречайтесь в людном месте.
      </span>
    </div>
  );
}
