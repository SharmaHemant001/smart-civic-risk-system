"use client";

import React from "react";

interface DashboardPreviewProps {
  stats?: any;
  issues?: any[];
}

export default function DashboardPreview({ stats, issues = [] }: DashboardPreviewProps) {
  // Safe default mock values if live data hasn't loaded yet
  const defaultIssues = [
    { _id: "p1", issueType: "sewer", severity: "Critical", riskScore: "Critical", riskValue: 98, status: "pending", locationName: "Dwarka Sector 5", communityConfirmations: 12, votes: 27 },
    { _id: "p2", issueType: "pothole", severity: "High", riskScore: "High", riskValue: 84, status: "in-progress", locationName: "Saket", communityConfirmations: 5, votes: 14 },
    { _id: "p3", issueType: "garbage", severity: "Medium", riskScore: "Medium", riskValue: 58, status: "pending", locationName: "Vasant Kunj", communityConfirmations: 2, votes: 8 },
    { _id: "p4", issueType: "construction", severity: "High", riskScore: "High", riskValue: 88, status: "in-progress", locationName: "Karol Bagh", communityConfirmations: 6, votes: 19 },
    { _id: "p5", issueType: "sewer", severity: "Critical", riskScore: "Critical", riskValue: 96, status: "pending", locationName: "Connaught Place", communityConfirmations: 8, votes: 21 },
  ];

  const activeIssues = issues.length > 0 ? issues : defaultIssues;

  // Compute stats based on issues
  const total = activeIssues.length;
  const critical = activeIssues.filter((i) => i.riskScore === "Critical" && !["resolved", "invalid"].includes(i.status)).length;
  const highRisk = activeIssues.filter((i) => (i.finalRisk || i.riskValue || 0) >= 80).length;
  const pendingSla = activeIssues.filter((i) => !["resolved", "invalid"].includes(i.status) && i.slaStatus !== "OK").length;
  
  const criScore = stats?.summary?.criScore || 84;

  return (
    <div className="w-full h-full bg-[#050816] text-white p-4 space-y-4 text-left font-sans text-xs select-none">
      
      {/* 🧭 CONSOLE TOP CONTROL BAR */}
      <div className="flex justify-between items-center bg-[#0B1220] border border-white/5 rounded-xl px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">
            Console Live Preview
          </span>
        </div>
        <div className="flex gap-2">
          <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[9px] font-bold">
            Demo Mode Active
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold">
            API Feed Stable
          </span>
        </div>
      </div>

      {/* 📊 KPI METRIC ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#0B1220] border border-white/5 p-3 rounded-xl hover:border-indigo-500/25 transition">
          <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider block">Community Risk Index</span>
          <span className="text-lg font-black block text-indigo-400 mt-1">{criScore}</span>
          <span className="text-[9px] text-red-400 font-semibold block mt-0.5">🔴 Critical Spike</span>
        </div>
        <div className="bg-[#0B1220] border border-[#6366F1]/10 p-3 rounded-xl hover:border-indigo-500/25 transition">
          <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider block">Critical Issues</span>
          <span className="text-lg font-black block text-rose-400 mt-1">{critical}</span>
          <span className="text-[9px] text-slate-500 font-medium block mt-0.5">Requires crew dispatch</span>
        </div>
        <div className="bg-[#0B1220] border border-white/5 p-3 rounded-xl hover:border-indigo-500/25 transition">
          <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider block">High Risk Areas</span>
          <span className="text-lg font-black block text-orange-400 mt-1">{highRisk}</span>
          <span className="text-[9px] text-slate-500 font-medium block mt-0.5">CRI &ge; 80 in NCR</span>
        </div>
        <div className="bg-[#0B1220] border border-white/5 p-3 rounded-xl hover:border-indigo-500/25 transition">
          <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider block">SLA Watchlist</span>
          <span className="text-lg font-black block text-amber-400 mt-1">{pendingSla || 3}</span>
          <span className="text-[9px] text-amber-300/80 font-semibold block mt-0.5">⏱️ Breach warning</span>
        </div>
      </div>

      {/* 🚨 PRIORITY ALERT CENTERPIECE */}
      <div className="bg-gradient-to-r from-red-950/45 via-[#2D0B0F]/30 to-red-950/45 border border-[#EF4444]/35 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_0_15px_rgba(239,68,68,0.08)]">
        <div>
          <span className="text-rose-400 font-black tracking-wide uppercase text-[9px] flex items-center gap-1.5">
            <span className="animate-ping text-[6px]">🔴</span> Municipal Priority Alert: Dwarka Sector 5
          </span>
          <p className="text-[10px] text-red-200/70 mt-0.5 font-medium">
            Drainage conduits breach threat in 6 hours. Dynamic spatiotemporal hazard spike.
          </p>
        </div>
        <div className="bg-black/45 border border-red-500/10 px-2.5 py-1.5 rounded-lg shrink-0 text-center text-[9px]">
          <span className="text-red-300 font-bold uppercase tracking-wider block text-[8px]">Recommended Action</span>
          <span className="text-white font-extrabold block mt-0.5">Deploy Response Team B</span>
        </div>
      </div>

      {/* 🗃️ DUAL SECTION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left 2 Cols: Map and Action Plan */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* MOCK GIS CITY MAP */}
          <div className="bg-[#0B1220] border border-white/5 rounded-xl p-3.5 space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="font-extrabold text-white flex items-center gap-1.5">
                <span>🗺️</span> City Risk Map replica
              </span>
              <span className="text-[8px] text-slate-500 uppercase tracking-widest">telemetry coordinates</span>
            </div>
            
            {/* The visual stylized map graphic */}
            <div className="h-[140px] w-full bg-[#050816] rounded-lg border border-white/5 relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px]" />
              
              {/* Glowing radar line */}
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-indigo-500/5 to-transparent h-1/2 w-full animate-pulse top-1/4 pointer-events-none" />

              {/* Vector grid shapes simulating neighborhoods */}
              <svg className="w-full h-full opacity-35 absolute inset-0 p-2" viewBox="0 0 100 60" fill="none">
                <path d="M10 10 L40 15 L35 35 L5 25 Z" stroke="#312E81" strokeWidth="0.5" />
                <path d="M40 15 L75 10 L68 40 L35 35 Z" stroke="#312E81" strokeWidth="0.5" />
                <path d="M35 35 L68 40 L55 55 L25 50 Z" stroke="#312E81" strokeWidth="0.5" />
                <path d="M5 25 L35 35 L25 50 L5 40 Z" stroke="#312E81" strokeWidth="0.5" strokeDasharray="2,2" />
              </svg>

              {/* Glowing reports */}
              <span className="absolute top-[20%] left-[25%] flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-white/20"></span>
              </span>
              <span className="absolute top-[50%] left-[55%] flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500 border border-white/20"></span>
              </span>
              <span className="absolute bottom-[20%] left-[40%] flex h-2.5 w-2.5">
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="absolute top-[35%] right-[20%] flex h-2.5 w-2.5">
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500"></span>
              </span>

              {/* Neighborhood Overlay Drawer Simulation */}
              <div className="absolute bottom-2 left-2 bg-black/85 border border-white/10 px-2 py-1 rounded shadow text-[9px] max-w-[150px]">
                <strong className="text-white">Dwarka (Sector 5)</strong>
                <div className="text-indigo-300 font-bold mt-0.5">CRI 98 &bull; Critical Hazard</div>
              </div>
            </div>
          </div>

          {/* TODAY'S ACTION PLAN */}
          <div className="bg-[#0B1220] border border-white/5 rounded-xl p-3.5 space-y-3">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="font-extrabold text-white flex items-center gap-1.5">
                <span>⚡</span> Today's Action Plan dispatches
              </span>
              <span className="text-[9px] text-indigo-400 font-semibold uppercase tracking-wider">Top interventions</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {[
                { title: "Clear Drainage – Dwarka", impact: "CRI -15%", why: "12 reports, outstanding 5d", color: "text-red-400 border-red-500/20 bg-red-500/5" },
                { title: "Repair Pothole – Saket", impact: "CRI -10%", why: "5 reports, outstanding 3d", color: "text-orange-400 border-orange-500/20 bg-orange-500/5" },
                { title: "Clear Garbage – Vasant Kunj", impact: "CRI -6%", why: "2 reports, outstanding 1d", color: "text-yellow-400 border-yellow-500/20 bg-yellow-500/5" },
              ].map((act, i) => (
                <div key={i} className={`p-2 border rounded-lg flex flex-col gap-1.5 ${act.color} text-[10px]`}>
                  <div className="font-bold truncate text-white border-b border-white/5 pb-1">{act.title}</div>
                  <div className="text-[9px] text-slate-400 truncate">{act.why}</div>
                  <div className="text-[9px] font-bold text-emerald-400">Impact: {act.impact}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Col: Top Zones & SLA */}
        <div className="space-y-4">
          
          {/* TOP RISK ZONES */}
          <div className="bg-[#0B1220] border border-white/5 rounded-xl p-3.5 space-y-3">
            <span className="font-extrabold text-white flex items-center gap-1.5 border-b border-white/5 pb-2">
              <span>🏙️</span> Top 5 Risk Zones
            </span>
            <div className="space-y-2.5 pt-1">
              {[
                { name: "Connaught Place", cri: 98, color: "bg-red-500" },
                { name: "Dwarka Sector 5", cri: 96, color: "bg-red-500" },
                { name: "Karol Bagh", cri: 88, color: "bg-orange-500" },
                { name: "Saket", cri: 84, color: "bg-orange-500" },
                { name: "Vasant Kunj", cri: 58, color: "bg-emerald-500" },
              ].map((zone, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between items-center text-[9px] font-semibold">
                    <span className="text-white">{zone.name}</span>
                    <span className="font-mono text-slate-400">{zone.cri}</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-white/5">
                    <div className={`${zone.color} h-full rounded-full`} style={{ width: `${zone.cri}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SLA WATCHLIST */}
          <div className="bg-[#0B1220] border border-white/5 rounded-xl p-3.5 space-y-3">
            <span className="font-extrabold text-white flex items-center gap-1.5 border-b border-white/5 pb-2">
              <span>⏱️</span> SLA Watchlist
            </span>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-[9px]">
                <thead>
                  <tr className="text-slate-400 border-b border-white/5 font-bold">
                    <th className="pb-1">Issue</th>
                    <th className="pb-1">Location</th>
                    <th className="pb-1 text-center">Time</th>
                    <th className="pb-1 text-right">Probability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  <tr>
                    <td className="py-1.5 font-bold">Sewer Blockage</td>
                    <td>Dwarka</td>
                    <td className="text-center font-mono text-red-400">6h</td>
                    <td className="text-right font-mono text-red-400">82%</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-bold">Sewer Main</td>
                    <td>Connaught Pl</td>
                    <td className="text-center font-mono text-orange-400">12h</td>
                    <td className="text-right font-mono text-orange-400">45%</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-bold">Construction</td>
                    <td>Karol Bagh</td>
                    <td className="text-center font-mono text-slate-400">24h</td>
                    <td className="text-right font-mono text-slate-400">45%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
