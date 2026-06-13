"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import API from "../../utils/api";
import Chart from "../../components/Chart";
import dynamic from "next/dynamic";

const MapComponent = dynamic(
  () => import("../../components/MapComponent"),
  { ssr: false }
);

type Issue = {
  _id: string;
  imageUrl: string;
  issueType: string;
  latitude: number;
  longitude: number;
  votes: number;
  communityConfirmations?: number;
  riskScore: string;
  riskLevel?: string;
  riskValue?: number;
  finalRisk?: number;
  status: string;
  locationName?: string;
  createdAt?: string;
  resolvedAt?: string;
  slaDeadline?: string;
  slaStatus?: string;
};

// 🌟 REALISTIC DELHI NCR SEEDED DATASET FOR DEMO MODE FALLBACK
const MOCK_DEMO_ISSUES: Issue[] = [
  {
    _id: "demo-1",
    imageUrl: "",
    issueType: "sewer",
    latitude: 28.5921,
    longitude: 77.0460,
    votes: 21,
    communityConfirmations: 8,
    riskScore: "Critical",
    riskLevel: "Critical",
    riskValue: 96,
    finalRisk: 96,
    status: "pending",
    locationName: "Dwarka",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    slaDeadline: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    slaStatus: "Warning",
  },
  {
    _id: "demo-2",
    imageUrl: "",
    issueType: "pothole",
    latitude: 28.5244,
    longitude: 77.1933,
    votes: 14,
    communityConfirmations: 5,
    riskScore: "High",
    riskLevel: "High",
    riskValue: 84,
    finalRisk: 84,
    status: "in-progress",
    locationName: "Saket",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    slaDeadline: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
    slaStatus: "OK",
  },
  {
    _id: "demo-3",
    imageUrl: "",
    issueType: "garbage",
    latitude: 28.5168,
    longitude: 77.1998,
    votes: 8,
    communityConfirmations: 2,
    riskScore: "Medium",
    riskLevel: "Medium",
    riskValue: 58,
    finalRisk: 58,
    status: "pending",
    locationName: "Vasant Kunj",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    slaDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    slaStatus: "OK",
  },
  {
    _id: "demo-4",
    imageUrl: "",
    issueType: "construction",
    latitude: 28.6505,
    longitude: 77.2028,
    votes: 19,
    communityConfirmations: 6,
    riskScore: "High",
    riskLevel: "High",
    riskValue: 88,
    finalRisk: 88,
    status: "in-progress",
    locationName: "Karol Bagh",
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    slaStatus: "Warning",
  },
  {
    _id: "demo-5",
    imageUrl: "",
    issueType: "sewer",
    latitude: 28.6328,
    longitude: 77.1896,
    votes: 27,
    communityConfirmations: 12,
    riskScore: "Critical",
    riskLevel: "Critical",
    riskValue: 98,
    finalRisk: 98,
    status: "pending",
    locationName: "Connaught Place",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    slaDeadline: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
    slaStatus: "Warning",
  }
];

const MOCK_DEMO_TOP_AREAS = [
  { _id: "Connaught Place", totalIssues: 12, criticalIssues: 5, escalations: 2, cri: 98, trend: "↑ 12%", severityScore: 88, densityScore: 92, criticalIssueScore: 85 },
  { _id: "Dwarka", totalIssues: 18, criticalIssues: 6, escalations: 1, cri: 96, trend: "↑ 8%", severityScore: 84, densityScore: 88, criticalIssueScore: 78 },
  { _id: "Karol Bagh", totalIssues: 15, criticalIssues: 4, escalations: 1, cri: 88, trend: "↑ 2%", severityScore: 78, densityScore: 82, criticalIssueScore: 74 },
  { _id: "Saket", totalIssues: 24, criticalIssues: 8, escalations: 2, cri: 84, trend: "↓ 4%", severityScore: 72, densityScore: 75, criticalIssueScore: 70 },
  { _id: "Vasant Kunj", totalIssues: 8, criticalIssues: 1, escalations: 0, cri: 58, trend: "↓ 6%", severityScore: 52, densityScore: 48, criticalIssueScore: 35 }
];

const MOCK_DEMO_STATS = {
  summary: { criScore: 84 },
  platformHealth: { escalations: 6 }
};

export default function Dashboard() {
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [topAreas, setTopAreas] = useState<any[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [weather, setWeather] = useState("clear");
  const [isAnimating, setIsAnimating] = useState(false);

  // 🛡️ DATA MODE CHECK
  const [isDemo, setIsDemo] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const mode = localStorage.getItem("demoMode");
      // If not explicitly disabled ("false"), default to Demo Mode to preserve mock telemetry
      setIsDemo(mode !== "false");
    }
  }, []);

  const [simState, setSimState] = useState<{
    active: boolean;
    weather: string;
    cri: number;
    reports: number;
    critical: number;
    alert: string;
    recommendation: string;
  }>({
    active: false,
    weather: "clear",
    cri: 0,
    reports: 0,
    critical: 0,
    alert: "",
    recommendation: ""
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleSimEvent = () => {
        const active = localStorage.getItem("sim_active") === "true";
        if (active) {
          const simWeather = localStorage.getItem("sim_weather") || "clear";
          setWeather(simWeather);
          setSimState({
            active: true,
            weather: simWeather,
            cri: parseInt(localStorage.getItem("sim_cri") || "0", 10),
            reports: parseInt(localStorage.getItem("sim_reports") || "0", 10),
            critical: parseInt(localStorage.getItem("sim_critical") || "0", 10),
            alert: localStorage.getItem("sim_alert") || "",
            recommendation: localStorage.getItem("sim_recommendation") || ""
          });
        } else {
          setSimState({
            active: false,
            weather: "clear",
            cri: 0,
            reports: 0,
            critical: 0,
            alert: "",
            recommendation: ""
          });
        }
      };

      handleSimEvent();
      window.addEventListener("civicguard-simulation", handleSimEvent);
      return () => window.removeEventListener("civicguard-simulation", handleSimEvent);
    }
  }, []);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [weather]);

  // Fetch Issues from DB
  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const res = await API.get(`/issues?weather=${weather}`);
        let data = res.data;
        
        // Demo Mode fallback if DB is empty
        if (isDemo && (!data || data.length === 0)) {
          data = MOCK_DEMO_ISSUES;
        }

        const sorted = data.sort(
          (a: any, b: any) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        );
        setIssues(sorted);
        console.log("Demo Mode:", isDemo);
        console.log("Dashboard Data Loaded (Issues)");
      } catch (err) {
        console.error(err);
        if (isDemo) {
          setIssues(MOCK_DEMO_ISSUES);
        } else {
          setIssues([]);
        }
        console.log("Demo Mode:", isDemo);
        console.log("Dashboard Data Loaded (Issues Catch)");
      }
    };
    fetchIssues();
  }, [weather, isDemo]);

  // Fetch Top Areas & Homepage Stats
  useEffect(() => {
    const fetchTopAreas = async () => {
      try {
        const [areasRes, statsRes] = await Promise.all([
          API.get(`/issues/top-areas?weather=${weather}`),
          API.get(`/issues/homepage-stats?weather=${weather}`),
        ]);
        
        let cleaned = areasRes.data.filter(
          (a: any) => a._id && a._id !== "Unknown"
        );
        let statData = statsRes.data;

        // Demo Mode fallback if DB is empty
        if (isDemo && (cleaned.length === 0 || !statData)) {
          cleaned = MOCK_DEMO_TOP_AREAS;
          statData = MOCK_DEMO_STATS;
        }

        setTopAreas(cleaned);
        setStats(statData);
        console.log("Dashboard Data Loaded (Stats/Areas)");
      } catch (err) {
        console.error(err);
        if (isDemo) {
          setTopAreas(MOCK_DEMO_TOP_AREAS);
          setStats(MOCK_DEMO_STATS);
        } else {
          setTopAreas([]);
          setStats(null);
        }
        console.log("Dashboard Data Loaded (Stats/Areas Catch)");
      } finally {
        setLoadingAreas(false);
      }
    };
    fetchTopAreas();
  }, [weather, isDemo]);

  // Compute strict data mode parameters
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

  // Dynamic Metrics Binding (No fallback defaults if Empty Mode)
  const activeCount = simState.active 
    ? simState.reports 
    : issues.filter((i) => !["resolved", "invalid"].includes(i.status)).length;
  
  const criticalCount = simState.active 
    ? simState.critical 
    : issues.filter((i) => i.riskScore === "Critical" && !["resolved", "invalid"].includes(i.status)).length;
  
  const resolvedCount = issues.filter((i) => i.status === "resolved").length;
  
  const escalationsCount = simState.active 
    ? (simState.cri >= 89 ? 1 : 0) 
    : (stats?.platformHealth?.escalations ?? 0);
  
  const activeIssuesList = issues.filter((i: any) => !["resolved", "invalid"].includes(i.status));
  const calculatedCRI = activeIssuesList.length > 0
    ? Math.round(activeIssuesList.reduce((sum: number, i: any) => sum + (i.finalRisk || i.riskValue || 0), 0) / activeIssuesList.length)
    : 0;

  const cityCRI = simState.active 
    ? simState.cri 
    : (stats?.summary?.criScore ?? calculatedCRI);

  const highestCriaArea = topAreas.length > 0 ? topAreas[0]._id : "None";
  const potentialReduction = cityCRI > 0 ? Math.round(cityCRI * 0.18) : 0;

  // SLA Watchlist logic (impending deadlines, max 5)
  const getSlaRiskWatchlist = () => {
    const active = issues.filter(i => !["resolved", "invalid"].includes(i.status) && i.slaDeadline);
    const sorted = [...active].sort((a, b) => new Date(a.slaDeadline || 0).getTime() - new Date(b.slaDeadline || 0).getTime());
    return sorted.slice(0, 5).map(issue => {
      const hrs = Math.max(1, Math.round((new Date(issue.slaDeadline || 0).getTime() - Date.now()) / (1000 * 60 * 60)));
      const prob = issue.slaStatus === "Breached" ? 100 : issue.slaStatus === "Warning" ? 82 : 45;
      
      const explanation = `SLA status is ${issue.slaStatus} with ${hrs} hours remaining because of high frequency of civic reports nearby and no dispatch unit assigned yet.`;
      
      return {
        issue: `${issue.riskScore || "Critical"} ${issue.issueType.charAt(0).toUpperCase() + issue.issueType.slice(1)}`,
        location: issue.locationName || "NCR",
        hoursRemaining: hrs,
        probability: prob,
        explanation
      };
    });
  };
  const slaRiskWatchlist = getSlaRiskWatchlist();
  const highRiskAreasCount = topAreas.filter(a => a.cri >= 80).length;
  const responseDelayRiskCount = slaRiskWatchlist.length;

  // Emergency Mode state check
  const showEmergencyMode = cityCRI >= 75 || escalationsCount > 0 || (slaRiskWatchlist && slaRiskWatchlist.some(w => w.probability >= 80));

  // Today's Action Plan (top 3 recommended actions today formatted cleanly with dynamic explainability)
  const getRecommendedActions = () => {
    const active = issues.filter(i => !["resolved", "invalid"].includes(i.status));
    const sorted = [...active].sort((a, b) => (b.finalRisk || b.riskValue || 0) - (a.finalRisk || a.riskValue || 0));
    return sorted.slice(0, 3).map((issue) => {
      const reduction = Math.max(4, Math.round((issue.finalRisk || issue.riskValue || 80) * 0.1));
      
      let actionTitle = `Resolve Sewer Blockage – ${issue.locationName}`;
      if (issue.issueType === "pothole") {
        actionTitle = `Repair Pothole Cluster – ${issue.locationName}`;
      } else if (issue.issueType === "garbage") {
        actionTitle = `Clear Garbage Hotspot – ${issue.locationName}`;
      } else if (issue.issueType === "construction") {
        actionTitle = `Secure Construction Hazard – ${issue.locationName}`;
      } else {
        const formattedType = issue.issueType.charAt(0).toUpperCase() + issue.issueType.slice(1).replace("_", " ");
        actionTitle = `Resolve ${formattedType} – ${issue.locationName}`;
      }

      // Calculate days unresolved
      const createdDate = issue.createdAt ? new Date(issue.createdAt) : new Date();
      const daysUnresolved = Math.max(1, Math.round((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));
      const confirmations = issue.communityConfirmations || 0;
      const votesCount = issue.votes || 0;

      const priority = issue.riskScore || "Critical";
      const why = `${confirmations + votesCount} unresolved report validations, outstanding for ${daysUnresolved} days.`;
      const expectedImpact = `CRI -${reduction}%`;

      return {
        title: actionTitle,
        priorityScore: Math.round(issue.finalRisk || issue.riskValue || 80),
        reduction,
        priority,
        why,
        expectedImpact
      };
    });
  };
  const recommendedActions = getRecommendedActions();

  // Municipal Impact Dashboard calculations (Dynamic)
  const resolvedIssues = useMemo(() => issues.filter(i => i.status === "resolved"), [issues]);
  
  const criticalRisksPrevented = useMemo(() => {
    return resolvedIssues.filter(i => 
      i.riskScore === "Critical" || 
      i.riskLevel === "Critical" || 
      (i.riskValue !== undefined && i.riskValue >= 80)
    ).length;
  }, [resolvedIssues]);

  const potentialSlaBreachesAvoided = useMemo(() => {
    return resolvedIssues.filter(i => {
      if (i.slaStatus === "Warning" || i.slaStatus === "Breached") return true;
      if (!i.slaDeadline || !i.createdAt) return false;
      const totalSlaMs = new Date(i.slaDeadline).getTime() - new Date(i.createdAt).getTime();
      const remainingAtResolution = new Date(i.slaDeadline).getTime() - (i.resolvedAt ? new Date(i.resolvedAt).getTime() : Date.now());
      return totalSlaMs > 0 && remainingAtResolution > 0 && (remainingAtResolution / totalSlaMs) <= 0.25;
    }).length;
  }, [resolvedIssues]);

  const estimatedCitizensImpacted = useMemo(() => {
    if (issues.length === 0) return 0;
    return (activeCount * 150) + (resolvedCount * 50);
  }, [activeCount, resolvedCount, issues]);

  const riskReductionAchieved = useMemo(() => {
    if (resolvedCount === 0 || cityCRI === 0) return { percentage: 0 };
    const averageResolvedImpact = resolvedIssues.length > 0 
      ? Math.round(resolvedIssues.reduce((sum, i) => sum + (i.finalRisk || i.riskValue || 45), 0) / resolvedIssues.length)
      : 45;
    const previousCRI = cityCRI + Math.round((resolvedCount * averageResolvedImpact * 0.15));
    const pointReduction = Math.max(0, previousCRI - cityCRI);
    const pctReduction = previousCRI > 0 ? Math.round((pointReduction / previousCRI) * 100) : 0;
    return {
      percentage: pctReduction
    };
  }, [resolvedIssues, resolvedCount, cityCRI]);

  const renderEmptyState = (message: string = "No operational data available.") => {
    return (
      <div className="flex flex-col items-center justify-center text-center p-6 bg-[#0B1220] border border-[#6366F1]/15 rounded-2xl w-full my-2">
        <span className="text-2xl mb-2">🛡️</span>
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">{message}</h4>
        <p className="text-[10px] text-slate-400 mt-1.5 mb-3">
          There are no active municipal hazards or risk reports registered in this region.
        </p>
        <Link
          href="/report"
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer shadow-md"
        >
          Submit Risk Report
        </Link>
      </div>
    );
  };

  return (
    <div className="min-h-full overflow-x-hidden bg-[#050816] p-4 md:p-6 text-slate-100 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h1 className="text-xl md:text-3xl font-extrabold text-white tracking-tight">
                Executive Dashboard
              </h1>
              <span className={`px-2.5 py-1 border rounded-full text-[10px] font-black uppercase tracking-wider self-start ${dataModeColor}`}>
                {dataModeLabel}
              </span>
            </div>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">
              Detect Risk &bull; Prioritize Action &bull; Reduce Impact
            </p>
          </div>
          
          <div className="bg-[#0B1220] border border-[#6366F1]/15 rounded-2xl px-4 py-2 backdrop-blur-md text-xs font-bold text-slate-300 flex items-center gap-2 self-start sm:self-auto shadow-md">
            <span className="text-slate-400 uppercase tracking-wider text-[10px]">Weather Simulation:</span>
            <select
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
              className="bg-[#050816] text-white border border-[#6366F1]/30 rounded px-2 py-0.5 outline-none cursor-pointer focus:border-[#7C3AED] transition-colors font-bold"
            >
              <option value="clear">☀️ Clear</option>
              <option value="rain">🌧️ Heavy Rain</option>
              <option value="heat">🔥 Extreme Heat</option>
            </select>
          </div>
        </div>

        {/* 🚨 COMPACT EMERGENCY MODE ALERT BANNER */}
        {showEmergencyMode && issues.length > 0 && (
          <div className="relative overflow-hidden bg-gradient-to-r from-red-950/85 via-[#3F0A10]/70 to-red-950/85 border border-[#EF4444]/40 rounded-2xl p-4 shadow-[0_0_20px_rgba(239,68,68,0.15)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-20 animate-pulse">
            <div className="space-y-1">
              <h3 className="text-rose-400 font-black text-sm uppercase tracking-wider flex items-center gap-2">
                <span>🚨</span> Critical Infrastructure Risk Detected in {highestCriaArea}
              </h3>
              <p className="text-[11px] text-red-200/80 font-medium">
                {criticalCount} active critical reports • {escalationsCount} active escalations
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 text-xs bg-black/45 border border-red-500/10 p-3 rounded-xl">
              <div>
                <span className="text-red-300 font-bold uppercase tracking-wider text-[9px] block">Recommended Action:</span>
                <span className="text-white font-extrabold">{weather === "rain" ? "Immediate drainage intervention" : weather === "heat" ? "Immediate sanitation dispatch" : "Immediate repair dispatches"}</span>
              </div>
              <div className="sm:border-l sm:border-red-500/20 sm:pl-6">
                <span className="text-red-300 font-bold uppercase tracking-wider text-[9px] block">Expected Reduction:</span>
                <span className="text-emerald-400 font-black text-sm">15%</span>
              </div>
            </div>
          </div>
        )}

        {/* 📊 KPI SUMMARY LAYER */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Community Risk Index" value={cityCRI} subtitle={cityCRI >= 75 ? "🔴 Critical" : cityCRI >= 50 ? "🟠 Elevated" : "🟢 Stable"} isAnimating={isAnimating} />
          <StatCard title="Critical Issues" value={criticalCount} subtitle="Immediate attention required" isAnimating={isAnimating} />
          <StatCard title="High Risk Areas" value={highRiskAreasCount} subtitle="Zones with CRI &ge; 80" isAnimating={isAnimating} />
          <StatCard title="Response Delay Risk" value={responseDelayRiskCount} subtitle="Impending SLA deadlines" isAnimating={isAnimating} />
        </div>

        {/* =========================================================
            ⚡ SECTION 1: MUNICIPAL RISK RADAR
           ========================================================= */}
        <div className="w-full bg-[#0B1220] border border-[#6366F1]/20 rounded-2xl p-5 shadow-2xl">
          <div className="border-b border-[#6366F1]/15 pb-3 flex justify-between items-center">
            <div>
              <h2 className="text-[#7C3AED] font-black text-sm uppercase tracking-wider flex items-center gap-2">
                <span>📡</span> Municipal Risk Radar
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">Highest Risk Area &amp; Mitigation Target</p>
            </div>
            <span className="px-2 py-0.5 rounded bg-[#7C3AED]/20 border border-[#7C3AED]/30 text-[#A78BFA] text-[9px] font-bold uppercase tracking-wider">
              Centerpiece
            </span>
          </div>

          {issues.length === 0 ? (
            renderEmptyState("No active hotspot telemetry.")
          ) : (
            <div className="bg-[#050816]/80 border border-indigo-500/30 rounded-2xl p-5 mt-4 relative overflow-hidden shadow-2xl">
              <div className="absolute top-[-20%] right-[-20%] w-[50%] h-[50%] bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none" />
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10 text-xs">
                
                {/* 1. Highest Risk Area */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-[#A78BFA] font-bold uppercase tracking-wider block">📍 Highest Risk Area</span>
                  <h3 className="text-lg font-black text-white truncate">
                    {simState.active && simState.cri >= 89 ? "Dwarka Sector 5" : (topAreas[0]?._id || "Saket")}
                  </h3>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-bold">
                    CRI: {simState.active ? simState.cri : (topAreas[0]?.cri || 0)} (Critical)
                  </div>
                </div>

                {/* 2. Reason */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-[#A78BFA] font-bold uppercase tracking-wider block">🚨 Reason</span>
                  <p className="text-slate-300 leading-relaxed font-medium text-[11px]">
                    {simState.active && simState.alert
                      ? simState.alert
                      : `This sector exhibits the highest concentration of active infrastructure hazards (${topAreas[0]?.totalIssues ?? 0} active, ${topAreas[0]?.criticalIssues ?? 0} critical).`}
                  </p>
                </div>

                {/* 3. Recommended Action */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-[#A78BFA] font-bold uppercase tracking-wider block">🛠️ Recommended Action</span>
                  <p className="text-slate-300 leading-relaxed font-medium text-[11px]">
                    {weather === "rain" ? "Immediate drainage dispatch and pump clearance." : weather === "heat" ? "Deploy emergency sanitation sweep crews." : "Deploy emergency road repair and hazard cleanup crews."}
                  </p>
                </div>

                {/* 4. Expected Risk Reduction */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-[#A78BFA] font-bold uppercase tracking-wider block">📈 Expected Risk Reduction</span>
                  <div className="space-y-1">
                    <span className="text-2xl font-black text-emerald-400 block font-mono">
                      -{potentialReduction}%
                    </span>
                    <span className="text-[9px] text-slate-400 block font-bold">Community Risk Index Drop</span>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>


        {/* =========================================================
            🗺️ SECTION 2: CITY RISK MAP CENTERPIECE
           ========================================================= */}
        <div className={`bg-[#0B1220] border rounded-2xl p-5 shadow-xl transition-all duration-700 ${isAnimating ? "border-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.25)]" : "border-[#6366F1]/15"}`}>
          <div className="flex items-center justify-between border-b border-[#6366F1]/10 pb-3">
            <div>
              <h2 className="text-white font-extrabold text-sm md:text-lg flex items-center gap-2">
                <span>🗺️</span> City Risk Map
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time geospatial visualization of active infrastructure and public safety hazards.
              </p>
            </div>
            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider shrink-0 bg-[#050816]/60 border border-white/5 px-3 py-1.5 rounded-xl">
              <span className="flex items-center gap-1"><span className="text-red-500">🔴</span> High Risk (&ge;80)</span>
              <span className="flex items-center gap-1"><span className="text-orange-500">🟠</span> Mod Risk (50-79)</span>
              <span className="flex items-center gap-1"><span className="text-emerald-500">🟢</span> Stable (&lt;50)</span>
            </div>
          </div>
          <div className="h-[400px] w-full rounded-xl overflow-hidden border border-white/5 relative z-10 mt-4 bg-[#050816]">
            {issues.length === 0 ? (
              <div className="h-full w-full flex items-center justify-center text-xs text-slate-500">
                Awaiting map telemetry coordinates.
              </div>
            ) : (
              <MapComponent issues={issues} areas={topAreas} weather={weather} route={null} />
            )}
          </div>
        </div>

        {/* =========================================================
            ⚡ SECTION 3: TODAY'S ACTION PLAN
           ========================================================= */}
        <div className={`w-full bg-[#0B1220] border rounded-2xl p-5 shadow-2xl flex flex-col justify-between transition-all duration-700 ${isAnimating ? "border-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.25)]" : "border-[#6366F1]/20"}`}>
          <div>
            <div className="border-b border-[#6366F1]/10 pb-3 flex justify-between items-center">
              <div>
                <h2 className="text-white font-extrabold text-sm md:text-base flex items-center gap-2">
                  <span>⚡</span> Today's Action Plan
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Top recommended interventions.
                </p>
              </div>
              <button
                onClick={() => router.push("/authority")}
                className="px-3 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
              >
                Dispatch
              </button>
            </div>

            {recommendedActions.length === 0 ? (
              renderEmptyState("No active recommendations today.")
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {recommendedActions.map((act, idx) => (
                  <div key={idx} className="bg-[#050816]/60 border border-white/5 p-3.5 rounded-xl flex flex-col gap-2 transition hover:scale-[1.01] shadow-inner text-xs">
                    <div className="flex items-center justify-between border-b border-white/5 pb-1.5 gap-2">
                      <span className="font-bold text-white truncate">{act.title}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shrink-0 ${
                        act.priority === "Critical" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                        act.priority === "High" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" :
                        "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                      }`}>
                        Priority: {act.priority}
                      </span>
                    </div>
                    <div className="text-[10px] space-y-1 text-slate-400 leading-normal">
                      <div>
                        <strong className="text-slate-300">Why:</strong> {act.why}
                      </div>
                      <div>
                        <strong className="text-emerald-400">Expected Impact:</strong> {act.expectedImpact}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* =========================================================
            🏙️ SECTION 4: OPERATIONAL INSIGHTS (ZONES + SLA LIST)
           ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-[#0B1220] border border-[#6366F1]/15 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#6366F1]/10 pb-3">
              <div>
                <h2 className="text-white font-extrabold text-sm md:text-lg flex items-center gap-2">
                  <span>🏙️</span> Top 5 Risk Zones
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Neighborhood risk profiles ranked by dynamic City Risk Index (CRI).
                </p>
              </div>
            </div>

            <div className="space-y-3.5">
              {loadingAreas ? (
                <div className="text-slate-400 text-sm py-8 text-center animate-pulse">Loading area telemetry...</div>
              ) : topAreas.length === 0 ? (
                renderEmptyState("No active neighborhood risk reports.")
              ) : (
                topAreas.slice(0, 5).map((area: any, index: number) => {
                  const cri = area.cri;
                  const colorClass = cri >= 80 ? "bg-red-500" : cri >= 50 ? "bg-orange-500" : "bg-emerald-500";
                  const textClass = cri >= 80 ? "text-red-400" : cri >= 50 ? "text-orange-400" : "text-emerald-400";
                  
                  return (
                     <div key={index} className="space-y-1">
                       <div className="flex justify-between items-center text-xs font-semibold">
                         <div className="flex items-center gap-2">
                           <span className={`w-2 h-2 rounded-full ${colorClass}`} />
                           <span className="text-white font-bold">{area._id}</span>
                         </div>
                         <span className={`font-mono font-bold ${textClass}`}>CRI {cri}</span>
                       </div>
                       <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-white/5">
                         <div className={`${colorClass} h-full rounded-full transition-all duration-500`} style={{ width: `${cri}%` }} />
                       </div>
                     </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="lg:col-span-5 bg-[#0B1220] border border-[#6366F1]/15 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="border-b border-[#6366F1]/10 pb-3">
              <h2 className="text-white font-extrabold text-sm md:text-lg flex items-center gap-2">
                <span>⏱️</span> SLA Watchlist
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Impending ticket deadlines requiring crew dispatches.
              </p>
            </div>

            {slaRiskWatchlist.length === 0 ? (
              renderEmptyState("All active issues within safe margins.")
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-400 border-b border-white/5 uppercase tracking-wider font-semibold text-[9px]">
                      <th className="py-2">Issue</th>
                      <th className="py-2">Location</th>
                      <th className="py-2 text-center">Remaining</th>
                      <th className="py-2 text-right">Probability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-200">
                    {slaRiskWatchlist.map((row, index) => (
                      <tr key={index} title={row.explanation} className="hover:bg-white/5 transition-colors cursor-help">
                        <td className="py-2.5 font-bold text-white capitalize text-[11px]">{row.issue}</td>
                        <td className="py-2.5 text-slate-300 text-[11px]">{row.location}</td>
                        <td className="py-2.5 text-center font-bold text-rose-400 text-[11px]">{row.hoursRemaining} Hrs</td>
                        <td className="py-2.5 text-right">
                          <span className={`px-1.5 py-0.5 rounded font-bold text-[8px] ${
                            row.probability >= 80 ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}>
                            {row.probability}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Section 6: Incident Distribution */}
        <div className="bg-[#0B1220] border border-[#6366F1]/15 rounded-2xl p-5 shadow-xl">
          <h2 className="text-white font-extrabold text-sm md:text-base flex items-center gap-2 border-b border-[#6366F1]/10 pb-3">
            <span>📊</span> Incident Distribution
          </h2>
          <div className="h-[160px] mt-4">
            {issues.length === 0 ? (
              <div className="h-full w-full flex items-center justify-center text-xs text-slate-500">
                Awaiting category metrics telemetry feed.
              </div>
            ) : (
              <Chart issues={issues} />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, isAnimating }: { title: string; value: any; subtitle: string; isAnimating?: boolean }) {
  return (
    <div className="bg-[#0B1220] border border-[#6366F1]/15 p-5 rounded-2xl text-center flex flex-col justify-center min-h-[110px] transition-all hover:scale-[1.02] shadow-md">
      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{title}</p>
      <h2 className={`text-3xl font-black mt-1.5 transition-all duration-300 ${isAnimating ? "text-indigo-400 scale-110 drop-shadow-[0_0_15px_#6366F1]" : "text-white"}`}>
        {value}
      </h2>
      <p className="text-slate-400 text-[10px] font-semibold mt-1">{subtitle}</p>
    </div>
  );
}
