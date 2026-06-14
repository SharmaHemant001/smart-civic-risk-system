"use client";

import React, { useState, useMemo } from "react";

interface IssueItem {
  id: string;
  type: string;
  location: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  risk: number;
  status: "Pending" | "Dispatched";
  lat: number;
  lng: number;
}

export default function DashboardPreview() {
  // 1. Interactive State representing actual dashboard datasets
  const [issues, setIssues] = useState<IssueItem[]>([
    { id: "1", type: "sewer", location: "Dwarka Sector 5", severity: "Critical", risk: 98, status: "Pending", lat: 28.5921, lng: 77.0460 },
    { id: "2", type: "pothole", location: "Saket", severity: "High", risk: 84, status: "Pending", lat: 28.5244, lng: 77.1933 },
    { id: "3", type: "garbage", location: "Vasant Kunj", severity: "Medium", risk: 58, status: "Pending", lat: 28.5168, lng: 77.1998 },
    { id: "4", type: "construction", location: "Karol Bagh", severity: "High", risk: 88, status: "Pending", lat: 28.6505, lng: 77.2028 },
  ]);

  // 2. Dispatch Interactive Handler
  const handleDispatch = (id: string) => {
    setIssues((prev) =>
      prev.map((issue) =>
        issue.id === id ? { ...issue, status: "Dispatched" } : issue
      )
    );
  };

  const handleReset = () => {
    setIssues((prev) =>
      prev.map((issue) => ({ ...issue, status: "Pending" }))
    );
  };

  // 3. Dynamic Derived Telemetry
  const activeIssues = useMemo(() => issues.filter((i) => i.status === "Pending"), [issues]);
  const resolvedCount = useMemo(() => issues.filter((i) => i.status === "Dispatched").length, [issues]);

  const criScore = useMemo(() => {
    if (activeIssues.length === 0) return 30; // base floor
    const sum = activeIssues.reduce((acc, curr) => acc + curr.risk, 0);
    return Math.round(sum / activeIssues.length);
  }, [activeIssues]);

  const criticalCount = useMemo(() => activeIssues.filter((i) => i.severity === "Critical").length, [activeIssues]);
  const highRiskCount = useMemo(() => activeIssues.filter((i) => i.risk >= 80).length, [activeIssues]);

  return (
    <div className="w-full bg-[#050816] text-white p-6 rounded-3xl border border-white/5 space-y-6 text-left font-sans text-xs select-none shadow-2xl relative overflow-hidden">
      
      {/* Background glow overlay */}
      <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
            Interactive Console Preview
          </h3>
          <p className="text-[10px] text-white/50 mt-1">
            Simulate a municipal dispatch in real-time. Click "Dispatch Crew" to see risks clear.
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-center">
          {resolvedCount > 0 && (
            <button
              onClick={handleReset}
              className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 rounded-lg text-[9px] font-bold transition duration-200 cursor-pointer"
            >
              🔄 Reset Demo
            </button>
          )}
          <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[9px] font-black uppercase tracking-wider">
            100% Live Mock Simulation
          </span>
        </div>
      </div>

      {/* KPI METRIC ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#0B1220] border border-white/5 p-3.5 rounded-2xl transition hover:border-indigo-500/20">
          <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider block">City Risk Index (CRI)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-black block text-indigo-400">{criScore}</span>
            {criScore > 80 ? (
              <span className="text-[8px] text-rose-400 font-extrabold uppercase bg-rose-500/10 px-1.5 py-0.5 rounded">Severe</span>
            ) : criScore > 50 ? (
              <span className="text-[8px] text-amber-400 font-extrabold uppercase bg-amber-500/10 px-1.5 py-0.5 rounded">Elevated</span>
            ) : (
              <span className="text-[8px] text-emerald-400 font-extrabold uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded">Safe</span>
            )}
          </div>
        </div>

        <div className="bg-[#0B1220] border border-white/5 p-3.5 rounded-2xl transition hover:border-indigo-500/20">
          <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider block">Critical Incidents</span>
          <span className="text-xl font-black block text-rose-400 mt-1">{criticalCount}</span>
        </div>

        <div className="bg-[#0B1220] border border-white/5 p-3.5 rounded-2xl transition hover:border-indigo-500/20">
          <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider block">High Risk Zones</span>
          <span className="text-xl font-black block text-orange-400 mt-1">{highRiskCount}</span>
        </div>

        <div className="bg-[#0B1220] border border-white/5 p-3.5 rounded-2xl transition hover:border-indigo-500/20">
          <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider block">Mitigated Risk Reports</span>
          <span className="text-xl font-black block text-emerald-400 mt-1">{resolvedCount}</span>
        </div>
      </div>

      {/* CORE INTERACTIVE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Map Preview & Action Recommendations */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* STYLIZED VECTOR MAP PREVIEW */}
          <div className="bg-[#0B1220] border border-white/5 rounded-2xl p-4 space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="font-extrabold text-white flex items-center gap-1.5">
                <span>🗺️</span> City Risk Map Preview
              </span>
              <span className="text-[8px] text-slate-500 uppercase tracking-widest font-mono">Real-time GPS nodes</span>
            </div>

            <div className="h-[180px] w-full bg-[#050816] rounded-xl border border-white/5 relative flex items-center justify-center overflow-hidden">
              {/* Dot grid simulation */}
              <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px]" />
              
              {/* Pulsing radar scanner */}
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-indigo-500/5 to-transparent h-1/2 w-full animate-pulse top-1/4 pointer-events-none" />

              {/* Grid Lines */}
              <svg className="w-full h-full opacity-25 absolute inset-0 p-3" viewBox="0 0 100 60" fill="none">
                <path d="M10 10 L45 8 L38 32 L5 25 Z" stroke="#312E81" strokeWidth="0.5" />
                <path d="M45 8 L80 12 L72 38 L38 32 Z" stroke="#312E81" strokeWidth="0.5" />
                <path d="M38 32 L72 38 L60 52 L25 48 Z" stroke="#312E81" strokeWidth="0.5" />
                <path d="M5 25 L38 32 L25 48 L8 40 Z" stroke="#312E81" strokeWidth="0.5" />
              </svg>

              {/* GPS Active Pins */}
              {issues.map((item) => {
                const isPending = item.status === "Pending";
                // Convert geographic lat/lng to percentage-based coordinates for simulation
                let left = "50%";
                let top = "50%";
                if (item.id === "1") { left = "25%"; top = "25%"; }
                else if (item.id === "2") { left = "60%"; top = "55%"; }
                else if (item.id === "3") { left = "42%"; top = "75%"; }
                else if (item.id === "4") { left = "75%"; top = "32%"; }

                return (
                  <div
                    key={item.id}
                    className="absolute transition-all duration-500 ease-out"
                    style={{ left, top }}
                  >
                    {isPending ? (
                      <span className="flex h-4.5 w-4.5 -translate-x-1/2 -translate-y-1/2">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-indigo-400`} />
                        <span className={`relative inline-flex rounded-full h-4 w-4 border border-white/20 items-center justify-center text-[7px] font-black ${
                          item.severity === "Critical" ? "bg-red-600 text-white" : "bg-orange-600 text-white"
                        }`}>
                          ⚠️
                        </span>
                      </span>
                    ) : (
                      <span className="flex h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 animate-scaleIn">
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500/20 border border-emerald-500 text-emerald-400 items-center justify-center text-[7px] font-black">
                          ✓
                        </span>
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Floating detail box for the selected highest priority area */}
              {activeIssues.length > 0 && (
                <div className="absolute bottom-3 left-3 bg-black/85 border border-white/10 px-3 py-2 rounded-xl shadow-xl text-[9px] max-w-[170px] backdrop-blur-md animate-fadeIn">
                  <div className="font-bold text-white flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    {activeIssues[0].location}
                  </div>
                  <div className="text-indigo-300 font-extrabold mt-0.5">
                    CRI Risk Score: {activeIssues[0].risk}
                  </div>
                  <div className="text-white/50 text-[8px] mt-0.5 capitalize">
                    Category: {activeIssues[0].type}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ACTION RECOMMENDATIONS */}
          <div className="bg-[#0B1220] border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="font-extrabold text-white flex items-center gap-1.5">
                <span>⚡</span> Recommended Action Plan & Crew Dispatch
              </span>
              <span className="text-[8px] text-indigo-400 font-bold uppercase tracking-wider">Dynamic Priorities</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {issues.map((item) => {
                const isPending = item.status === "Pending";

                let actionTitle = "";
                let actionDesc = "";
                let cardColor = "";

                if (item.type === "sewer") {
                  actionTitle = `Clear Sewer Main – ${item.location}`;
                  actionDesc = "Severe conduit blockages require immediate high-pressure vacuum extraction.";
                  cardColor = isPending ? "border-rose-500/20 bg-rose-500/5 hover:border-rose-500/40 text-rose-300" : "border-white/5 bg-slate-950/20 opacity-40 text-slate-400";
                } else if (item.type === "pothole") {
                  actionTitle = `Repair Pothole Cluster – ${item.location}`;
                  actionDesc = "Potholes reported on high-traffic artery. Immediate cold asphalt mix deployment.";
                  cardColor = isPending ? "border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40 text-amber-300" : "border-white/5 bg-slate-950/20 opacity-40 text-slate-400";
                } else if (item.type === "garbage") {
                  actionTitle = `SWM Waste Clearance – ${item.location}`;
                  actionDesc = "Commercial solid waste dumping blocking public right of way. Dispatch garbage truck.";
                  cardColor = isPending ? "border-yellow-500/20 bg-yellow-500/5 hover:border-yellow-500/40 text-yellow-300" : "border-white/5 bg-slate-950/20 opacity-40 text-slate-400";
                } else {
                  actionTitle = `Inspect Scaffolding – ${item.location}`;
                  actionDesc = "Unsecured scaffolding reported adjacent to pedestrian crossing. Structural audit.";
                  cardColor = isPending ? "border-orange-500/20 bg-orange-500/5 hover:border-orange-500/40 text-orange-300" : "border-white/5 bg-slate-950/20 opacity-40 text-slate-400";
                }

                return (
                  <div
                    key={item.id}
                    className={`p-3 border rounded-xl flex flex-col justify-between gap-3 text-[10px] transition duration-300 ${cardColor}`}
                  >
                    <div className="space-y-1">
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-extrabold text-white truncate">{actionTitle}</span>
                        {isPending && (
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                            item.severity === "Critical" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                          }`}>
                            {item.severity}
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-400 leading-relaxed line-clamp-2">
                        {actionDesc}
                      </p>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-white/5 gap-2 mt-1">
                      <span className="text-[9px] font-extrabold text-emerald-400">
                        Mitigation Impact: -{Math.round(item.risk * 0.15)} CRI
                      </span>
                      {isPending ? (
                        <button
                          onClick={() => handleDispatch(item.id)}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 hover:scale-[1.03] active:scale-95 cursor-pointer shadow-md shadow-indigo-950/25"
                        >
                          Dispatch Crew
                        </button>
                      ) : (
                        <span className="text-[9px] text-emerald-400 font-black flex items-center gap-1 py-1">
                          🟢 Dispatched & Resolved
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Top Areas & Risk Trend/SLA */}
        <div className="space-y-5">
          
          {/* TOP RISK AREAS */}
          <div className="bg-[#0B1220] border border-white/5 rounded-2xl p-4 space-y-4">
            <span className="font-extrabold text-white flex items-center gap-1.5 border-b border-white/5 pb-2">
              <span>🏙️</span> Risk Area Leaderboard
            </span>
            
            <div className="space-y-3">
              {issues.map((item) => {
                const isPending = item.status === "Pending";
                const displayRisk = isPending ? item.risk : 15; // drops significantly when resolved

                let barColor = "bg-red-500";
                if (displayRisk < 40) barColor = "bg-emerald-500";
                else if (displayRisk < 80) barColor = "bg-orange-500";

                return (
                  <div key={item.id} className="space-y-1">
                    <div className="flex justify-between items-center text-[9px] font-semibold">
                      <span className={`${isPending ? "text-white" : "text-slate-500 line-through"}`}>
                        {item.location}
                      </span>
                      <span className="font-mono text-slate-400">{displayRisk} CRI</span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-white/5">
                      <div
                        className={`${barColor} h-full rounded-full transition-all duration-500 ease-out`}
                        style={{ width: `${displayRisk}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RISK TREND & SLA POLICY WATCHLIST */}
          <div className="bg-[#0B1220] border border-white/5 rounded-2xl p-4 space-y-3">
            <span className="font-extrabold text-white flex items-center gap-1.5 border-b border-white/5 pb-2">
              <span>⏱️</span> SLA Breach Warnings
            </span>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-[9px]">
                <thead>
                  <tr className="text-slate-500 border-b border-white/5 font-bold">
                    <th className="pb-1">Category</th>
                    <th className="pb-1">Location</th>
                    <th className="pb-1 text-center">Remaining</th>
                    <th className="pb-1 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  {issues.map((item) => {
                    const isPending = item.status === "Pending";
                    let remaining = "";
                    let remainingColor = "";
                    let statusLabel = "";

                    if (!isPending) {
                      remaining = "N/A";
                      remainingColor = "text-slate-500";
                      statusLabel = "🟢 Resolved";
                    } else {
                      if (item.severity === "Critical") {
                        remaining = "6h";
                        remainingColor = "text-red-400 font-extrabold";
                        statusLabel = "🔴 Alert";
                      } else if (item.severity === "High") {
                        remaining = "18h";
                        remainingColor = "text-orange-400 font-bold";
                        statusLabel = "🟡 Warning";
                      } else {
                        remaining = "42h";
                        remainingColor = "text-slate-400";
                        statusLabel = "🔵 Active";
                      }
                    }

                    return (
                      <tr key={item.id} className="transition duration-300">
                        <td className="py-2 font-bold capitalize">{item.type}</td>
                        <td>{item.location.split(" ")[0]}</td>
                        <td className={`text-center font-mono ${remainingColor}`}>{remaining}</td>
                        <td className={`text-right font-extrabold text-[8px] uppercase ${isPending ? (item.severity === "Critical" ? "text-rose-400 animate-pulse" : "text-orange-400") : "text-emerald-400"}`}>
                          {statusLabel}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
