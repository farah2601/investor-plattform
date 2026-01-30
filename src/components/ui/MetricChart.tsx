"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export type MetricChartDataPoint = {
  month: string;
  value: number | null;
  /** Forecasted value (future months); shown as dashed line */
  valueForecast?: number | null;
};

export type MetricFormat = "currency" | "percent" | "number";

type MetricChartProps = {
  data?: MetricChartDataPoint[];
  metricLabel: string;
  format?: MetricFormat;
};

function formatValue(v: number, format: MetricFormat): string {
  if (format === "currency") {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
    return "$" + v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  if (format === "percent") {
    return v.toFixed(1) + "%";
  }
  return v.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function yAxisFormatter(v: number, format: MetricFormat): string {
  if (format === "currency") {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1000) return `$${Math.round(v / 1000)}k`;
    return "$" + Math.round(v).toLocaleString("en-US");
  }
  if (format === "percent") return `${Math.round(v)}%`;
  return String(Math.round(v));
}

function CustomTooltip({
  active,
  payload,
  label,
  metricLabel,
  format,
}: {
  active?: boolean;
  payload?: { dataKey?: string; value?: number }[];
  label?: string;
  metricLabel: string;
  format: MetricFormat;
}) {
  if (!active || !payload || !payload.length) return null;

  const value = payload.find((p) => p.dataKey === "value")?.value;
  const forecast = payload.find((p) => p.dataKey === "valueForecast")?.value;
  const isForecast = value == null && forecast != null;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 shadow-lg">
      <div className="font-medium mb-1">{label}</div>
      <div className="text-slate-300 space-y-0.5">
        {value != null && (
          <div>{metricLabel}: {formatValue(value, format)}</div>
        )}
        {forecast != null && (isForecast || value != null) && (
          <div className={isForecast ? "text-amber-300" : ""}>
            Prognose: {formatValue(forecast, format)}
          </div>
        )}
      </div>
    </div>
  );
}

export function MetricChart({
  data = [],
  metricLabel,
  format = "currency",
}: MetricChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-64 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-slate-400">No historical data</p>
          <p className="text-xs text-slate-500 mt-1">
            Historical {metricLabel} data will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-64 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
      <div className="h-6 mb-2" aria-hidden />
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
              tickFormatter={(v) => yAxisFormatter(v, format)}
            />
            <Tooltip
              content={(props) => (
                <CustomTooltip
                  {...props}
                  metricLabel={metricLabel}
                  format={format}
                />
              )}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2B74FF"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
            {data.some((d) => d.valueForecast != null) && (
              <Line
                type="monotone"
                dataKey="valueForecast"
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
