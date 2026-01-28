/**
 * Simple linear regression forecast for KPI chart series.
 * Extends historical series with projected values for future months.
 */

import type { ChartPoint } from "./kpi_series";
import {
  parsePeriodDate,
  monthKey,
  formatMonthLabel,
  buildMonthlyAxis,
} from "./kpi_series";

export type ForecastOptions = {
  /** Min historical points with valid values to produce forecast (default 3) */
  minPoints?: number;
  /** Max historical points to use for regression (default 12) */
  maxPoints?: number;
  /** Months ahead to project (default 6) */
  monthsAhead?: number;
};

const DEFAULT_OPTIONS: Required<ForecastOptions> = {
  minPoints: 3,
  maxPoints: 12,
  monthsAhead: 6,
};

/**
 * Add months to a date (UTC-safe).
 */
function addMonths(d: Date, months: number): Date {
  const out = new Date(d);
  out.setUTCMonth(out.getUTCMonth() + months);
  return out;
}

/**
 * Simple OLS linear regression: y = a + b * x.
 * Returns [intercept a, slope b] or null if insufficient data / zero variance.
 */
function linearRegression(x: number[], y: number[]): [number, number] | null {
  const n = x.length;
  if (n < 2) return null;

  const sumX = x.reduce((s, v) => s + v, 0);
  const sumY = y.reduce((s, v) => s + v, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    den += dx * dx;
  }
  if (den === 0) return null;

  const b = num / den;
  const a = meanY - b * meanX;
  return [a, b];
}

/**
 * Extend a chart series with forecasted points using linear regression
 * on the last N valid values. Appends future months with `forecast` set.
 *
 * @param series - Output from buildDenseSeries (with period_date)
 * @param opts - Forecast options
 * @returns Extended series: [...historical, ...forecast points]
 */
export function extendWithForecast(
  series: ChartPoint[],
  opts: ForecastOptions = {}
): ChartPoint[] {
  const { minPoints, maxPoints, monthsAhead } = { ...DEFAULT_OPTIONS, ...opts };

  const valid = series.filter((p) => p.value != null && !Number.isNaN(p.value));
  if (valid.length < minPoints) return series;

  const used = valid.slice(-maxPoints);
  const n = used.length;
  const x = used.map((_, i) => i);
  const y = used.map((p) => p.value as number);

  const coef = linearRegression(x, y);
  if (!coef) return series;

  const [a, b] = coef;
  const last = used[n - 1];
  const lastPeriod = last?.period_date;
  if (!lastPeriod) return series;

  const lastDate = parsePeriodDate(lastPeriod);
  if (!lastDate) return series;

  const nextMonthStart = addMonths(lastDate, 1);
  const futureDates = buildMonthlyAxis(
    nextMonthStart,
    addMonths(lastDate, monthsAhead)
  );

  const forecastPoints: ChartPoint[] = futureDates.map((d, i) => {
    const idx = n + i;
    const value = a + b * idx;
    return {
      label: formatMonthLabel(d),
      value: null,
      period_date: monthKey(d),
      forecast: Math.round(value * 100) / 100,
    };
  });

  return [...series, ...forecastPoints];
}
