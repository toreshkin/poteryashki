"use client";

import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { CITY_CENTER, CITY_ZOOM } from "@/lib/config";
import { Report } from "@/lib/types";
import { animalIconMarkup, CHECK_MARKUP } from "@/components/Icons";
import { daysSince, FRESH_DAYS } from "@/lib/filter";

function markerIcon(report: Report): L.DivIcon {
  const resolved = report.status === "resolved";
  const kind = resolved
    ? "resolved"
    : report.report_type === "lost"
      ? "lost"
      : "found";

  // Возраст заявки виден без клика: свежая крупнее и с ореолом,
  // давняя мельче и приглушённее — искать нужно прежде всего свежее.
  const days = daysSince(report.event_date);
  const fresh = !resolved && days <= FRESH_DAYS;
  const stale = !resolved && days > 30;
  const size = resolved || stale ? 36 : 42;
  const age = fresh ? " pin--fresh" : stale ? " pin--faded" : "";

  const inner = resolved
    ? CHECK_MARKUP
    : animalIconMarkup(report.animal_type, size === 42 ? 21 : 18);
  return L.divIcon({
    className: "",
    html: `<div class="pin pin--${kind}${age}" style="width:${size}px;height:${size}px">${inner}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/**
 * Маркеры через кластер-группу: при сотнях заявок отдельные пины
 * превращают карту в кашу и тормозят на телефоне.
 */
function ClusterMarkers({
  reports,
  onSelect,
}: {
  reports: Report[];
  onSelect: (report: Report) => void;
}) {
  const map = useMap();
  useEffect(() => {
    const group = L.markerClusterGroup({
      maxClusterRadius: 48,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) =>
        L.divIcon({
          className: "",
          html: `<div class="pin pin--cluster" style="width:44px;height:44px">${cluster.getChildCount()}</div>`,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        }),
    });
    for (const report of reports) {
      const marker = L.marker([report.lat, report.lng], {
        icon: markerIcon(report),
      });
      marker.on("click", () => onSelect(report));
      group.addLayer(marker);
    }
    map.addLayer(group);
    return () => {
      map.removeLayer(group);
    };
  }, [map, reports, onSelect]);
  return null;
}

/** Кнопка «моё местоположение» — управляет картой изнутри. */
function LocateControl() {
  const map = useMap();
  useEffect(() => {
    const button = L.DomUtil.create("button");
    button.type = "button";
    button.setAttribute("aria-label", "Моё местоположение");
    button.className =
      "flex h-11 w-11 items-center justify-center rounded-[14px] bg-surface text-ink shadow-[0_3px_14px_rgba(35,32,28,.18)]";
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
      <ClusterMarkers reports={reports} onSelect={onSelect} />
    </MapContainer>
  );
}
