"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function LayoutClient({ children }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-full overflow-x-hidden bg-black">

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
          <div className="relative w-64 bg-black shadow-2xl">
            <Sidebar />
          </div>
        </div>
      )}

      {/* 📄 MAIN CONTENT */}
      <main className="min-w-0 flex-1 h-full overflow-x-hidden overflow-y-auto bg-black">

        {/* 📱 MOBILE HEADER */}
        <div className="sticky top-0 z-40 md:hidden flex items-center justify-between p-4 bg-black backdrop-blur border-b border-white/10">

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
