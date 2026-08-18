"use client";

import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Report } from "@/lib/types";
import { animalIconMarkup, EYE_MARKUP } from "@/components/Icons";
import type { Sighting } from "@/components/Sightings";

const eyeIcon = L.divIcon({
  className: "",
  html: `<div class="pin pin--sighting" style="width:30px;height:30px">${EYE_MARKUP}</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

export default function SightingsMap({
  report,
  sightings,
}: {
  report: Report;
  sightings: Sighting[];
}) {
  const reportIcon = L.divIcon({
    className: "",
    html: `<div class="pin pin--${report.report_type}" style="width:38px;height:38px">${animalIconMarkup(report.animal_type, 19)}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });

  return (
    <div className="h-[190px] w-full overflow-hidden rounded-[18px] border border-line-soft">
      <MapContainer
        center={[report.lat, report.lng]}
        zoom={14}
        className="h-full w-full"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[report.lat, report.lng]} icon={reportIcon} />
        {sightings.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lng]} icon={eyeIcon} />
        ))}
      </MapContainer>
    </div>
  );
}
