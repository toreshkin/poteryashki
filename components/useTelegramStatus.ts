"use client";

import { useEffect, useState } from "react";
import { getTelegramWebApp } from "@/lib/telegram";

/**
 * «Мои заявки» доступны, когда приложение открыто внутри Telegram
 * и на сервере настроен бот (TELEGRAM_BOT_TOKEN). Иначе разделы скрыты —
 * тот же паттерн, что useAiStatus при AI_PROVIDER=off.
 */
export function useTelegramStatus(): { available: boolean } {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!getTelegramWebApp()) return;
    fetch("/api/telegram/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { enabled?: boolean } | null) => {
        if (data?.enabled) setAvailable(true);
      })
      .catch(() => {});
  }, []);

  return { available };
}
