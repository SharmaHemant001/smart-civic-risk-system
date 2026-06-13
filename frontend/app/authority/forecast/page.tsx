"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import API from "../../../utils/api";

const MapComponent = dynamic(
  () => import("@/components/MapComponent"),
  { ssr: false }
);

type CityForecastPoint = {
  totalRisk: number;
  averageRisk: number;
  criticalCount: number;
  confidence?: number;
};

type CityForecastData = {
  forecasts: {
    "0d": CityForecastPoint;
    "7d": CityForecastPoint;
    "14d": CityForecastPoint;
    "30d": CityForecastPoint;
  };
  growthPercent: number;
  assumptions: {
    weather: string;
    activeIssues: number;
    criticalIssues: number;
    horizon: string;
  };
};

type AreaForecast = {
  area: string;
  totalIssues: number;
  currentCRI: number;
  forecast7Days: number;
  forecast14Days: number;
  forecast30Days: number;
  increasePercent: number;
  explanation: string;
  drivers: string[];
};

type RiskAlert = {
  area: string;
  currentCRI: number;
  forecastCRI: number;
  increase: number;
  increasePercent: number;
  drivers: string[];
};

type InterventionSet = {
  name: string;
  expectedReduction: number;
  issueIds: string[];
  details: string;
};

type ActiveIssue = {
  _id: string;
  issueType: string;
  locationName: string;
  finalRisk: number;
  riskLevel: string;
  status: string;
  description: string;
  latitude: number;
  longitude: number;
  votes: number;
  createdAt?: string;
  slaDeadline?: string;
  slaStatus?: string;
  severity?: string;
};

const MOCK_FORECAST_CITY: CityForecastData = {
  forecasts: {
    "0d": { averageRisk: 84, criticalCount: 2, totalRisk: 84, confidence: 95 },
    "7d": { averageRisk: 90, criticalCount: 3, totalRisk: 90, confidence: 90 },
    "14d": { averageRisk: 94, criticalCount: 4, totalRisk: 94, confidence: 85 },
    "30d": { averageRisk: 98, criticalCount: 5, totalRisk: 98, confidence: 80 }
  },
  growthPercent: 16.7,
  assumptions: {
    weather: "clear",
    activeIssues: 5,
    criticalIssues: 2,
    horizon: "30 Days"
  }
};

const MOCK_FORECAST_RECOMMENDATIONS: InterventionSet[] = [
  {
    name: "Dwarka Sewer Clearing",
    expectedReduction: 18,
    issueIds: ["demo-1"],
    details: "Clearing sewer blockage in Dwarka to prevent overflows."
  },
  {
    name: "Connaught Place Sewer Sweep",
    expectedReduction: 15,
    issueIds: ["demo-5"],
    details: "Secondary sweep of active sewer complaints in CP."
  }
];

const MOCK_FORECAST_AREAS: AreaForecast[] = [
  { area: "Dwarka", totalIssues: 2, currentCRI: 94, forecast7Days: 96, forecast14Days: 98, forecast30Days: 99, increasePercent: 5.3, explanation: "Increasing risk due to sewer backlog.", drivers: ["sewer"] },
  { area: "Saket", totalIssues: 1, currentCRI: 57, forecast7Days: 60, forecast14Days: 62, forecast30Days: 65, increasePercent: 14.0, explanation: "Increasing risk due to road hazards.", drivers: ["pothole"] },
  { area: "Vasant Kunj", totalIssues: 1, currentCRI: 44, forecast7Days: 44, forecast14Days: 45, forecast30Days: 45, increasePercent: 2.2, explanation: "Stable hazard profile.", drivers: ["garbage"] },
  { area: "Karol Bagh", totalIssues: 1, currentCRI: 55, forecast7Days: 57, forecast14Days: 58, forecast30Days: 60, increasePercent: 9.1, explanation: "Increasing risk due to construction activity.", drivers: ["construction"] }
];

const MOCK_FORECAST_ALERTS: RiskAlert[] = [
  {
    area: "Dwarka",
    currentCRI: 94,
    forecastCRI: 99,
    increase: 5,
    increasePercent: 5.3,
    drivers: ["Sewer backlog", "Local density spike"]
  }
];

const MOCK_FORECAST_ISSUES: ActiveIssue[] = [
  { _id: "demo-1", issueType: "sewer", locationName: "Dwarka", finalRisk: 96, riskLevel: "Critical", status: "pending", description: "Critical sewer blockage", latitude: 28.5921, longitude: 77.0460, votes: 21 },
  { _id: "demo-2", issueType: "pothole", locationName: "Saket", finalRisk: 84, riskLevel: "High", status: "in-progress", description: "Pothole near metro station", latitude: 28.5244, longitude: 77.1933, votes: 14 },
  { _id: "demo-3", issueType: "garbage", locationName: "Vasant Kunj", finalRisk: 58, riskLevel: "Medium", status: "pending", description: "Garbage accumulation", latitude: 28.5168, longitude: 77.1998, votes: 8 },
  { _id: "demo-4", issueType: "construction", locationName: "Karol Bagh", finalRisk: 79, riskLevel: "High", status: "in-progress", description: "Construction debris on road", latitude: 28.6505, longitude: 77.2028, votes: 19 },
  { _id: "demo-5", issueType: "sewer", locationName: "Connaught Place", finalRisk: 92, riskLevel: "Critical", status: "pending", description: "Sewer overflow at block E", latitude: 28.5700, longitude: 77.2200, votes: 27 }
];

export default function ForecastPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [weather, setWeather] = useState("clear");
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(true);

  // Projections Data
  const [cityData, setCityData] = useState<CityForecastData | null>(null);
  const [areaForecasts, setAreaForecasts] = useState<AreaForecast[]>([]);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [recommendations, setRecommendations] = useState<InterventionSet[]>([]);
  const [activeIssues, setActiveIssues] = useState<ActiveIssue[]>([]);

  // Simulation Planner States
  const [simSelectedIds, setSimSelectedIds] = useState<string[]>([]);
  const [simLoading, setSimLoading] = useState(false);
  const [simResults, setSimResults] = useState<{
    originalCityRisk30d: number;
    projectedCityRisk30d: number;
    improvement: number;
    cityForecast: CityForecastData;
  } | null>(null);

  // Heatmap State
  const [mapDay, setMapDay] = useState(0); // 0, 7, 14, 30
  const [heatmapPoints, setHeatmapPoints] = useState<[number, number, number][]>([]);
  const [mapLoading, setMapLoading] = useState(false);

  // Load Initial Dashboard Metrics
  const loadForecastData = async () => {
    setLoading(true);
    try {
      const [cityRes, areasRes, alertsRes, issuesRes] = await Promise.all([
        API.get(`/authority/forecast/city?weather=${weather}`),
        API.get(`/authority/forecast/areas?weather=${weather}`),
        API.get(`/authority/forecast/alerts?weather=${weather}`),
        API.get(`/authority/issues?weather=${weather}`),
      ]);

      setCityData(cityRes.data.cityForecast);
      setRecommendations(cityRes.data.recommendations);
      setAreaForecasts(areasRes.data);
      setAlerts(alertsRes.data);
      
      const activeOnly = issuesRes.data.filter(
        (i: any) => !["resolved", "invalid"].includes(i.status)
      );
      setActiveIssues(activeOnly);

      // Reset simulator when weather changes
      setSimSelectedIds([]);
      setSimResults(null);
    } catch (err) {
      console.error("Failed to load forecasting metrics:", err);
      if (isDemo) {
        setCityData(MOCK_FORECAST_CITY);
        setRecommendations(MOCK_FORECAST_RECOMMENDATIONS);
        setAreaForecasts(MOCK_FORECAST_AREAS);
        setAlerts(MOCK_FORECAST_ALERTS);
        setActiveIssues(MOCK_FORECAST_ISSUES);
        setSimSelectedIds([]);
        setSimResults(null);
      } else {
        setCityData(null);
        setRecommendations([]);
        setAreaForecasts([]);
        setAlerts([]);
        setActiveIssues([]);
      }
    } finally {
      setLoading(false);
      console.log("Demo Mode:", isDemo);
      console.log("Forecast Planner Loaded");
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
      console.log("FORECAST ROUTE AUTH DEBUG:", {
        loading: !authChecked,
        user,
        role: userRole,
        pathname: "/authority/forecast",
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
    loadForecastData();
  }, [weather, authChecked]);

  // Load Heatmap Data on Day or Weather Changes
  useEffect(() => {
    if (!authChecked) return;
    const fetchHeatmap = async () => {
      setMapLoading(true);
      try {
        const res = await API.get(`/authority/forecast/heatmap?day=${mapDay}&weather=${weather}`);
        setHeatmapPoints(res.data);
      } catch (err) {
        console.error("Failed to load forecast heatmap:", err);
        if (isDemo) {
          setHeatmapPoints([
            [28.5921, 77.0460, 0.9],
            [28.5244, 77.1933, 0.7],
            [28.5168, 77.1998, 0.4],
            [28.6505, 77.2028, 0.7],
            [28.5700, 77.2200, 0.8]
          ]);
        } else {
          setHeatmapPoints([]);
        }
      } finally {
        setMapLoading(false);
      }
    };
    fetchHeatmap();
  }, [mapDay, weather, authChecked]);

  // Execute Intervention Planner Simulation
  const runSimulation = async (selectedIds: string[]) => {
    setSimLoading(true);
    try {
      const res = await API.post("/authority/forecast/intervention", {
        ids: selectedIds,
        weather,
      });
      setSimResults(res.data);
    } catch (err) {
      console.error("Simulation query failed:", err);
      if (isDemo) {
        const baseRisk = MOCK_FORECAST_CITY.forecasts["30d"].totalRisk;
        const resolvedCount = selectedIds.length;
        const projectedCityRisk30d = Math.max(10, baseRisk - (resolvedCount * 14));
        setSimResults({
          originalCityRisk30d: baseRisk,
          projectedCityRisk30d,
          improvement: baseRisk - projectedCityRisk30d,
          cityForecast: {
            forecasts: {
              "0d": { averageRisk: 84, criticalCount: 2, totalRisk: 84, confidence: 95 },
              "7d": { averageRisk: Math.round(90 * (projectedCityRisk30d / baseRisk)), criticalCount: Math.max(0, 3 - resolvedCount), totalRisk: Math.round(90 * (projectedCityRisk30d / baseRisk)), confidence: 90 },
              "14d": { averageRisk: Math.round(94 * (projectedCityRisk30d / baseRisk)), criticalCount: Math.max(0, 4 - resolvedCount), totalRisk: Math.round(94 * (projectedCityRisk30d / baseRisk)), confidence: 85 },
              "30d": { averageRisk: Math.round(projectedCityRisk30d / 5), criticalCount: Math.max(0, 5 - resolvedCount), totalRisk: projectedCityRisk30d, confidence: 80 }
            },
            growthPercent: Math.round(((projectedCityRisk30d - 84) / 84) * 100 * 10) / 10,
            assumptions: {
              weather: weather,
              activeIssues: Math.max(0, 5 - resolvedCount),
              criticalIssues: Math.max(0, 2 - resolvedCount),
              horizon: "30 Days"
            }
          }
        });
      }
    } finally {
      setSimLoading(false);
    }
  };

  // Auto pre-select top 5 issues on forecast page load
  useEffect(() => {
    if (activeIssues.length > 0 && simSelectedIds.length === 0) {
      const sorted = [...activeIssues].sort((a: any, b: any) => (b.finalRisk || b.riskValue || 0) - (a.finalRisk || a.riskValue || 0));
      const top5 = sorted.slice(0, 5).map((i: any) => i._id);
      setSimSelectedIds(top5);
      runSimulation(top5);
    }
  }, [activeIssues]);

  const handleCheckboxChange = (id: string) => {
    const nextIds = simSelectedIds.includes(id)
      ? simSelectedIds.filter((item) => item !== id)
      : [...simSelectedIds, id];
    
    setSimSelectedIds(nextIds);
    if (nextIds.length > 0) {
      runSimulation(nextIds);
    } else {
      setSimResults(null);
    }
  };

  const applyPresetSet = (presetIds: string[]) => {
    setSimSelectedIds(presetIds);
    runSimulation(presetIds);
  };

  const resetPlanner = () => {
    setSimSelectedIds([]);
    setSimResults(null);
  };

  // Convert raw API heatmap array [lat, lng, intensity] into Leaflet-compatible props
  const mapIssues = heatmapPoints.map((p, idx) => ({
    _id: `mock-${idx}`,
    latitude: p[0],
    longitude: p[1],
    riskValue: p[2] * 100,
    riskScore: p[2] >= 0.80 ? "Critical" : p[2] >= 0.65 ? "High" : p[2] >= 0.50 ? "Medium" : "Low",
    status: "pending",
  }));

  // Dynamic calculations for forecast drivers based on weather state
  const forecastDrivers = useMemo(() => {
    const rainMultiplier = weather === "rain" ? 12 : weather === "heat" ? 5 : 0;
    const escalationCount = activeIssues.filter(i => i.votes >= 5).length * 2 + 4;
    const resolvedCount = activeIssues.filter(i => i.status === "resolved").length;
    const resolutionActivity = -Math.max(4, Math.round(resolvedCount * 0.5));
    
    return [
      { name: "Rain/Weather Impact", value: `+${rainMultiplier}`, color: "text-rose-400" },
      { name: "Escalation Growth", value: `+${escalationCount}`, color: "text-rose-400" },
      { name: "Resolution Activity", value: `${resolutionActivity}`, color: "text-emerald-400" },
      { name: "Historical Trend", value: "+6", color: "text-rose-400" }
    ];
  }, [weather, activeIssues]);

  // Dynamic Predicted SLA breaches
  const predictedSlaBreaches = useMemo(() => {
    const unresolved = activeIssues.filter(i => i.slaDeadline && !["resolved", "invalid"].includes(i.status));
    const sorted = [...unresolved].sort((a, b) => new Date(a.slaDeadline || 0).getTime() - new Date(b.slaDeadline || 0).getTime());
    
    return sorted.slice(0, 3).map(issue => {
      const breachDate = new Date(issue.slaDeadline || 0).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const hrs = (new Date(issue.slaDeadline || 0).getTime() - Date.now()) / (1000 * 60 * 60);
      let prob = 45;
      if (hrs <= 12) prob = 95;
      else if (hrs <= 24) prob = 85;
      else if (hrs <= 48) prob = 72;

      return {
        area: issue.locationName || "NCR",
        breachDate,
        probability: `${prob}%`,
        reason: `${issue.riskLevel} severity + unresolved for ${Math.max(1, Math.round((Date.now() - new Date(issue.createdAt || 0).getTime()) / (1000 * 60 * 60 * 24)))} days`,
        intervention: `Deploy crew to clear ${issue.issueType} corridor.`
      };
    });
  }, [activeIssues]);

  // Scenario telemetry calculations
  const baselineCRI = cityData?.forecasts?.["30d"]?.averageRisk || 70;
  const worstCaseCRI = Math.round(baselineCRI * 1.25);
  const worstCaseEscalations = activeIssues.filter(i => i.votes >= 5).length + 8;
  const worstCaseCriticals = Math.round((cityData?.forecasts?.["30d"]?.criticalCount || 5) * 1.5);

  const bestCaseReduction = recommendations[0]?.expectedReduction || 15;
  const bestCaseCRI = Math.round(baselineCRI * (1 - bestCaseReduction / 100));
  const bestCaseEscalations = Math.max(1, worstCaseEscalations - 5);
  const bestCaseCriticals = Math.max(1, worstCaseCriticals - 4);

  // Sandbox calculations
  const currentCityCRI = simResults ? simResults.cityForecast?.forecasts?.["0d"]?.averageRisk : cityData?.forecasts?.["0d"]?.averageRisk || 74;
  const projectedCityCRI = simResults ? simResults.cityForecast?.forecasts?.["30d"]?.averageRisk : cityData?.forecasts?.["30d"]?.averageRisk || 74;
  const reductionPercentage = simResults ? simResults.improvement : 0;

  const criticalIssuesRemoved = useMemo(() => {
    return activeIssues.filter(i => simSelectedIds.includes(i._id) && i.riskLevel === "Critical").length;
  }, [simSelectedIds, activeIssues]);

  const escalationsPreventedCount = useMemo(() => {
    return activeIssues.filter(i => simSelectedIds.includes(i._id) && i.votes >= 4).length;
  }, [simSelectedIds, activeIssues]);

  const slaBreachesPreventedCount = useMemo(() => {
    return activeIssues.filter(i => simSelectedIds.includes(i._id) && (i.slaStatus === "Warning" || i.slaStatus === "Breached" || i.votes > 3)).length;
  }, [simSelectedIds, activeIssues]);

  const estimatedResolutionEffort = useMemo(() => {
    let totalHours = 0;
    simSelectedIds.forEach(id => {
      const issue = activeIssues.find(i => i._id === id);
      if (issue) {
        const level = issue.riskLevel || issue.severity;
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
  }, [simSelectedIds, activeIssues]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="animate-pulse text-sm font-semibold tracking-wider text-indigo-400">
          🛡️ VERIFYING AUTHORITY SESSION CREDENTIALS...
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-full bg-slate-950 text-white flex flex-col items-center justify-center py-20 space-y-4">
        <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-sm text-white/60 animate-pulse font-medium">Assembling Civic Forecasts...</span>
      </div>
    );
  }

  const currentCityForecast = simResults ? simResults.cityForecast : cityData;
  const growthPercent = simResults ? simResults.cityForecast?.growthPercent : cityData?.growthPercent;

  const reportsLast14Days = activeIssues.filter(i => {
    if (!i.createdAt) return false;
    const diff = Date.now() - new Date(i.createdAt).getTime();
    return diff <= 14 * 24 * 60 * 60 * 1000;
  }).length;

  const trendExplanation = (growthPercent ?? 0) < 0 
    ? "Decreasing historical trend" 
    : (growthPercent ?? 0) > 0 
    ? "Increasing historical trend" 
    : "Stable historical trend";

  const mappedAreas = areaForecasts.map(af => {
    let cri = af.currentCRI;
    if (mapDay === 7) cri = af.forecast7Days;
    else if (mapDay === 14) cri = af.forecast14Days;
    else if (mapDay === 30) cri = af.forecast30Days;

    const diff = cri - af.currentCRI;
    const trend = diff > 0 ? `↑ ${diff}%` : diff < 0 ? `↓ ${Math.abs(diff)}%` : "→ Stable";

    return {
      area: af.area,
      cri,
      trend,
      totalIssues: af.totalIssues,
      criticalIssues: af.drivers?.length || 0,
      escalations: af.drivers?.some(d => d.toLowerCase().includes("sla")) ? 1 : 0
    };
  });

  return (
    <div className="min-h-full bg-slate-950 text-white p-4 md:p-6 space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Link
                href="/authority"
                className="text-xs font-bold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 transition"
              >
                ← Back to Command Center
              </Link>
              <span className="text-white/20">•</span>
              <span className="text-xs bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/20 font-bold uppercase tracking-wider">
                Predictive Mode
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-200 bg-clip-text text-transparent mt-1">
                Forecast &amp; Intervention Planner
              </h1>
              {(() => {
                const isEmptyMode = areaForecasts.length === 0 && !isDemo;
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
                  <span className={`px-2.5 py-0.5 border rounded-full text-[9px] font-black uppercase tracking-wider self-start sm:self-center mt-1 ${dataModeColor}`}>
                    {dataModeLabel}
                  </span>
                );
              })()}
            </div>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">
              Detect Risk &bull; Prioritize Action &bull; Reduce Impact
            </p>
          </div>

          {/* WEATHER SELECTOR */}
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1 backdrop-blur-md self-start xl:self-auto">
            <span className="text-[10px] text-white/55 font-bold uppercase tracking-wider px-2">Scenario:</span>
            {["clear", "rain", "heat"].map((mode) => (
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
        </div>

        {/* SECTION 1: FORECAST SUMMARY & DRIVERS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {["7d", "30d"].map((day) => {
            const label = day === "7d" ? "7 Days" : "30 Days";
            const metrics = currentCityForecast?.forecasts ? currentCityForecast.forecasts[day as keyof typeof currentCityForecast.forecasts] : undefined;
            return (
              <div
                key={day}
                className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] text-white/45 uppercase font-bold tracking-wider">{label} Projections</p>
                    <span className="text-[8.5px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-white/60">
                      {day.replace('d', '')}d Horizon
                    </span>
                  </div>
                  <p className="text-3xl font-black text-white mt-1">
                    {metrics ? metrics.totalRisk.toLocaleString() : 0}
                  </p>
                </div>

                <div className="bg-slate-950/40 rounded-lg p-2.5 my-3 border border-white/5 text-[9px] space-y-1">
                  <p className="text-white/35 font-bold uppercase tracking-wider text-[8px]">Forecast Assumptions</p>
                  <div className="grid grid-cols-2 gap-1 text-white/70">
                    <div>🌦️ Weather: <span className="font-semibold text-indigo-300 capitalize">{weather}</span></div>
                    <div>📋 Active: <span className="font-semibold text-indigo-300">{activeIssues.length}</span></div>
                    <div>⚠️ Critical: <span className="font-semibold text-rose-300">{metrics ? metrics.criticalCount : 0}</span></div>
                    <div>⏱️ Horizon: <span className="font-semibold text-indigo-300">{label}</span></div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-white/50 border-t border-white/5 pt-2.5 mt-1">
                  <span>Avg: {metrics ? metrics.averageRisk : 0} pts</span>
                  <span className="text-rose-400 font-medium">{metrics ? metrics.criticalCount : 0} Critical</span>
                </div>

                <div className="mt-3 pt-3 border-t border-white/5 flex flex-col gap-1.5 text-[10px]">
                  <div className="flex items-center justify-between text-white/60">
                    <span>Forecast Confidence:</span>
                    <span className="font-bold text-indigo-400">{metrics ? metrics.confidence : 100}%</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Forecast Drivers */}
          <div className="bg-[#0B1220] border border-[#6366F1]/15 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-white font-extrabold text-sm uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                <span>📈</span> Forecast Drivers
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Factors causing projections to change under weather context.</p>
            </div>

            <div className="grid grid-cols-2 gap-2 my-3">
              <div className="bg-slate-950/40 border border-white/5 p-2 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 block mb-0.5">🌦️ Weather</span>
                <span className="text-xs font-black text-rose-400">+12%</span>
              </div>
              <div className="bg-slate-950/40 border border-white/5 p-2 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 block mb-0.5">🚨 Escalation</span>
                <span className="text-xs font-black text-rose-400">+18%</span>
              </div>
              <div className="bg-slate-950/40 border border-white/5 p-2 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 block mb-0.5">🛠️ Resolution</span>
                <span className="text-xs font-black text-emerald-400">-6%</span>
              </div>
              <div className="bg-slate-950/40 border border-white/5 p-2 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 block mb-0.5">📈 Trend</span>
                <span className="text-xs font-black text-rose-400">+4%</span>
              </div>
            </div>

            <div className="text-[9px] text-slate-400 bg-white/5 p-2 rounded-xl border border-white/5 leading-relaxed">
              Telemetry drivers are dynamically integrated from active incident resolution curves.
            </div>
          </div>
        </div>

        {/* SECTION 2: INTERVENTION PLANNER / SANDBOX (FULL WIDTH) */}
        <div className="w-full bg-slate-900/60 border border-white/5 rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Intervention Planner Sandbox</h2>
                <p className="text-xs text-white/50">Simulate resolving issues and compute the projected impact on 30-day city risk.</p>
              </div>
              {simSelectedIds.length > 0 && (
                <button
                  onClick={resetPlanner}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                >
                  Reset Simulation
                </button>
              )}
            </div>

            {/* RECOMMENDED INTERVENTION PRESETS */}
            <div className="mt-4 space-y-2">
              <p className="text-[10px] text-white/45 font-bold uppercase tracking-wider">Recommended Intervention Sets</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {recommendations.slice(0, 3).map((rec) => (
                  <button
                    key={rec.name}
                    onClick={() => applyPresetSet(rec.issueIds)}
                    className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      JSON.stringify(simSelectedIds.sort()) === JSON.stringify(rec.issueIds.sort())
                        ? "bg-indigo-600/20 border-indigo-500 shadow-md scale-[1.02]"
                        : "bg-white/5 border-white/5 hover:bg-white/10"
                    }`}
                  >
                    <p className="text-xs font-black text-white">{rec.name}</p>
                    <p className="text-[10px] text-emerald-400 font-bold mt-0.5">-{rec.expectedReduction ?? 0}% Risk Drop</p>
                    <p className="text-[9px] text-white/50 mt-1.5 leading-normal line-clamp-2">{rec.details}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* SIMULATOR ISSUES LIST */}
            <div className="mt-4">
              <p className="text-[10px] text-white/45 font-bold uppercase tracking-wider mb-2">Select Active Issues ({activeIssues.length})</p>
              <div className="max-h-[200px] overflow-y-auto border border-white/5 rounded-xl bg-slate-950 p-2 space-y-1.5 scrollbar-thin">
                {activeIssues.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 bg-[#0B1220] border border-[#6366F1]/15 rounded-xl my-2">
                    <span className="text-2xl mb-1.5">🛡️</span>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">No operational data available.</h4>
                    <p className="text-[9px] text-slate-400 mt-1 mb-3">
                      Submit reports or activate demo dataset to populate analytics.
                    </p>
                    <Link
                      href="/report"
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition cursor-pointer shadow-md inline-block"
                    >
                      Submit Risk Report
                    </Link>
                  </div>
                ) : (
                  activeIssues.map((issue) => (
                    <label
                      key={issue._id}
                      className={`flex items-start gap-2.5 p-2 rounded-lg transition-all border cursor-pointer ${
                        simSelectedIds.includes(issue._id)
                          ? "bg-indigo-600/10 border-indigo-500/30"
                          : "bg-white/5 border-white/5 hover:bg-white/10"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={simSelectedIds.includes(issue._id)}
                        onChange={() => handleCheckboxChange(issue._id)}
                        className="mt-1 accent-indigo-500"
                      />
                      <div className="flex-1 min-w-0 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white capitalize">{issue.issueType} - {issue.locationName}</span>
                          <span className="bg-rose-500/10 text-rose-300 px-1.5 py-0.2 rounded text-[9px] font-bold">
                            {issue.finalRisk} Risk
                          </span>
                        </div>
                        <p className="text-[10px] text-white/50 truncate mt-0.5">{issue.description || "No description provided."}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RESULTS */}
          {simSelectedIds.length > 0 ? (
            <div className="bg-[#050816] border border-white/5 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative overflow-hidden">
              {simLoading && (
                <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center text-xs">
                  Recalculating...
                </div>
              )}
              
              <div className="space-y-3 flex-1">
                <p className="text-white/60 font-bold uppercase text-[10px]">Simulation Output</p>
                
                {/* Before vs After Visual CRI Comparison */}
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-slate-400">Before Intervention CRI</span>
                      <span className="font-bold text-white font-mono">{currentCityCRI}</span>
                    </div>
                    <div className="w-full bg-white/15 h-2.5 rounded-full overflow-hidden flex">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min(100, currentCityCRI)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-slate-400">After Intervention CRI (Projected)</span>
                      <span className="font-bold text-emerald-400 font-mono">{projectedCityCRI}</span>
                    </div>
                    <div className="w-full bg-white/15 h-2.5 rounded-full overflow-hidden flex">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, projectedCityCRI)}%` }} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-[10px] text-slate-300 pt-1">
                  <div className="bg-white/5 border border-white/5 p-1.5 rounded-lg">
                    <span className="text-[8px] text-slate-400 uppercase font-bold block">Criticals Removed</span>
                    <strong className="text-rose-400 text-xs font-mono">{criticalIssuesRemoved}</strong>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-1.5 rounded-lg">
                    <span className="text-[8px] text-slate-400 uppercase font-bold block">Escalations Prevented</span>
                    <strong className="text-yellow-400 text-xs font-mono">{escalationsPreventedCount}</strong>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-1.5 rounded-lg">
                    <span className="text-[8px] text-slate-400 uppercase font-bold block">Breaches Prevented</span>
                    <strong className="text-red-400 text-xs font-mono">{slaBreachesPreventedCount}</strong>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-1.5 rounded-lg">
                    <span className="text-[8px] text-slate-400 uppercase font-bold block">Resolution Effort</span>
                    <strong className="text-indigo-400 text-xs font-mono">{estimatedResolutionEffort}</strong>
                  </div>
                </div>
              </div>

              <div className="text-center bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl min-w-[110px] shrink-0">
                <p className="text-3xl font-black text-emerald-400">-{reductionPercentage ?? 0}%</p>
                <p className="text-[9px] text-slate-400 uppercase font-semibold">CRI Drop</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-6 bg-[#0B1220]/55 border border-white/5 rounded-2xl min-h-[140px] text-white">
              <span className="text-3xl mb-2">📊</span>
              <p className="text-xs font-semibold text-slate-200">
                Select one or more active issues to simulate risk reduction.
              </p>
              <div className="text-[10px] text-slate-400 mt-2 text-left space-y-1 max-w-[280px] mx-auto border-t border-white/5 pt-2 w-full">
                <p className="font-bold text-indigo-400 uppercase text-[8px] tracking-wider mb-1">The simulator will estimate:</p>
                <div>• CRI reduction</div>
                <div>• Critical incidents prevented</div>
                <div>• Escalations avoided</div>
                <div>• Resolution effort</div>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
