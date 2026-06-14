"use client";

import React, { useState, useEffect } from "react";
import API from "../utils/api";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (role?: string) => void;
  initialMode?: "methods" | "role-selection" | "demo-selection";
  isProtectedTarget?: boolean;
}

export default function LoginModal({
  isOpen,
  onClose,
  onSuccess,
  initialMode = "methods",
  isProtectedTarget = false,
}: LoginModalProps) {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localSelectedRole, setLocalSelectedRole] = useState<"operator" | "supervisor" | "admin" | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError("");
      setIsSubmitting(false);
      setLocalSelectedRole(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleContinue = async () => {
    if (!localSelectedRole) return;
    setError("");
    setIsSubmitting(true);

    console.log("Role Selected:", localSelectedRole);
    
    const roleDisplayNames = {
      operator: "Demo Operator",
      supervisor: "Demo Supervisor",
      admin: "Demo Admin",
    };

    const localMockUser = {
      id: `mock-id-${localSelectedRole}`,
      displayName: roleDisplayNames[localSelectedRole],
      email: `demo-${localSelectedRole}@civicguard.gov`,
      role: localSelectedRole,
      profilePhoto: ""
    };

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Login request timed out")), 2500)
      );

      const response = await Promise.race([
        API.post("/auth/login", {
          idToken: "mock-google-id-token",
          role: localSelectedRole,
        }),
        timeoutPromise,
      ]) as any;

      const { accessToken, user: backendUser } = response.data;

      const updatedUser = {
        ...backendUser,
        displayName: roleDisplayNames[localSelectedRole],
        email: `demo-${localSelectedRole}@civicguard.gov`,
        role: localSelectedRole,
      };

      localStorage.setItem("demoMode", "true");
      localStorage.setItem("role", localSelectedRole);
      localStorage.setItem("displayName", roleDisplayNames[localSelectedRole]);
      localStorage.setItem("authType", "demo");
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("userRole", localSelectedRole);
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("user", JSON.stringify(updatedUser));

      console.log("Session Created: Demo Mode = true (Backend Connected)");

      // Dispatch login event
      window.dispatchEvent(new Event("civicguard-auth"));

      onSuccess(localSelectedRole);
    } catch (err: any) {
      console.warn("Backend authentication failed, falling back to local client-side demo session:", err);
      
      localStorage.setItem("demoMode", "true");
      localStorage.setItem("role", localSelectedRole);
      localStorage.setItem("displayName", roleDisplayNames[localSelectedRole]);
      localStorage.setItem("authType", "demo");
      localStorage.setItem("accessToken", `demo-${localSelectedRole}`);
      localStorage.setItem("userRole", localSelectedRole);
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("user", JSON.stringify(localMockUser));

      console.log("Session Created: Demo Mode = true (Local Fallback Active)");

      // Dispatch login event
      window.dispatchEvent(new Event("civicguard-auth"));

      onSuccess(localSelectedRole);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-neutral-900 border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-white">
        
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-sm cursor-pointer transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ✕
        </button>

        <div className="space-y-4">
          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20 mx-auto">
              <span className="text-white text-2xl font-bold">CG</span>
            </div>
            <h3 className="text-lg font-black tracking-tight leading-snug">
              Municipal Operations Access
            </h3>
            <p className="text-xs text-indigo-300 font-medium max-w-xs mx-auto leading-relaxed">
              Select an access level to enter the operations console.
            </p>
          </div>

          {error && (
            <div className="text-xs bg-red-950/40 border border-red-500/30 text-red-200 p-3 rounded-lg text-center">
              {error}
            </div>
          )}

          <div className="space-y-2.5 pt-2">
            {[
              {
                key: "admin",
                title: "Demo Administrator Session",
                desc: "Full command center capabilities, configurations, and simulator overrides",
                icon: "🛡️",
              },
              {
                key: "supervisor",
                title: "Demo Supervisor Session",
                desc: "Risk trend forecasting, crew dispatches, and emergency simulator access",
                icon: "📊",
              },
              {
                key: "operator",
                title: "Demo Operator Session",
                desc: "Dispatch queue updates, status reports, and active task reviews",
                icon: "🛠️",
              },
            ].map((role) => {
              const isSelected = localSelectedRole === role.key;
              return (
                <button
                  key={role.key}
                  disabled={isSubmitting}
                  onClick={() => setLocalSelectedRole(role.key as any)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl bg-neutral-950/60 border hover:bg-neutral-950 text-left transition cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed ${
                    isSelected 
                      ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-neutral-950" 
                      : "border-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center self-center h-4 mr-1">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                      isSelected ? "border-indigo-500 bg-indigo-500" : "border-white/30"
                    }`}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <span className="text-lg bg-neutral-900 p-1.5 rounded-lg group-hover:bg-indigo-950/40 transition">
                    {role.icon}
                  </span>
                  <div className="space-y-0.5 leading-snug flex-1">
                    <span className={`text-xs font-bold transition ${
                      isSelected ? "text-indigo-300" : "text-white"
                    }`}>
                      {role.title}
                    </span>
                    <p className="text-[9px] text-gray-500 group-hover:text-gray-400 leading-normal font-medium">
                      {role.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleContinue}
            disabled={isSubmitting || !localSelectedRole}
            className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition duration-200 cursor-pointer flex items-center justify-center gap-2 ${
              localSelectedRole && !isSubmitting
                ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                : "bg-white/5 text-white/30 border border-white/5 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Initializing Session...</span>
              </>
            ) : (
              "Continue"
            )}
          </button>

          <div className="text-center pt-3 text-[10px] text-gray-500 border-t border-white/5 font-semibold">
            Demo Environment — Access levels are simulated for evaluation and demonstration purposes.
          </div>
        </div>

      </div>
    </div>
  );
}
