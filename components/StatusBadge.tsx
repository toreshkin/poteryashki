import { CheckIcon } from "@/components/Icons";
import { Report, REPORT_TYPE_LABELS } from "@/lib/types";

/** Статус читается не только цветом: точка плюс подпись. */
export default function StatusBadge({
  report,
  size = "md",
}: {
  report: Pick<Report, "report_type" | "status">;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "h-[22px] px-[9px] text-[11.5px]" : "h-[26px] px-[11px] text-[12.5px]";

  if (report.status === "resolved") {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-muted-tint font-semibold text-ink-2 ${pad}`}>
        <CheckIcon size={size === "sm" ? 11 : 13} />
        Уже дома
      </span>
    );
  }

  const lost = report.report_type === "lost";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${pad} ${
        lost ? "bg-lost-tint text-lost" : "bg-found-tint text-found"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${lost ? "bg-lost" : "bg-found"}`}
      />
      {REPORT_TYPE_LABELS[report.report_type]}
    </span>
  );
}
