"use client";
import UploadForm from "../../components/UploadForm";

export default function ReportPage() {
  return (
    <div className="min-h-full bg-slate-950 text-white relative flex flex-col lg:flex-row overflow-x-hidden">
      {/* 🔮 BACKGROUND GRADIENT GLOWS */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[150px] pointer-events-none" />

      {/* 🏛️ LEFT PANEL: Guidance & Visual Flow */}
      <div className="w-full lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center space-y-8 relative z-10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider self-start">
            📡 Risk Report Desk
          </div>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tight leading-none text-white">
            Submit Risk Report
          </h1>
          <p className="text-white/60 text-xs leading-relaxed max-w-md">
            Detect Risk &bull; Prioritize Action &bull; Reduce Impact
          </p>
        </div>

        {/* GUIDANCE BULLETS (Your Report Helps) */}
        <div className="space-y-4 max-w-xl">
          <p className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest">
            Your Report Helps:
          </p>
          <div className="space-y-3">
            <div className="p-3 bg-slate-900/40 border border-white/5 rounded-xl flex items-center gap-3">
              <span className="text-lg bg-white/5 p-1 rounded-lg">📍</span>
              <div className="space-y-0.5 leading-tight">
                <h4 className="text-xs font-bold text-white">Detect Risk Clusters</h4>
                <p className="text-[10px] text-white/55">Group local reports to pinpoint emerging threat hotspots.</p>
              </div>
            </div>
            <div className="p-3 bg-slate-900/40 border border-white/5 rounded-xl flex items-center gap-3">
              <span className="text-lg bg-white/5 p-1 rounded-lg">🚨</span>
              <div className="space-y-0.5 leading-tight">
                <h4 className="text-xs font-bold text-white">Trigger Escalations</h4>
                <p className="text-[10px] text-white/55">Alert municipal response teams before hazards become active crises.</p>
              </div>
            </div>
            <div className="p-3 bg-slate-900/40 border border-white/5 rounded-xl flex items-center gap-3">
              <span className="text-lg bg-white/5 p-1 rounded-lg">🛠️</span>
              <div className="space-y-0.5 leading-tight">
                <h4 className="text-xs font-bold text-white">Prioritize Repairs</h4>
                <p className="text-[10px] text-white/55">Recommend where city repair crews should deploy resources.</p>
              </div>
            </div>
            <div className="p-3 bg-slate-900/40 border border-white/5 rounded-xl flex items-center gap-3">
              <span className="text-lg bg-white/5 p-1 rounded-lg">📉</span>
              <div className="space-y-0.5 leading-tight">
                <h4 className="text-xs font-bold text-white">Reduce City Risk</h4>
                <p className="text-[10px] text-white/55">Help lower the citywide risk score before incidents escalate.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 📦 RIGHT PANEL: Multi-step reporting card */}
      <div className="w-full lg:w-1/2 p-4 lg:p-12 flex items-center justify-center relative z-10 bg-slate-900/20 border-t lg:border-t-0 lg:border-l border-white/5">
        <div className="w-full max-w-xl bg-slate-900/60 border border-white/10 shadow-2xl rounded-3xl p-6 lg:p-8 backdrop-blur-md">
          <UploadForm />
        </div>
      </div>
    </div>
  );
}