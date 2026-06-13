"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import API from "../../utils/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from "recharts";

const MapComponent = dynamic(
  () => import("@/components/MapComponent"),
  { ssr: false }
);

type Issue = {
  _id: string;
  issueType: string;
  locationName: string;
  latitude: number;
  longitude: number;
  votes: number;
  communityConfirmations?: number;
  riskScore: string;
  riskLevel?: string;
  riskValue?: number;
  finalRisk?: number;
  status: string;
  createdAt: string;
  slaDeadline: string;
  slaStatus: string;
  slaHoursRemaining: number;
  explanation?: string;
  breakdown?: any;
  severity?: string;
};

type AreaRank = {
  rank: number;
  area: string;
  cri: number;
  totalIssues: number;
  criticalIssues: number;
  trend: string;
};

export default function AuthorityDashboard() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  // Weather Simulator Mode: clear, rain, heat
  const [weather, setWeather] = useState("clear");

  // Fetch states
  const [stats, setStats] = useState<any>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [areas, setAreas] = useState<AreaRank[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [expandedIssueIds, setExpandedIssueIds] = useState<string[]>([]);
  
  // Loading indicators
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(true);

  // Filters & Search states
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRisk, setFilterRisk] = useState("");
  const [filterSla, setFilterSla] = useState("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Multi-select for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState<"resolved" | "in-progress" | "recalculate" | null>(null);

  // Analytics Chart Range: 7days, 30days
  const [chartRange, setChartRange] = useState<"7days" | "30days">("30days");

  // Live Escalation Alert Feed State
  const [escalations, setEscalations] = useState<any[]>([]);
  const [escalationsLoading, setEscalationsLoading] = useState(true);
  const [checkingEscalations, setCheckingEscalations] = useState(false);

  // Simulation states
  const [simActive, setSimActive] = useState<boolean>(false);
  const [simAlert, setSimAlert] = useState<string>("");
  const [simCRI, setSimCRI] = useState<number | null>(null);
  const [simReports, setSimReports] = useState<number | null>(null);
  const [simCritical, setSimCritical] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleSimEvent = () => {
        const active = localStorage.getItem("sim_active") === "true";
        setSimActive(active);
        if (active) {
          setSimAlert(localStorage.getItem("sim_alert") || "");
          const w = localStorage.getItem("sim_weather");
          if (w) setWeather(w);
          setSimCRI(parseInt(localStorage.getItem("sim_cri") || "0", 10) || null);
          setSimReports(parseInt(localStorage.getItem("sim_reports") || "0", 10) || null);
          setSimCritical(parseInt(localStorage.getItem("sim_critical") || "0", 10) || null);
        } else {
          setSimAlert("");
          setSimCRI(null);
          setSimReports(null);
          setSimCritical(null);
        }
      };

      handleSimEvent();
      window.addEventListener("civicguard-simulation", handleSimEvent);
      return () => window.removeEventListener("civicguard-simulation", handleSimEvent);
    }
  }, []);

  const activeAlerts = useMemo(() => {
    const list = [...escalations];
    if (simActive && simAlert) {
      list.unshift({
        _id: "sim-escalation-alert",
        area: "Dwarka Sector 5",
        status: "Critical",
        message: simAlert,
        timestamp: new Date().toISOString(),
        oldRisk: 74,
        newRisk: 98,
        riskIncrease: 24,
        trendDirection: "Increasing",
        issueCount: 14
      });
    }
    return list;
  }, [escalations, simActive, simAlert]);

  // Heatmap selection overlay filter
  const [heatmapFilter, setHeatmapFilter] = useState<"all" | "critical" | "breached" | "high">("all");

  // Impact Simulator Checklist
  const [simulatorSelectedIds, setSimulatorSelectedIds] = useState<string[]>([]);
  const [simResults, setSimResults] = useState<{
    currentCityRisk: number;
    projectedCityRisk: number;
    riskReduction: number;
    originalForecast?: any;
    remainingForecast?: any;
    originalAreaForecasts?: any[];
    projectedAreaForecasts?: any[];
  } | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  const criticalIssuesRemoved = useMemo(() => {
    return issues.filter(i => simulatorSelectedIds.includes(i._id) && i.riskScore === "Critical").length;
  }, [simulatorSelectedIds, issues]);

  const escalationsPreventedCount = useMemo(() => {
    return issues.filter(i => simulatorSelectedIds.includes(i._id) && (i.votes || 0) >= 4).length;
  }, [simulatorSelectedIds, issues]);

  const estimatedResolutionEffort = useMemo(() => {
    let totalHours = 0;
    simulatorSelectedIds.forEach(id => {
      const issue = issues.find(i => i._id === id);
      if (issue) {
        const level = issue.riskScore || issue.severity;
        if (level === "Critical") totalHours += 12;
        else if (level === "High") totalHours += 8;
        else if (level === "Medium") totalHours += 4;
        else totalHours += 2;
      }
    });
    if (totalHours === 0) return "0h";
    if (totalHours >= 24) {
      const days = (totalHours / 8).toFixed(1);
      return `${days} Crew-Days`;
    }
    return `${totalHours} Person-Hours`;
  }, [simulatorSelectedIds, issues]);

  const loadEscalations = async () => {
    try {
      const res = await API.get("/escalations/recent");
      setEscalations(res.data);
    } catch (err) {
      console.error("Failed to load escalations:", err);
    } finally {
      setEscalationsLoading(false);
    }
  };

  const handleCheckEscalations = async () => {
    setCheckingEscalations(true);
    try {
      await API.post("/escalations/check");
      await loadEscalations();
    } catch (err) {
      console.error("Failed to check escalations:", err);
    } finally {
      setCheckingEscalations(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDemoMode = localStorage.getItem("demoMode") !== "false";
      setIsDemo(isDemoMode);
      const token = localStorage.getItem("accessToken");
      const isTokenValid = token && token !== "null" && token !== "undefined";
      const userStr = localStorage.getItem("user");
      let user = null;
      try {
        if (userStr) user = JSON.parse(userStr);
      } catch (err) {}
      
      const allowedRoles = ["operator", "supervisor", "admin", "dispatcher", "manager", "fieldcrew"];
      const userRole = user?.role ? user.role.toLowerCase() : "";
 
      // Debug Log
      console.log("AUTHORITY ROUTE AUTH DEBUG:", {
        loading: !authChecked,
        user,
        role: userRole,
        pathname: "/authority",
        isTokenValid,
        isDemo: isDemoMode
      });
 
      if (isDemoMode) {
        setAuthChecked(true);
      } else if (!isTokenValid) {
        router.push("/dashboard");
      } else if (!allowedRoles.includes(userRole)) {
        router.push("/dashboard");
      } else {
        setAuthChecked(true);
      }
    }
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    loadEscalations();
    const interval = setInterval(() => {
      loadEscalations();
    }, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [authChecked]);

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  // Load dashboard data
  const loadDashboardData = async () => {
    setTimeout(() => setLoading(true), 0);
    try {
      // Build query string
      const weatherParam = `weather=${weather}`;
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
      const typeParam = filterType ? `&issueType=${filterType}` : "";
      const statusParam = filterStatus ? `&status=${filterStatus}` : "";
      const riskParam = filterRisk ? `&riskLevel=${filterRisk}` : "";
      const slaParam = filterSla ? `&slaStatus=${filterSla}` : "";

      const [statsRes, issuesRes, areasRes, analyticsRes] = await Promise.all([
        API.get(`/authority/stats?${weatherParam}`),
        API.get(`/authority/issues?${weatherParam}${searchParam}${typeParam}${statusParam}${riskParam}${slaParam}`),
        API.get(`/authority/areas?${weatherParam}`),
        API.get(`/authority/analytics?${weatherParam}`),
      ]);

      setStats(statsRes.data);
      setIssues(issuesRes.data);
      setAreas(areasRes.data);
      setAnalytics(analyticsRes.data);
      setSelectedIds([]); // Reset multi-selects

      // Auto pre-select top 5 highest-risk active issues if simulatorSelectedIds is empty
      if (issuesRes.data && issuesRes.data.length > 0 && simulatorSelectedIds.length === 0) {
        const active = issuesRes.data.filter((i: any) => !["resolved", "invalid"].includes(i.status));
        if (active.length > 0) {
          const sorted = [...active].sort((a: any, b: any) => (b.finalRisk || b.riskValue || 0) - (a.finalRisk || a.riskValue || 0));
          const top5 = sorted.slice(0, 5).map((i: any) => i._id);
          setSimulatorSelectedIds(top5);
        }
      }
    } catch (err) {
      console.error("Failed to load authority command center metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger loading when weather or filter changes
  useEffect(() => {
    if (!authChecked) return;
    const timer = setTimeout(() => {
      loadDashboardData();
    }, 0);
    return () => clearTimeout(timer);
  }, [weather, search, filterType, filterStatus, filterRisk, filterSla, authChecked]);

  // Run impact simulation on selection changes
  useEffect(() => {
    if (!authChecked) return;
    const runSimulation = async () => {
      setTimeout(() => setSimLoading(true), 0);
      try {
        const idsStr = simulatorSelectedIds.join(",");
        const res = await API.get(`/authority/impact-simulation?ids=${idsStr}&weather=${weather}`);
        setSimResults(res.data);
      } catch (err) {
        console.error("Impact simulation failed:", err);
      } finally {
        setSimLoading(false);
      }
    };
    const timer = setTimeout(() => {
      runSimulation();
    }, 0);
    return () => clearTimeout(timer);
  }, [simulatorSelectedIds, weather, authChecked]);

  // Bulk Actions executor
  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.length === 0) return;
    setBulkLoading(true);
    setShowBulkModal(false);
    try {
      await API.post("/authority/bulk-update", {
        ids: selectedIds,
        action: bulkAction,
        weather,
      });
      // Reload page and clear simulator selection if issues got resolved
      if (bulkAction === "resolved") {
        setSimulatorSelectedIds(prev => prev.filter(id => !selectedIds.includes(id)));
      }
      await loadDashboardData();
    } catch (err) {
      console.error("Bulk action failed:", err);
      alert("Failed to execute bulk action. Please try again.");
    } finally {
      setBulkLoading(false);
      setBulkAction(null);
    }
  };

  // CSV Exporter
  const handleExportCSV = () => {
    const weatherParam = `weather=${weather}`;
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
    const typeParam = filterType ? `&issueType=${filterType}` : "";
    const statusParam = filterStatus ? `&status=${filterStatus}` : "";
    const riskParam = filterRisk ? `&riskLevel=${filterRisk}` : "";
    const slaParam = filterSla ? `&slaStatus=${filterSla}` : "";

    // Trigger raw browser download
    const url = `${API.defaults.baseURL}/authority/export?${weatherParam}${searchParam}${typeParam}${statusParam}${riskParam}${slaParam}`;
    window.open(url, "_blank");
  };

  // Table selections
  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedIssues.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedIssues.map(i => i._id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Priority-sorted issues queue (ranked by Risk Score, SLA Urgency, and Escalation Risk)
  const sortedIssues = useMemo(() => {
    return [...issues].sort((a: any, b: any) => {
      const aRisk = a.finalRisk || a.riskValue || 0;
      const bRisk = b.finalRisk || b.riskValue || 0;
      const aSlaUrgency = a.slaStatus === "Breached" ? 30 : a.slaStatus === "Warning" ? 15 : 0;
      const bSlaUrgency = b.slaStatus === "Breached" ? 30 : b.slaStatus === "Warning" ? 15 : 0;
      const aEscalation = a.votes > 5 ? 15 : 0;
      const bEscalation = b.votes > 5 ? 15 : 0;
      return (bRisk + bSlaUrgency + bEscalation) - (aRisk + aSlaUrgency + aEscalation);
    });
  }, [issues]);

  const paginatedIssues = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedIssues.slice(start, start + itemsPerPage);
  }, [sortedIssues, currentPage]);

  const totalPages = Math.ceil(sortedIssues.length / itemsPerPage);

  const resourceAllocations = useMemo(() => {
    if (areas.length === 0) return [];
    
    const breachIssue = [...issues].filter(i => !["resolved", "invalid"].includes(i.status) && i.slaDeadline)
      .sort((a, b) => new Date(a.slaDeadline || 0).getTime() - new Date(b.slaDeadline || 0).getTime())[0];

    const allocs = [];

    if (areas[0]) {
      allocs.push({
        title: "Priority Deployment 1",
        area: areas[0].area,
        reason: `${areas[0].totalIssues} active issues, ${areas[0].criticalIssues} critical hazards. High density sector threat index.`,
        expectedReduction: `CRI Reduction: -${Math.max(4, Math.round(areas[0].cri * 0.15))} pts`,
        score: "98/100",
        confidence: "High",
        slaImprovement: "High",
        escalationPrevention: "High"
      });
    }

    if (areas[1]) {
      allocs.push({
        title: "Priority Deployment 2",
        area: areas[1].area,
        reason: `${areas[1].totalIssues} unresolved issues with escalating hazard profiles in routing corridors.`,
        expectedReduction: `CRI Reduction: -${Math.max(3, Math.round(areas[1].cri * 0.12))} pts`,
        score: "92/100",
        confidence: "High",
        slaImprovement: "Medium",
        escalationPrevention: "Medium"
      });
    } else if (areas[0]) {
      allocs.push({
        title: "Priority Deployment 2",
        area: areas[0].area,
        reason: "Secondary hazard mitigation sweep in peak risk sector.",
        expectedReduction: `CRI Reduction: -${Math.max(2, Math.round(areas[0].cri * 0.08))} pts`,
        score: "85/100",
        confidence: "Medium",
        slaImprovement: "Medium",
        escalationPrevention: "Medium"
      });
    }

    if (breachIssue) {
      allocs.push({
        title: "Priority Deployment 3",
        area: breachIssue.locationName || "Dwarka",
        reason: `SLA Breach prevention for critical unresolved ${breachIssue.issueType} near breach limits.`,
        expectedReduction: `CRI Reduction: -5 pts`,
        score: "88/100",
        confidence: "High",
        slaImprovement: "Critical",
        escalationPrevention: "Medium"
      });
    } else if (areas[2]) {
      allocs.push({
        title: "Priority Deployment 3",
        area: areas[2].area,
        reason: `SLA warning threshold mitigation for active unresolved risks in ${areas[2].area}.`,
        expectedReduction: `CRI Reduction: -${Math.max(2, Math.round(areas[2].cri * 0.10))} pts`,
        score: "88/100",
        confidence: "High",
        slaImprovement: "High",
        escalationPrevention: "Medium"
      });
    }

    return allocs;
  }, [areas, issues]);

  // Filtered issues to display on heatmap
  const heatmapIssues = useMemo(() => {
    switch (heatmapFilter) {
      case "critical":
        return issues.filter(i => i.riskLevel === "Critical" && !["resolved", "invalid"].includes(i.status));
      case "breached":
        return issues.filter(i => i.slaStatus === "Breached" && !["resolved", "invalid"].includes(i.status));
      case "high":
        return issues.filter(i => (i.riskLevel === "High" || i.riskLevel === "Critical") && !["resolved", "invalid"].includes(i.status));
      default:
        return issues.filter(i => !["resolved", "invalid"].includes(i.status));
    }
  }, [issues, heatmapFilter]);

  // Analytics daily chart slicer
  const chartData = useMemo(() => {
    if (!analytics || !analytics.dailyTrend) return [];
    return chartRange === "7days"
      ? analytics.dailyTrend.slice(-7)
      : analytics.dailyTrend;
  }, [analytics, chartRange]);

  // Top issues for simulation list (select active ones only)
  const topActiveIssuesForSim = useMemo(() => {
    return issues
      .filter(i => !["resolved", "invalid"].includes(i.status))
      .slice(0, 8);
  }, [issues]);

  // SLA Color Mapper
  const getSlaBadgeStyles = (status: string) => {
    switch (status) {
      case "Breached":
        return "text-red-400 bg-red-500/10 border-red-500/20";
      case "Warning":
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      default:
        return "text-green-400 bg-green-500/10 border-green-500/20";
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="animate-pulse text-sm font-semibold tracking-wider text-indigo-400">
          🛡️ VERIFYING AUTHORITY SESSION CREDENTIALS...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full overflow-x-hidden bg-slate-950 p-4 md:p-6 text-white space-y-6">
      
      {/* HEADER TITLE & CONTROLS */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-200 bg-clip-text text-transparent">
              Command Center
            </h1>
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
                <span className={`px-2.5 py-0.5 border rounded-full text-[9px] font-black uppercase tracking-wider self-start sm:self-center ${dataModeColor}`}>
                  {dataModeLabel}
                </span>
              );
            })()}
          </div>
          <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">
            Detect Risk &bull; Prioritize Action &bull; Reduce Impact
          </p>
        </div>

        {/* WEATHER SIMULATION & ACTIONS */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1 backdrop-blur-md">
            <span className="text-[10px] text-white/55 font-bold uppercase tracking-wider px-2">Weather:</span>
            {["clear", "rain", "heat"].map(mode => (
              <button
                key={mode}
                onClick={() => setWeather(mode)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  weather === mode
                    ? "bg-indigo-600 text-white shadow-md scale-105"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {mode === "clear" ? "☀️ Clear" : mode === "rain" ? "🌧️ Rain" : "🔥 Heat"}
              </button>
            ))}
          </div>

          <Link
            href="/authority/forecast"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 border border-indigo-500 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-lg cursor-pointer"
          >
            🔮 Forecast Planner
          </Link>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 border border-emerald-500 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-950/20 cursor-pointer"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* =========================================================
          🗺️ SECTION 1: MUNICIPAL HEATMAP
         ========================================================= */}
      <div className="w-full bg-[#0B1220] border border-[#6366F1]/15 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#6366F1]/10 pb-3">
          <div>
            <h2 className="text-white font-extrabold text-sm md:text-base flex items-center gap-2">
              <span>🗺️</span> Municipal Heatmap
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Geospatial hotspots of active environmental issues.</p>
          </div>
          
          <div className="flex gap-1.5 bg-slate-950/50 border border-white/5 rounded-xl p-1 shrink-0 self-start sm:self-auto">
            {[
              { filter: "all", label: "All" },
              { filter: "critical", label: "Critical" },
              { filter: "breached", label: "SLA Breached" },
              { filter: "high", label: "High Risk" }
            ].map(opt => (
              <button
                key={opt.filter}
                onClick={() => setHeatmapFilter(opt.filter as any)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                  heatmapFilter === opt.filter
                    ? "bg-white text-black"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active Hotspots Summary Card */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/40 border border-white/5 p-3 rounded-2xl">
          <div className="bg-slate-900/40 p-2 rounded-xl border border-white/5 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Critical Areas</span>
            <span className="text-sm font-black text-red-400 block mt-0.5 font-mono">
              {loading ? "..." : areas.filter(a => a.cri >= 80).length}
            </span>
          </div>
          <div className="bg-slate-900/40 p-2 rounded-xl border border-white/5 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">High Risk Areas</span>
            <span className="text-sm font-black text-orange-400 block mt-0.5 font-mono">
              {loading ? "..." : areas.filter(a => a.cri >= 50 && a.cri < 80).length}
            </span>
          </div>
          <div className="bg-slate-900/40 p-2 rounded-xl border border-[#EF4444]/20 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Escalations</span>
            <span className="text-sm font-black text-yellow-400 block mt-0.5 font-mono">
              {loading ? "..." : escalations.length}
            </span>
          </div>
          <div className="bg-slate-900/40 p-2 rounded-xl border border-white/5 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Highest Risk Index</span>
            <span className="text-[10px] font-black text-indigo-300 block mt-0.5 truncate">
              {loading ? "..." : (areas[0] ? `${areas[0].area} (${areas[0].cri})` : "None")}
            </span>
          </div>
        </div>

        <div className="w-full h-[450px] rounded-2xl overflow-hidden border border-white/5 relative bg-slate-950">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 z-10 text-xs">
              Loading Map...
            </div>
          ) : null}
          <MapComponent
            issues={heatmapIssues}
            route={null}
            mode="dashboard"
            areas={areas}
            weather={weather}
            setWeather={setWeather}
          />
        </div>
      </div>

      {/* =========================================================
          🚒 SECTION 1.6: RESOURCE ALLOCATION ENGINE
         ========================================================= */}
      <div className="bg-[#0B1220] border border-[#6366F1]/15 p-5 rounded-3xl space-y-4 shadow-xl">
        <div className="border-b border-[#6366F1]/10 pb-3">
          <h2 className="text-white font-extrabold text-xs md:text-sm uppercase tracking-wider flex items-center gap-2">
            <span>🚒</span> Resource Allocation Engine
          </h2>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Automated deployment recommendations matching current risk levels, active incidents, and response timelines.
          </p>
        </div>

        {resourceAllocations.length === 0 ? (
          <div className="text-slate-400 text-xs py-4 text-center">
            {loading ? "Computing dispatch allocations..." : "No Operational Data Available. Connect a live feed or enable demo dataset."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {resourceAllocations.map((alloc, idx) => (
              <div key={idx} className="bg-slate-950/50 border border-white/5 p-4 rounded-2xl flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">{alloc.title}</span>
                    <span className="px-1.5 py-0.2 rounded bg-[#10B981]/15 text-[#10B981] text-[9px] font-bold">
                      Score: {alloc.score}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-white text-sm capitalize">Deploy ➔ {alloc.area}</h4>
                  <p className="text-[10px] text-slate-300 leading-snug">{alloc.reason}</p>
                </div>

                <div className="pt-2 border-t border-white/5 space-y-1.5 text-[9px] text-slate-400">
                  <div className="flex justify-between items-center">
                    <span>Expected Risk Reduction:</span>
                    <span className="font-bold text-emerald-400 font-mono">{alloc.expectedReduction}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Expected SLA Improvement:</span>
                    <span className="font-bold text-indigo-300">{alloc.slaImprovement}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Expected Escalation Prevention:</span>
                    <span className="font-bold text-amber-400">{alloc.escalationPrevention}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Confidence Level:</span>
                    <span className="font-bold text-white">{alloc.confidence}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: CRITICAL ISSUES TABLE & AREA RANKINGS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* CRITICAL ISSUES TABLE */}
        <div className="xl:col-span-2 bg-slate-900/60 border border-white/5 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Critical Operations Queue</h2>
              <p className="text-xs text-white/50">Filtered unresolved issues needing immediate dispatch.</p>
            </div>

            {/* BULK ACTIONS POPUP TOGGLE */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/70 font-semibold">{selectedIds.length} selected</span>
                <select
                  onChange={e => {
                    if (e.target.value) {
                      setBulkAction(e.target.value as any);
                      setShowBulkModal(true);
                      e.target.value = ""; // Reset dropdown
                    }
                  }}
                  className="bg-indigo-600 border border-indigo-500 text-white rounded-lg text-xs px-2.5 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="">Bulk Actions...</option>
                  <option value="resolved">Mark Resolved</option>
                  <option value="in-progress">Mark In Progress</option>
                  <option value="recalculate">Recalculate Risk</option>
                </select>
              </div>
            )}
          </div>

          {/* SEARCH & FILTERS CONTROLS */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 bg-slate-950/50 p-3 rounded-2xl border border-white/5">
            <input
              type="text"
              placeholder="Search details..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="col-span-2 md:col-span-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-indigo-500"
            />
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="" className="bg-slate-900">All Categories</option>
              <option value="pothole" className="bg-slate-900">Pothole</option>
              <option value="sewer" className="bg-slate-900">Sewer</option>
              <option value="garbage" className="bg-slate-900">Garbage</option>
              <option value="construction" className="bg-slate-900">Construction</option>
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="" className="bg-slate-900">All Statuses</option>
              <option value="pending" className="bg-slate-900">Pending</option>
              <option value="in-progress" className="bg-slate-900">In Progress</option>
              <option value="need-review" className="bg-slate-900">Needs Review</option>
              <option value="resolved" className="bg-slate-900">Resolved</option>
            </select>
            <select
              value={filterRisk}
              onChange={e => setFilterRisk(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="" className="bg-slate-900">All Risk Levels</option>
              <option value="Critical" className="bg-slate-900">Critical</option>
              <option value="High" className="bg-slate-900">High</option>
              <option value="Medium" className="bg-slate-900">Medium</option>
              <option value="Low" className="bg-slate-900">Low</option>
            </select>
            <select
              value={filterSla}
              onChange={e => setFilterSla(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white/80 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="" className="bg-slate-900">All SLA States</option>
              <option value="OK" className="bg-slate-900">SLA: OK</option>
              <option value="Warning" className="bg-slate-900">SLA: Warning</option>
              <option value="Breached" className="bg-slate-900">SLA: Breached</option>
            </select>
          </div>

          {/* QUEUE TABLE */}
          <div className="overflow-x-auto rounded-2xl border border-white/5">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 text-[10px] uppercase tracking-wider text-white/60 border-b border-white/5">
                  <th className="p-3 w-8">
                    <input
                      type="checkbox"
                      checked={paginatedIssues.length > 0 && selectedIds.length === paginatedIssues.length}
                      onChange={toggleSelectAll}
                      className="rounded accent-indigo-600 cursor-pointer"
                    />
                  </th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Location</th>
                  <th className="p-3 text-center">Score</th>
                  <th className="p-3 text-center">Level</th>
                  <th className="p-3 text-center">SLA Status</th>
                  <th className="p-3 text-center">Votes</th>
                  <th className="p-3 text-center">Age</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: itemsPerPage }).map((_, idx) => (
                    <tr key={idx} className="border-b border-white/5 animate-pulse">
                      <td className="p-3"><div className="h-4 w-4 bg-white/10 rounded" /></td>
                      <td className="p-3"><div className="h-4 w-20 bg-white/10 rounded" /></td>
                      <td className="p-3"><div className="h-4 w-32 bg-white/10 rounded" /></td>
                      <td className="p-3"><div className="h-4 w-8 bg-white/10 rounded mx-auto" /></td>
                      <td className="p-3"><div className="h-4 w-12 bg-white/10 rounded mx-auto" /></td>
                      <td className="p-3"><div className="h-4 w-16 bg-white/10 rounded mx-auto" /></td>
                      <td className="p-3"><div className="h-4 w-8 bg-white/10 rounded mx-auto" /></td>
                      <td className="p-3"><div className="h-4 w-8 bg-white/10 rounded mx-auto" /></td>
                    </tr>
                  ))
                ) : issues.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8">
                      <div className="flex flex-col items-center justify-center text-center py-6 bg-[#0B1220] border border-[#6366F1]/15 rounded-2xl">
                        <span className="text-3xl mb-2">🛡️</span>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">No operational data available.</h4>
                        <p className="text-[10px] text-slate-400 mt-1.5 mb-3 max-w-[280px] leading-normal">
                          There are no active municipal hazards or risk reports registered in this region.
                        </p>
                        <Link
                          href="/report"
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer shadow-md inline-block"
                        >
                          Submit Risk Report
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedIssues.map(issue => {
                    const isExpanded = expandedIssueIds.includes(issue._id);
                    const ageDays = Math.max(0, Math.round((new Date().getTime() - new Date(issue.createdAt).getTime()) / (1000 * 60 * 60 * 24)));

                    return (
                      <React.Fragment key={issue._id}>
                        <tr 
                          onClick={() => {
                            setExpandedIssueIds(prev => 
                              prev.includes(issue._id) ? prev.filter(id => id !== issue._id) : [...prev, issue._id]
                            );
                          }}
                          className="border-b border-white/5 hover:bg-white/5 text-xs text-white/95 cursor-pointer transition-colors"
                        >
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(issue._id)}
                              onChange={() => toggleSelectOne(issue._id)}
                              className="rounded accent-indigo-600 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 capitalize font-semibold">{issue.issueType}</td>
                          <td className="p-3 text-white/70 max-w-[150px] truncate">{issue.locationName}</td>
                          <td className="p-3 text-center font-bold">{Math.round(issue.finalRisk || issue.riskValue || 0)}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              issue.riskLevel === "Critical" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                              issue.riskLevel === "High" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" :
                              issue.riskLevel === "Medium" ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                              "bg-green-500/10 text-green-400 border border-green-500/20"
                            }`}>
                              {issue.riskLevel}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getSlaBadgeStyles(issue.slaStatus)}`}>
                              {issue.slaStatus}
                            </span>
                          </td>
                          <td className="p-3 text-center text-white/70">{issue.votes}</td>
                          <td className="p-3 text-center text-white/70">
                            {ageDays}d
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-[#0B1220]/75 border-b border-white/5">
                            <td colSpan={8} className="p-4" onClick={(e) => e.stopPropagation()}>
                              <div className="space-y-3 max-w-4xl text-xs text-slate-300">
                                <p className="font-bold text-indigo-400 uppercase tracking-wider text-[9px] mb-2 flex items-center gap-1.5">
                                  <span>🔍</span> Risk Assessment Explanation
                                </p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-black/25 border border-white/5 p-4 rounded-xl">
                                  <div className="space-y-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Risk Score</span>
                                    <span className="text-sm font-black text-white font-mono">
                                      {Math.round(issue.finalRisk || issue.riskValue || 0)} ({issue.riskLevel})
                                    </span>
                                  </div>

                                  <div className="space-y-1 md:col-span-2">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Why Score Is High</span>
                                    <p className="text-slate-200 leading-relaxed text-[11px]">
                                      {issue.communityConfirmations !== undefined || issue.votes > 0 ? (
                                        `${(issue.communityConfirmations || 0) + issue.votes} citizen reports and confirmations, unresolved for ${ageDays} days.`
                                      ) : (
                                        `Unresolved reports in high-density corridors for ${ageDays} days.`
                                      )}
                                    </p>
                                  </div>

                                  <div className="space-y-1">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Expected Impact</span>
                                    <span className="text-xs font-black text-emerald-400 font-mono block">
                                      Community Risk Index -{Math.max(4, Math.round((issue.finalRisk || issue.riskValue || 75) * 0.1))}%
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5 flex items-center justify-between text-[11px]">
                                  <div className="flex items-center gap-2">
                                    <span className="text-indigo-400 font-bold">Recommended Intervention:</span>
                                    <span className="text-white font-medium capitalize">
                                      {issue.issueType === "sewer" ? `Clear sewerage blockage at ${issue.locationName}.` :
                                       issue.issueType === "pothole" ? `Repair road damage at ${issue.locationName}.` :
                                       issue.issueType === "garbage" ? `Clear waste accumulation at ${issue.locationName}.` :
                                       `Dispatch crew to resolve ${issue.issueType} at ${issue.locationName}.`}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-white/60">
                Page {currentPage} of {totalPages} ({issues.length} records)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 transition cursor-pointer"
                >
                  ◀ Previous
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 transition cursor-pointer"
                >
                  Next ▶
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: AREA RANKINGS & LIVE ALERTS */}
        <div className="flex flex-col gap-6">
          {/* AREA RISK RANKINGS */}
          <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-5 shadow-xl space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Community Risk Index</h2>
              <p className="text-xs text-white/50">Aggregated priority index by neighborhood.</p>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[180px] pr-1 scrollbar-thin">
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="h-14 bg-white/5 border border-white/5 rounded-2xl animate-pulse" />
                ))
              ) : areas.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-6 bg-[#0B1220] border border-[#6366F1]/15 rounded-2xl min-h-[120px]">
                  <span className="text-3xl mb-2">🛡️</span>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">No operational data available.</h4>
                  <p className="text-[10px] text-slate-400 mt-1.5 mb-3 max-w-[200px] leading-normal">
                    No neighborhood reports available to compute ranking indices.
                  </p>
                  <Link
                    href="/report"
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer shadow-md inline-block"
                  >
                    Submit Risk Report
                  </Link>
                </div>
              ) : (
                areas.map((area, idx) => (
                  <div
                    key={area.area}
                    className="flex items-center justify-between p-3 bg-slate-950/40 border border-white/5 rounded-2xl hover:border-white/10 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-indigo-400 w-4">#{idx + 1}</span>
                      <div>
                        <p className="text-xs font-semibold text-white truncate max-w-[120px]">{area.area}</p>
                        <p className="text-[9px] text-white/50 mt-0.5">
                          Issues: {area.totalIssues} ({area.criticalIssues} crit)
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-indigo-200">{area.cri}</p>
                      <span className={`text-[9px] font-bold ${
                        area.trend.startsWith("+") ? "text-red-400" :
                        area.trend.startsWith("-") ? "text-emerald-400" :
                        "text-white/40"
                      }`}>
                        {area.trend.startsWith("+") ? "📈" : area.trend.startsWith("-") ? "📉" : "▪"} {area.trend}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* LIVE ESCALATION ALERTS */}
          {activeAlerts.length > 0 && (
            <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
                    <span>🚨</span> Live Alerts Feed
                  </h2>
                  <p className="text-[10px] text-white/50">Real-time risk escalation events (last 24h).</p>
                </div>
                <button
                  onClick={handleCheckEscalations}
                  disabled={checkingEscalations}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black tracking-wider transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {checkingEscalations ? (
                    <>
                      <span className="animate-spin">🔄</span>
                      Checking...
                    </>
                  ) : (
                    <>
                      <span>🔍</span>
                      Check Now
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[200px] pr-1 scrollbar-thin">
                {escalationsLoading ? (
                  Array.from({ length: 2 }).map((_, idx) => (
                    <div key={idx} className="h-20 bg-white/5 border border-white/5 rounded-2xl animate-pulse" />
                  ))
                ) : (
                  activeAlerts.map((event) => {
                    let severityClass = "";
                    let borderClass = "";
                    
                    if (event.status === "Critical") {
                      severityClass = "bg-red-500/10 border-red-500/20 text-red-300";
                      borderClass = "border-l-4 border-l-red-500";
                    } else if (event.status === "Warning") {
                      severityClass = "bg-amber-500/10 border-amber-500/20 text-amber-300";
                      borderClass = "border-l-4 border-l-amber-500";
                    } else {
                      severityClass = "bg-blue-500/10 border-blue-500/20 text-blue-300";
                      borderClass = "border-l-4 border-l-blue-500";
                    }

                    return (
                      <div
                        key={event._id}
                        className={`p-3 border border-white/5 rounded-2xl flex flex-col gap-1.5 transition hover:border-white/10 ${severityClass} ${borderClass}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                            event.status === "Critical" ? "bg-red-500/20 text-red-400" :
                            event.status === "Warning" ? "bg-amber-500/20 text-amber-400" :
                            "bg-blue-500/20 text-blue-400"
                          }`}>
                            {event.status}
                          </span>
                          <span className="text-[9px] text-white/40">{formatTimeAgo(event.timestamp)}</span>
                        </div>
                        
                        <p className="text-xs font-medium text-white/90 leading-snug">{event.message}</p>
                        
                        <div className="flex items-center justify-between text-[9px] text-white/50 mt-1 border-t border-white/5 pt-1.5">
                          <div className="flex items-center gap-1">
                            <span>📊</span>
                            <span>CRI:</span>
                            <span className="font-bold text-white">
                              {Math.round(event.oldRisk)} ➔ {Math.round(event.newRisk)}
                            </span>
                            <span className={`font-bold ${
                              event.trendDirection === "Increasing" ? "text-red-400" : "text-emerald-400"
                            }`}>
                              ({event.riskIncrease >= 0 ? "+" : ""}{event.riskIncrease}%)
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <span>📦</span>
                            <span>Count:</span>
                            <span className="font-bold text-white">{event.issueCount}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: INTERVENTION SIMULATOR */}
      <div className="bg-[#0B1220] border border-[#6366F1]/15 rounded-3xl p-5 shadow-xl space-y-4">
        <div>
          <h2 className="text-white font-extrabold text-sm md:text-base flex items-center gap-2">
            <span>🎯</span> Intervention Simulator
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Select reports to simulate the projected impact of resolving them on the Community Risk Index in real-time.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* CHECKLIST */}
          <div className="lg:col-span-2 bg-slate-950/40 border border-white/5 rounded-2xl p-4 space-y-3">
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Active Incident Checklist</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="h-10 bg-white/5 rounded-xl animate-pulse" />
                ))
              ) : topActiveIssuesForSim.length === 0 ? (
                <p className="text-xs text-white/50 col-span-2">No active issues found to simulate.</p>
              ) : (
                topActiveIssuesForSim.map(issue => (
                  <label
                    key={issue._id}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border transition cursor-pointer select-none ${
                      simulatorSelectedIds.includes(issue._id)
                        ? "bg-indigo-600/10 border-indigo-500/40 text-white"
                        : "bg-white/5 border-white/5 hover:border-white/10 text-white/80"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={simulatorSelectedIds.includes(issue._id)}
                      onChange={() => {
                        setSimulatorSelectedIds(prev =>
                          prev.includes(issue._id)
                            ? prev.filter(x => x !== issue._id)
                            : [...prev, issue._id]
                        );
                      }}
                      className="rounded accent-indigo-600 cursor-pointer"
                    />
                    <div className="text-xs truncate">
                      <p className="font-semibold capitalize flex items-center gap-1.5">
                        <span>{issue.issueType}</span>
                        <span className="text-[10px] px-1 rounded bg-black/30 text-white/70">
                          {Math.round(issue.finalRisk || issue.riskValue || 0)}
                        </span>
                      </p>
                      <p className="text-[10px] text-white/50 truncate max-w-[150px]">{issue.locationName}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* RESULTS PANEL */}
          <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
            {simLoading && (
              <div className="absolute inset-0 bg-slate-955/60 z-10 flex items-center justify-center text-xs">
                Simulating...
              </div>
            )}
            
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Simulation Results</p>
            
            {simulatorSelectedIds.length > 0 && simResults ? (
              <div className="space-y-3 my-2 text-xs">
                <div className="space-y-2 bg-[#050816]/40 p-3 rounded-xl border border-white/5">
                  <div>
                    <div className="flex justify-between text-[11px] mb-0.5">
                      <span className="text-slate-400">Current Risk Index</span>
                      <span className="font-bold text-white font-mono">{simResults.originalForecast?.forecasts?.["0d"]?.averageRisk ?? simResults.currentCityRisk ?? 0}</span>
                    </div>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden flex">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, simResults.originalForecast?.forecasts?.["0d"]?.averageRisk ?? simResults.currentCityRisk ?? 0)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-[11px] mb-0.5">
                      <span className="text-slate-400">Projected Risk Index</span>
                      <span className="font-bold text-emerald-400 font-mono">{simResults.remainingForecast?.forecasts?.["0d"]?.averageRisk ?? simResults.projectedCityRisk ?? 0}</span>
                    </div>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, simResults.remainingForecast?.forecasts?.["0d"]?.averageRisk ?? simResults.projectedCityRisk ?? 0)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 text-[11px] flex justify-between items-center text-emerald-400 font-bold">
                  <span>Projected CRI Drop:</span>
                  <span className="text-xs font-black">-{simResults.riskReduction ?? 0}%</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-[9px] text-slate-400">
                  <div className="bg-[#050816]/40 border border-white/5 p-1.5 rounded-lg">
                    <span>Criticals Removed</span>
                    <strong className="text-rose-400 text-xs font-mono font-black block mt-0.5">{criticalIssuesRemoved}</strong>
                  </div>
                  <div className="bg-[#050816]/40 border border-[#6366F1]/10 p-1.5 rounded-lg">
                    <span>Resolution Effort</span>
                    <strong className="text-indigo-400 text-xs font-mono font-black block mt-0.5 truncate">{estimatedResolutionEffort}</strong>
                  </div>
                </div>
              </div>
            ) : simulatorSelectedIds.length > 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-6 bg-white/5 border border-white/5 rounded-2xl min-h-[120px] my-2 animate-pulse">
                <span className="text-xs text-slate-400 font-medium">Simulating calculations...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-4 bg-[#0B1220]/55 border border-white/5 rounded-2xl min-h-[120px] my-2 text-white">
                <span className="text-2xl mb-1">📊</span>
                <p className="text-[10px] font-semibold text-slate-200">
                  Select issues to simulate index drop.
                </p>
                <div className="text-[9px] text-slate-400 mt-2 text-left space-y-0.5 border-t border-white/5 pt-2 w-full">
                  <div>• Estimated Risk Reduction</div>
                  <div>• Critical incidents prevented</div>
                  <div>• Dispatch effort needed</div>
                </div>
              </div>
            )}

            {simulatorSelectedIds.length > 0 && (
              <button
                onClick={() => setSimulatorSelectedIds([])}
                className="w-full py-1.5 mt-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-[10px] font-semibold transition cursor-pointer text-slate-300"
              >
                Reset Selection
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CONFIRMATION BULK ACTION MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBulkModal(false)} />
          <div className="relative bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-scaleIn">
            <h3 className="text-base font-bold text-white">Confirm Bulk Action</h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Are you sure you want to apply <strong className="text-indigo-400 font-bold capitalize">&quot;{bulkAction}&quot;</strong> to the selected <strong className="text-white font-bold">{selectedIds.length}</strong> issues? This will update resolved rates and statistics immediately.
            </p>
            <div className="flex gap-2 justify-end text-xs">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAction}
                disabled={bulkLoading}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold cursor-pointer disabled:opacity-50"
              >
                {bulkLoading ? "Updating..." : "Yes, Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* =====================================
   📦 HELPER KPI CARD COMPONENT
===================================== */


/* =====================================
   📦 HELPER PERFORMANCE CARD COMPONENT
===================================== */
function PerformanceCard({ title, value, desc, highlight }: any) {
  const cardBorderColor = highlight ? "border-indigo-500/30" : "border-white/5";
  const cardBgColor = highlight ? "bg-indigo-950/20" : "bg-slate-900/60";
  const valueColor = highlight ? "text-indigo-300" : "text-white";

  return (
    <div className={`border ${cardBorderColor} ${cardBgColor} rounded-2xl p-4 shadow-md flex flex-col justify-between min-h-[95px] transition hover:scale-[1.01]`}>
      <div>
        <p className="text-[9px] md:text-[10px] text-white/50 font-bold uppercase tracking-wider">{title}</p>
        <h4 className={`text-base md:text-xl font-black mt-1 ${valueColor}`}>
          {value}
        </h4>
      </div>
      <p className="text-[9px] text-white/40 mt-1.5">{desc}</p>
    </div>
  );
}
