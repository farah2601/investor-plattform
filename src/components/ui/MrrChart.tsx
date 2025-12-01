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
  { month: "Jan", mrr: 120000 },
  { month: "Feb", mrr: 125000 },
  { month: "Mar", mrr: 132000 },
  { month: "Apr", mrr: 140000 },
  { month: "May", mrr: 150000 },
  { month: "Jun", mrr: 158000 },
  { month: "Jul", mrr: 165000 },
  { month: "Aug", mrr: 172000 },
  { month: "Sep", mrr: 180000 },
  { month: "Oct", mrr: 188000 },
  { month: "Nov", mrr: 200000 },
  { month: "Dec", mrr: 210000 },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const value = payload[0].value as number;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 shadow-lg">
      <div className="font-medium mb-1">{label}</div>
      <div className="text-slate-300">
        MRR: {value.toLocaleString("nb-NO")} kr
      </div>
    </div>
  );
}

export function MrrChart() {
  return (
    <div className="w-full h-64 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
      <h3 className="text-sm font-medium text-slate-200 mb-2">
        MRR siste 12 måneder
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
              dataKey="mrr"
              stroke="#2563EB"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}