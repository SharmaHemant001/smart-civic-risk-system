"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  ZoomControl,
  Polyline,
  Tooltip,
} from "react-leaflet";
import MarkerPopup from "./MarkerPopup";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState, useMemo } from "react";

type Issue = {
  _id: string;
  latitude: number;
  longitude: number;
  riskScore: string;
  riskValue?: number;
  votes?: number;
  status?: string;
  issueType?: string;
  locationName?: string;
};

type Props = {
  issues: Issue[];
  route: any;
  routeIssues?: Issue[];
  setRouteIssues?: any;
  selectedIssue?: any;
  mode?: string;
  selectedRouteId?: string;
  setSelectedRouteId?: (routeId: string) => void;
  areas?: any[];
  weather?: string;
  setWeather?: (w: string) => void;
  mapViewMode?: "heatmap" | "markers" | "both";
  setMapViewMode?: (mode: "heatmap" | "markers" | "both") => void;
  showHeatmap?: boolean;
  showMarkers?: boolean;
  showNeighborhoods?: boolean;
  showRouteSegments?: boolean;
};

const NEIGHBORHOOD_COORDS: { [key: string]: [number, number] } = {
  "Connaught Place": [28.6328, 77.1896],
  "Saket": [28.5244, 77.1933],
  "DLF Cyber City": [28.4595, 77.1085],
  "Indirapuram": [28.6176, 77.0655],
  "Noida City Center": [28.5921, 77.3635],
  "Vasant Kunj": [28.5168, 77.1998],
  "Lajpat Nagar": [28.5644, 77.2389],
  "Karol Bagh": [28.6505, 77.2028],
  "Greater Kailash": [28.5244, 77.2477],
  "Rajouri Garden": [28.6659, 77.0826],
  "Rohini": [28.7501, 77.0373],
  "Dwarka": [28.5921, 77.0460],
  "Shalimar Bagh": [28.7614, 77.1316],
  "Pitampura": [28.7368, 77.1186],
  "Malviya Nagar": [28.5199, 77.2013],
  "Munirka": [28.5134, 77.1889],
  "Lodi Road": [28.6032, 77.2202],
  "Aerocity": [28.5721, 77.1093],
  "Delhi Cantt": [28.6430, 77.1334],
  "Golf Course Road": [28.5505, 77.1771],
  "Noida": [28.5355, 77.3910],
  "Greater Noida": [28.4744, 77.5030],
  "Dadri": [28.5492, 77.5532],
  "Khurja": [28.2523, 77.8566],
};

/* =====================================
   📍 GEO DISTANCE
===================================== */
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

/* =====================================
   🎯 ZOOM TRACKER
===================================== */
function ZoomTracker({ setZoom }: { setZoom: (z: number) => void }) {
  const map = useMap();
  useEffect(() => {
    const handleZoom = () => {
      setZoom(map.getZoom());
    };
    map.on("zoomend", handleZoom);
    return () => {
      map.off("zoomend", handleZoom);
    };
  }, [map, setZoom]);
  return null;
}

/* =====================================
   🎯 FOCUS MAP
===================================== */
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

/* =====================================
   🎯 ISSUE MARKER
===================================== */
/* =====================================
   🎯 ISSUE MARKER
===================================== */
function IssueMarker({
  issue,
  isSelected,
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
      icon={defaultIcon}
    >
      <MarkerPopup issue={issue} />
    </Marker>
  );
}

/* =====================================
   🚗 ROUTING
===================================== */
function RouteDrawing({ route, selectedRouteId, setSelectedRouteId, activeIssues, showRouteSegments, areas }: any) {
  const map = useMap();
  const hasZoomed = useRef(false);
  const prevRouteRef = useRef<any>(null);

  useEffect(() => {
    if (!route || !route.routes) return;

    if (route !== prevRouteRef.current) {
      prevRouteRef.current = route;
      hasZoomed.current = false;
    }

    const allPoints: [number, number][] = [];
    route.routes.forEach((r: any) => {
      if (r.geometry && r.geometry.coordinates) {
        r.geometry.coordinates.forEach((c: any) => {
          allPoints.push([c[1], c[0]]);
        });
      }
    });

    if (allPoints.length > 0 && !hasZoomed.current) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [50, 50] });
      hasZoomed.current = true;
    }
  }, [route, map]);

  if (!route || !route.routes) return null;

  // Helper: Segment color based on closest active hazard distance
  const getSegmentColor = (p1: [number, number], p2: [number, number]) => {
    if (!activeIssues || activeIssues.length === 0) return "#22c55e"; // Green (Safe)

    const midLat = (p1[0] + p2[0]) / 2;
    const midLon = (p1[1] + p2[1]) / 2;

    let minDistance = Infinity;
    let closestIssue: any = null;

    for (let i = 0; i < activeIssues.length; i++) {
      const issue = activeIssues[i];
      const lat1 = midLat;
      const lon1 = midLon;
      const lat2 = +issue.latitude;
      const lon2 = +issue.longitude;
      
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
      const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      if (d < minDistance) {
        minDistance = d;
        closestIssue = issue;
      }
    }

    // 150m buffer
    if (minDistance <= 0.15 && closestIssue) {
      const score = closestIssue.riskScore || "";
      if (score === "Critical" || score === "High") {
        return "#ef4444"; // Red (Critical)
      } else if (score === "Medium") {
        return "#eab308"; // Yellow (Moderate)
      }
    }

    return "#22c55e"; // Green (Safe)
  };

  const getSegmentMetadata = (p1: [number, number]) => {
    let closestNeighborhood = "Unknown";
    let closestCRI = 0;
    let closestTrend = "Stable →";
    let minNDist = Infinity;

    for (const [name, coords] of Object.entries(NEIGHBORHOOD_COORDS)) {
      const d = getDistance(coords[0], coords[1], p1[0], p1[1]);
      if (d < minNDist) {
        minNDist = d;
        closestNeighborhood = name;
      }
    }

    const areaInfo = areas?.find((a: any) => a.area === closestNeighborhood);
    if (areaInfo) {
      closestCRI = areaInfo.cri;
      closestTrend = areaInfo.trend;
    }

    const localIssues = activeIssues.filter((issue: any) => {
      const d = getDistance(p1[0], p1[1], +issue.latitude, +issue.longitude);
      return d <= 0.25;
    });

    const hazardsCount = localIssues.length;
    const criticalCount = localIssues.filter((i: any) => i.riskScore === "Critical").length;

    let segmentRisk = "Low Risk";
    let riskColor = "text-emerald-400";
    if (criticalCount > 0) {
      segmentRisk = "Critical Risk";
      riskColor = "text-red-400 font-bold";
    } else if (hazardsCount > 0) {
      segmentRisk = "Moderate Risk";
      riskColor = "text-yellow-400 font-bold";
    }

    return {
      neighborhood: closestNeighborhood,
      cri: closestCRI,
      trend: closestTrend,
      hazards: hazardsCount,
      risk: segmentRisk,
      riskColor
    };
  };

  return (
    <>
      {route.routes.map((r: any) => {
        const isSelected = r.routeId === selectedRouteId;
        const positions = r.geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);

        if (isSelected) {
          if (showRouteSegments) {
            // Calculate path segments grouped by consecutive risk colors
            const segments: { positions: [number, number][]; color: string }[] = [];
            
            if (positions.length >= 2) {
              let currentGroup: [number, number][] = [positions[0]];
              let currentColor = getSegmentColor(positions[0], positions[1]);

              for (let i = 0; i < positions.length - 1; i++) {
                const p1 = positions[i];
                const p2 = positions[i + 1];
                const color = getSegmentColor(p1, p2);

                if (color === currentColor) {
                  currentGroup.push(p2);
                } else {
                  segments.push({ positions: currentGroup, color: currentColor });
                  currentGroup = [p1, p2];
                  currentColor = color;
                }
              }
              if (currentGroup.length > 1) {
                segments.push({ positions: currentGroup, color: currentColor });
              }
            }

            return (
              <div key={r.routeId}>
                {segments.map((seg, sIdx) => {
                  const meta = getSegmentMetadata(seg.positions[0]);
                  return (
                    <div key={sIdx}>
                      <Polyline
                        positions={seg.positions}
                        pathOptions={{
                          color: seg.color,
                          weight: 10,
                          opacity: 0.2
                        }}
                        eventHandlers={{
                          click: () => {
                            if (setSelectedRouteId) setSelectedRouteId(r.routeId);
                          }
                        }}
                      />
                      <Polyline
                        positions={seg.positions}
                        pathOptions={{
                          color: seg.color,
                          weight: 6,
                          opacity: 0.95
                        }}
                        eventHandlers={{
                          click: () => {
                            if (setSelectedRouteId) setSelectedRouteId(r.routeId);
                          }
                        }}
                      >
                        <Tooltip sticky>
                          <div className="p-2 bg-slate-950/95 text-white border border-white/10 rounded-lg text-[10px] space-y-1">
                            <div className="font-black border-b border-white/5 pb-1 text-indigo-400">
                              📍 Neighborhood: {meta.neighborhood}
                            </div>
                            <div>Exposure: <strong className={meta.riskColor}>{meta.risk}</strong></div>
                            <div>Hazards Nearby: <strong className="text-white">{meta.hazards}</strong></div>
                            <div>Neighborhood CRI: <strong className="text-white">{meta.cri} ({meta.trend})</strong></div>
                          </div>
                        </Tooltip>
                      </Polyline>
                    </div>
                  );
                })}
              </div>
            );
          } else {
            // Render as single solid indigo line
            const meta = getSegmentMetadata(positions[0]);
            return (
              <div key={r.routeId}>
                <Polyline
                  positions={positions}
                  pathOptions={{
                    color: "#6366f1",
                    weight: 10,
                    opacity: 0.2
                  }}
                  eventHandlers={{
                    click: () => {
                      if (setSelectedRouteId) setSelectedRouteId(r.routeId);
                    }
                  }}
                />
                <Polyline
                  positions={positions}
                  pathOptions={{
                    color: "#6366f1",
                    weight: 6,
                    opacity: 0.95
                  }}
                  eventHandlers={{
                    click: () => {
                      if (setSelectedRouteId) setSelectedRouteId(r.routeId);
                    }
                  }}
                >
                  <Tooltip sticky>
                    <div className="p-2 bg-slate-950/95 text-white border border-white/10 rounded-lg text-[10px] space-y-1">
                      <div className="font-black border-b border-white/5 pb-1 text-indigo-400">
                        📍 Selected Route: {r.routeId}
                      </div>
                      <div>Status: <strong>Unified Risk Render Active</strong></div>
                      <div>Representative Neighborhood: <strong>{meta.neighborhood}</strong></div>
                      <div>CRI Exposure: <strong>{meta.cri}</strong></div>
                    </div>
                  </Tooltip>
                </Polyline>
              </div>
            );
          }
        } else {
          // Unselected route rendered in dashed slate
          return (
            <div key={r.routeId}>
              <Polyline
                positions={positions}
                pathOptions={{
                  color: "#475569",
                  weight: 4.5,
                  opacity: 0.35,
                  dashArray: "5, 8"
                }}
                eventHandlers={{
                  click: () => {
                    if (setSelectedRouteId) setSelectedRouteId(r.routeId);
                  }
                }}
              />
            </div>
          );
        }
      })}
    </>
  );
}

/* =====================================
   🔥 RISK HEATMAP
===================================== */
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
          : issue.riskScore === "Critical" || issue.riskScore === "High"
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

/* =====================================
   🗺️ NEIGHBORHOOD INTERFACE MAP
===================================== */
export default function MapComponent({
  issues,
  route,
  routeIssues = [],
  setRouteIssues,
  selectedIssue,
  mode = "dashboard",
  selectedRouteId,
  setSelectedRouteId,
  areas = [],
  weather = "clear",
  setWeather,
  mapViewMode: propMapViewMode,
  setMapViewMode: propSetMapViewMode,
  showHeatmap = true,
  showMarkers = false,
  showNeighborhoods = false,
  showRouteSegments = true
}: Props) {
  const [zoom, setZoom] = useState(12);
  const [internalMapViewMode, setInternalMapViewMode] = useState<"heatmap" | "markers" | "both">(
    mode === "driver" ? "both" : "heatmap"
  );
  const mapViewMode = propMapViewMode !== undefined ? propMapViewMode : internalMapViewMode;
  const setMapViewMode = propSetMapViewMode !== undefined ? propSetMapViewMode : setInternalMapViewMode;
  const activeShowHeatmap = showHeatmap && (mapViewMode === "heatmap" || mapViewMode === "both");
  const activeShowMarkers = showMarkers || (mapViewMode === "markers" || mapViewMode === "both");
  const [selectedArea, setSelectedArea] = useState<any>(null);

  // Collapsible legend states
  const [legendOpen, setLegendOpen] = useState(false);
  const [openCRI, setOpenCRI] = useState(true);
  const [openSegment, setOpenSegment] = useState(true);
  const [openHeatmap, setOpenHeatmap] = useState(true);
  const [openMarkers, setOpenMarkers] = useState(true);

  // Extract active issues once
  const activeIssues = useMemo(() => {
    return issues.filter(
      (i) => !["resolved", "invalid"].includes(i.status || "")
    );
  }, [issues]);

  // In-component Grid Clustering Logic
  const clusteredItems = useMemo(() => {
    if (zoom >= 14) {
      return activeIssues.map(issue => ({ type: "single", data: issue }));
    }

    // Grid sizing coordinate degrees based on map zoom levels
    const gridSize = zoom <= 10 ? 0.05 : zoom <= 12 ? 0.018 : 0.007;
    const clusters: { [key: string]: Issue[] } = {};

    activeIssues.forEach(issue => {
      const gridX = Math.round(issue.latitude / gridSize);
      const gridY = Math.round(issue.longitude / gridSize);
      const key = `${gridX}_${gridY}`;
      if (!clusters[key]) {
        clusters[key] = [];
      }
      clusters[key].push(issue);
    });

    const result: any[] = [];
    Object.values(clusters).forEach(group => {
      if (group.length === 1) {
        result.push({ type: "single", data: group[0] });
      } else {
        const avgLat = group.reduce((sum, item) => sum + item.latitude, 0) / group.length;
        const avgLng = group.reduce((sum, item) => sum + item.longitude, 0) / group.length;
        result.push({
          type: "cluster",
          count: group.length,
          latitude: avgLat,
          longitude: avgLng,
          issues: group
        });
      }
    });

    return result;
  }, [activeIssues, zoom]);

  // Leaflet divIcons definition (Zero Asset dependency, pure HTML/CSS)
  const categoryIcons = useMemo(() => ({
    pothole: L.divIcon({
      html: `<div style="width:24px;height:24px;background:#ef4444;border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.5);font-size:10px;">🔴</div>`,
      className: "custom-marker-div",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    }),
    garbage: L.divIcon({
      html: `<div style="width:24px;height:24px;background:#f97316;border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.5);font-size:10px;">🟠</div>`,
      className: "custom-marker-div",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    }),
    sewer: L.divIcon({
      html: `<div style="width:24px;height:24px;background:#a855f7;border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.5);font-size:10px;">🟣</div>`,
      className: "custom-marker-div",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    }),
    construction: L.divIcon({
      html: `<div style="width:24px;height:24px;background:#eab308;border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.5);font-size:10px;">🟡</div>`,
      className: "custom-marker-div",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    }),
    other: L.divIcon({
      html: `<div style="width:24px;height:24px;background:#3b82f6;border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.5);font-size:10px;">🔵</div>`,
      className: "custom-marker-div",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    })
  }), []);

  const routeIcon = useMemo(
    () =>
      new L.DivIcon({
        html: `<div style="width:16px;height:16px;background:#ef4444;border-radius:50%;border:3px solid white;"></div>`,
      }),
    []
  );

  const selectedIcon = useMemo(
    () =>
      new L.DivIcon({
        html: `<div style="width:18px;height:18px;background:#22c55e;border-radius:50%;border:3px solid white;"></div>`,
      }),
    []
  );

  const getIssueIcon = (issueType: string, isSelected: boolean, isOnRoute: boolean, riskScore?: string) => {
    if (isSelected) return selectedIcon;
    
    // Critical risk/escalation zones get a pulsing 🚨 icon
    if (riskScore === "Critical") {
      return L.divIcon({
        html: `<div class="critical-pulse-marker-div" style="width:28px;height:28px;background:#ef4444;border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px #ef4444;font-size:12px;">🚨</div>`,
        className: "custom-marker-div",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14]
      });
    }

    const type = (issueType || "").toLowerCase();
    
    // On-route issues get their category icon with a special indigo ring
    if (isOnRoute) {
      const colors: Record<string, string> = {
        pothole: "#ef4444",
        garbage: "#f97316",
        sewer: "#a855f7",
        construction: "#eab308",
        other: "#3b82f6"
      };
      const color = colors[type] || colors.other;
      const emoji = type === "pothole" ? "🔴" : type === "garbage" ? "🟠" : type === "sewer" ? "🟣" : type === "construction" ? "🟡" : "🔵";
      return L.divIcon({
        html: `<div style="width:28px;height:28px;background:${color};border:3px solid #6366f1;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.6);font-size:11px;">${emoji}</div>`,
        className: "custom-marker-div route-hazard-marker",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14]
      });
    }

    if (type === "pothole") return categoryIcons.pothole;
    if (type === "garbage") return categoryIcons.garbage;
    if (type === "sewer") return categoryIcons.sewer;
    if (type === "construction") return categoryIcons.construction;
    return categoryIcons.other;
  };

  const getClusterIcon = (count: number) => {
    return L.divIcon({
      html: `<div style="width:30px;height:30px;background:#8b5cf6;border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(139,92,246,0.6);color:white;font-weight:black;font-size:11px;">${count}</div>`,
      className: "cluster-div-marker",
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  };

  const createLabelIcon = (name: string, cri: number, trend: string, totalIssues: number) => {
    const trendColor = trend.includes("↑") ? "text-red-400 font-bold" : trend.includes("↓") ? "text-emerald-400 font-bold" : "text-gray-400";
    
    // Color Coding: Red = Critical (CRI >= 80), Orange = High (CRI 50-79), Green = Stable (< 50)
    const borderCol = cri >= 80 ? "border-red-500" : cri >= 50 ? "border-orange-500" : "border-emerald-500";
    const bgCol = cri >= 80 ? "bg-red-950/90 text-red-400" : cri >= 50 ? "bg-orange-950/90 text-orange-400" : "bg-emerald-950/90 text-emerald-400";

    if (zoom < 12) {
      // Zoomed Out: Only show CRI badges
      return L.divIcon({
        html: `
          <div class="px-1.5 py-0.5 ${bgCol} border ${borderCol} rounded-full text-center shadow-md font-sans font-black text-[8px] whitespace-nowrap">
            CRI ${cri}
          </div>
        `,
        className: "neighborhood-label-overlay",
        iconSize: [40, 18],
        iconAnchor: [20, 9]
      });
    } else if (zoom < 14) {
      // Medium Zoom: Show neighborhood names with CRI badges
      return L.divIcon({
        html: `
          <div class="px-2 py-0.5 ${bgCol} border ${borderCol} rounded-lg text-center shadow-lg font-sans text-[8px] font-extrabold flex items-center gap-1 max-w-[120px] truncate whitespace-nowrap">
            <span>${name}</span>
            <span class="px-1 py-0.2 bg-black/45 rounded font-black">CRI ${cri}</span>
          </div>
        `,
        className: "neighborhood-label-overlay",
        iconSize: [110, 20],
        iconAnchor: [55, 10]
      });
    } else {
      // High Zoom: Show full intelligence details
      return L.divIcon({
        html: `
          <div class="px-2 py-1 ${bgCol} backdrop-blur-md border ${borderCol} rounded-xl text-center shadow-2xl font-sans" style="min-width:76px;">
            <div class="text-[8px] font-black text-gray-200 truncate uppercase max-w-[75px]">${name}</div>
            <div class="text-xs font-black text-white mt-0.5">CRI ${cri}</div>
            <div class="text-[7px] ${trendColor} mt-0.5">${trend}</div>
            <div class="text-[7px] text-white/60 mt-0.5">Hazards: ${totalIssues}</div>
          </div>
        `,
        className: "neighborhood-label-overlay",
        iconSize: [80, 48],
        iconAnchor: [40, 24]
      });
    }
  };

  // Resolve neighborhood coordinates to issues dynamically
  const areaIssues = useMemo(() => {
    if (!selectedArea) return [];
    const coords = NEIGHBORHOOD_COORDS[selectedArea.area];
    if (!coords) return [];
    return issues.filter((issue) => {
      const d = getDistance(coords[0], coords[1], issue.latitude, issue.longitude);
      return d <= 4.0 && !["resolved", "invalid"].includes(issue.status || "");
    });
  }, [selectedArea, issues]);

  const topRisk = useMemo(() => {
    if (areaIssues.length === 0) return "None";
    const counts: Record<string, number> = {};
    areaIssues.forEach(i => {
      const type = i.issueType || "other";
      counts[type] = (counts[type] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const rawVal = sorted[0]?.[0] || "Other";
    return rawVal.charAt(0).toUpperCase() + rawVal.slice(1);
  }, [areaIssues]);

  const forecastTrend = useMemo(() => {
    if (!selectedArea) return "Stable →";
    const criticalCount = areaIssues.filter(i => i.riskScore === "Critical").length;
    if (weather === "rain" || criticalCount > 1) return "Degrading ↑";
    if (areaIssues.length === 0) return "Improving ↓";
    return "Stable →";
  }, [selectedArea, areaIssues, weather]);

  // Collision detection for neighborhood markers
  const visibleAreas = useMemo(() => {
    if (!areas) return [];
    if (zoom < 11) return [];
    
    // In lower zooms, increase distance spacing threshold to avoid overlaps
    const minDistance = zoom < 11 ? 6.0 : zoom < 13 ? 3.0 : zoom < 14 ? 1.5 : 0;
    const selected: any[] = [];
    
    areas.forEach((area) => {
      const coords = NEIGHBORHOOD_COORDS[area.area];
      if (!coords) return;
      
      const tooClose = selected.some((sel) => {
        const selCoords = NEIGHBORHOOD_COORDS[sel.area];
        const dist = getDistance(coords[0], coords[1], selCoords[0], selCoords[1]);
        return dist < minDistance;
      });
      
      if (!tooClose) {
        selected.push(area);
      }
    });
    
    return selected.slice(0, 8);
  }, [areas, zoom]);

  return (
    <div className="h-full w-full overflow-hidden rounded-3xl relative border border-white/10">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes markerPulse {
          0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1.15); box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
          100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .critical-pulse-marker-div {
          animation: markerPulse 1.5s infinite;
          border-radius: 50%;
        }
      `}} />

      {/* 🟣 MAP MODE SWITCHER OVERLAY (Only outside driver page) */}
      {mode !== "driver" && (
        <div className="absolute top-4 left-4 z-[1000] bg-slate-900/80 backdrop-blur-md border border-white/10 px-1.5 py-1 rounded-xl flex items-center gap-1 shadow-2xl">
          {(["heatmap", "markers", "both"] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setMapViewMode(opt)}
              className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                mapViewMode === opt
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* 🌤 LIVE WEATHER LAYER OVERLAY (Only outside driver page) */}
      {setWeather && mode !== "driver" && (
        <div className="absolute top-4 right-4 z-[1000] bg-slate-900/80 backdrop-blur-md border border-white/10 px-1.5 py-1 rounded-xl flex items-center gap-1 shadow-2xl">
          {["clear", "rain", "heat"].map((mode) => (
            <button
              key={mode}
              onClick={() => setWeather(mode)}
              className={`px-2.5 py-1 rounded-lg text-xs font-black capitalize transition-all cursor-pointer ${
                weather === mode
                  ? "bg-indigo-600 text-white shadow-md scale-105"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              {mode === "clear" ? "☀️ Clear" : mode === "rain" ? "🌧️ Rain" : "🔥 Heat"}
            </button>
          ))}
        </div>
      )}

      {/* 🔴 COLLAPSIBLE GIS LEGENDS OVERLAY (Priority 8) */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-slate-950/90 backdrop-blur-md border border-white/10 p-3 rounded-2xl shadow-2xl text-[9px] text-gray-300 font-sans space-y-2.5 min-w-[170px] max-w-[210px] max-h-[260px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 select-none">
        <div className="flex items-center justify-between border-b border-white/5 pb-1 mb-1.5">
          <span className="font-black text-gray-400 uppercase tracking-widest text-[8px]">GIS COMMAND LEGEND</span>
          <button
            onClick={() => setLegendOpen(!legendOpen)}
            className="text-indigo-400 hover:text-indigo-300 text-[8px] uppercase font-black"
          >
            {legendOpen ? "Collapse" : "Expand"}
          </button>
        </div>

        {legendOpen && (
          <div className="space-y-2 animate-fade-in transition-all">
            {/* CRI Legend */}
            <div className="border-b border-white/5 pb-1.5">
              <button
                onClick={() => setOpenCRI(!openCRI)}
                className="w-full flex items-center justify-between font-black uppercase text-[8px] text-indigo-400 text-left py-0.5"
              >
                <span>CRI Risk Index</span>
                <span>{openCRI ? "▼" : "▶"}</span>
              </button>
              {openCRI && (
                <div className="space-y-1 mt-1 font-semibold text-[9px]">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span>Critical Risk (CRI &ge; 80)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
                    <span>High Risk (CRI 50–79)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                    <span>Stable / Low (&lt; 50)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Route Segment Legend */}
            <div className="border-b border-white/5 pb-1.5">
              <button
                onClick={() => setOpenSegment(!openSegment)}
                className="w-full flex items-center justify-between font-black uppercase text-[8px] text-indigo-400 text-left py-0.5"
              >
                <span>Route Risk Segments</span>
                <span>{openSegment ? "▼" : "▶"}</span>
              </button>
              {openSegment && (
                <div className="space-y-1 mt-1 font-semibold text-[9px]">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-3.5 h-1 bg-green-500 rounded" />
                    <span>Safe Corridor</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-3.5 h-1 bg-yellow-400 rounded" />
                    <span>Moderate Exposure</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-3.5 h-1 bg-red-500 rounded" />
                    <span>High Risk segment</span>
                  </div>
                </div>
              )}
            </div>

            {/* Heatmap Legend */}
            <div className="border-b border-white/5 pb-1.5">
              <button
                onClick={() => setOpenHeatmap(!openHeatmap)}
                className="w-full flex items-center justify-between font-black uppercase text-[8px] text-indigo-400 text-left py-0.5"
              >
                <span>Municipal Hazard Density</span>
                <span>{openHeatmap ? "▼" : "▶"}</span>
              </button>
              {openHeatmap && (
                <div className="space-y-1 mt-1 font-semibold text-[9px] flex items-center gap-1 justify-between">
                  <span className="text-[7px] text-white/50">Low</span>
                  <div className="h-1.5 flex-1 rounded bg-gradient-to-r from-green-500 via-yellow-400 to-red-500" />
                  <span className="text-[7px] text-white/50">High</span>
                </div>
              )}
            </div>

            {/* Markers Legend */}
            <div>
              <button
                onClick={() => setOpenMarkers(!openMarkers)}
                className="w-full flex items-center justify-between font-black uppercase text-[8px] text-indigo-400 text-left py-0.5"
              >
                <span>Map Markers</span>
                <span>{openMarkers ? "▼" : "▶"}</span>
              </button>
              {openMarkers && (
                <div className="grid grid-cols-2 gap-x-1 gap-y-1 mt-1 text-[8px] font-semibold text-white/80">
                  <div className="flex items-center gap-1">🔴 <span>Pothole</span></div>
                  <div className="flex items-center gap-1">🟠 <span>Garbage</span></div>
                  <div className="flex items-center gap-1">🟣 <span>Sewer</span></div>
                  <div className="flex items-center gap-1">🟡 <span>Const.</span></div>
                  <div className="flex items-center gap-1">🔵 <span>Other</span></div>
                  <div className="flex items-center gap-1">🚨 <span>Critical</span></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 🗺️ CLICKABLE FLOATING NEIGHBORHOOD DRAWER (Priority 1) */}
      {selectedArea && (
        <div className="absolute top-4 right-4 z-[1000] w-72 bg-slate-950/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl text-white transition-all transform slide-in-from-right animate-in">
          <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
            <div>
              <h3 className="text-sm font-black tracking-tight">{selectedArea.area}</h3>
              <p className="text-[9px] text-white/50 font-bold uppercase tracking-wider">Neighborhood GIS Drawer</p>
            </div>
            <button
              onClick={() => setSelectedArea(null)}
              className="text-gray-400 hover:text-white font-bold text-xs bg-white/5 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-slate-900/40 p-2 border border-white/5 rounded-xl">
              <span className="text-[8px] text-white/50 uppercase font-bold block">CRI Score</span>
              <span className={`text-base font-black block mt-0.5 ${
                selectedArea.cri >= 80 ? "text-red-400 animate-pulse" : selectedArea.cri >= 50 ? "text-orange-400" : "text-emerald-400"
              }`}>{selectedArea.cri}</span>
            </div>
            <div className="bg-slate-900/40 p-2 border border-white/5 rounded-xl">
              <span className="text-[8px] text-white/50 uppercase font-bold block">Trend</span>
              <span className={`text-xs font-bold block mt-1.5 ${
                selectedArea.trend.includes("↑") ? "text-red-400" :
                selectedArea.trend.includes("↓") ? "text-emerald-400" :
                "text-gray-400"
              }`}>{selectedArea.trend}</span>
            </div>
            <div className="bg-slate-900/40 p-2 border border-white/5 rounded-xl">
              <span className="text-[8px] text-white/50 uppercase font-bold block">Active Issues</span>
              <span className="text-base font-black text-white block mt-0.5">{areaIssues.length}</span>
            </div>
            <div className="bg-slate-900/40 p-2 border border-white/5 rounded-xl">
              <span className="text-[8px] text-white/50 uppercase font-bold block">Critical Issues</span>
              <span className="text-base font-black text-red-400 block mt-0.5">
                {areaIssues.filter(i => i.riskScore === "Critical").length}
              </span>
            </div>
            <div className="bg-slate-900/40 p-2 border border-white/5 rounded-xl">
              <span className="text-[8px] text-white/50 uppercase font-bold block">Escalations</span>
              <span className="text-base font-black text-yellow-400 block mt-0.5">
                {areaIssues.filter(i => (i.votes || 0) >= 3).length}
              </span>
            </div>
            <div className="bg-slate-900/40 p-2 border border-white/5 rounded-xl">
              <span className="text-[8px] text-white/50 uppercase font-bold block">Top Risk</span>
              <span className="text-xs font-bold text-white block mt-1.5 truncate">{topRisk}</span>
            </div>
            <div className="bg-slate-900/40 p-2 border border-white/5 rounded-xl col-span-2">
              <span className="text-[8px] text-white/50 uppercase font-bold block">Forecast Trend</span>
              <span className="text-xs font-bold text-indigo-300 block mt-0.5">{forecastTrend}</span>
            </div>
          </div>
        </div>
      )}

      {/* LEAFLET CONTAINER */}
      <MapContainer
        key={selectedIssue?._id || "map"}
        center={[28.6139, 77.209]}
        zoom={12}
        zoomControl={false}
        className="w-full h-full touch-none md:touch-auto"
        preferCanvas={true}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <ZoomTracker setZoom={setZoom} />
        <ZoomControl position="bottomright" />

        {/* Heatmap Layer */}
        {activeShowHeatmap && (
          <RiskHeatmap issues={issues} />
        )}

        {selectedIssue && <FocusMap issue={selectedIssue} />}

        {route && (
          <RouteDrawing
            route={route}
            selectedRouteId={selectedRouteId}
            setSelectedRouteId={setSelectedRouteId}
            activeIssues={activeIssues}
            showRouteSegments={showRouteSegments}
            areas={areas}
          />
        )}

        {/* Neighborhood Overlays (Priority 1, 5 & 9) */}
        {showNeighborhoods && visibleAreas.map((area: any) => {
          const coords = NEIGHBORHOOD_COORDS[area.area];
          if (!coords) return null;

          return (
            <Marker
              key={`label-${area.area}`}
              position={coords}
              icon={createLabelIcon(area.area, area.cri, area.trend, area.totalIssues)}
              eventHandlers={{
                click: () => {
                  setSelectedArea(area);
                }
              }}
            />
          );
        })}

        {/* Clustered Markers Layer (Priority 5) */}
        {activeShowMarkers && (
          <>
            {clusteredItems.map((item: any, idx: number) => {
              if (item.type === "cluster") {
                return (
                  <Marker
                    key={`cluster-${idx}`}
                    position={[item.latitude, item.longitude]}
                    icon={getClusterIcon(item.count)}
                    eventHandlers={{
                      click: (e) => {
                        const map = e.target._map;
                        map.flyTo([item.latitude, item.longitude], map.getZoom() + 2, {
                          duration: 1.0
                        });
                      }
                    }}
                  />
                );
              }

              const issue = item.data;
              const isSelected = selectedIssue?._id === issue._id;
              const isOnRoute = routeIssues?.some((i) => i._id === issue._id);
              const customIcon = getIssueIcon(issue.issueType || "other", isSelected, isOnRoute, issue.riskScore);

              return (
                <IssueMarker
                  key={issue._id}
                  issue={issue}
                  isSelected={isSelected}
                  defaultIcon={customIcon}
                />
              );
            })}
          </>
        )}
      </MapContainer>
    </div>
  );
}
