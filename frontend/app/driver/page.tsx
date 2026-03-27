"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import API from "../../utils/api";
import FilterPanel from "../../components/FilterPanel";
import Legend from "../../components/Legend";
import RouteInput from "../../components/RouteInput";

type Issue = {
  _id: string;
  imageUrl: string;
  issueType: string;
  latitude: number;
  longitude: number;
  votes: number;
  riskScore: string;
  status: string;
};

const MapComponent = dynamic(
  () => import("@/components/MapComponent"),
  { ssr: false }
);

export default function DriverPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filter, setFilter] = useState("");
  const [route, setRoute] = useState<any>(null);
  const [routeIssues, setRouteIssues] = useState<Issue[]>([]);

  // 🔥 Fetch issues
  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const res = await API.get("/issues");
        setIssues(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchIssues();
    const interval = setInterval(fetchIssues, 30000);
    return () => clearInterval(interval);
  }, []);

  // 🔥 Filter only route issues
  const displayIssues = useMemo(() => {
    const base = route ? routeIssues : [];
    return filter
      ? base.filter((i) => i.issueType === filter)
      : base;
  }, [route, routeIssues, filter]);

  return (
    <div className="relative w-full h-full">

      {/* FILTER */}
      <div className="absolute top-5 left-5 z-[1000]">
        <FilterPanel setFilter={setFilter} />
      </div>

      {/* ROUTE */}
      <div className="absolute top-5 right-5 z-[1000] w-[280px]">
        <RouteInput setRoute={setRoute} setRouteIssues={setRouteIssues} />
      </div>

      {/* ALERT */}
      {routeIssues.length > 0 && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[1000]
                        bg-yellow-500 text-white px-5 py-2 rounded-xl shadow-lg">
          ⚠ {routeIssues.length} issue(s) on your route
        </div>
      )}

      {/* EMPTY STATE */}
      {!route && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 
                        -translate-y-1/2 text-white/60 bg-black/40 
                        px-6 py-3 rounded-xl backdrop-blur">
          🚗 Enter route to view issues
        </div>
      )}

      {/* MAP */}
      <div className="h-full w-full">
        <MapComponent
          issues={issues}                 // ✅ IMPORTANT
          route={route}
          routeIssues={displayIssues}
          setRouteIssues={setRouteIssues}
          mode="driver"
        />
      </div>

      {/* LEGEND */}
      <div className="absolute bottom-6 left-6 z-[1000]">
        <Legend />
      </div>
    </div>
  );
}