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
            Submit Municipal Risk Report
          </h1>
          <p className="text-white/60 text-xs leading-relaxed max-w-md">
            Report infrastructure and public safety risks. Focus on: **Hazard Type, Severity, Description, Location, and Evidence**.
          </p>
        </div>

        {/* 🔄 PROCESS PIPELINE VISUALIZATION */}
        <div className="space-y-3 max-w-xl">
          <p className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest">
            🔄 Incident Lifecycle Pipeline
          </p>
          <div className="flex flex-wrap items-center gap-2 bg-[#0B1220]/50 border border-[#6366F1]/15 p-3.5 rounded-2xl text-[10px] font-bold text-slate-300 select-none">
            <span className="px-2 py-1 bg-white/5 rounded">Report Hazard</span>
            <span className="text-white/30 font-black">➔</span>
            <span className="px-2 py-1 bg-white/5 rounded">Risk Analysis</span>
            <span className="text-white/30 font-black">➔</span>
            <span className="px-2 py-1 bg-white/5 rounded">Escalation Detection</span>
            <span className="text-white/30 font-black">➔</span>
            <span className="px-2 py-1 bg-white/5 rounded">Resource Allocation</span>
            <span className="text-white/30 font-black">➔</span>
            <span className="px-2 py-1 bg-white/5 rounded">Risk Reduction</span>
          </div>
        </div>

        {/* CORE CAPABILITIES (4 ICON CARDS) */}
        <div className="space-y-3 max-w-xl">
          <p className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest">
            🛡️ Platform Core Capabilities
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { title: "Detect Risk Clusters", desc: "Groups local reports to identify growing threat zones.", icon: "📡" },
              { title: "Trigger Escalations", desc: "Alerts crew dispatches of critical SLA risk spikes.", icon: "🚨" },
              { title: "Prioritize Repairs", desc: "Schedules interventions based on computed risk value.", icon: "🛠️" },
              { title: "Reduce City Risk", desc: "Lowers the overall City Risk Index (CRI) score.", icon: "🛡️" }
            ].map((card, idx) => (
              <div key={idx} className="p-3 bg-slate-900/40 border border-white/5 rounded-xl space-y-1.5 hover:border-indigo-500/25 transition shadow-lg">
                <span className="text-sm bg-white/5 p-1 rounded-lg inline-block">{card.icon}</span>
                <h4 className="text-xs font-bold text-white">{card.title}</h4>
                <p className="text-[10px] text-white/50 leading-normal">{card.desc}</p>
              </div>
            ))}
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