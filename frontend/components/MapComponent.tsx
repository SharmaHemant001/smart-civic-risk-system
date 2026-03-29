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

type Issue = {
  _id: string;
  latitude: number;
  longitude: number;
  riskScore: string;
  riskValue?: number;
  votes?: number;
  status?: string;
};

const isElevatedRisk = (riskScore: string) =>
  riskScore === "Critical" || riskScore === "High";

type Props = {
  issues: Issue[];
  route: any;
  routeIssues?: Issue[];
  setRouteIssues?: any;
  selectedIssue?: any;
  mode?: string;
};

/* =========================
   📍 GEO DISTANCE
========================= */
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* =========================
   🎯 FOCUS MAP
========================= */
function FocusMap({ issue }: any) {
  const map = useMap();

  useEffect(() => {
    if (!issue) return;

    map.flyTo([+issue.latitude, +issue.longitude], 16, {
      duration: 1.5,
    });
  }, [issue, map]);

  return null;
}

/* =========================
   🎯 ISSUE MARKER
========================= */
function IssueMarker({
  issue,
  isSelected,
  isOnRoute,
  selectedIcon,
  routeIcon,
  defaultIcon,
}: any) {
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected && markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [isSelected]);

  const lat = +issue.latitude;
  const lon = +issue.longitude;

  if (!lat || !lon || isNaN(lat) || isNaN(lon)) return null;

  return (
    <Marker
      ref={markerRef}
      position={[lat, lon]}
      icon={
        isSelected
          ? selectedIcon
          : isOnRoute
          ? routeIcon
          : defaultIcon
      }
    >
      <MarkerPopup issue={issue} />
    </Marker>
  );
}

/* =========================
   🚗 ROUTING
========================= */
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
        try {
          map.removeControl(mapAny._routingControl);
        } catch {}
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

        const nearbyIssues: any[] = [];

        coords.forEach((point: any) => {
          issues.forEach((issue: any) => {
            const dist = getDistance(
              issue.latitude,
              issue.longitude,
              point.lat,
              point.lng
            );

            if (dist < 1.5) {
              nearbyIssues.push(issue);
            }
          });
        });

        const uniqueIssues = Array.from(
          new Map(nearbyIssues.map((i) => [i._id, i])).values()
        );

        setRouteIssues?.(uniqueIssues);

        const segs = [];

        for (let i = 0; i < coords.length - 1; i++) {
          const start = coords[i];
          const end = coords[i + 1];

          const nearby = uniqueIssues.filter((issue: any) => {
            const dist = getDistance(
              issue.latitude,
              issue.longitude,
              start.lat,
              start.lng
            );
            return dist < 1.5;
          });

          let risk = "low";

          if (nearby.some((i: any) => isElevatedRisk(i.riskScore)))
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
          map.fitBounds(bounds, { padding: [60, 60] });
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
        try {
          map.removeControl(mapAny._routingControl);
        } catch {}
        mapAny._routingControl = null;
      }
    };
  }, [route, issues]);

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

/* =========================
   🔥 RISK HEATMAP
========================= */
function RiskHeatmap({ issues }: { issues: Issue[] }) {
  const map = useMap();

  useEffect(() => {
    let heatLayer: any = null;
    let isMounted = true;

    const loadHeatmap = async () => {
      await import("leaflet.heat");

      const activeIssues = issues.filter((issue) => {
        const lat = Number(issue.latitude);
        const lon = Number(issue.longitude);

        return (
          Number.isFinite(lat) &&
          Number.isFinite(lon) &&
          !["resolved", "invalid"].includes(issue.status || "")
        );
      });

      const heatPoints = activeIssues.map((issue) => {
        const votes = Math.max(Number(issue.votes || 0), 0);
        const baseWeight = Number.isFinite(Number(issue.riskValue))
          ? Math.max(0.35, Math.min(Number(issue.riskValue) / 100, 1.1))
          : isElevatedRisk(issue.riskScore)
          ? 1
          : issue.riskScore === "Medium"
          ? 0.65
          : 0.35;
        const intensity = Math.min(baseWeight + Math.min(votes * 0.05, 0.25), 1.25);

        return [Number(issue.latitude), Number(issue.longitude), intensity] as [
          number,
          number,
          number
        ];
      });

      if (!isMounted || heatPoints.length === 0) return;

      heatLayer = (L as any).heatLayer(heatPoints, {
        radius: 28,
        blur: 22,
        maxZoom: 17,
        minOpacity: 0.25,
        gradient: {
          0.2: "#22c55e",
          0.45: "#facc15",
          0.75: "#f97316",
          1.0: "#ef4444",
        },
      });

      heatLayer.addTo(map);
    };

    loadHeatmap();

    return () => {
      isMounted = false;
      if (heatLayer) {
        map.removeLayer(heatLayer);
      }
    };
  }, [issues, map]);

  return null;
}

/* =========================
   🗺️ MAIN MAP
========================= */
export default function MapComponent({
  issues,
  route,
  routeIssues = [],
  setRouteIssues,
  selectedIssue,
  mode = "dashboard",
}: Props) {
  const defaultIcon = useRef(new L.Icon.Default()).current;

  const routeIcon = useRef(
    new L.DivIcon({
      html: `<div style="width:16px;height:16px;background:#ef4444;border-radius:50%;border:3px solid white;"></div>`,
    })
  ).current;

  const selectedIcon = useRef(
    new L.DivIcon({
      html: `<div style="width:18px;height:18px;background:#22c55e;border-radius:50%;border:3px solid white;"></div>`,
    })
  ).current;

  return (
    <div className="h-full min-h-[320px] w-full overflow-hidden rounded-2xl">

      <MapContainer
        key={selectedIssue?._id || "map"}
        center={[28.6139, 77.209]}
        zoom={12}
        zoomControl={false}
        className="w-full h-full touch-none md:touch-auto"
        preferCanvas={true}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

        <ZoomControl position="bottomright" />

        <RiskHeatmap issues={issues} />

        {selectedIssue && <FocusMap issue={selectedIssue} />}

        {route && (
          <Routing
            route={route}
            issues={issues}
            setRouteIssues={setRouteIssues}
          />
        )}

        {(mode === "driver" ? routeIssues : issues).map((issue) => {
          const isSelected = selectedIssue?._id === issue._id;
          const isOnRoute = routeIssues?.some((i) => i._id === issue._id);

          return (
            <IssueMarker
              key={issue._id}
              issue={issue}
              isSelected={isSelected}
              isOnRoute={isOnRoute}
              selectedIcon={selectedIcon}
              routeIcon={routeIcon}
              defaultIcon={defaultIcon}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
