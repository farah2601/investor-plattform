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

const data = [
  { month: "Jan", burn: 80000 },
  { month: "Feb", burn: 82000 },
  { month: "Mar", burn: 83000 },
  { month: "Apr", burn: 85000 },
  { month: "May", burn: 86000 },
  { month: "Jun", burn: 87000 },
  { month: "Jul", burn: 88000 },
  { month: "Aug", burn: 89000 },
  { month: "Sep", burn: 90000 },
  { month: "Oct", burn: 91000 },
  { month: "Nov", burn: 92000 },
  { month: "Dec", burn: 93000 },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const value = payload[0].value as number;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 shadow-lg">
      <div className="font-medium mb-1">{label}</div>
      <div className="text-slate-300">
        Monthly burn: ${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toLocaleString("en-US")}
      </div>
    </div>
  );
}

export function BurnChart() {
  // Calculate average burn for color coding
  const avgBurn = data.reduce((sum, d) => sum + d.burn, 0) / data.length;
  
  return (
    <div className="w-full h-64 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-200">
          Monthly Burn Rate
        </h3>
        <p className="text-xs text-slate-400">
          Last 12 months
        </p>
      </div>
      <div className="w-full h-[80%]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
          >
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "rgba(148, 163, 184, 0.9)", fontSize: 10 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "rgba(148, 163, 184, 0.9)", fontSize: 10 }}
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="burn" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.burn > avgBurn ? "#ef4444" : "#2B74FF"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-2 pt-2 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#2B74FF]" />
          <span className="text-xs text-slate-400">Below average</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#ef4444]" />
          <span className="text-xs text-slate-400">Above average</span>
        </div>
      </div>
    </div>
  );
}