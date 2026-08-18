"use client";

import { CSSProperties, useState } from "react";
import { thumbUrl } from "@/lib/photos";

// Картинка-миниатюра с fallback на оригинал: у старых заявок
// (и при сбое генерации) файла _thumb может не быть.
export default function PhotoThumb({
  src,
  alt,
  className,
  style,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
}) {
  const [failed, setFailed] = useState(false);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={failed ? src : thumbUrl(src)}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
