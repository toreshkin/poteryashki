"use client";

import { useEffect, useState } from "react";

/**
 * Координаты пользователя для показа расстояния до заявки.
 * Разрешение не запрашиваем сами: браузер показал бы окно на пустом месте.
 * Спрашиваем только если человек уже разрешал геолокацию этому сайту —
 * тогда permissions вернёт "granted" и окна не будет.
 */
export function useNearby(): [number, number] | null {
  const [position, setPosition] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    let cancelled = false;

    function locate() {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          if (!cancelled) setPosition([p.coords.latitude, p.coords.longitude]);
        },
        () => {},
        { maximumAge: 5 * 60 * 1000, timeout: 8000 }
      );
    }

    // Не во всех браузерах есть Permissions API — тогда просто не показываем
    // расстояние, чтобы не выпрашивать доступ у случайного посетителя.
    navigator.permissions
      ?.query({ name: "geolocation" as PermissionName })
      .then((status) => {
        if (!cancelled && status.state === "granted") locate();
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return position;
}
