"use client";
import dynamic from "next/dynamic";

const MapComponent = dynamic(
  () => import("@/components/MapComponent"),
  { ssr: false }
);

import { useEffect, useState } from "react";
import API from "../../utils/api";
import Chart from "../../components/Chart";
import getLocationName from "../../utils/getLocationName";

type Issue = {
  _id: string;
  imageUrl: string;
  issueType: string;
  latitude: number;
  longitude: number;
  votes: number;
  riskScore: string;
  status: string;
  createdAt?: string;
};

const locationCache: any = {};

export default function Dashboard() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [locations, setLocations] = useState<any>({});
  const [topAreas, setTopAreas] = useState<any[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // ✅ FETCH ISSUES
  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const res = await API.get("/issues");

        const sorted = res.data.sort(
          (a: any, b: any) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        );

        setIssues(sorted);
      } catch (err) {
        console.error(err);
      }
    };

    fetchIssues();
  }, []);

  // 🔥 LOCATION FETCH
  useEffect(() => {
    const fetchLocations = async () => {
      const map: any = {};

      for (let issue of issues.slice(0, 10)) {
        const key = `${issue.latitude}-${issue.longitude}`;

        if (locationCache[key]) {
          map[issue._id] = locationCache[key];
        } else {
          try {
            const name = await getLocationName(
              issue.latitude,
              issue.longitude
            );

            const finalName = name || "Unknown";
            locationCache[key] = finalName;
            map[issue._id] = finalName;
          } catch {
            map[issue._id] = "Unknown";
          }
        }
      }

      setLocations(map);
    };

    if (issues.length > 0) fetchLocations();
  }, [issues]);

  // 🔥 TOP AREAS
  useEffect(() => {
    const fetchAreaStats = async () => {
      const map: any = {};

      for (let issue of issues.slice(0, 15)) {
        const key = `${issue.latitude}-${issue.longitude}`;

        let name = locationCache[key];

        if (!name) {
          try {
            name = await getLocationName(issue.latitude, issue.longitude);
            locationCache[key] = name;
          } catch {
            name = "Unknown";
          }
        }

        if (!name || name === "Unknown") continue;

        if (!map[name]) {
          map[name] = { area: name, count: 0 };
        }

        map[name].count++;
      }

      const sorted = Object.values(map)
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 5);

      setTopAreas(sorted);
    };

    if (issues.length > 0) fetchAreaStats();
  }, [issues]);

  // 📊 STATS
  const total = issues.length;
  const high = issues.filter((i) => i.riskScore === "High").length;
  const resolved = issues.filter((i) => i.status === "resolved").length;
  const pending = issues.filter((i) => i.status === "pending").length;
  const inProgress = issues.filter((i) => i.status === "in-progress").length;
  const invalid = issues.filter((i) => i.status === "invalid").length;

  const today = issues.filter((i) => {
    if (!i.createdAt) return false;
    return new Date(i.createdAt).toDateString() === new Date().toDateString();
  }).length;

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-indigo-500 to-purple-500/10 p-6">

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">
          Dashboard Overview
        </h1>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-8 shadow-2xl">

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard title="Today" value={today} />
          <StatCard title="High Risk" value={high} />
          <StatCard title="Resolved" value={resolved} />
          <StatCard title="In Progress" value={inProgress} />
          <StatCard title="Total" value={total} />
        </div>

        {/* ALERT */}
        {topAreas.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-2 rounded-xl text-sm">
            ⚠ High risk concentration detected in {topAreas[0].area}
          </div>
        )}

        {/* CHART */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
          <h2 className="text-white font-semibold mb-1">
            📊 Issues Distribution
          </h2>
          <Chart issues={issues} />
        </div>

        {/* TABLE */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-4">
            Latest Reports
          </h2>

          {issues.slice(0, 5).map((issue) => (
            <div
              key={issue._id}
              onClick={() => {
                localStorage.setItem("selectedIssue", JSON.stringify(issue));
                window.location.href="/driver";
              }}
              className="flex items-center justify-between py-4 border-b border-white/10 hover:bg-white/10 rounded-lg px-3 transition cursor-pointer hover:scale-[1.01]"
            >
              <div className="flex items-center gap-3">
                <img
                  src={issue.imageUrl}
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.png";
                  }}
                  className="w-12 h-12 rounded-lg object-cover"
                />

                <div>
                  <p className="text-white capitalize font-medium">
                    {issue.issueType}
                  </p>
                  <p className="text-xs text-white/60">
                    {locations[issue._id] || "Fetching..."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 min-w-[140px] justify-end">
                <div className="text-white font-semibold text-sm w-12 text-center">
                  {issue.votes}
                </div>

                <span className={`text-xs px-3 py-1 rounded-full text-center w-[110px] ${
                  issue.status === "resolved"
                    ? "bg-green-500/20 text-green-300"
                    : issue.status === "invalid"
                    ? "bg-red-500/20 text-red-300"
                    : issue.status === "in-progress"
                    ? "bg-blue-500/20 text-blue-300"
                    : "bg-yellow-500/20 text-yellow-300"
                }`}>
                  {issue.status || "pending"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 🔥 SELECTED ISSUE INFO (NEW FEATURE) */}
        {selectedIssue && (
          <div className="bg-indigo-500/10 border border-indigo-400/20 p-4 rounded-xl text-white">
            📍 Selected: {selectedIssue.issueType}  
            <br />
            Lat: {selectedIssue.latitude}, Lng: {selectedIssue.longitude}
          </div>
        )}

      </div>
    </div>
  );
}

// CARD
function StatCard({ title, value }: any) {
  return (
    <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow hover:scale-105 transition">
      <p className="text-white/60 text-sm">{title}</p>
      <h2 className="text-3xl font-bold mt-2 text-white text-center">
        {value}
      </h2>
    </div>
  );
}