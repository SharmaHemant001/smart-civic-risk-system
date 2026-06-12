"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard?login=true");
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center text-white">
      <div className="text-center space-y-3">
        <div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-gray-500 font-medium tracking-wide">
          Redirecting to Municipal Operations console...
        </p>
      </div>
    </div>
  );
}
