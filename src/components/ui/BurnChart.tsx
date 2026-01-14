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

export type BurnChartDataPoint = {
  month: string;
  burn: number | null;
};

type BurnChartProps = {
  data?: BurnChartDataPoint[];
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload || !payload.length) return null;

  const value = payload[0].value;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 shadow-lg">
      <div className="font-medium mb-1">{label}</div>
      <div className="text-slate-300">
        Monthly burn: ${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toLocaleString("en-US")}
      </div>
    </div>
  );
}

export function BurnChart({ data = [] }: BurnChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-64 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-slate-400">No historical data</p>
          <p className="text-xs text-slate-500 mt-1">Historical burn rate data will appear here</p>
        </div>
      </div>
    );
  }

  // Calculate average burn for color coding (only if we have data with non-null values)
  const validData = data.filter((d) => d.burn !== null && d.burn !== undefined);
  const avgBurn = validData.length > 0 
    ? validData.reduce((sum, d) => sum + (d.burn || 0), 0) / validData.length 
    : 0;
  
  return (
    <div className="w-full h-64 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-200">
          Monthly Burn Rate
        </h3>
        <p className="text-xs text-slate-400">
          Historical data
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
              {data.map((entry, index) => {
                const burnValue = entry.burn ?? 0;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={burnValue > avgBurn ? "#ef4444" : "#2B74FF"}
                    opacity={entry.burn === null ? 0.3 : 1}
                  />
                );
              })}
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