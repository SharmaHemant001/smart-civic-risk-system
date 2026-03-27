
"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import API from "../../utils/api";
import FilterPanel from "../../components/FilterPanel";
import Legend from "../../components/Legend";
import RouteInput from "../../components/RouteInput";

// ✅ Issue type
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

// ✅ Dynamic Map import
const MapComponent = dynamic(
  () => import("@/components/MapComponent").then((mod) => mod.default),
  { ssr: false }
) as React.ComponentType<{
  issues: Issue[];
  route: any;
  routeIssues?: Issue[];
}>;

export default function DriverPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filter, setFilter] = useState("");
  const [route, setRoute] = useState<any>(null);
  const [routeIssues, setRouteIssues] = useState<Issue[]>([]);

  // 🔥 Fetch issues (LESS FREQUENT)
  const fetchIssues = async () => {
    try {
      const res = await API.get("/issues");
      setIssues(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchIssues();

    const interval = setInterval(fetchIssues, 30000); // ✅ reduced refresh
    return () => clearInterval(interval);
  }, []);

  // 🔎 Filter
  const filteredIssues = filter
    ? issues.filter((i) => i.issueType === filter)
    : issues;

  // ✅ MEMOIZED MAP (KEY FIX)
 
 const baseIssues = route ? routeIssues : [];

const displayIssues = filter
  ? baseIssues.filter((i) => i.issueType === filter)
  : baseIssues;




const memoMap = useMemo(() => {
  return (
    <MapComponent
      issues={displayIssues}
      route={route}
      routeIssues={routeIssues}
    />
  );
}, [displayIssues, route, routeIssues]);

  return (
    <div className="relative w-full h-full">

      {/* 🔥 FILTER */}
      <div className="absolute top-5 left-5 z-[1000]">
        <FilterPanel setFilter={setFilter} />
      </div>

      {/* 🔥 ROUTE */}
      <div className="absolute top-5 right-5 z-[1000] w-[280px]">
        <RouteInput setRoute={setRoute} setRouteIssues={setRouteIssues} />
      </div>

      {/* ⚠ ROUTE ALERT */}
      {routeIssues.length > 0 && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[1000]
                        bg-yellow-500 text-white px-5 py-2 rounded-xl shadow-lg">
          ⚠ {routeIssues.length} issue(s) on your route
        </div>
      )}
         

       { !route && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000]
                        bg-indigo-500 text-white px-5 py-2 rounded-xl shadow-lg">
                  🚗 Enter route
        </div>
      )}


      {/* 🗺️ MAP */}
      <div className="h-full w-full">
        {memoMap}
      </div>

      {/* 📊 LEGEND */}
      <div className="absolute bottom-6 left-6 z-[1000]">
        <Legend />
      </div>
    </div>
  );
}

