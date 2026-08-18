"use client";

// Интеграция с Telegram WebApp (Mini App).
// Скрипт telegram-web-app.js подключается в layout и создаёт window.Telegram.WebApp
// только когда сайт открыт внутри Telegram.

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  colorScheme: "light" | "dark";
  /** Вне Telegram скрипт всё равно создаёт объект, но platform = "unknown". */
  platform?: string;
  initData?: string;
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

/**
 * Сырая строка initData для передачи на сервер: подпись проверяется
 * в lib/telegram-auth.ts, данным из initDataUnsafe сервер не доверяет.
 */
export function getInitData(): string | null {
  return getTelegramWebApp()?.initData || null;
}

/** Инициализация при открытии внутри Telegram; возвращает @username, если есть. */
export function initTelegram(): string | null {
  const tg = getTelegramWebApp();
  if (!tg) return null;
  tg.ready();
  tg.expand();
  // Тема Telegram может отличаться от системной — следуем за клиентом,
  // иначе приложение вспыхивает белым внутри тёмного мессенджера.
  // Только внутри настоящего Telegram: в обычном браузере скрипт тоже
  // создаёт WebApp и всегда рапортует светлую тему, перебивая системную.
  const insideTelegram = Boolean(tg.platform && tg.platform !== "unknown");
  if (insideTelegram && (tg.colorScheme === "dark" || tg.colorScheme === "light")) {
    document.documentElement.dataset.theme = tg.colorScheme;
  }
  const username = tg.initDataUnsafe?.user?.username;
  return username ? `@${username}` : null;
}
