// Штриховые иконки 24×24 вместо эмодзи: одинаково выглядят на всех платформах
// и перекрашиваются через currentColor.

interface IconProps {
  size?: number;
  className?: string;
}

function Stroke({
  size = 20,
  className,
  width = 1.6,
  children,
}: IconProps & { width?: number; children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: "none" }}
    >
      {children}
    </svg>
  );
}

function Solid({ size = 20, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      aria-hidden="true"
      style={{ flex: "none" }}
    >
      {children}
    </svg>
  );
}

export const PawIcon = (p: IconProps) => (
  <Solid {...p}>
    <ellipse cx="6.6" cy="9" rx="2.1" ry="2.7" />
    <ellipse cx="11.4" cy="6.9" rx="2.2" ry="2.9" />
    <ellipse cx="16.6" cy="9.4" rx="2.1" ry="2.7" />
    <path d="M11.6 12.2c-3.1 0-5.4 2.2-5.4 4.5 0 1.7 1.3 2.8 3 2.8 1 0 1.6-.4 2.4-.4s1.4.4 2.4.4c1.7 0 3-1.1 3-2.8 0-2.3-2.3-4.5-5.4-4.5Z" />
  </Solid>
);

export const CatIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M5.2 6.4 7.6 9.9a6.6 6.6 0 0 1 8.8 0l2.4-3.5c.5-.7 1.6-.3 1.6.5v9.3a5.2 5.2 0 0 1-5.2 5.2H8.8a5.2 5.2 0 0 1-5.2-5.2V6.9c0-.8 1.1-1.2 1.6-.5Z" />
  </Solid>
);

export const OtherAnimalIcon = (p: IconProps) => (
  <Stroke {...p} width={1.5}>
    <path d="M12 4.5c2.4 0 4.4 1.6 5 3.8l2.4 1.4-2 1.3c-.3 3.3-2.6 5.6-5.4 5.6s-5.1-2.3-5.4-5.6l-2-1.3L7 8.3c.6-2.2 2.6-3.8 5-3.8Z" />
    <path d="M12 16.6V21" />
  </Stroke>
);

export const MapPinIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.4" />
  </Stroke>
);

export const ListIcon = (p: IconProps) => (
  <Stroke {...p}>
    <rect x="3.5" y="5" width="17" height="5.5" rx="2" />
    <rect x="3.5" y="13.5" width="17" height="5.5" rx="2" />
  </Stroke>
);

export const SearchIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="11" cy="11" r="6.4" />
    <path d="m15.8 15.8 4.2 4.2" />
  </Stroke>
);

export const FiltersIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 8h7M15.5 8H20M4 16h3.5M12 16h8" />
    <circle cx="13" cy="8" r="2.2" />
    <circle cx="9.7" cy="16" r="2.2" />
  </Stroke>
);

export const PlusIcon = (p: IconProps) => (
  <Stroke {...p} width={1.9}>
    <path d="M12 5.5v13M5.5 12h13" />
  </Stroke>
);

export const CloseIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </Stroke>
);

export const CheckIcon = (p: IconProps) => (
  <Stroke {...p} width={2.2}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Stroke>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M9.5 5.5 16 12l-6.5 6.5" />
  </Stroke>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M14.5 5.5 8 12l6.5 6.5" />
  </Stroke>
);

export const PhoneIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M6.6 3.6h2.9l1.5 3.9-2 1.5a12 12 0 0 0 6 6l1.5-2 3.9 1.5v2.9a2 2 0 0 1-2.2 2A17 17 0 0 1 4.6 5.8a2 2 0 0 1 2-2.2Z" />
  </Stroke>
);

export const SendIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M21 4 3 11l6.4 2.6L21 4Zm0 0-8.4 16-3.2-6.4" />
  </Stroke>
);

export const ShareIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M12 15.5V4M12 4 8.6 7.4M12 4l3.4 3.4" />
    <path d="M5 13.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4.5" />
  </Stroke>
);

export const EyeIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M2.6 12S6.2 5.8 12 5.8 21.4 12 21.4 12 17.8 18.2 12 18.2 2.6 12 2.6 12Z" />
    <circle cx="12" cy="12" r="2.9" />
  </Stroke>
);

export const EyeOffIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 4l16 16" />
    <path d="M9.9 5.9A9.5 9.5 0 0 1 12 5.6c6 0 9.4 6.4 9.4 6.4a17 17 0 0 1-3.2 4M6.6 7.6A17 17 0 0 0 2.6 12S6 18.4 12 18.4c1 0 1.9-.2 2.7-.5" />
  </Stroke>
);

export const ImageIcon = (p: IconProps) => (
  <Stroke {...p} width={1.4}>
    <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
    <circle cx="8.5" cy="10" r="1.7" />
    <path d="m4 17 5-4.5 4.5 4 3-2.5L20 17" />
  </Stroke>
);

export const CameraIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
    <circle cx="12" cy="13" r="3.4" />
  </Stroke>
);

export const FlagIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M6 21V4h11l-2.4 4L17 12H6" />
  </Stroke>
);

export const ShieldIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M12 3.2 5 6.1v5.7c0 4.2 2.9 7.6 7 9.1 4.1-1.5 7-4.9 7-9.1V6.1l-7-2.9Z" />
  </Stroke>
);

export const TrashIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4.6 7h14.8M9.6 7V5h4.8v2M6.6 7l.8 12.2A1.8 1.8 0 0 0 9.2 21h5.6a1.8 1.8 0 0 0 1.8-1.8L17.4 7" />
  </Stroke>
);

export const CalendarIcon = (p: IconProps) => (
  <Stroke {...p}>
    <rect x="3.5" y="5.5" width="17" height="15" rx="3" />
    <path d="M3.5 10h17M8 3.5v4M16 3.5v4" />
  </Stroke>
);

export const LocateIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 3v3.2M12 17.8V21M21 12h-3.2M6.2 12H3" />
  </Stroke>
);

export const SparkleIcon = (p: IconProps) => (
  <Solid {...p}>
    <path d="M11.4 3.4 13 8.4l5 1.6-5 1.6-1.6 5-1.6-5-5-1.6 5-1.6 1.6-5Z" />
    <path d="M18.4 15.2l.8 2.4 2.4.8-2.4.8-.8 2.4-.8-2.4-2.4-.8 2.4-.8.8-2.4Z" />
  </Solid>
);

/** Иконка по виду животного. */
export function AnimalIcon({
  animal,
  size,
  className,
}: IconProps & { animal: "dog" | "cat" | "other" }) {
  if (animal === "cat") return <CatIcon size={size} className={className} />;
  if (animal === "other") return <OtherAnimalIcon size={size} className={className} />;
  return <PawIcon size={size} className={className} />;
}

/** Разметка иконки животного строкой — для маркеров Leaflet. */
export function animalIconMarkup(
  animal: "dog" | "cat" | "other",
  size: number
): string {
  const open = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"`;
  if (animal === "cat") {
    return `${open} fill="currentColor"><path d="M5.2 6.4 7.6 9.9a6.6 6.6 0 0 1 8.8 0l2.4-3.5c.5-.7 1.6-.3 1.6.5v9.3a5.2 5.2 0 0 1-5.2 5.2H8.8a5.2 5.2 0 0 1-5.2-5.2V6.9c0-.8 1.1-1.2 1.6-.5Z"/></svg>`;
  }
  if (animal === "other") {
    return `${open} fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4.5c2.4 0 4.4 1.6 5 3.8l2.4 1.4-2 1.3c-.3 3.3-2.6 5.6-5.4 5.6s-5.1-2.3-5.4-5.6l-2-1.3L7 8.3c.6-2.2 2.6-3.8 5-3.8Z"/><path d="M12 16.6V21"/></svg>`;
  }
  return `${open} fill="currentColor"><ellipse cx="6.6" cy="9" rx="2.1" ry="2.7"/><ellipse cx="11.4" cy="6.9" rx="2.2" ry="2.9"/><ellipse cx="16.6" cy="9.4" rx="2.1" ry="2.7"/><path d="M11.6 12.2c-3.1 0-5.4 2.2-5.4 4.5 0 1.7 1.3 2.8 3 2.8 1 0 1.6-.4 2.4-.4s1.4.4 2.4.4c1.7 0 3-1.1 3-2.8 0-2.3-2.3-4.5-5.4-4.5Z"/></svg>`;
}

export const CHECK_MARKUP = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7"/></svg>`;

export const EYE_MARKUP = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.6 12S6.2 5.8 12 5.8 21.4 12 21.4 12 17.8 18.2 12 18.2 2.6 12 2.6 12Z"/><circle cx="12" cy="12" r="2.9"/></svg>`;

export const PIN_MARKUP = `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.4"/></svg>`;
