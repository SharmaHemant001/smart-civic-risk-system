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
  riskValue?: number;
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
    <div className="flex h-full min-h-0 flex-col bg-black md:relative md:block">

      {/* 🔥 TOP CONTROLS */}
      <div className="z-[1000] flex flex-col gap-3 p-3 md:absolute md:top-5 md:left-5 md:right-5 md:flex-row md:items-start md:justify-between md:pointer-events-none md:p-0">
        <div className="w-full md:pointer-events-auto md:w-auto">
          <FilterPanel setFilter={setFilter} />
        </div>

        <div className="w-full md:pointer-events-auto md:max-w-[320px]">
          <RouteInput setRoute={setRoute} setRouteIssues={setRouteIssues} />
        </div>
      </div>

      {/* ⚠ ROUTE ALERT */}
      {routeIssues.length > 0 && (
        <div className="mx-3 mb-3 rounded-xl bg-yellow-500 px-5 py-2 text-white shadow-lg md:absolute md:top-5 md:left-1/2 md:z-[1000] md:-translate-x-1/2">
          ⚠ {routeIssues.length} issue(s) on your route
        </div>
      )}

      {/* 🚗 EMPTY STATE */}
      {!route && !selectedIssue && (
        <div className="absolute top-1/2 left-1/2 z-[900] -translate-x-1/2 
                        -translate-y-1/2 text-white/60 bg-black/40 
                        px-6 py-3 rounded-xl backdrop-blur">
          🚗 Enter route to view issues
        </div>
      )}

      {/* 🗺️ MAP */}
      <div className="min-h-0 flex-1 w-full px-3 pb-3 md:h-full md:px-0 md:pb-0">
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
      <div className="z-[1000] px-3 pb-3 md:absolute md:bottom-6 md:left-6 md:right-auto md:px-0 md:pb-0">
        <Legend />
      </div>
    </div>
  );
}
