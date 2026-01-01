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
  { month: "Jan", arr: 1440000 },
  { month: "Feb", arr: 1500000 },
  { month: "Mar", arr: 1584000 },
  { month: "Apr", arr: 1680000 },
  { month: "May", arr: 1800000 },
  { month: "Jun", arr: 1896000 },
  { month: "Jul", arr: 1980000 },
  { month: "Aug", arr: 2064000 },
  { month: "Sep", arr: 2160000 },
  { month: "Oct", arr: 2256000 },
  { month: "Nov", arr: 2400000 },
  { month: "Dec", arr: 2520000 },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const value = payload[0].value as number;
  const formatted = value >= 1000000 
    ? `$${(value / 1000000).toFixed(2)}M`
    : `$${(value / 1000).toFixed(0)}k`;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 shadow-lg">
      <div className="font-medium mb-1">{label}</div>
      <div className="text-slate-300">
        ARR: {formatted}
      </div>
    </div>
  );
}

export function ArrChart() {
  return (
    <div className="w-full h-64 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
      <h3 className="text-sm font-medium text-slate-200 mb-2">
        ARR over time
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
              tickFormatter={(v) => {
                if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
                return `$${(v / 1000).toFixed(0)}k`;
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="arr"
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

