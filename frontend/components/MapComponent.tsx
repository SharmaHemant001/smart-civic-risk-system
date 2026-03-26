"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  ZoomControl,
  Polyline,
} from "react-leaflet";
import MarkerPopup from "./MarkerPopup";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { Fenix } from "next/font/google";

type Issue = {
  _id: string;
  latitude: number;
  longitude: number;
  riskScore: string;
};

type Props = {
  issues: Issue[];
  route?: any;
  routeIssues?: any[];
  selectedIssue?: any; // ✅ NEW
};

delete (L.Icon.Default.prototype as any)._getIconUrl;

// 🔴 ROUTE MARKER
const routeIcon = new L.DivIcon({
  className: "",
  html: `
    <div style="
      width:16px;
      height:16px;
      background:#ef4444;
      border-radius:50%;
      border:3px solid white;
      box-shadow:0 0 12px #ef4444;
    "></div>
  `,
});

// 🟢 SELECTED MARKER
const selectedIcon = new L.DivIcon({
  className: "",
  html: `
    <div style="
      width:18px;
      height:18px;
      background:#22c55e;
      border-radius:50%;
      border:3px solid white;
      box-shadow:0 0 14px #22c55e;
    "></div>
  `,
});

// 🔥 FOCUS MAP
function FocusMap({ issue }: any) {
  const map = useMap();

  useEffect(() => {
    if (!issue) return;

    map.flyTo(
      [Number(issue.latitude), Number(issue.longitude)],
      16,
      { duration: 1.5 }
    );
  }, [issue, map]);

  return null;
}

// 🔥 HEATMAP
function Heatmap({ issues }: { issues: Issue[] }) {
  const map = useMap();

  useEffect(() => {
    if (!issues.length) return;

    let heatLayer: any;

    const loadHeat = async () => {
      await import("leaflet.heat");

      const heatData = issues.map((i) => [
        Number(i.latitude),
        Number(i.longitude),
        i.riskScore === "High" ? 0.8 : i.riskScore === "Medium" ? 0.5 : 0.2,
      ]);

      heatLayer = (L as any).heatLayer(heatData, {
        radius: 20,
        blur: 18,
        maxZoom: 17,
      }).addTo(map);
    };

    loadHeat();

    return () => {
      if (heatLayer) map.removeLayer(heatLayer);
    };
  }, [issues, map]);

  return null;
}

// 🚗 ROUTING
function Routing({ route, routeIssues }: any) {
  const map = useMap();
  const hasZoomed = useRef(false);
  const [segments, setSegments] = useState<any[]>([]);

  useEffect(() => {
    if (!route?.start || !route?.end) return;

    let isMounted = true;
    setSegments([]);

    const loadRouting = async () => {
      await import("leaflet-routing-machine");

      const mapAny = map as any;

      if (mapAny._routingControl) {
        map.removeControl(mapAny._routingControl);
        mapAny._routingControl = null;
      }

      const routingControl = (L as any).Routing.control({
        waypoints: [
          L.latLng(route.start.lat, route.start.lon),
          L.latLng(route.end.lat, route.end.lon),
        ],
        show: false,
        addWaypoints: false,
        draggableWaypoints: false,
        lineOptions: { styles: [] },
        createMarker: () => null,
      }).addTo(map);

      routingControl.on("routesfound", (e: any) => {
        const coords = e.routes[0].coordinates;
        const segs = [];

        for (let i = 0; i < coords.length - 1; i++) {
          const start = coords[i];
          const end = coords[i + 1];

          const nearby = routeIssues?.filter((issue: any) => {
            const dx = issue.latitude - start.lat;
            const dy = issue.longitude - start.lng;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return dist < 0.01;
          });

          let risk = "low";

          if (nearby?.some((i: any) => i.riskScore === "High"))
            risk = "high";
          else if (nearby?.some((i: any) => i.riskScore === "Medium"))
            risk = "medium";

          segs.push({
            coords: [
              [start.lat, start.lng],
              [end.lat, end.lng],
            ],
            risk,
          });
        }

        if (isMounted) setSegments(segs);

        if (!hasZoomed.current) {
          const bounds = L.latLngBounds(
            coords.map((c: any) => [c.lat, c.lng])
          );
          map.fitBounds(bounds, { padding: [80, 80] });
          hasZoomed.current = true;
        }
      });

      mapAny._routingControl = routingControl;
    };

    loadRouting();

    return () => {
      isMounted = false;
      const mapAny = map as any;
      if (mapAny._routingControl) {
        map.removeControl(mapAny._routingControl);
        mapAny._routingControl = null;
      }
    };
  }, [route, map, routeIssues]);

  return (
    <>
      {segments.map((seg, i) => {
        const color =
          seg.risk === "high"
            ? "#ef4444"
            : seg.risk === "medium"
            ? "#facc15"
            : "#22c55e";

        return (
          <>
            <Polyline
              key={`glow-${i}`}
              positions={seg.coords}
              pathOptions={{ color, weight: 10, opacity: 0.2 }}
            />
            <Polyline
              key={`main-${i}`}
              positions={seg.coords}
              pathOptions={{ color, weight: 5, opacity: 0.9 }}
            />
          </>
        );
      })}
    </>
  );
}
function FixMapResize() {
  const map = useMap();

  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize(); // 🔥 KEY FIX
    }, 200);
  }, [map]);

  return null;
}
// ✅ MAIN MAP
export default function MapComponent({
  issues,
  route,
  routeIssues = [],
  selectedIssue, // ✅ NEW
}: Props) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <MapContainer
        center={[28.6139, 77.209]}
        zoom={12}
        zoomControl={false}
        className="w-full h-full"
        preferCanvas={true}
        zoomAnimation={true}
        fadeAnimation={true}
      >
      < FixMapResize />
        <TileLayer
  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
  attribution="© OpenStreetMap & CARTO"
/>

        <ZoomControl position="bottomright" />

        {/* 🔥 FOCUS FEATURE */}
        {selectedIssue && <FocusMap issue={selectedIssue} />}

        {!route && <Heatmap issues={issues} />}
        {route && <Routing route={route} routeIssues={routeIssues} />}

        {/* 📍 MARKERS */}
        {issues.map((issue) => {
          const lat = Number(issue.latitude);
          const lon = Number(issue.longitude);
          if (isNaN(lat) || isNaN(lon)) return null;

          const isOnRoute = routeIssues.some(
            (ri) => ri._id.toString() === issue._id.toString()
          );

          const isSelected =
            selectedIssue?._id === issue._id;

          return (
            <Marker
              key={issue._id}
              position={[lat, lon]}
              icon={
                isSelected
                  ? selectedIcon
                  : isOnRoute
                  ? routeIcon
                  : new L.DivIcon({
                      className: "",
                      html: `<div style="
                        width:8px;
                        height:8px;
                        background:#6b7280;
                        border-radius:50%;
                        opacity:0.4;
                      "></div>`,
                    })
              }
              zIndexOffset={1000}
            >
              <MarkerPopup issue={issue} />
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}