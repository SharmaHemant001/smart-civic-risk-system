"use client";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import API from "../utils/api";

export default function HomePage() {
  const [stats, setStats] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(true);

  const MOCK_DEMO_ISSUES = [
    { _id: "d1", issueType: "sewer", severity: "Critical", riskScore: "Critical", status: "pending", locationName: "Dwarka", createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), slaDeadline: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), slaStatus: "Warning", votes: 21, communityConfirmations: 8 },
    { _id: "d2", issueType: "pothole", severity: "High", riskScore: "High", status: "in-progress", locationName: "Saket", createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), slaDeadline: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(), slaStatus: "OK", votes: 14, communityConfirmations: 5 },
    { _id: "d3", issueType: "garbage", severity: "Medium", riskScore: "Medium", status: "pending", locationName: "Vasant Kunj", createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), slaDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), slaStatus: "OK", votes: 8, communityConfirmations: 2 },
    { _id: "d4", issueType: "construction", severity: "High", riskScore: "High", status: "in-progress", locationName: "Karol Bagh", createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), slaStatus: "Warning", votes: 19, communityConfirmations: 6 },
    { _id: "d5", issueType: "sewer", severity: "Critical", riskScore: "Critical", status: "pending", locationName: "Connaught Place", createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), slaDeadline: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(), slaStatus: "Warning", votes: 27, communityConfirmations: 12 }
  ];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, issuesRes] = await Promise.all([
          API.get("/issues/homepage-stats"),
          API.get("/issues"),
        ]);
        let statsData = statsRes.data;
        let issuesData = issuesRes.data;

        const isDemoMode = typeof window !== "undefined" ? (localStorage.getItem("demoMode") !== "false") : true;
        setIsDemo(isDemoMode);

        if (isDemoMode && (!issuesData || issuesData.length === 0)) {
          issuesData = MOCK_DEMO_ISSUES;
          statsData = {
            summary: { total: 5, critical: 2, resolved: 0, active: 5, resolvedPercentage: 0, criScore: 84 },
            platformHealth: { reportsToday: 2, activeHazards: 5, escalations: 1, protectedRoutes: 4, aiAccuracy: "94%" },
            liveActivity: [
              "🔴 Critical Alert: sewer reported in Dwarka (5m ago)",
              "🔴 Critical Alert: sewer reported in Connaught Place (15m ago)",
              "🔄 Forecast models synchronized with weather feed"
            ]
          };
        }

        setStats(statsData);
        setIssues(issuesData);
      } catch (err) {
        console.error("Failed to fetch homepage stats:", err);
        const isDemoMode = typeof window !== "undefined" ? (localStorage.getItem("demoMode") !== "false") : true;
        setIsDemo(isDemoMode);
        if (isDemoMode) {
          setIssues(MOCK_DEMO_ISSUES);
          setStats({
            summary: { total: 5, critical: 2, resolved: 0, active: 5, resolvedPercentage: 0, criScore: 84 },
            platformHealth: { reportsToday: 2, activeHazards: 5, escalations: 1, protectedRoutes: 4, aiAccuracy: "94%" },
            liveActivity: [
              "🔴 Critical Alert: sewer reported in Dwarka (5m ago)",
              "🔴 Critical Alert: sewer reported in Connaught Place (15m ago)",
              "🔄 Forecast models synchronized with weather feed"
            ]
          });
        } else {
          setStats({
            summary: { total: 0, critical: 0, resolved: 0, active: 0, resolvedPercentage: 0, criScore: 0 },
            platformHealth: { reportsToday: 0, activeHazards: 0, escalations: 0, protectedRoutes: 0, aiAccuracy: "N/A" },
            liveActivity: []
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const totalReportsCount = issues.length;
  const activeIssuesCount = issues.filter((i) => !["resolved", "invalid"].includes(i.status)).length;
  const criticalIssuesCount = issues.filter((i) => i.riskScore === "Critical" && !["resolved", "invalid"].includes(i.status)).length;
  const resolvedIssuesCount = issues.filter((i) => i.status === "resolved").length;
  const cityCRI = stats?.summary?.criScore ?? 0;

  const riskReductionPercent = useMemo(() => {
    if (issues.length === 0 || cityCRI === 0) return 0;
    const resolvedIssues = issues.filter(i => i.status === "resolved");
    const averageResolvedImpact = resolvedIssues.length > 0 
      ? Math.round(resolvedIssues.reduce((sum: number, i: any) => sum + (i.finalRisk || i.riskValue || 0), 0) / resolvedIssues.length)
      : 0;
    const previousCRI = cityCRI + Math.round((resolvedIssuesCount * averageResolvedImpact * 0.15));
    const pointReduction = Math.max(0, previousCRI - cityCRI);
    return previousCRI > 0 ? Math.round((pointReduction / previousCRI) * 100) : 0;
  }, [issues, cityCRI, resolvedIssuesCount]);

  const breachesAvoidedCount = useMemo(() => {
    return issues.filter(i => {
      if (i.status !== "resolved") return false;
      if (i.slaStatus === "Warning" || i.slaStatus === "Breached") return true;
      if (!i.slaDeadline || !i.createdAt) return false;
      const totalSlaMs = new Date(i.slaDeadline).getTime() - new Date(i.createdAt).getTime();
      const remainingAtResolution = new Date(i.slaDeadline).getTime() - (i.resolvedAt ? new Date(i.resolvedAt).getTime() : Date.now());
      return totalSlaMs > 0 && remainingAtResolution > 0 && (remainingAtResolution / totalSlaMs) <= 0.25;
    }).length;
  }, [issues]);

  const liveActivity = stats?.liveActivity && stats.liveActivity.length > 0 
    ? stats.liveActivity 
    : [
        "🟠 Spike trigger check operational in NCR",
        "🟢 Forecast models synchronized",
        "🔄 Recalculating risk indices..."
      ];

  return (
    <div className="min-h-full bg-slate-950 text-white relative overflow-x-hidden flex flex-col justify-between">
      {/* 🔮 BACKGROUND GRADIENT GLOWS */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-500/10 rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute top-[30%] right-[10%] w-[350px] h-[350px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* 🟢 LIVE TICKER BANNER */}
      <div className="w-full bg-slate-900 border-b border-white/5 py-2 overflow-hidden relative z-20">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 shrink-0 uppercase tracking-widest border-r border-white/10 pr-4 mr-4">
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            Live Status
          </div>
          <div className="w-full overflow-hidden whitespace-nowrap relative">
            <div className="inline-flex gap-8 animate-marquee text-xs font-medium text-white/80">
              {liveActivity.map((act: string, idx: number) => (
                <span key={idx} className="inline-flex items-center gap-1">
                  {act}
                </span>
              ))}
              {/* Duplicate for seamless scrolling */}
              {liveActivity.map((act: string, idx: number) => (
                <span key={`dup-${idx}`} className="inline-flex items-center gap-1">
                  {act}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>


      {/* HERO SECTION */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-6 py-16 md:py-28 flex flex-col justify-center items-center flex-1">
        
        {/* HERO CENTER: Text & CTAs */}
        <div className="w-full flex flex-col space-y-8 text-center items-center">
          
          {(() => {
            const isEmptyMode = issues.length === 0 && !isDemo;
            const dataModeLabel = isEmptyMode
              ? "⚪ No Operational Data"
              : isDemo
              ? "🟣 Demo Dataset Active"
              : "🟢 Live Operational Data";
            const dataModeColor = isEmptyMode
              ? "bg-slate-500/10 border-slate-500/20 text-slate-400"
              : isDemo
              ? "bg-purple-500/10 border-purple-500/20 text-purple-400 animate-pulse"
              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
            return (
              <div className="flex flex-col items-center gap-3">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/15 to-purple-500/15 border border-indigo-500/30 text-indigo-300 text-[10px] font-black uppercase tracking-wider shadow-md shadow-indigo-950/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  CivicGuard Platform
                </div>
                <span className={`px-2.5 py-0.5 border rounded-full text-[9px] font-black uppercase tracking-wider ${dataModeColor}`}>
                  {dataModeLabel}
                </span>
              </div>
            );
          })()}
          
          <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1] text-white max-w-3xl">
            CivicGuard
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-200 mt-2 text-3xl md:text-5xl font-black">
              Municipal Risk Intelligence Platform
            </span>
          </h2>
          
          <div className="space-y-4 max-w-2xl text-center">
            <p className="text-indigo-200 text-sm md:text-base leading-relaxed font-bold border-y border-white/5 py-4 px-3">
              Predict Risk. Prioritize Interventions. Reduce Citywide Incidents Before Escalation.
            </p>
            <p className="text-white/60 text-xs md:text-sm leading-relaxed font-normal max-w-lg mx-auto">
              Transforming civic reports, environmental signals, and operational data into actionable municipal intelligence.
            </p>
          </div>
 
          {/* INTERACTIVE CALL TO ACTIONS */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-lg pt-4">
            <Link href="/report" className="w-full sm:w-auto flex-1">
              <button className="w-full px-6 py-3.5 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-white font-bold text-xs shadow-md hover:scale-[1.03] active:scale-95 transition cursor-pointer uppercase tracking-wider">
                📤 Report Hazard
              </button>
            </Link>
            <Link href="/dashboard" className="w-full sm:w-auto flex-1">
              <button className="w-full px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-xl shadow-indigo-950/20 hover:scale-[1.03] active:scale-95 transition cursor-pointer uppercase tracking-wider">
                📊 Executive Dashboard
              </button>
            </Link>
            <Link href="/authority" className="w-full sm:w-auto flex-1">
              <button className="w-full px-6 py-3.5 rounded-xl bg-white text-slate-950 font-bold text-xs shadow-xl hover:scale-[1.03] active:scale-95 transition cursor-pointer uppercase tracking-wider">
                🏛️ Command Center
              </button>
            </Link>
          </div>

          {/* 🌐 PLATFORM OVERVIEW SECTION */}
          <div className="w-full mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 text-left bg-slate-900/40 border border-white/5 rounded-3xl p-8 backdrop-blur-md shadow-2xl">
            {/* How CivicGuard Works */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase text-indigo-400 tracking-wider">How CivicGuard Works</h3>
              <ol className="space-y-2.5 text-xs text-white/75 font-semibold">
                <li className="flex items-center gap-3 bg-white/5 border border-white/5 px-4 py-2 rounded-xl">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">1</span>
                  Citizen Reports Hazard
                </li>
                <li className="flex items-center gap-3 bg-white/5 border border-white/5 px-4 py-2 rounded-xl">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">2</span>
                  AI Risk Analysis
                </li>
                <li className="flex items-center gap-3 bg-white/5 border border-white/5 px-4 py-2 rounded-xl">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">3</span>
                  Escalation Detection
                </li>
                <li className="flex items-center gap-3 bg-white/5 border border-white/5 px-4 py-2 rounded-xl">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">4</span>
                  Resource Allocation
                </li>
                <li className="flex items-center gap-3 bg-white/5 border border-white/5 px-4 py-2 rounded-xl">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">5</span>
                  Risk Reduction
                </li>
              </ol>
            </div>

            {/* Why Cities Need This */}
            <div className="space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase text-indigo-400 tracking-wider">Why Cities Need This</h3>
                <ul className="space-y-2.5 text-xs text-white/75 font-semibold">
                  <li className="flex items-center gap-3 bg-white/5 border border-white/5 px-4 py-2 rounded-xl">
                    <span className="text-indigo-400">📡</span> Detect emerging hotspots
                  </li>
                  <li className="flex items-center gap-3 bg-white/5 border border-white/5 px-4 py-2 rounded-xl">
                    <span className="text-rose-400">⏱️</span> Prevent SLA breaches
                  </li>
                  <li className="flex items-center gap-3 bg-white/5 border border-white/5 px-4 py-2 rounded-xl">
                    <span className="text-amber-400">🛠️</span> Prioritize repair crews
                  </li>
                  <li className="flex items-center gap-3 bg-white/5 border border-white/5 px-4 py-2 rounded-xl">
                    <span className="text-emerald-400">🛡️</span> Reduce citywide risk
                  </li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* FOOTER ARCHITECTURE */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto px-6 py-8 border-t border-white/5 bg-slate-950/80 backdrop-blur-md text-center">
        <div className="text-[10px] text-white/30 uppercase tracking-wider">
          CivicGuard Platform &copy; 2026. Built for Smart Cities 🚀
        </div>
      </footer>

      {/* Styling for Marquee Scrolling Animation */}
      <style jsx global>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

function StatCard({ value, label, color }: { value: any; label: string; color: string }) {
  return (
    <div className="bg-slate-900/40 border border-white/5 p-3 rounded-xl shadow-lg flex flex-col justify-center">
      <p className={`text-2xl font-black tracking-tight ${color}`}>{value}</p>
      <p className="text-[10px] text-white/50 uppercase font-semibold mt-0.5">{label}</p>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-slate-900/40 border border-white/5 hover:border-indigo-500/20 p-4 rounded-2xl transition-all duration-300 hover:scale-[1.02] shadow-xl group">
      <span className="text-xl bg-white/5 p-2 rounded-xl group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-colors inline-block">{icon}</span>
      <h3 className="font-bold text-xs text-white mt-2">{title}</h3>
      <p className="text-[10px] text-white/50 mt-1 leading-normal">{desc}</p>
    </div>
  );
}
