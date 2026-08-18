"use client";

import dynamic from "next/dynamic";

// Единственная точка ленивой загрузки LocationPicker:
// Leaflet ломается на сервере, поэтому ssr: false.
const LocationPickerLazy = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center rounded-2xl border border-line text-ink-3">
      Загрузка карты…
    </div>
  ),
});

export default LocationPickerLazy;
