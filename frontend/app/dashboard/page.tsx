"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import API from "../../utils/api";
import Chart from "../../components/Chart";

const MapComponent = dynamic(
  () => import("@/components/MapComponent"),
  { ssr: false }
);

type Issue = {
  _id: string;
  imageUrl: string;
  issueType: string;
  latitude: number;
  longitude: number;
  votes: number;
  riskScore: string;
  status: string;
  locationName?: string;
  createdAt?: string;
};

export default function Dashboard() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [topAreas, setTopAreas] = useState<any[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(true);

  // =========================
  // FETCH ISSUES
  // =========================
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

  // =========================
  // FETCH TOP AREAS
  // =========================
  useEffect(() => {
    const fetchTopAreas = async () => {
      try {
        const res = await API.get("/issues/top-areas");

        // ✅ remove null / empty areas
        const cleaned = res.data.filter(
          (a: any) => a._id && a._id !== "Unknown"
        );

        setTopAreas(cleaned);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingAreas(false);
      }
    };

    fetchTopAreas();
  }, []);

  // =========================
  // STATS
  // =========================
  const total = issues.length;
  const high = issues.filter((i) => i.riskScore === "High").length;
  const resolved = issues.filter((i) => i.status === "resolved").length;
  const inProgress = issues.filter((i) => i.status === "in-progress").length;

  const today = issues.filter((i) => {
    if (!i.createdAt) return false;
    return new Date(i.createdAt).toDateString() === new Date().toDateString();
  }).length;

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-indigo-500 to-purple-500/10 p-4 md:p-6">

      {/* HEADER */}
      <h1 className="text-xl md:text-3xl font-bold text-white mb-4 md:mb-6">
        Dashboard Overview
      </h1>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 md:p-6 space-y-6 md:space-y-8 shadow-2xl">

        {/* STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
          <StatCard title="Today" value={today} />
          <StatCard title="High Risk" value={high} />
          <StatCard title="Resolved" value={resolved} />
          <StatCard title="In Progress" value={inProgress} />
          <StatCard title="Total" value={total} />
        </div>

        {/* ALERT */}
        {topAreas.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm">
            ⚠ High risk concentration in {topAreas[0]._id}
          </div>
        )}

        {/* CHART */}
        <div className="bg-white/10 rounded-2xl p-4 md:p-6">
          <h2 className="text-white font-semibold mb-2 text-sm md:text-lg">
            📊 Issues Distribution
          </h2>
          <Chart issues={issues} />
        </div>

        {/* TOP AREAS */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/10">
          <h2 className="text-white text-lg font-semibold mb-4">
            🔥 Top Areas
          </h2>

          {loadingAreas ? (
            <div className="text-white/60 text-sm">Loading...</div>
          ) : topAreas.length === 0 ? (
            <div className="text-white/50 text-sm">
              No valid location data yet
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto">
              {topAreas.map((area: any, index: number) => (
                <div
                  key={index}
                  className="min-w-[140px] px-4 py-3 rounded-xl bg-white/10 text-white text-center hover:bg-white/20 transition"
                >
                  {area._id}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* LATEST REPORTS */}
        <div className="bg-white/10 rounded-2xl p-4 md:p-6">
          <h2 className="text-white font-semibold mb-4 text-sm md:text-lg">
            Latest Reports
          </h2>

          {issues.slice(0, 6).map((issue) => (
            <div
              key={issue._id}
              className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-3 border-b border-white/10"
            >
              <div className="flex items-center gap-3">

                <img
                  src={issue.imageUrl}
                  className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover"
                />

                <div>
                  <p className="text-white text-sm md:text-base">
                    {issue.issueType}
                  </p>

                  <p className="text-xs text-white/70">
                    📍 {issue.locationName && issue.locationName !== "Unknown"
                      ? issue.locationName
                      : "Location unavailable"}
                  </p>
                </div>
              </div>

              <div className="flex justify-between md:justify-end gap-4 text-sm">
                <span className="text-white">{issue.votes}</span>
                <span className="text-white/80 text-xs md:text-sm">
                  {issue.status}
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

function StatCard({ title, value }: any) {
  return (
    <div className="bg-white/10 p-3 md:p-5 rounded-xl text-center">
      <p className="text-white/60 text-xs md:text-sm">{title}</p>
      <h2 className="text-xl md:text-3xl text-white font-bold">{value}</h2>
    </div>
  );
}