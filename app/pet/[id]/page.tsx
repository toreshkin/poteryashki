import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceClient } from "@/lib/supabase";
import { ANIMAL_TYPE_LABELS, Report, REPORT_TYPE_LABELS } from "@/lib/types";
import { SITE_NAME } from "@/lib/config";
import { ContactLinks, ReportBadges } from "@/components/PetSheet";
import ResolveForm from "@/components/ResolveForm";
import ShareButton from "@/components/ShareButton";
import Sightings from "@/components/Sightings";
import SimilarReports from "@/components/SimilarReports";
import { distanceKm } from "@/lib/geo";
import { ChevronLeftIcon, ImageIcon, MapPinIcon } from "@/components/Icons";

export const dynamic = "force-dynamic";

const PUBLIC_FIELDS =
  "id, created_at, report_type, animal_type, name, description, landmarks, lat, lng, photos, contact_phone, contact_telegram, status, event_date";

async function getReport(id: string): Promise<Report | null> {
  try {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from("reports")
      .select(PUBLIC_FIELDS)
      .eq("id", id)
      .neq("status", "hidden")
      .maybeSingle();
    return (data as Report) ?? null;
  } catch {
    return null;
  }
}

async function getSimilarNearby(
  report: Report
): Promise<(Report & { distance: number })[]> {
  try {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from("reports")
      .select(PUBLIC_FIELDS)
      .eq("status", "active")
      .eq("report_type", report.report_type === "lost" ? "found" : "lost")
      .eq("animal_type", report.animal_type)
      .limit(200);
    return ((data as Report[]) ?? [])
      .map((r) => ({
        ...r,
        distance: distanceKm(report.lat, report.lng, r.lat, r.lng),
      }))
      .filter((r) => r.distance <= 3)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/pet/[id]">): Promise<Metadata> {
  const { id } = await params;
  const report = await getReport(id);
  if (!report) return { title: SITE_NAME };

  const title = `${REPORT_TYPE_LABELS[report.report_type]}: ${
    report.name ?? ANIMAL_TYPE_LABELS[report.animal_type]
  } — ${SITE_NAME}`;
  return {
    title,
    description: report.description.slice(0, 160),
    openGraph: {
      title,
      description: report.description.slice(0, 160),
      images: report.photos.length > 0 ? [report.photos[0]] : undefined,
    },
  };
}

export default async function PetPage({ params }: PageProps<"/pet/[id]">) {
  const { id } = await params;
  const report = await getReport(id);
  if (!report) notFound();
  const similar = report.status === "active" ? await getSimilarNearby(report) : [];
  const title = report.name ?? ANIMAL_TYPE_LABELS[report.animal_type];

  return (
    <main className="mx-auto w-full max-w-lg pb-10">
      <div
        className="relative w-full overflow-hidden bg-muted-tint"
        style={{ height: report.photos.length > 0 ? 300 : 150 }}
      >
        {report.photos.length > 0 ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={report.photos[0]}
              alt={`Фото: ${title}`}
              className="h-full w-full object-cover"
            />
            {report.photos.length > 1 && (
              <div className="absolute inset-x-0 bottom-0 flex gap-2.5 overflow-x-auto bg-gradient-to-t from-ink/40 to-transparent p-3 [scrollbar-width:none]">
                {report.photos.slice(1).map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={url}
                    src={url}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-xl border-2 border-white/80 object-cover"
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-ink-3">
            <ImageIcon size={48} />
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink/40 to-transparent" />
        <div className="absolute inset-x-3.5 top-3.5 flex items-center justify-between">
          <Link
            href="/"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-white/95 text-ink"
            aria-label="Назад к карте"
          >
            <ChevronLeftIcon size={18} />
          </Link>
          <ShareButton report={report} iconOnly />
        </div>
      </div>

      <div className="-mt-6 space-y-6 rounded-t-[24px] bg-paper px-4 pt-5">
        <div className="space-y-2.5">
          <ReportBadges report={report} />
          <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight">
            {title}
          </h1>
          <p className="text-pretty text-[15.5px] leading-relaxed">
            {report.description}
          </p>
          {report.landmarks && (
            <div className="flex items-start gap-2 text-sm text-ink-2">
              <MapPinIcon size={17} className="mt-0.5" />
              <span className="text-pretty">{report.landmarks}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2.5">
          <ContactLinks report={report} />
        </div>

        <SimilarReports reportId={report.id} similar={similar} />

        <Sightings report={report} />

        {report.status === "active" && (
          <ResolveForm reportId={report.id} name={title} />
        )}
      </div>
    </main>
  );
}
