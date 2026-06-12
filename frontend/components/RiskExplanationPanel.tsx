"use client";

import { useState } from "react";

type Props = {
  issue: {
    finalRisk?: number;
    riskValue?: number;
    riskLevel?: string;
    riskScore?: string;
    explanation?: string;
    breakdown?: {
      [key: string]: any;
    };
  };
};

export default function RiskExplanationPanel({ issue }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!issue) return null;

  const riskValue = issue.finalRisk ?? issue.riskValue ?? 0;
  const riskLevel = issue.riskLevel ?? issue.riskScore ?? "Low";
  const explanation = issue.explanation || "No risk analysis available for this issue.";
  
  const rawBreakdown = issue.breakdown || {};

  const getVal = (val: any, fallback = 0): number => {
    if (typeof val === "number") return val;
    if (val && typeof val === "object" && typeof val.contribution === "number") return val.contribution;
    if (val && typeof val === "object" && typeof val.impact === "number") return val.impact;
    return fallback;
  };

  const getBaseVal = (val: any, fallback = 0): number => {
    if (val && typeof val === "object" && typeof val.value === "number") return val.value;
    if (val && typeof val === "object" && typeof val.factor === "number") return val.factor;
    return fallback;
  };

  const severityPoints = rawBreakdown.severityContribution ?? getVal(rawBreakdown.severity);
  const frequencyPoints = rawBreakdown.frequencyContribution ?? getVal(rawBreakdown.frequency);
  const densityPoints = rawBreakdown.densityContribution ?? getVal(rawBreakdown.density ?? rawBreakdown.location);
  const persistencePoints = rawBreakdown.persistenceContribution ?? getVal(rawBreakdown.persistence ?? rawBreakdown.time);
  const weatherPoints = rawBreakdown.weatherContribution ?? getVal(rawBreakdown.weather);
  const escalationPoints = rawBreakdown.escalationContribution ?? 0;

  const severityBase = rawBreakdown.severityBase ?? getBaseVal(rawBreakdown.severity, severityPoints * 2);
  const frequencyBase = rawBreakdown.frequencyBase ?? getBaseVal(rawBreakdown.frequency, frequencyPoints / 0.3);
  const densityBase = rawBreakdown.densityBase ?? getBaseVal(rawBreakdown.location ?? rawBreakdown.density, densityPoints / 0.2);
  const timeFactor = rawBreakdown.timeFactor ?? getBaseVal(rawBreakdown.time, 1 + (persistencePoints / (riskValue || 50)));
  const weatherFactor = rawBreakdown.weatherFactor ?? getBaseVal(rawBreakdown.weather, 1 + (weatherPoints / (riskValue || 50)));

  // Color mapping
  const getRiskColor = (level: string) => {
    switch (level) {
      case "Critical":
        return { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", glow: "shadow-red-500/10" };
      case "High":
        return { text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", glow: "shadow-orange-500/10" };
      case "Medium":
        return { text: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", glow: "shadow-yellow-500/10" };
      default:
        return { text: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", glow: "shadow-green-500/10" };
    }
  };

  const colors = getRiskColor(riskLevel);

  return (
    <div className={`w-full rounded-2xl border ${colors.border} ${colors.bg} p-4 shadow-lg transition-all duration-300`}>
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-white/60 text-xs font-semibold uppercase tracking-wider">
            Risk Score Assessment
          </h4>
          <p className="text-2xl font-black text-white mt-1 flex items-baseline gap-2">
            <span>{riskValue}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${colors.border} ${colors.text}`}>
              {riskLevel}
            </span>
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium transition cursor-pointer"
        >
          {expanded ? "Hide Details ▴" : "Show Breakdown ▾"}
        </button>
      </div>

      {/* EXPLANATION */}
      <div className="mt-3 text-white/95 text-xs sm:text-sm leading-relaxed border-t border-white/5 pt-3">
        {explanation}
      </div>

      {/* EXPANDABLE BREAKDOWN */}
      {expanded && (
        <div className="mt-4 border-t border-white/10 pt-4 space-y-4 animate-fadeIn">
          <h5 className="text-white font-semibold text-xs uppercase tracking-wide">
            Points & Adjustment Breakdown
          </h5>
          
          <div className="space-y-3">
            {/* Severity */}
            <ProgressBar
              label="Infrastructure Severity (50%)"
              score={Math.min(100, Math.round(severityBase))}
              contribution={severityPoints}
              color="bg-indigo-500"
            />
            {/* Frequency */}
            <ProgressBar
              label="Community Votes Signal (30%)"
              score={Math.min(100, Math.round(frequencyBase))}
              contribution={frequencyPoints}
              color="bg-sky-500"
            />
            {/* Location */}
            <ProgressBar
              label="Location Density Weight (20%)"
              score={Math.min(100, Math.round(densityBase))}
              contribution={densityPoints}
              color="bg-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4 border-t border-white/5 pt-3">
            {/* Time Factor */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <p className="text-white/50 text-[10px] uppercase font-semibold">Time Persistence</p>
              <p className="text-lg font-bold text-white mt-0.5">+{persistencePoints} pts</p>
              <p className="text-white/60 text-[11px] mt-1">
                Aging factor is <span className="text-amber-400 font-medium">{timeFactor.toFixed(2)}x</span>.
              </p>
            </div>
            {/* Weather Factor */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
              <p className="text-white/50 text-[10px] uppercase font-semibold">Weather Impact</p>
              <p className="text-lg font-bold text-white mt-0.5">+{weatherPoints} pts</p>
              <p className="text-white/60 text-[11px] mt-1">
                Weather multiplier is <span className="text-blue-400 font-medium">{weatherFactor.toFixed(2)}x</span>.
              </p>
            </div>
          </div>

          {escalationPoints > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 mt-3">
              <p className="text-rose-400 text-[10px] uppercase font-bold tracking-wider">⚠️ Escalation Active</p>
              <p className="text-lg font-bold text-white mt-0.5">+{escalationPoints} pts</p>
              <p className="text-white/60 text-[11px] mt-1">
                Risk accumulated due to active critical clustering in this neighborhood.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type BarProps = {
  label: string;
  score: number;
  contribution: number;
  color: string;
};

function ProgressBar({ label, score, contribution, color }: BarProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-white/70">
        <span>{label}</span>
        <span className="font-semibold text-white">
          Score: {score} (+{contribution} pts)
        </span>
      </div>
      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
        <div
          className={`${color} h-full rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
    </div>
  );
}
