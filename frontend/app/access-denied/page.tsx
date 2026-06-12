"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AccessDeniedPage() {
  const router = useRouter();
  const [currentRole, setCurrentRole] = useState("Citizen");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      try {
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user?.role) {
            // Capitalize role name
            setCurrentRole(user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase());
          }
        }
      } catch (err) {
        console.error("Failed to parse user info:", err);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden text-white">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-900/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-900/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center px-4">
        <div className="flex justify-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/20 animate-bounce">
            <span className="text-white text-3xl font-extrabold">🛑</span>
          </div>
        </div>
        <h2 className="text-3xl font-black tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-300 to-amber-300">
          Access Restricted
        </h2>
        <p className="mt-3 text-xs text-gray-400 font-medium max-w-sm mx-auto leading-relaxed">
          Your account is authenticated but does not have permission to access the Municipal Operations Console.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-neutral-900/60 backdrop-blur-md border border-red-500/20 py-8 px-6 shadow-2xl sm:rounded-2xl sm:px-10 space-y-6">
          
          {/* Role status cards */}
          <div className="space-y-4">
            <div className="bg-neutral-950/80 border border-white/5 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block">
                  Current Role
                </span>
                <span className="text-sm font-bold text-red-400 mt-1 block">
                  {currentRole}
                </span>
              </div>
              <span className="text-xs bg-red-500/10 border border-red-500/20 text-red-300 px-2 py-0.5 rounded-md font-semibold">
                Unauthorized
              </span>
            </div>

            <div className="bg-neutral-950/80 border border-white/5 p-4 rounded-xl space-y-2">
              <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block">
                Required Authorization Tiers
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                {["Operator", "Supervisor", "Administrator"].map((role) => (
                  <span
                    key={role}
                    className="text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2.5 py-1 rounded-lg font-bold"
                  >
                    🛠️ {role}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Secure Environment Notice */}
          <div className="text-center border-t border-white/5 pt-5 text-[10px] text-gray-500 leading-normal">
            If you need to evaluate operational workflows, launch simulated access by continuing in **Demo Mode** from the login screen.
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 gap-3 pt-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-white/10 hover:border-white/20 rounded-xl shadow-sm text-xs font-bold text-white bg-white/5 hover:bg-white/10 focus:outline-none transition-all cursor-pointer"
            >
              📊 Return to Dashboard
            </button>
            
            <button
              onClick={() => router.push("/report")}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-purple-500/20 rounded-xl shadow-lg text-xs font-bold text-purple-300 bg-purple-600/10 hover:bg-purple-600/20 focus:outline-none transition-all cursor-pointer"
            >
              📤 Continue Reporting
            </button>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-[10px] text-gray-600 z-10">
        <p className="font-semibold text-gray-500">CivicGuard Security Gateway</p>
        <p className="mt-0.5">Authorization Level Enforcement Module</p>
      </div>
    </div>
  );
}
