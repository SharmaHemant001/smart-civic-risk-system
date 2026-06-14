"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import PlatformJourneyHeader from "@/components/PlatformJourneyHeader";
import LoginModal from "@/components/LoginModal";

export default function LayoutClient({ children }: any) {
  const router = useRouter();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(false);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [modalTargetRoute, setModalTargetRoute] = useState("");
  const [modalInitialMode, setModalInitialMode] = useState<"methods" | "role-selection" | "demo-selection">("methods");

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  const checkAuthStatus = () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      const isTokenValid = token && token !== "null" && token !== "undefined";
      setIsAuthenticated(!!isTokenValid);

      const isDemo = localStorage.getItem("demoMode") === "true";
      setIsDemoMode(isDemo);

      const userStr = localStorage.getItem("user");
      let user = null;
      try {
        if (userStr) user = JSON.parse(userStr);
      } catch (err) {}

      if (isTokenValid && user) {
        setUserRole(user.role || "");
        setDisplayName(user.displayName || "");
      } else {
        setUserRole("");
        setDisplayName("");
      }
    }
  };

  // Check auth on pathname change or auth event trigger
  useEffect(() => {
    checkAuthStatus();

    const handleAuthEvent = () => {
      checkAuthStatus();
    };

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("login") === "true") {
        setModalTargetRoute("");
        setModalInitialMode("methods");
        setShowLoginModal(true);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }

    window.addEventListener("civicguard-auth", handleAuthEvent);
    return () => window.removeEventListener("civicguard-auth", handleAuthEvent);
  }, [pathname]);

  // Route interceptor for direct visits / refreshes on protected URLs
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDemo = localStorage.getItem("demoMode") === "true";
      if (isDemo) {
        return; // Bypass validation/guards in demo mode entirely
      }

      const token = localStorage.getItem("accessToken");
      const isTokenValid = token && token !== "null" && token !== "undefined";
      
      const userStr = localStorage.getItem("user");
      let user = null;
      try {
        if (userStr) user = JSON.parse(userStr);
      } catch (err) {}

      const allowedRoles = ["operator", "supervisor", "admin", "dispatcher", "manager", "fieldcrew"];
      const userRoleLower = user?.role ? user.role.toLowerCase() : "";

      const isProtected = pathname.startsWith("/authority");

      if (isProtected) {
        if (!isTokenValid) {
          setModalTargetRoute(pathname);
          setModalInitialMode("methods");
          setShowLoginModal(true);
        } else if (!allowedRoles.includes(userRoleLower)) {
          setModalTargetRoute(pathname);
          setModalInitialMode("methods");
          setShowLoginModal(true);
        }
      }
    }
  }, [pathname, router]);

  const handleSignOut = () => {
    localStorage.removeItem("demoMode");
    localStorage.removeItem("role");
    localStorage.removeItem("displayName");
    localStorage.removeItem("authType");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("user");

    setIsAuthenticated(false);
    setUserRole("");
    setDisplayName("");
    setIsDemoMode(false);

    window.dispatchEvent(new Event("civicguard-auth"));
    router.push("/");
  };

  const handleProtectedClick = (targetPath: string) => {
    setModalInitialMode("methods");
    setModalTargetRoute(targetPath);
    setShowLoginModal(true);
  };

  const allowedRoles = ["operator", "supervisor", "admin", "dispatcher", "manager", "fieldcrew"];
  const isAuthorized = isDemoMode || (isAuthenticated && allowedRoles.includes(userRole.toLowerCase()));
  const isProtected = pathname.startsWith("/authority");
  const shouldHideContent = isProtected && !isAuthorized;

  const isAuthPage = pathname === "/login" || pathname === "/forgot-password" || pathname === "/access-denied";

  if (isAuthPage) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-black">
        <main className="w-full h-full overflow-y-auto bg-black">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-black">

      {/* 🟣 SIDEBAR (DESKTOP) */}
      <div className="hidden md:block">
        <Sidebar
          isAuthenticated={isAuthenticated}
          userRole={userRole}
          onProtectedClick={handleProtectedClick}
        />
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
            <Sidebar
              isAuthenticated={isAuthenticated}
              userRole={userRole}
              onProtectedClick={handleProtectedClick}
            />
          </div>
        </div>
      )}

      {/* 📄 MAIN CONTENT */}
      <main className="min-w-0 flex-1 h-screen flex flex-col bg-black overflow-hidden">

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

        <PlatformJourneyHeader
          isAuthenticated={isAuthenticated}
          userRole={userRole}
          displayName={displayName}
          isDemoModeProp={isDemoMode}
          onSignInClick={() => {
            setModalInitialMode("methods");
            setModalTargetRoute("");
            setShowLoginModal(true);
          }}
          onSignOutClick={handleSignOut}
          onProtectedClick={handleProtectedClick}
        />

        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-black min-h-0">
          {shouldHideContent ? (
            <div className="flex-1 min-h-[80vh] bg-slate-950 flex flex-col items-center justify-center p-6 text-white animate-fadeIn">
              <div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4 animate-duration-1000" />
              <p className="text-xs text-white/55 font-bold uppercase tracking-wider animate-pulse">Verifying municipal access permissions...</p>
            </div>
          ) : (
            children
          )}
        </div>
      </main>

      {/* GLOBAL MUNICIPAL OPERATIONS ACCESS MODAL */}
      {showLoginModal && (
        <LoginModal
          isOpen={true}
          onClose={() => {
            setShowLoginModal(false);
            setModalTargetRoute("");
            if (isProtected && !isAuthorized) {
              router.push("/dashboard");
            }
          }}
          onSuccess={(role) => {
            setShowLoginModal(false);
            checkAuthStatus();
            const allowedRoles = ["operator", "supervisor", "admin", "dispatcher", "manager", "fieldcrew"];
            if (role && allowedRoles.includes(role.toLowerCase())) {
              const target = modalTargetRoute || "/authority";
              router.push(target);
            }
            setModalTargetRoute("");
          }}
          initialMode={modalInitialMode}
          isProtectedTarget={!!modalTargetRoute}
        />
      )}
    </div>
  );
}
