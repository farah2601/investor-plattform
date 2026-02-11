/**
 * Per-Metric Details Types
 */

export type MetricType = "mrr" | "arr" | "growth_mom" | "burn" | "runway" | "churn";
export type MetricStatus = "reported" | "derived" | "missing" | "not_applicable";

export type MetricInput = {
  label: string;
  range: string;
  rawValue?: string;
  parsedValue?: number;
};

export type MetricProvenance = {
  sheetName?: string;
  range?: string;
  timestamp?: string;
  source?: string;
};

export type SanityCheck = {
  name: string;
  passed: boolean;
  note?: string;
};

export type MetricDetails = {
  metric: MetricType;
  value: number | null;
  formattedValue: string;
  currency?: string;
  period: string;
  status: MetricStatus;
  confidence: "low" | "medium" | "high";
  explanation: string;
  methodology: string;
  formula?: string;
  inputs?: MetricInput[];
  provenance?: MetricProvenance;
  sanityChecks: SanityCheck[];
  warnings: string[];
  definition: string;
  lastUpdated?: string;
};

/**
 * Helper to format currency values
 */
export function formatCurrency(value: number | null, currency: string = "USD"): string {
  if (value === null) return "—";
  const symbol = currency === "NOK" ? "kr " : currency === "EUR" ? "€" : "$";
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 10,
  });
  return `${symbol}${formatted}`;
}

/**
 * Helper to format percentage values
 */
export function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(1)}%`;
}

/**
 * Helper to format months values
 */
export function formatMonths(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(1)} mo`;
}

/**
 * Metric definitions for display
 */
export function getMetricDefinition(metric: MetricType): string {
  const defs: Record<MetricType, string> = {
    mrr: "Monthly Recurring Revenue: Predictable revenue from subscriptions/contracts.",
    arr: "Annual Recurring Revenue: Yearly run-rate (MRR × 12).",
    growth_mom: "Month-over-Month Growth: % change in MRR vs previous month.",
    burn: "Burn Rate: Monthly cash outflow when expenses exceed revenue.",
    runway: "Runway: Months of cash remaining at current burn rate.",
    churn: "Churn Rate: % of customers who stopped subscribing during the period.",
  };
  return defs[metric] ?? "Metric definition.";
}
