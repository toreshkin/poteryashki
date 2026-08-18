"use client";

// Интеграция с Telegram WebApp (Mini App).
// Скрипт telegram-web-app.js подключается в layout и создаёт window.Telegram.WebApp
// только когда сайт открыт внутри Telegram.

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  colorScheme: "light" | "dark";
  initDataUnsafe?: {
    user?: { username?: string; first_name?: string };
  };
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  const tg = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } })
    .Telegram?.WebApp;
  return tg ?? null;
}

/** Инициализация при открытии внутри Telegram; возвращает @username, если есть. */
export function initTelegram(): string | null {
  const tg = getTelegramWebApp();
  if (!tg) return null;
  tg.ready();
  tg.expand();
  const username = tg.initDataUnsafe?.user?.username;
  return username ? `@${username}` : null;
}
