import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — карта потерявшихся животных`,
    short_name: SITE_NAME,
    description:
      "Карта потерявшихся и найденных животных в Бишкеке: сообщите о пропаже или находке, отметьте встречу.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf8f5",
    theme_color: "#faf8f5",
    lang: "ru",
    dir: "ltr",
    categories: ["social", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Сообщить о пропаже",
        short_name: "Потерялся",
        url: "/report?type=lost",
      },
      {
        name: "Сообщить о находке",
        short_name: "Нашёл",
        url: "/report?type=found",
      },
      { name: "Лента заявок", short_name: "Лента", url: "/feed" },
    ],
  };
}
