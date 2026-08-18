import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Golos_Text, Literata } from "next/font/google";
import "./globals.css";
import { SITE_NAME } from "@/lib/config";
import ServiceWorker from "@/components/ServiceWorker";

const golos = Golos_Text({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-golos",
  display: "swap",
});

const literata = Literata({
  subsets: ["cyrillic", "latin"],
  weight: ["600"],
  variable: "--font-literata",
  display: "swap",
});

export const metadata: Metadata = {
  title: SITE_NAME,
  description:
    "Карта потерявшихся и найденных животных в Бишкеке. Сообщите о пропаже питомца или о найденном животном.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#faf8f5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // suppressHydrationWarning: telegram-web-app.js добавляет на <html>
  // свои CSS-переменные до гидратации React
  return (
    <html
      lang="ru"
      className={`${golos.variable} ${literata.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
