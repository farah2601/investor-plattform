/**
 * Client-side KPI extraction and validation utilities
 * 
 * Handles extraction of KPI values from kpi_snapshots.kpis (JSONB) which can be:
 * - Flat: kpis.mrr = 100000
 * - Nested: kpis.mrr = { value: 100000, source: "...", updated_at: "..." }
 * 
 * Also provides validation for "valid snapshots" (snapshots with meaningful data).
 */

export type KPIValue = number | null;

/**
 * Extract numeric value from KPI (handles both flat and nested formats)
 * 
 * @param kpis - The kpis object (can be flat or nested)
 * @param key - The KPI key to extract (e.g., "mrr", "arr", "burn_rate")
 * @returns The numeric value or null if missing/invalid
 */
export function extractKpiNumber(kpis: unknown, key: string): KPIValue {
  if (!kpis || typeof kpis !== "object" || kpis === null) {
    return null;
  }

  const kpisObj = kpis as Record<string, unknown>;
  const kpi = kpisObj[key];

  if (kpi === null || kpi === undefined) {
    return null;
  }

  // New format: {value, source, updated_at}
  if (typeof kpi === "object" && kpi !== null && "value" in kpi) {
    const kpiValue = kpi as { value: unknown };
    if (typeof kpiValue.value === "number") {
      // Return only if finite (not NaN, Infinity, or -Infinity)
      return Number.isFinite(kpiValue.value) ? kpiValue.value : null;
    }
    if (kpiValue.value === null) {
      return null;
    }
    // Try to convert to number
    const num = Number(kpiValue.value);
    return Number.isFinite(num) ? num : null;
  }

  // Old format: direct number
  if (typeof kpi === "number") {
    // Return only if finite (not NaN, Infinity, or -Infinity)
    return Number.isFinite(kpi) ? kpi : null;
  }

  // Try to convert to number
  const num = Number(kpi);
  return Number.isFinite(num) ? num : null;
}

/**
 * Check if a snapshot is valid (has at least one meaningful KPI value)
 * 
 * Valid if at least one of these KPIs is non-null:
 * - mrr
 * - net_revenue
 * - burn_rate
 * - cash_balance
 * - customers
 * 
 * @param kpis - The kpis object from snapshot
 * @returns true if snapshot is valid, false otherwise
 */
export function isValidSnapshotByKpis(kpis: unknown): boolean {
  if (!kpis || typeof kpis !== "object" || kpis === null) {
    return false;
  }

  const mrr = extractKpiNumber(kpis, "mrr");
  const netRevenue = extractKpiNumber(kpis, "net_revenue");
  const burnRate = extractKpiNumber(kpis, "burn_rate");
  const cashBalance = extractKpiNumber(kpis, "cash_balance");
  const customers = extractKpiNumber(kpis, "customers");

  // Valid if at least one is non-null
  return (
    mrr !== null ||
    netRevenue !== null ||
    burnRate !== null ||
    cashBalance !== null ||
    customers !== null
  );
}

/**
 * Normalize percentage value
 * 
 * Handles both decimal (0.045) and percentage (4.5) formats:
 * - If |value| <= 1: treat as decimal, multiply by 100
 * - Otherwise: treat as already percentage
 * 
 * @param value - The value to normalize
 * @param allowNegative - If false, negative values return null (e.g., for churn)
 * @returns Normalized percentage or null
 */
export function normalizePercent(value: number | null, allowNegative: boolean): number | null {
  if (value === null) {
    return null;
  }

  const num = Number(value);
  if (isNaN(num)) {
    return null;
  }

  // Normalize: if |value| <= 1, treat as decimal and multiply by 100
  const normalized = Math.abs(num) <= 1 ? num * 100 : num;

  // If negative not allowed and normalized is negative, return null
  if (!allowNegative && normalized < 0) {
    return null;
  }

  return normalized;
}
