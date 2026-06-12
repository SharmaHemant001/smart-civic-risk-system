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
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError("");
      setIsSubmitting(false);
      setSelectedRole(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectSession = async (roleKey: "operator" | "supervisor" | "admin") => {
    setError("");
    setIsSubmitting(true);
    setSelectedRole(roleKey);
    
    try {
      const response = await API.post("/auth/login", {
        idToken: "mock-google-id-token",
        role: roleKey,
      });
      const { accessToken, user: backendUser } = response.data;

      const roleDisplayNames = {
        operator: "Demo Operator",
        supervisor: "Demo Supervisor",
        admin: "Demo Admin",
      };

      const updatedUser = {
        ...backendUser,
        displayName: roleDisplayNames[roleKey],
        email: `demo-${roleKey}@civicguard.gov`,
        role: roleKey,
      };

      localStorage.setItem("demoMode", "true");
      localStorage.setItem("role", roleKey);
      localStorage.setItem("displayName", roleDisplayNames[roleKey]);
      localStorage.setItem("authType", "demo");
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("userRole", roleKey);
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("user", JSON.stringify(updatedUser));

      // Dispatch login event
      window.dispatchEvent(new Event("civicguard-auth"));

      onSuccess(roleKey);
    } catch (err: any) {
      console.error(err);
      setError("Failed to initialize simulated session. Please try again.");
      setSelectedRole(null);
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
                title: "Enter Demo Administrator Session",
                desc: "Full command center capabilities, configurations, and simulator overrides",
                icon: "🛡️",
              },
              {
                key: "supervisor",
                title: "Enter Demo Supervisor Session",
                desc: "Risk trend forecasting, crew dispatches, and emergency simulator access",
                icon: "📊",
              },
              {
                key: "operator",
                title: "Enter Demo Operator Session",
                desc: "Dispatch queue updates, status reports, and active task reviews",
                icon: "🛠️",
              },
            ].map((role) => {
              const isCurrentSubmitting = isSubmitting && selectedRole === role.key;
              return (
                <button
                  key={role.key}
                  disabled={isSubmitting}
                  onClick={() => handleSelectSession(role.key as any)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl bg-neutral-950/60 border border-white/5 hover:border-purple-500/30 hover:bg-neutral-950 text-left transition cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-lg bg-neutral-900 p-1.5 rounded-lg group-hover:bg-purple-950/40 transition">
                    {isCurrentSubmitting ? "⌛" : role.icon}
                  </span>
                  <div className="space-y-0.5 leading-snug">
                    <span className="text-xs font-bold text-white group-hover:text-purple-300 transition">
                      {isCurrentSubmitting ? "Initializing..." : role.title}
                    </span>
                    <p className="text-[9px] text-gray-500 group-hover:text-gray-400 leading-normal font-medium">
                      {role.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="text-center pt-3 text-[10px] text-gray-500 border-t border-white/5 font-semibold">
            Demo Environment — Access levels are simulated for evaluation and demonstration purposes.
          </div>
        </div>

      </div>
    </div>
  );
}
