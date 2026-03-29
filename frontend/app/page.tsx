"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-full flex items-start md:items-center 
                    bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 
                    relative overflow-hidden">

      {/* 🔥 BACKGROUND GLOW */}
      <div className="absolute inset-0 
        bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.15),transparent_40%)]" />

      {/* EXTRA GLOW */}
      <div className="absolute bottom-[-100px] right-[-100px] w-[300px] h-[300px]
        bg-pink-500 opacity-30 blur-[120px] rounded-full" />

      <div className="flex w-full flex-col px-6 py-10 md:px-16 md:py-0 items-center justify-between gap-10 md:flex-row relative z-10">

        {/* 🔥 LEFT SIDE */}
        <div className="text-white w-full max-w-xl pt-2 md:pt-0">

          {/* ✅ TITLE FIXED */}
          <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight text-center md:text-left">
            CivicGuard
          </h1>

          {/* ✅ TAGLINE FIXED */}
          <p className="mt-4 md:mt-6 text-white/80 text-lg text-center md:text-left">
            Report, validate, and navigate civic risks in real-time with
            route-aware safety insights.
          </p>

          {/* 📊 STATS */}
          <div className="grid grid-cols-3 gap-4 md:flex md:gap-10 mt-8">
            <Stat value="120+" label="Issues" />
            <Stat value="35" label="Critical Risk" />
            <Stat value="75%" label="Resolved" />
          </div>

          {/* 🚀 BUTTONS */}
          <div className="flex flex-col sm:flex-row gap-4 md:gap-6 mt-10 flex-wrap">

            <Link href="/driver">
              <button className="px-6 py-3 rounded-xl 
                w-full sm:w-auto bg-white text-indigo-600 font-medium
                shadow-lg hover:scale-105 transition">
                <span className="block text-center">🚗 Safe Navigation</span>
              </button>
            </Link>

            <Link href="/report">
              <button className="px-6 py-3 rounded-xl 
                w-full sm:w-auto
                bg-gradient-to-r from-green-500 to-emerald-600 
                text-white shadow-lg hover:scale-105 transition">
                <span className="block text-center">📸 Report Issue</span>
              </button>
            </Link>

            <Link href="/dashboard">
              <button className="px-6 py-3 rounded-xl 
                w-full sm:w-auto
                bg-white/20 backdrop-blur-md
                text-white shadow hover:bg-white/30 transition">
                <span className="block text-center">📊 Dashboard</span>
              </button>
            </Link>

          </div>

          {/* 🔥 FEATURES (UPDATED) */}
          <div className="grid grid-cols-1 gap-5 mt-14 md:mt-16 sm:grid-cols-2 lg:grid-cols-3">

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
      <div className="hidden md:block absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-sm">
        Built for Smart Cities 🚀
      </div>

    </div>
  );
}

/* 🔥 STAT COMPONENT */
function Stat({ value, label }: any) {
  return (
    <div className="text-center md:text-left">
      <p className="text-2xl md:text-3xl font-bold">{value}</p>
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

      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-white/70 text-sm mt-2 leading-relaxed">{desc}</p>
    </div>
  );
}
