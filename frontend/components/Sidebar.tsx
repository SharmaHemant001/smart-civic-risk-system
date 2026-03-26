"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { path: "/dashboard", icon: "📊", label: "Dashboard" },
    { path: "/report", icon: "📤", label: "Report" },
    { path: "/driver", icon: "🚗", label: "Driver" },
  ];

  return (
    <aside
      className="h-screen w-20 
                 bg-gradient-to-b from-indigo-600 via-purple-600 to-indigo-700 
                 text-white flex flex-col items-center py-6 gap-8 
                 shadow-2xl backdrop-blur-xl"
    >
      {/* 🔥 LOGO (clickable now) */}
      <Link
        href="/"
        className="text-2xl bg-white/20 p-2 rounded-xl 
                   backdrop-blur-md shadow-lg 
                   hover:scale-110 hover:bg-white/30 
                   transition duration-300"
      >
        🤖
      </Link>

      {/* NAV */}
      <nav className="flex flex-col gap-6 mt-6">
        {navItems.map((item) => {
          const isActive =
            pathname === item.path ||
            pathname.startsWith(item.path); // 🔥 better detection

          return (
            <Link
              key={item.path}
              href={item.path}
              className="relative group"
            >
              {/* ACTIVE INDICATOR */}
              {isActive && (
                <span
                  className="absolute -left-3 top-1/2 -translate-y-1/2 
                             w-1 h-8 bg-white rounded-full shadow-lg"
                ></span>
              )}

              {/* ICON */}
              <div
                className={`
                  flex items-center justify-center w-12 h-12 rounded-xl
                  transition-all duration-300
                  ${
                    isActive
                      ? "bg-white text-indigo-600 shadow-lg scale-110"
                      : "bg-white/10 hover:bg-white/20 hover:scale-105"
                  }
                `}
              >
                <span className="text-xl">{item.icon}</span>
              </div>

              {/* TOOLTIP */}
              <span
                className="absolute left-16 top-1/2 -translate-y-1/2 
                           bg-black/80 backdrop-blur-md text-white text-xs 
                           px-2 py-1 rounded 
                           opacity-0 group-hover:opacity-100 
                           transition whitespace-nowrap shadow"
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}