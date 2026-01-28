/**
 * KPI Series Builder
 * 
 * Builds dense monthly chart series from KPI snapshots with proper date handling.
 * Ensures all months between min and max period_date are included (dense axis).
 */

import { extractKpiNumber, isValidSnapshotByKpis, normalizePercent } from "./kpi_extract";

export type SnapshotRow = {
  period_date: string; // YYYY-MM-01 format
  kpis: unknown;
};

export type Point = {
  x: string; // Formatted label like "Jan 2026"
  y: number | null; // Value or null for missing data
};

export type ChartPoint = {
  label: string; // Formatted label like "Jan 2026"
  value: number | null; // Value or null for missing data
  /** YYYY-MM-01, set by buildDenseSeries for use in forecast */
  period_date?: string;
  /** Forecasted value for future months (extends series) */
  forecast?: number;
};

type BuildSeriesOptions = {
  percent?: boolean;
  allowNegative?: boolean;
};

/**
 * Parse period_date (YYYY-MM-01) to Date object
 * @param period_date - Date string in YYYY-MM-01 format
 * @returns Date object or null if invalid
 */
export function parsePeriodDate(period_date: string): Date | null {
  try {
    const date = new Date(period_date + "T00:00:00Z");
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch {
    return null;
  }
}

/**
 * Convert Date to month key (YYYY-MM-01 format, UTC-safe)
 * @param d - Date object
 * @returns String in format "YYYY-MM-01"
 */
export function monthKey(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

/**
 * Format Date to month label (e.g., "Jan 2026")
 * @param d - Date object
 * @returns Formatted string like "Jan 2026"
 */
export function formatMonthLabel(d: Date): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 7);
  }
}

/**
 * Format period_date (YYYY-MM-01) to readable label (e.g., "Jan 2026")
 * @deprecated Use parsePeriodDate + formatMonthLabel instead
 */
export function formatPeriodLabel(period_date: string): string {
  const date = parsePeriodDate(period_date);
  if (!date) {
    return period_date.slice(0, 7);
  }
  return formatMonthLabel(date);
}

/**
 * Build dense monthly axis from Date range
 * Returns array of all months (Date objects) between min and max (inclusive)
 * @param min - Start date (inclusive)
 * @param max - End date (inclusive)
 * @returns Array of Date objects, one per month
 */
export function buildMonthlyAxis(min: Date, max: Date): Date[] {
  const months: Date[] = [];
  const current = new Date(min);
  
  // Set to first day of month for consistency
  current.setUTCDate(1);
  current.setUTCHours(0, 0, 0, 0);
  
  const maxDate = new Date(max);
  maxDate.setUTCDate(1);
  maxDate.setUTCHours(0, 0, 0, 0);
  
  while (current <= maxDate) {
    months.push(new Date(current));
    // Move to next month
    current.setUTCMonth(current.getUTCMonth() + 1);
  }
  
  return months;
}

/**
 * Build dense monthly axis from sorted snapshots
 * Returns array of all months (YYYY-MM-01) between min and max period_date
 * @deprecated Use buildMonthlyAxis with Date objects instead
 */
export function buildDenseMonthlyAxis(sortedSnapshots: SnapshotRow[]): string[] {
  if (sortedSnapshots.length === 0) {
    return [];
  }

  const periods: string[] = [];
  const firstPeriod = sortedSnapshots[0]?.period_date;
  const lastPeriod = sortedSnapshots[sortedSnapshots.length - 1]?.period_date;

  if (!firstPeriod || !lastPeriod) {
    return [];
  }

  const firstDate = parsePeriodDate(firstPeriod);
  const lastDate = parsePeriodDate(lastPeriod);

  if (!firstDate || !lastDate) {
    return [];
  }

  const monthDates = buildMonthlyAxis(firstDate, lastDate);
  for (const date of monthDates) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    periods.push(`${year}-${month}-01`);
  }

  return periods;
}

/**
 * Build dense chart series from snapshot rows
 * 
 * 1) Sorts by period_date ascending
 * 2) Filters to valid snapshots only
 * 3) Finds min/max period_date from valid rows
 * 4) Builds dense monthly axis (all months between min and max)
 * 5) Extracts and normalizes values
 * 6) Returns ChartPoint[] for all months (value is null for missing data)
 * 
 * @param rows - Array of snapshot rows
 * @param kpiKey - KPI key to extract (e.g., "mrr", "arr", "burn_rate")
 * @param opts - Options for percentage normalization
 * @returns Array of ChartPoint with dense monthly axis
 */
export function buildDenseSeries(
  rows: SnapshotRow[],
  kpiKey: string,
  opts?: { percent?: boolean; allowNegative?: boolean }
): ChartPoint[] {
  const { percent = false, allowNegative = true } = opts || {};

  // 1) Sort by period_date ascending
  const sorted = [...rows].sort((a, b) => {
    if (!a.period_date || !b.period_date) return 0;
    return a.period_date.localeCompare(b.period_date);
  });

  // 2) Filter to valid snapshots only
  const validSnapshots = sorted.filter((row) => {
    if (!row.period_date) return false;
    return isValidSnapshotByKpis(row.kpis);
  });

  // 3) Find min/max period_date from valid rows
  if (validSnapshots.length === 0) {
    return [];
  }

  const firstPeriod = validSnapshots[0]?.period_date;
  const lastPeriod = validSnapshots[validSnapshots.length - 1]?.period_date;

  if (!firstPeriod || !lastPeriod) {
    return [];
  }

  const minDate = parsePeriodDate(firstPeriod);
  const maxDate = parsePeriodDate(lastPeriod);

  if (!minDate || !maxDate) {
    return [];
  }

  // 4) Build dense axis (all months between min and max)
  const monthDates = buildMonthlyAxis(minDate, maxDate);

  // 5) Build map: period_date (YYYY-MM-01) -> value
  const valueMap = new Map<string, number | null>();
  for (const snapshot of validSnapshots) {
    if (!snapshot.period_date) continue;
    
    let value = extractKpiNumber(snapshot.kpis, kpiKey);
    
    // Normalize if percent
    if (percent && value !== null) {
      value = normalizePercent(value, allowNegative);
    }
    
    valueMap.set(snapshot.period_date, value);
  }

  // 6) Build ChartPoint[] for all months
  const points: ChartPoint[] = monthDates.map((monthDate) => {
    const period_date = monthKey(monthDate);
    const value = valueMap.get(period_date) ?? null;
    const label = formatMonthLabel(monthDate);
    
    return {
      label,
      value,
      period_date,
    };
  });

  return points;
}

/**
 * Build chart series from snapshot rows
 * 
 * 1) Sorts by period_date ascending
 * 2) Filters to valid snapshots only
 * 3) Extracts and normalizes values
 * 4) Builds dense monthly axis
 * 5) Returns points for all months (y is null for missing data)
 * 
 * @deprecated Use buildDenseSeries instead
 */
export function buildSeries(
  rows: SnapshotRow[],
  key: string,
  options: BuildSeriesOptions = {}
): Point[] {
  const chartPoints = buildDenseSeries(rows, key, options);
  return chartPoints.map((p) => ({
    x: p.label,
    y: p.value,
  }));
}
