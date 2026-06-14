"use client";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import API from "../utils/api";
import DashboardPreview from "@/components/DashboardPreview";

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

      {/* HERO SECTION */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-16 pb-12 flex flex-col justify-start items-center flex-1">
        
        {/* HERO CENTER: Text & CTAs */}
        <div className="w-full flex flex-col space-y-4 text-center items-center">
          
          <div className="flex flex-col items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/15 to-purple-500/15 border border-indigo-500/30 text-indigo-300 text-[10px] font-black uppercase tracking-wider shadow-md shadow-indigo-950/20">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
              CivicGuard Platform
            </div>
            {/* Tagline Slogan branding */}
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
              Detect Risk &bull; Prioritize Action &bull; Reduce Impact
            </span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-[1.1] text-white max-w-3xl">
            Municipal Risk Intelligence Platform
          </h2>
          
          <div className="space-y-2 max-w-2xl text-center">
            <p className="text-indigo-200 text-xs md:text-sm leading-relaxed font-bold border-y border-white/5 py-2 px-3">
              Transform citizen-reported hazards into actionable municipal decisions.
            </p>
            <p className="text-white/60 text-[11px] md:text-xs leading-relaxed max-w-lg mx-auto">
              Identify high-risk areas, prioritize interventions, and help authorities reduce citywide risk before incidents escalate.
            </p>
            <p className="text-indigo-400/80 text-[10px] md:text-xs font-bold uppercase tracking-wider mt-1.5">
              Built for Municipal Authorities, Smart Cities, and Civic Operations Teams.
            </p>
          </div>
 
          {/* INTERACTIVE CALL TO ACTIONS */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center w-full max-w-md pt-1">
            <Link href="/dashboard" className="w-full sm:w-auto flex-1">
              <button className="w-full px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-xl shadow-indigo-950/20 hover:scale-[1.03] active:scale-95 transition cursor-pointer uppercase tracking-wider">
                Explore Dashboard
              </button>
            </Link>
            <Link href="/report" className="w-full sm:w-auto flex-1">
              <button className="w-full px-5 py-2.5 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-white font-bold text-xs shadow-md hover:scale-[1.03] active:scale-95 transition cursor-pointer uppercase tracking-wider">
                Submit Risk Report
              </button>
            </Link>
          </div>

          {/* 🖥️ GLOWING PRODUCT SHOWCASE SCREENSHOT */}
          <div className="w-full max-w-3xl mt-6 bg-slate-900/40 border border-indigo-500/20 rounded-3xl p-1.5 backdrop-blur-md shadow-[0_0_30px_rgba(99,102,241,0.15)] hover:shadow-[0_0_45px_rgba(99,102,241,0.35)] transition-all duration-300 ease-out hover:-translate-y-1 relative">
            {/* Browser frame decoration */}
            <div className="flex items-center justify-between px-4 py-1.5 border-b border-white/5 bg-slate-950/40 rounded-t-2xl">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500/80" />
                <span className="w-2 h-2 rounded-full bg-yellow-500/80" />
                <span className="w-2 h-2 rounded-full bg-green-500/80" />
              </div>
              <div className="text-[9px] text-white/40 font-mono select-none px-6 py-0.5 rounded bg-black/40 border border-white/5 truncate max-w-xs">
                civicguard.gov/dashboard
              </div>
              <div className="w-12" /> {/* spacer */}
            </div>
            {/* Mockup Dynamic Preview */}
            <div className="relative rounded-b-2xl overflow-hidden bg-slate-950 border-t border-white/5 min-h-[400px]">
              <DashboardPreview stats={stats} issues={issues} />
            </div>
          </div>

          {/* 🌐 PLATFORM OVERVIEW SECTION */}
          <div className="w-full mt-10 flex flex-col gap-8 bg-slate-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md shadow-2xl text-left">
            {/* How CivicGuard Works */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase text-indigo-400 tracking-wider">How CivicGuard Works</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-4 items-stretch text-center text-xs font-bold">
                {[
                  { name: "Citizen Report", icon: "👥", desc: "Report hazards with GPS & photos", path: "/report" },
                  { name: "Risk Analysis", icon: "⚖️", desc: "Process base risk calculations", path: "/dashboard" },
                  { name: "Escalation Detection", icon: "🏛️", desc: "Track high-risk zone spikes", path: "/authority" },
                  { name: "Action Recommendation", icon: "🔮", desc: "Simulate mitigation options", path: "/authority/forecast" },
                  { name: "Risk Reduction", icon: "🚗", desc: "Optimize dispatch paths", path: "/driver" }
                ].map((step) => (
                  <Link
                    key={step.path}
                    href={step.path}
                    className="p-4 bg-slate-950/60 border border-white/5 hover:border-indigo-500/30 rounded-2xl flex flex-col items-center justify-between gap-2 transition hover:scale-[1.02] cursor-pointer group shadow-lg"
                  >
                    <div className="text-xl bg-white/5 p-2 rounded-xl group-hover:bg-indigo-950/40 transition">
                      {step.icon}
                    </div>
                    <span className="text-xs font-bold text-white group-hover:text-indigo-300 transition">
                      {step.name}
                    </span>
                    <p className="text-[9px] text-slate-500 font-medium leading-normal mt-1">
                      {step.desc}
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            {/* Core Capabilities */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase text-indigo-400 tracking-wider">Core Capabilities</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl flex items-start gap-3">
                  <span className="text-lg bg-indigo-500/10 p-2 rounded-xl text-indigo-300">📍</span>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white">Risk Detection</h4>
                    <p className="text-[10px] text-white/50 leading-relaxed">Identify emerging risk hotspots across municipal zones.</p>
                  </div>
                </div>
                <div className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl flex items-start gap-3">
                  <span className="text-lg bg-rose-500/10 p-2 rounded-xl text-rose-300">🚨</span>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white">Escalation Monitoring</h4>
                    <p className="text-[10px] text-white/50 leading-relaxed">Detect growing incidents before they escalate into civic crises.</p>
                  </div>
                </div>
                <div className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl flex items-start gap-3">
                  <span className="text-lg bg-amber-500/10 p-2 rounded-xl text-amber-300">🛠</span>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white">Resource Allocation</h4>
                    <p className="text-[10px] text-white/50 leading-relaxed">Recommend where municipal crews and resources should deploy.</p>
                  </div>
                </div>
                <div className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl flex items-start gap-3">
                  <span className="text-lg bg-emerald-500/10 p-2 rounded-xl text-emerald-300">📉</span>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white">Intervention Planning</h4>
                    <p className="text-[10px] text-white/50 leading-relaxed">Simulate resolution actions before spending city resources.</p>
                  </div>
                </div>
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
