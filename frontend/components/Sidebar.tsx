"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  isAuthenticated?: boolean;
  userRole?: string;
  onProtectedClick?: (targetPath: string) => void;
}

export default function Sidebar({
  isAuthenticated = false,
  userRole = "",
  onProtectedClick,
}: SidebarProps) {
  const pathname = usePathname();
  const allowedRoles = ["operator", "supervisor", "admin", "dispatcher", "manager", "fieldcrew"];

  const primaryNavItems = [
    { path: "/dashboard", icon: "📊", label: "Executive Dashboard" },
    { path: "/authority", icon: "🏛️", label: "Command Center" },
    { path: "/authority/forecast", icon: "🔮", label: "Forecast Planner" },
    { path: "/report", icon: "📤", label: "Submit Report" },
  ];

  const handleNavItemClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    const isProtected = path.startsWith("/authority");
    const isAuthorized = isAuthenticated && allowedRoles.includes(userRole.toLowerCase());

    if (isProtected && !isAuthorized) {
      e.preventDefault();
      if (onProtectedClick) {
        onProtectedClick(path);
      }
    }
  };

  const renderNavItem = (item: { path: string; icon: string; label: string }) => {
    const isActive =
      pathname === item.path ||
      (item.path !== "/authority" && pathname.startsWith(item.path));

    return (
      <Link
        key={item.path}
        href={item.path}
        onClick={(e) => handleNavItemClick(e, item.path)}
        className="relative group w-full"
      >
        {/* ACTIVE INDICATOR */}
        {isActive && (
          <span
            className="absolute left-0 md:-left-2 top-1/2 -translate-y-1/2 
                       w-1 h-8 bg-white rounded-full shadow"
          />
        )}

        {/* ITEM */}
        <div
          className={`
            flex items-center md:justify-center gap-3
            w-full md:w-12 h-12
            px-3 md:px-0
            rounded-xl transition-all duration-300

            ${
              isActive
                ? "bg-white text-indigo-600 shadow-md scale-[1.02] md:scale-110"
                : "bg-white/10 hover:bg-white/20"
            }
          `}
        >
          {/* ICON */}
          <span className="text-xl w-6 flex justify-center">
            {item.icon}
          </span>

          {/* LABEL (MOBILE ONLY) */}
          <span className="md:hidden text-sm font-medium">
            {item.label}
          </span>
        </div>

        {/* TOOLTIP (DESKTOP ONLY) */}
        <span
          className="
            hidden md:block absolute left-16 top-1/2 -translate-y-1/2
            bg-black/80 backdrop-blur-md text-white text-xs
            px-2 py-1 rounded
            opacity-0 group-hover:opacity-100
            transition whitespace-nowrap shadow
            z-50
          "
        >
          {item.label}
        </span>
      </Link>
    );
  };

  return (
    <aside
      className="
        h-full md:h-screen
        w-64 md:w-20
        bg-gradient-to-b from-indigo-600 via-purple-600 to-indigo-700
        text-white flex flex-col
        items-start md:items-center
        py-6 px-4 md:px-2
        gap-4
        shadow-2xl backdrop-blur-xl
      "
    >
      {/* 🔥 LOGO */}
      <Link
        href="/"
        className="text-2xl bg-white/20 p-2 rounded-xl 
                   backdrop-blur-md shadow-lg 
                   hover:scale-110 hover:bg-white/30 
                   transition duration-300 self-center mb-2"
      >
        🤖
      </Link>

      {/* PRIMARY NAV */}
      <div className="w-full text-center">
        <span className="text-[8px] text-white/50 uppercase font-black tracking-widest hidden md:inline-block mb-1">
          Core
        </span>
        <span className="text-[9px] text-white/55 uppercase font-black tracking-widest md:hidden block mb-1 px-1 text-left">
          Core Operations
        </span>
      </div>
      <nav className="flex flex-col gap-2.5 w-full">
        {primaryNavItems.map(renderNavItem)}
      </nav>
    </aside>
  );
}