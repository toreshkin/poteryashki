"use client";

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import { useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CITY_CENTER, CITY_ZOOM } from "@/lib/config";
import { PIN_MARKUP } from "@/components/Icons";

const pinIcon = L.divIcon({
  className: "",
  html: `<div class="pin pin--picker" style="width:38px;height:38px">${PIN_MARKUP}</div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function GeolocateButton({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            onPick(latitude, longitude);
            map.setView([latitude, longitude], 15);
            setBusy(false);
          },
          () => setBusy(false),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }}
      className="absolute bottom-3 right-3 z-[500] rounded-[14px] bg-surface px-4 py-2.5 text-sm font-semibold shadow-[0_3px_14px_rgba(35,32,28,.18)] disabled:opacity-50"
    >
      {busy ? "Ищем…" : "Моё местоположение"}
    </button>
  );
}

export default function LocationPicker({
  value,
  onChange,
}: {
  value: [number, number] | null;
  onChange: (pos: [number, number]) => void;
}) {
  return (
    <div className="relative h-72 w-full overflow-hidden rounded-2xl border border-line">
      <MapContainer
        center={value ?? CITY_CENTER}
        zoom={value ? 15 : CITY_ZOOM}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={(lat, lng) => onChange([lat, lng])} />
        <GeolocateButton onPick={(lat, lng) => onChange([lat, lng])} />
        {value && <Marker position={value} icon={pinIcon} />}
      </MapContainer>
    </div>
  );
}
