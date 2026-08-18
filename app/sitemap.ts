import type { MetadataRoute } from "next";
import { getServiceClient } from "@/lib/supabase";

// Sitemap переживает недоступность БД: тогда в нём только статические страницы.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
  if (!siteUrl) return [];

  const entries: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "hourly", priority: 1 },
    { url: `${siteUrl}/feed`, changeFrequency: "hourly", priority: 0.8 },
  ];

  try {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from("reports")
      .select("id, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1000);
    for (const report of data ?? []) {
      entries.push({
        url: `${siteUrl}/pet/${report.id}`,
        lastModified: report.created_at,
        changeFrequency: "daily",
        priority: 0.6,
      });
    }
  } catch (err) {
    console.error("sitemap:", err);
  }

  return entries;
}
