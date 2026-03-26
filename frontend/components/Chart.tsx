"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type Props = {
  issues: any[];
};

export default function Chart({ issues }: Props) {
  // 📊 Group by type
  const dataMap: any = {};

  issues.forEach((issue) => {
    const type = issue.issueType;
    if (!dataMap[type]) {
      dataMap[type] = 0;
    }
    dataMap[type]++;
  });

  const data = Object.keys(dataMap).map((key) => ({
    name: key,
    count: dataMap[key],
  }));

  // 🎨 COLORS
  const getColor = (type: string) => {
    switch (type) {
      case "pothole":
        return "#ef4444";
      case "garbage":
        return "#22c55e";
      case "sewer":
        return "#3b82f6";
      case "construction":
        return "#f97316";
      default:
        return "#6366f1";
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-xl border border-white/10 
                    p-5 rounded-2xl shadow-xl">

      

      <p className="text-white/50 text-xs mb-4">
        Breakdown of civic issues by category
      </p>

      {/* 📊 CHART */}
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          
          {/* AXIS */}
          <XAxis 
            dataKey="name" 
            stroke="#ffffff80" 
            tick={{ fill: "#ffffff80", fontSize: 12 }} 
          />

          <YAxis 
            stroke="#ffffff50" 
            tick={{ fill: "#ffffff60", fontSize: 12 }} 
          />

          {/* TOOLTIP */}
          <Tooltip
            contentStyle={{
              backgroundColor: "#1f2937",
              border: "none",
              borderRadius: "8px",
              color: "white",
            }}
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
          />

          {/* BARS */}
          <Bar
            dataKey="count"
            radius={[8, 8, 0, 0]}
            animationDuration={800}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getColor(entry.name)}
              />
            ))}
          </Bar>

        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}