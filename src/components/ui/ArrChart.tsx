"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export type ArrChartDataPoint = {
  month: string;
  arr: number | null;
  /** Forecasted value (future months); shown as dashed line */
  arrForecast?: number | null;
};

type ArrChartProps = {
  data?: ArrChartDataPoint[];
};

function fmt(v: number) {
  return v >= 1000000
    ? `$${(v / 1000000).toFixed(2)}M`
    : `$${(v / 1000).toFixed(0)}k`;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey?: string; value?: number }[];
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;

  const arr = payload.find((p) => p.dataKey === "arr")?.value;
  const f = payload.find((p) => p.dataKey === "arrForecast")?.value;
  const isForecast = arr == null && f != null;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 shadow-lg">
      <div className="font-medium mb-1">{label}</div>
      <div className="text-slate-300 space-y-0.5">
        {arr != null && <div>ARR: {fmt(arr)}</div>}
        {f != null && (isForecast || arr != null) && (
          <div className={isForecast ? "text-amber-300" : ""}>
            Prognose: {fmt(f)}
          </div>
        )}
      </div>
    </div>
  );
}

export function ArrChart({ data = [] }: ArrChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-64 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-slate-400">No historical data</p>
          <p className="text-xs text-slate-500 mt-1">Historical ARR data will appear here</p>
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
              tickFormatter={(v) => {
                if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
                if (v >= 1000) return `$${Math.round(v / 1000)}k`;
                return "$" + Math.round(v).toLocaleString("en-US");
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
              connectNulls
            />
            {data.some((d) => d.arrForecast != null) && (
              <Line
                type="monotone"
                dataKey="arrForecast"
                stroke="#2B74FF"
                strokeWidth={2}
                strokeDasharray="6 4"
                strokeOpacity={0.7}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
                name="Prognose"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

