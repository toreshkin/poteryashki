import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Значок Next.js в углу мешает смотреть макет на телефоне.
  // В production-сборке его и так нет.
  devIndicators: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Не X-Frame-Options: DENY — приложение открывается во фрейме Telegram.
          // script-src сознательно не задаём: inline-скрипты Next и telegram-web-app.js.
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
