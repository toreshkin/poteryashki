import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Значок Next.js в углу мешает смотреть макет на телефоне.
  // В production-сборке его и так нет.
  devIndicators: false,
};

export default nextConfig;
