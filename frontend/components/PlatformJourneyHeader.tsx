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
        
        {/* BRAND LOGO */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="flex items-center gap-1.5 pr-3 mr-1">
            <span className="text-sm bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 p-1.5 rounded-lg">🤖</span>
            <span className="text-xs font-black uppercase tracking-wider text-white">CivicGuard</span>
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
              <span>Open Demo</span>
            </button>
          )}
        </div>

      </div>
    </>
  );
}
