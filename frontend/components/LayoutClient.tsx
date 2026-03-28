"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";

export default function LayoutClient({ children }: any) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex h-full">

      {/* 🟣 SIDEBAR (DESKTOP) */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* 📱 MOBILE SIDEBAR */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">

          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer */}
          <div className="relative w-64 bg-black">
            <Sidebar />
          </div>
        </div>
      )}

      {/* 📄 MAIN CONTENT */}
      <main className="flex-1 h-full overflow-y-auto">

        {/* 📱 MOBILE HEADER */}
        <div className="md:hidden flex items-center justify-between p-4 bg-black/30 backdrop-blur border-b border-white/10">

          <button
            onClick={() => setIsOpen(true)}
            className="text-white text-2xl"
          >
            ☰
          </button>

          <h1 className="text-white font-semibold text-sm">
            CivicGuard
          </h1>

          <div />
        </div>

        {children}
      </main>
    </div>
  );
}