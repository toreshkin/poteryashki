"use client";

import { useEffect, useState } from "react";

export interface AiStatus {
  enabled: boolean;
  vision: boolean;
}

/** Один запрос за загрузку страницы; при ошибке считаем, что ИИ выключен. */
export function useAiStatus(): AiStatus {
  const [status, setStatus] = useState<AiStatus>({
    enabled: false,
    vision: false,
  });

  useEffect(() => {
    fetch("/api/ai/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AiStatus | null) => data && setStatus(data))
      .catch(() => {});
  }, []);

  return status;
}
