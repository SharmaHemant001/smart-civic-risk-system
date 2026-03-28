"use client";

import "leaflet/dist/leaflet.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { useState } from "react";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CivicGuard – Smart Civic Risk System",
  description:
    "A real-time civic risk detection and route-aware navigation platform for safer urban mobility",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full overflow-hidden`}>

        <div className="flex h-full">

          {/* 🟣 SIDEBAR (DESKTOP) */}
          <div className="hidden md:block">
            <Sidebar />
          </div>

          {/* 📱 MOBILE SIDEBAR (DRAWER) */}
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

              <div /> {/* empty for spacing */}
            </div>

            {children}
          </main>

        </div>

      </body>
    </html>
  );
}