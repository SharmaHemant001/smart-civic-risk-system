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

  // ✅ NEW: selected issue from dashboard
  const [selectedIssue, setSelectedIssue] = useState<any>(null);

  /* =====================================
     🔥 FETCH ISSUES
  ===================================== */
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

  /* =====================================
     🔥 GET SELECTED ISSUE FROM DASHBOARD
  ===================================== */
  useEffect(() => {
    const stored = localStorage.getItem("selectedIssue");

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSelectedIssue(parsed);

        // optional: remove after use
        localStorage.removeItem("selectedIssue");
      } catch (e) {
        console.error("Error parsing selected issue", e);
      }
    }
  }, []);

  /* =====================================
     🔥 FILTER ROUTE ISSUES
  ===================================== */
   const displayIssues = useMemo(() => {
  // 🔥 if route exists → show route issues
  if (route) {
    return filter
      ? routeIssues.filter((i) => i.issueType === filter)
      : routeIssues;
      
  }

  // 🔥 if coming from dashboard → show selected issue
  if (selectedIssue) {
    return [selectedIssue];
  }

  return [];
}, [route, routeIssues, filter, selectedIssue]);




  return (
    <div className="relative w-full h-full">

      {/* 🔥 TOP CONTROLS */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-col gap-3 md:top-5 md:left-5 md:right-5 md:flex-row md:items-start md:justify-between pointer-events-none">
        <div className="pointer-events-auto w-full md:w-auto">
          <FilterPanel setFilter={setFilter} />
        </div>

        <div className="pointer-events-auto w-full md:max-w-[320px]">
          <RouteInput setRoute={setRoute} setRouteIssues={setRouteIssues} />
        </div>
      </div>

      {/* ⚠ ROUTE ALERT */}
      {routeIssues.length > 0 && (
        <div className="absolute top-44 left-1/2 -translate-x-1/2 z-[1000] md:top-5
                        bg-yellow-500 text-white px-5 py-2 rounded-xl shadow-lg">
          ⚠ {routeIssues.length} issue(s) on your route
        </div>
      )}

      {/* 🚗 EMPTY STATE */}
      {!route && !selectedIssue && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 
                        -translate-y-1/2 text-white/60 bg-black/40 
                        px-6 py-3 rounded-xl backdrop-blur">
          🚗 Enter route to view issues
        </div>
      )}

      {/* 🗺️ MAP */}
      <div className="h-full w-full">
        <MapComponent
          issues={route ? issues : displayIssues}                 // all issues
          route={route}
          routeIssues={displayIssues}
          setRouteIssues={setRouteIssues}
          selectedIssue={selectedIssue}   // 🔥 NEW
          mode="driver"
        />
      </div>

    

      {/* 📊 LEGEND */}
      <div className="absolute bottom-4 left-3 right-3 z-[1000] md:bottom-6 md:left-6 md:right-auto">
        <Legend />
      </div>
    </div>
  );
}
