import "leaflet/dist/leaflet.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar"; // ✅ keep this

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
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full overflow-hidden`}>

        <div className="flex h-full">

          {/* 🟣 SIDEBAR */}
          <Sidebar />

          {/* 📄 CONTENT */}
          <main className="flex-1 h-full ">
            {children}
          </main>

        </div>  

      </body>
    </html>
  );
}