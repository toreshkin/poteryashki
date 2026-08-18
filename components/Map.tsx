"use client";

import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CITY_CENTER, CITY_ZOOM } from "@/lib/config";
import { Report } from "@/lib/types";
import { animalIconMarkup, CHECK_MARKUP } from "@/components/Icons";

function markerIcon(report: Report): L.DivIcon {
  const kind =
    report.status === "resolved"
      ? "resolved"
      : report.report_type === "lost"
        ? "lost"
        : "found";
  const size = report.status === "resolved" ? 36 : 42;
  const inner =
    report.status === "resolved"
      ? CHECK_MARKUP
      : animalIconMarkup(report.animal_type, 21);
  return L.divIcon({
    className: "",
    html: `<div class="pin pin--${kind}" style="width:${size}px;height:${size}px">${inner}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Кнопка «моё местоположение» — управляет картой изнутри. */
function LocateControl() {
  const map = useMap();
  useEffect(() => {
    const button = L.DomUtil.create("button");
    button.type = "button";
    button.setAttribute("aria-label", "Моё местоположение");
    button.className =
      "flex h-11 w-11 items-center justify-center rounded-[14px] bg-white text-ink shadow-[0_3px_14px_rgba(35,32,28,.18)]";
    button.innerHTML = `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 3v3.2M12 17.8V21M21 12h-3.2M6.2 12H3"/></svg>`;

    const control = new L.Control({ position: "bottomright" });
    control.onAdd = () => {
      L.DomEvent.disableClickPropagation(button);
      L.DomEvent.on(button, "click", () => {
        map.locate({ setView: true, maxZoom: 15 });
      });
      return button;
    };
    control.addTo(map);
    return () => {
      control.remove();
    };
  }, [map]);
  return null;
}

export default function Map({
  reports,
  onSelect,
}: {
  reports: Report[];
  onSelect: (report: Report) => void;
}) {
  return (
    <MapContainer
      center={CITY_CENTER}
      zoom={CITY_ZOOM}
      className="h-full w-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocateControl />
      {reports.map((report) => (
        <Marker
          key={report.id}
          position={[report.lat, report.lng]}
          icon={markerIcon(report)}
          eventHandlers={{ click: () => onSelect(report) }}
        />
      ))}
    </MapContainer>
  );
}
