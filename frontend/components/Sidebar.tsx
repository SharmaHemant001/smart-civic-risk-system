"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { path: "/dashboard", icon: "📊", label: "Dashboard" },
    { path: "/report", icon: "📤", label: "Report" },
  ];

  return (
    <aside
      className="
        h-full md:h-screen
        w-64 md:w-20
        bg-gradient-to-b from-indigo-600 via-purple-600 to-indigo-700
        text-white flex flex-col items-start md:items-center
        py-6 px-4 md:px-0 gap-6
        shadow-2xl backdrop-blur-xl
      "
    >
      {/* 🔥 LOGO */}
      <Link
        href="/"
        className="text-2xl bg-white/20 p-2 rounded-xl 
                   backdrop-blur-md shadow-lg 
                   hover:scale-110 hover:bg-white/30 
                   transition duration-300 self-center md:self-auto"
      >
        🤖
      </Link>

      {/* NAV */}
      <nav className="flex flex-col gap-4 w-full mt-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.path ||
            pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              href={item.path}
              className="relative group w-full"
            >
              {/* ACTIVE INDICATOR */}
              {isActive && (
                <span
                  className="absolute left-0 md:-left-3 top-1/2 -translate-y-1/2 
                             w-1 h-8 bg-white rounded-full shadow-lg"
                ></span>
              )}

              {/* ITEM */}
              <div
                className={`
                  flex items-center gap-3
                  w-full md:w-12 h-12 px-3 md:px-0
                  rounded-xl transition-all duration-300
                  ${
                    isActive
                      ? "bg-white text-indigo-600 shadow-lg scale-[1.02] md:scale-110"
                      : "bg-white/10 hover:bg-white/20"
                  }
                `}
              >
                {/* ICON */}
                <span className="text-xl flex justify-center w-6">
                  {item.icon}
                </span>

                {/* LABEL (ONLY MOBILE) */}
                <span className="md:hidden text-sm font-medium">
                  {item.label}
                </span>
              </div>

              {/* TOOLTIP (ONLY DESKTOP) */}
              <span
                className="hidden md:block absolute left-16 top-1/2 -translate-y-1/2 
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