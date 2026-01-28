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
  /** Forecasted value (future months); shown as dashed line */
  mrrForecast?: number | null;
};

type MrrChartProps = {
  data?: MrrChartDataPoint[];
};

function fmt(v: number) {
  return v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : "$" + v.toLocaleString("en-US");
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

  const mrr = payload.find((p) => p.dataKey === "mrr")?.value;
  const f = payload.find((p) => p.dataKey === "mrrForecast")?.value;
  const isForecast = mrr == null && f != null;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 shadow-lg">
      <div className="font-medium mb-1">{label}</div>
      <div className="text-slate-300 space-y-0.5">
        {mrr != null && <div>MRR: {fmt(mrr)}</div>}
        {f != null && (isForecast || mrr != null) && (
          <div className={isForecast ? "text-amber-300" : ""}>
            Prognose: {fmt(f)}
          </div>
        )}
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
              connectNulls
            />
            {data.some((d) => d.mrrForecast != null) && (
              <Line
                type="monotone"
                dataKey="mrrForecast"
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