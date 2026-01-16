"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export type MrrChartDataPoint = {
  month: string;
  mrr: number | null;
};

type MrrChartProps = {
  data?: MrrChartDataPoint[];
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload || !payload.length) return null;

  const value = payload[0].value;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 shadow-lg">
      <div className="font-medium mb-1">{label}</div>
      <div className="text-slate-300">
        MRR: ${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toLocaleString("en-US")}
      </div>
    </div>
  );
}

export function MrrChart({ data = [] }: MrrChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-64 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-slate-400">No historical data</p>
          <p className="text-xs text-slate-500 mt-1">Historical MRR data will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-64 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
      <div className="h-6 mb-2"></div>
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