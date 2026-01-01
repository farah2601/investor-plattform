"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
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
        Burn: ${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toLocaleString("en-US")}/mo
      </div>
    </div>
  );
}

export function BurnChart() {
  return (
    <div className="w-full h-64 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
      <h3 className="text-sm font-medium text-slate-200 mb-2">
        Burn vs Runway
      </h3>
      <div className="w-full h-[85%]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "rgba(148, 163, 184, 0.9)", fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "rgba(148, 163, 184, 0.9)", fontSize: 11 }}
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="burn"
              stroke="#2B74FF"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}