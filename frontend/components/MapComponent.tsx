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

// ✅ FIX Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

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
  setRouteIssues?: any; // ✅ NEW
  selectedIssue?: any;
};

// 🔴 ROUTE MARKER
const routeIcon = new L.DivIcon({
  className: "",
  html: `<div style="
      width:16px;
      height:16px;
      background:#ef4444;
      border-radius:50%;
      border:3px solid white;
      box-shadow:0 0 12px #ef4444;
    "></div>`,
});

// 🟢 SELECTED MARKER
const selectedIcon = new L.DivIcon({
  className: "",
  html: `<div style="
      width:18px;
      height:18px;
      background:#22c55e;
      border-radius:50%;
      border:3px solid white;
      box-shadow:0 0 14px #22c55e;
    "></div>`,
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

// 🔥 ROUTING (UPDATED)
function Routing({ route, issues, setRouteIssues }: any) {
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

        // 🔥 NEW: DETECT ISSUES ON ROUTE
        const nearbyIssues: any[] = [];

        coords.forEach((point: any) => {
          issues.forEach((issue: any) => {
            const dx = issue.latitude - point.lat;
            const dy = issue.longitude - point.lng;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 0.01) {
              nearbyIssues.push(issue);
            }
          });
        });

        // REMOVE DUPLICATES
        const uniqueIssues = Array.from(
          new Map(nearbyIssues.map((i) => [i._id, i])).values()
        );

        // 🔥 UPDATE DRIVER PAGE STATE
        if (setRouteIssues) {
          setRouteIssues(uniqueIssues);
        }

        // 🔥 SEGMENT COLORING
        const segs = [];

        for (let i = 0; i < coords.length - 1; i++) {
          const start = coords[i];
          const end = coords[i + 1];

          const nearby = uniqueIssues.filter((issue: any) => {
            const dx = issue.latitude - start.lat;
            const dy = issue.longitude - start.lng;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return dist < 0.01;
          });

          let risk = "low";

          if (nearby.some((i: any) => i.riskScore === "High"))
            risk = "high";
          else if (nearby.some((i: any) => i.riskScore === "Medium"))
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
  }, [route, map, issues, setRouteIssues]);

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

// ✅ MAIN MAP
export default function MapComponent({
  issues,
  route,
  routeIssues = [],
  setRouteIssues,
  selectedIssue,
}: Props) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <MapContainer
        center={[28.6139, 77.209]}
        zoom={12}
        zoomControl={false}
        className="w-full h-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ZoomControl position="bottomright" />

        {selectedIssue && <FocusMap issue={selectedIssue} />}

        {route && (
          <Routing
            route={route}
            issues={issues}
            setRouteIssues={setRouteIssues}
          />
        )}

        {issues.map((issue) => {
          const lat = Number(issue.latitude);
          const lon = Number(issue.longitude);

          if (isNaN(lat) || isNaN(lon)) return null;

          const isOnRoute = routeIssues.some(
            (ri) => ri._id === issue._id
          );

          const isSelected = selectedIssue?._id === issue._id;

          return (
            <Marker
              key={issue._id}
              position={[lat, lon]}
              icon={
                isSelected
                  ? selectedIcon
                  : isOnRoute
                  ? routeIcon
                  : undefined
              }
            >
              <MarkerPopup issue={issue} />
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}