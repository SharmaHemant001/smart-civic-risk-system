import "leaflet/dist/leaflet.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import LayoutClient from "@/components/LayoutClient";

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
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}