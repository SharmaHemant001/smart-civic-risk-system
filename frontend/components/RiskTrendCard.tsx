"use client";

type Props = {
  issue: {
    finalRisk?: number;
    riskValue?: number;
    timeline?: {
      currentRisk: number;
      riskAfter7Days: number;
      riskAfter14Days: number;
    };
  };
};

export default function RiskTrendCard({ issue }: Props) {
  if (!issue || !issue.timeline) return null;

  const { currentRisk, riskAfter7Days, riskAfter14Days } = issue.timeline;

  // Helper to get indicator colors based on score value
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-red-400 bg-red-500/10 border-red-500/20";
    if (score >= 65) return "text-orange-400 bg-orange-500/10 border-orange-500/20";
    if (score >= 50) return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    return "text-green-400 bg-green-500/10 border-green-500/20";
  };

  return (
    <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 shadow-lg">
      <h4 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">
        Risk Progression Timeline (Aging Impact)
      </h4>

      <div className="grid grid-cols-3 gap-2 relative">
        {/* Step 1: Today */}
        <div className="flex flex-col items-center text-center p-3 bg-white/5 border border-white/5 rounded-xl">
          <span className="text-[10px] text-white/50 uppercase font-bold">Today</span>
          <span className={`text-xl font-black mt-1.5 px-3 py-1 rounded-full border ${getScoreColor(currentRisk)}`}>
            {currentRisk}
          </span>
          <span className="text-[10px] text-white/40 mt-1">Immediate</span>
        </div>

        {/* Step 2: +7 Days */}
        <div className="flex flex-col items-center text-center p-3 bg-white/5 border border-white/5 rounded-xl">
          <span className="text-[10px] text-white/50 uppercase font-bold">+7 Days</span>
          <span className={`text-xl font-black mt-1.5 px-3 py-1 rounded-full border ${getScoreColor(riskAfter7Days)}`}>
            {riskAfter7Days}
          </span>
          <span className="text-[10px] text-white/40 mt-1">
            {riskAfter7Days - currentRisk > 0 ? `+${riskAfter7Days - currentRisk} pts` : "No change"}
          </span>
        </div>

        {/* Step 3: +14 Days */}
        <div className="flex flex-col items-center text-center p-3 bg-white/5 border border-white/5 rounded-xl">
          <span className="text-[10px] text-white/50 uppercase font-bold">+14 Days</span>
          <span className={`text-xl font-black mt-1.5 px-3 py-1 rounded-full border ${getScoreColor(riskAfter14Days)}`}>
            {riskAfter14Days}
          </span>
          <span className="text-[10px] text-white/40 mt-1">
            {riskAfter14Days - currentRisk > 0 ? `+${riskAfter14Days - currentRisk} pts` : "No change"}
          </span>
        </div>
      </div>

      {/* Dynamic progression bar display */}
      <div className="mt-4 bg-white/5 rounded-xl p-2.5 flex items-center gap-3 border border-white/5">
        <span className="text-[18px]">📈</span>
        <p className="text-white/70 text-xs leading-normal">
          If unresolved, risk will grow from <strong className="text-white">{currentRisk}</strong> to <strong className="text-white">{riskAfter14Days}</strong> over the next 14 days as infrastructure degrades.
        </p>
      </div>
    </div>
  );
}
