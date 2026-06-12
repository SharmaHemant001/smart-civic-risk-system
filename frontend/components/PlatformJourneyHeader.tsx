"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

interface PlatformJourneyHeaderProps {
  isAuthenticated?: boolean;
  userRole?: string;
  displayName?: string;
  isDemoModeProp?: boolean;
  onSignInClick?: () => void;
  onSignOutClick?: () => void;
  onProtectedClick?: (targetPath: string) => void;
}

export default function PlatformJourneyHeader({
  isAuthenticated = false,
  userRole = "",
  displayName = "",
  isDemoModeProp = false,
  onSignInClick,
  onSignOutClick,
  onProtectedClick,
}: PlatformJourneyHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [simStep, setSimStep] = useState(0);
  const [simActive, setSimActive] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const active = localStorage.getItem("sim_active") === "true";
      const step = parseInt(localStorage.getItem("sim_step") || "0", 10);
      setSimActive(active);
      setSimStep(step);

      const handleSimEvent = () => {
        setSimActive(localStorage.getItem("sim_active") === "true");
        setSimStep(parseInt(localStorage.getItem("sim_step") || "0", 10));
      };

      window.addEventListener("civicguard-simulation", handleSimEvent);
      return () => window.removeEventListener("civicguard-simulation", handleSimEvent);
    }
  }, []);

  const steps = [
    { name: "Citizen Report", path: "/report", icon: "👥" },
    { name: "Risk Analysis", path: "/dashboard", icon: "⚖️" },
    { name: "Escalation Detection", path: "/authority", icon: "🏛️" },
    { name: "Action Recommendation", path: "/authority/forecast", icon: "🔮" },
    { name: "Risk Reduction", path: "/driver", icon: "🚗" }
  ];

  // Determine current active step based on pathname
  let activeIndex = -1;
  if (pathname === "/report") activeIndex = 0;
  else if (pathname === "/dashboard") activeIndex = 1;
  else if (pathname === "/authority") activeIndex = 2;
  else if (pathname === "/authority/forecast") activeIndex = 3;
  else if (pathname === "/driver") activeIndex = 4;

  const allowedRoles = ["operator", "supervisor", "admin", "dispatcher", "manager", "fieldcrew"];

  const handleStepClick = (e: React.MouseEvent, path: string) => {
    const isProtected = path.startsWith("/authority");
    const isAuthorized = isAuthenticated && allowedRoles.includes(userRole.toLowerCase());

    if (isProtected && !isAuthorized) {
      e.preventDefault();
      if (onProtectedClick) {
        onProtectedClick(path);
      }
    } else {
      router.push(path);
    }
  };

  const triggerSimUpdate = (stepNum: number, active: boolean) => {
    if (typeof window !== "undefined") {
      if (!active) {
        localStorage.removeItem("sim_active");
        localStorage.removeItem("sim_step");
        localStorage.removeItem("sim_weather");
        localStorage.removeItem("sim_cri");
        localStorage.removeItem("sim_reports");
        localStorage.removeItem("sim_critical");
        localStorage.removeItem("sim_alert");
        localStorage.removeItem("sim_recommendation");
      } else {
        localStorage.setItem("sim_active", "true");
        localStorage.setItem("sim_step", stepNum.toString());

        // Dynamic State Seeding per Step
        if (stepNum === 1) {
          localStorage.setItem("sim_weather", "rain");
          localStorage.setItem("sim_cri", "78");
          localStorage.setItem("sim_reports", "85");
          localStorage.setItem("sim_critical", "80");
          localStorage.removeItem("sim_alert");
          localStorage.removeItem("sim_recommendation");
        } else if (stepNum === 2) {
          localStorage.setItem("sim_weather", "rain");
          localStorage.setItem("sim_cri", "89");
          localStorage.setItem("sim_reports", "118");
          localStorage.setItem("sim_critical", "94");
          localStorage.removeItem("sim_alert");
          localStorage.removeItem("sim_recommendation");
        } else if (stepNum === 3) {
          localStorage.setItem("sim_weather", "rain");
          localStorage.setItem("sim_cri", "98");
          localStorage.setItem("sim_reports", "132");
          localStorage.setItem("sim_critical", "110");
          localStorage.setItem("sim_alert", "Dwarka Flooding Cluster: Spatiotemporal escalation spike in drainage channels.");
          localStorage.removeItem("sim_recommendation");
        } else if (stepNum === 4) {
          localStorage.setItem("sim_weather", "rain");
          localStorage.setItem("sim_cri", "99");
          localStorage.setItem("sim_reports", "132");
          localStorage.setItem("sim_critical", "110");
          localStorage.setItem("sim_alert", "SLA Breach Warning: Dwarka Sector 5 drainage blockages breach in 6 hours.");
          localStorage.removeItem("sim_recommendation");
        } else if (stepNum === 5) {
          localStorage.setItem("sim_weather", "rain");
          localStorage.setItem("sim_cri", "99");
          localStorage.setItem("sim_reports", "132");
          localStorage.setItem("sim_critical", "110");
          localStorage.setItem("sim_alert", "SLA Breach Warning: Dwarka Sector 5 drainage blockages breach in 6 hours.");
          localStorage.setItem("sim_recommendation", "Deploy Emergency Response Team B to clear Sector 5 conduits.");
        } else if (stepNum === 6) {
          localStorage.setItem("sim_weather", "clear");
          localStorage.setItem("sim_cri", "83"); // CRI drops by 15 points
          localStorage.setItem("sim_reports", "92");
          localStorage.setItem("sim_critical", "75");
          localStorage.removeItem("sim_alert");
          localStorage.removeItem("sim_recommendation");
        }
      }
      
      setSimActive(active);
      setSimStep(stepNum);
      window.dispatchEvent(new Event("civicguard-simulation"));
    }
  };

  const startSimulation = () => {
    triggerSimUpdate(1, true);
    setShowSimModal(true);
  };

  const nextSimStep = () => {
    if (simStep < 6) {
      triggerSimUpdate(simStep + 1, true);
    } else {
      stopSimulation();
    }
  };

  const prevSimStep = () => {
    if (simStep > 1) {
      triggerSimUpdate(simStep - 1, true);
    }
  };

  const stopSimulation = () => {
    triggerSimUpdate(0, false);
    setShowSimModal(false);
  };

  const simInfo = [
    {
      title: "1. Severe Rainfall Strikes City",
      desc: "Monsoon rainfall hits Delhi NCR. The Platform Risk Engine dynamically updates local coefficients, raising the base City Risk Index (CRI)."
    },
    {
      title: "2. Drainage Complaints Spikes",
      desc: "Citizens submit flood reports. Spatiotemporal coordinates list density clusters in Sector 5, Dwarka, raising report metrics."
    },
    {
      title: "3. Spatial Escalation Triggered",
      desc: "Escalation detection engine flags report frequency. Dwarka hotspot triggers a critical operational alarm (CRI reaches 89)."
    },
    {
      title: "4. SLA Breach Forecasted",
      desc: "Predictive engine projects Dwarka Sector 5 reports will breach response deadlines within 6 hours. CRI index peaks at 98."
    },
    {
      title: "5. Resource Allocation Suggested",
      desc: "Municipal engine coordinates dispatch. Action Plan recommends clearing Sector 5 drainage conduits immediately."
    },
    {
      title: "6. Intervention Complete - CRI Restored",
      desc: "Simulate dispatch resolution. Drainage cleared. Critical reports are resolved, and the overall City Risk Index drops by 15 points (CRI 83)."
    }
  ];

  const displayRole = userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1).toLowerCase() : "";

  return (
    <>
      <div className="w-full bg-[#070B14] border-b border-white/10 px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 select-none z-30">
        
        {/* BRAND LOGO & BREADCRUMBS */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="flex items-center gap-1.5 border-r border-white/10 pr-3 mr-1">
            <span className="text-sm bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 p-1.5 rounded-lg">🤖</span>
            <span className="text-xs font-black uppercase tracking-wider text-white">CivicGuard</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            {steps.map((step, idx) => {
              const isActive = idx === activeIndex;
              const isPast = idx < activeIndex;
              
              return (
                <React.Fragment key={step.path}>
                  {idx > 0 && <span className="text-white/20">➔</span>}
                  <button
                    onClick={(e) => handleStepClick(e, step.path)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                      isActive
                        ? "bg-indigo-600/25 border border-indigo-500/40 text-indigo-300 shadow-md shadow-indigo-500/5 scale-105"
                        : isPast
                        ? "text-white/60 hover:text-white hover:bg-white/5"
                        : "text-white/30 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span>{step.icon}</span>
                    <span className="hidden sm:inline">{step.name}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* CONTROLS & DEMO MODE BADGE */}
        <div className="flex items-center justify-end gap-2 text-[10px]">
          
          {/* AUTH STATUS BADGE */}
          {isAuthenticated && (
            <div className={`${isDemoModeProp ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'} border px-2 py-1 rounded-lg flex items-center gap-1.5 font-extrabold`}>
              <span>👤</span>
              <span>{displayRole}</span>
            </div>
          )}

          {/* SIGN IN / SIGN OUT BUTTON */}
          {isAuthenticated ? (
            <button
              onClick={onSignOutClick}
              className="px-2.5 py-1 bg-red-600/10 hover:bg-red-600/20 text-red-300 border border-red-500/30 rounded-lg font-black flex items-center gap-1 transition cursor-pointer"
            >
              <span>🚪</span>
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={onSignInClick}
              className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg font-black flex items-center gap-1 transition cursor-pointer animate-pulse"
            >
              <span>🛡️</span>
              <span>Municipal Access</span>
            </button>
          )}

          {/* SIMULATION CONTROLS */}
          {simActive ? (
            <button
              onClick={() => setShowSimModal(true)}
              className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg border border-purple-500/20 font-black flex items-center gap-1.5 shadow-md shadow-purple-500/10 cursor-pointer animate-pulse"
            >
              <span>⚡ Sim Stage {simStep}/6</span>
            </button>
          ) : (
            <button
              onClick={startSimulation}
              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg font-black flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>▶ Start Crisis Simulation</span>
            </button>
          )}
        </div>

      </div>

      {/* SIMULATOR STEP CONTROLLER MODAL */}
      {showSimModal && simActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-neutral-900 border border-purple-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowSimModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-sm cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-1">
              <span className="text-xs font-black text-purple-400 uppercase tracking-widest block">
                ⚡ City Crisis Simulator
              </span>
              <h3 className="text-base font-black text-white">
                {simInfo[simStep - 1].title}
              </h3>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
              {simInfo[simStep - 1].desc}
            </p>

            {/* Step visualization dots */}
            <div className="flex justify-center gap-1.5 py-1">
              {simInfo.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                    idx + 1 === simStep
                      ? "bg-purple-500 w-4 shadow-lg shadow-purple-500/40"
                      : idx + 1 < simStep
                      ? "bg-purple-400/55"
                      : "bg-white/10"
                  }`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={stopSimulation}
                className="flex-1 py-2 border border-white/5 hover:bg-white/5 text-[10px] text-gray-400 font-bold rounded-xl transition cursor-pointer"
              >
                Reset Demo
              </button>
              
              {simStep > 1 && (
                <button
                  onClick={prevSimStep}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 text-[10px] text-white font-bold rounded-xl border border-white/10 transition cursor-pointer"
                >
                  Back
                </button>
              )}

              <button
                onClick={nextSimStep}
                className="flex-[2] py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[10px] font-black rounded-xl shadow-lg border border-purple-500/10 transition cursor-pointer"
              >
                {simStep === 6 ? "Finish Simulation" : "Next Stage ➔"}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
