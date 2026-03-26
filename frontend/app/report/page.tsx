
"use client";

import UploadForm from "../../components/UploadForm";

export default function ReportPage() {
  return (
    <div className="min-h-full flex 
                    bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 
                    relative">

      {/* 🔥 BACKGROUND GLOW */}
      <div className="absolute inset-0 
                      bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.15),transparent_40%)]" />

      {/* 🔥 LEFT SIDE */}
      <div className="hidden md:flex flex-col justify-center px-16 w-1/2 relative z-10 text-white">

        <h1 className="text-5xl font-bold leading-tight drop-shadow-lg">
          Report Civic Issue
        </h1>

        <p className="mt-6 text-lg text-white/90 max-w-md">
          Help improve your city by reporting potholes, garbage,
          sewer issues, or construction hazards.
        </p>

        <p className="mt-2 text-sm text-white/70">
          Upload image, select issue, and submit — it's quick & easy.
        </p>

        <img
          src="https://cdn-icons-png.flaticon.com/512/3062/3062634.png"
          className="w-72 mt-10 drop-shadow-2xl"
        />
      </div>

      {/* 📦 RIGHT SIDE */}
      <div className="flex items-center justify-center w-full md:w-1/2 p-6 relative z-10">

        <div className="w-full max-w-md 
                        bg-white/10 backdrop-blur-xl 
                        border border-white/20 
                        shadow-[0_20px_60px_rgba(0,0,0,0.35)] 
                        rounded-3xl p-6">

          <h2 className="text-xl font-semibold text-white mb-1">
            Submit Issue
          </h2>

          <p className="text-xs text-white/70 mb-4">
            Fill details to report civic problem
          </p>

          {/* ❌ NO SCROLL HERE */}
          <UploadForm />

        </div>
      </div>
    </div>
  );
}

