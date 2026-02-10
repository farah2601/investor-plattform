/**
 * Minimal MetricResult Type - Single Source of Truth
 * 
 * Simple, stable contract for Key Metrics + per-card Details
 * NO over-engineering. Just what's needed.
 */

export type MetricKey = "mrr" | "arr" | "growth_mom" | "burn" | "runway" | "churn" | "cash" | "burn_rate" | "runway_months" | "cash_balance";

export type MetricStatus = "reported" | "derived" | "missing" | "not_applicable";

export type ConfidenceLevel = "low" | "medium" | "high";

export type MetricEvidence = {
  sheetName?: string;
  range?: string;
  inputs?: Array<{
    label: string;
    range: string;
    value: number | string;
  }>;
};

export type MetricResult = {
  key: MetricKey;
  value: number | null;
  formatted: string;           // ALWAYS present: "$10,000", "12.5%", "—", "∞"
  status: MetricStatus;
  confidence: ConfidenceLevel;
  explanation?: string;         // Short (1-2 sentences)
  evidence?: MetricEvidence;
  warnings?: string[];
};

/**
 * Helper: Format currency
 */
export function formatCurrency(value: number | null, currency: string = "USD"): string {
  if (value === null) return "—";
  const symbol = currency === "NOK" ? "kr " : currency === "EUR" ? "€" : "$";
  return `${symbol}${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Helper: Format percentage
 */
export function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(1)}%`;
}

/**
 * Helper: Format months
 */
export function formatMonths(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(1)} mo`;
}
