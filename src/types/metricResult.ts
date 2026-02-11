/**
 * Result shape from normalizeMetricsOutput
 */

/** ARR display type for labels and details (never imply contract-backed unless data says so). */
export type ArrDisplayType = "run_rate_arr" | "observed_arr";

export type MetricResult = {
  key: string;
  value?: number | null;
  formatted?: string;
  status?: string;
  explanation?: string;
  warnings?: string[];
  confidence?: string;
  evidence?: unknown;
  /** Source of the value (e.g. "sheet", "stripe", "computed") for display in details */
  source?: string;
  /** For ARR: classification so UI shows "ARR (run-rate)" vs "ARR (observed)" */
  arr_type?: ArrDisplayType;
  /** For ARR: months used when observed_arr (e.g. 6 or 12) */
  arr_months_used?: number;
  /** For ARR: "averaged" (over months) or "annualized" (latest MRR × 12) */
  arr_method?: "averaged" | "annualized";
};

export type MetricKey = "mrr" | "arr" | "growth_mom" | "burn" | "runway" | "churn" | "cash" | "burn_rate" | "runway_months" | "cash_balance" | "net_revenue" | "customers";

/**
 * Helper: Format currency
 */
export function formatCurrency(value: number | null, currency: string = "USD"): string {
  if (value === null) return "—";
  const symbol = currency === "NOK" ? "kr " : currency === "EUR" ? "€" : "$";
  return `${symbol}${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 10 })}`;
}

/**
 * Helper: Format percentage
 */
export function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(1)}%`;
}
