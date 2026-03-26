"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="h-full flex items-center 
                    bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 
                    relative overflow-hidden">

      {/* 🔥 BACKGROUND GLOW */}
      <div className="absolute inset-0 
        bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.15),transparent_40%)]" />

      {/* EXTRA GLOW */}
      <div className="absolute bottom-[-100px] right-[-100px] w-[300px] h-[300px]
        bg-pink-500 opacity-30 blur-[120px] rounded-full" />

      <div className="flex w-full px-16 items-center justify-between relative z-10">

        {/* 🔥 LEFT SIDE */}
        <div className="text-white max-w-xl">

          {/* ✅ TITLE FIXED */}
          <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight">
            CivicGuard
          </h1>

          {/* ✅ TAGLINE FIXED */}
          <p className="mt-6 text-white/80 text-lg">
            Report, validate, and navigate civic risks in real-time with
            route-aware safety insights.
          </p>

          {/* 📊 STATS */}
          <div className="flex gap-10 mt-8">
            <Stat value="120+" label="Issues" />
            <Stat value="35" label="High Risk" />
            <Stat value="75%" label="Resolved" />
          </div>

          {/* 🚀 BUTTONS */}
          <div className="flex gap-6 mt-10 flex-wrap">

            <Link href="/driver">
              <button className="px-6 py-3 rounded-xl 
                bg-white text-indigo-600 font-medium
                shadow-lg hover:scale-105 transition">
                🚗 Safe Navigation
              </button>
            </Link>

            <Link href="/report">
              <button className="px-6 py-3 rounded-xl 
                bg-gradient-to-r from-green-500 to-emerald-600 
                text-white shadow-lg hover:scale-105 transition">
                📸 Report Issue
              </button>
            </Link>

            <Link href="/dashboard">
              <button className="px-6 py-3 rounded-xl 
                bg-white/20 backdrop-blur-md
                text-white shadow hover:bg-white/30 transition">
                📊 Dashboard
              </button>
            </Link>

          </div>

          {/* 🔥 FEATURES (UPDATED) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16">

            {/* ❌ REMOVED AI */}
            <FeatureCard 
              title="🗳️ Community Validation" 
              desc="Verify issues through crowd-based feedback" 
            />

            <FeatureCard 
              title="🗺️ Smart Routing" 
              desc="Find safer routes avoiding high-risk areas" 
            />

            <FeatureCard 
              title="⚠️ Risk Alerts" 
              desc="Identify and avoid dangerous zones in real time" 
            />

          </div>

        </div>

        {/* 🔥 RIGHT SIDE (UPGRADED LOOK) */}
        <div className="hidden md:flex justify-center items-center 
                        bg-white/10 backdrop-blur-xl 
                        p-8 rounded-3xl 
                        shadow-[0_20px_60px_rgba(0,0,0,0.4)]">

          <img 
            src="https://cdn-icons-png.flaticon.com/512/3209/3209265.png"
            className="w-80 drop-shadow-2xl"
          />

        </div>

      </div>

      {/* FOOTER */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-sm">
        Built for Smart Cities 🚀
      </div>

    </div>
  );
}

/* 🔥 STAT COMPONENT */
function Stat({ value, label }: any) {
  return (
    <div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-white/70 text-sm">{label}</p>
    </div>
  );
}

/* 🔥 FEATURE CARD */
function FeatureCard({ title, desc }: any) {
  return (
    <div className="bg-white/10 backdrop-blur-xl 
                    border border-white/20 
                    p-5 rounded-2xl text-white 
                    shadow-lg hover:scale-105 transition">

      <h3 className="font-semibold">{title}</h3>
      <p className="text-white/70 text-sm mt-2">{desc}</p>
    </div>
  );
}