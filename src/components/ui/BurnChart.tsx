"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export type BurnChartDataPoint = {
  month: string;
  burn: number | null;
  /** Forecasted value (future months); shown as dashed line */
  burnForecast?: number | null;
};

type BurnChartProps = {
  data?: BurnChartDataPoint[];
};

function fmtBurn(v: number) {
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

  const burn = payload.find((p) => p.dataKey === "burn")?.value;
  const f = payload.find((p) => p.dataKey === "burnForecast")?.value;
  const isForecast = burn == null && f != null;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 shadow-lg">
      <div className="font-medium mb-1">{label}</div>
      <div className="text-slate-300 space-y-0.5">
        {burn != null && <div>Monthly burn: {fmtBurn(burn)}</div>}
        {f != null && (isForecast || burn != null) && (
          <div className={isForecast ? "text-amber-300" : ""}>
            Prognose: {fmtBurn(f)}
          </div>
        )}
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
              connectNulls
            />
            {data.some((d) => d.burnForecast != null) && (
              <Line
                type="monotone"
                dataKey="burnForecast"
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