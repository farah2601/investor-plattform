/**
 * Per-Metric Details Data Model
 * 
 * Structured object for each metric (MRR, ARR, Growth, Burn, Runway, Churn)
 * to support per-card drill-down with audit-friendly information.
 */

export type MetricType = "mrr" | "arr" | "growth_mom" | "burn" | "runway" | "churn";

export type MetricStatus = "reported" | "derived" | "missing" | "not_applicable";

export type ConfidenceLevel = "low" | "medium" | "high";

export type MetricInput = {
  label: string;           // e.g., "MRR from January"
  range: string;           // A1 notation, e.g., "B2:B15"
  rawValue: string | number; // Original cell value
  parsedValue: number;     // Parsed numeric value
};

export type MetricProvenance = {
  sheetName: string;       // e.g., "Financials"
  range: string;           // A1 notation
  timestamp: string;       // ISO 8601
  source?: "sheet" | "stripe" | "manual" | "computed";
};

export type SanityCheck = {
  name: string;            // e.g., "Burn is non-negative"
  passed: boolean;
  note?: string;           // Optional explanation if failed
};

export type MetricDetails = {
  metric: MetricType;
  
  // Core values
  value: number | null;
  formattedValue: string;  // e.g., "$10,000", "12.5%", "10.5 months"
  currency?: string;       // "USD", "NOK", "EUR", null for percentages/months
  period: string;          // e.g., "2024-01" or "January 2024"
  
  // Status & confidence
  status: MetricStatus;
  confidence: ConfidenceLevel;
  
  // Explanations (investor-friendly)
  explanation: string;     // Short (1-2 sentences): what this value means
  methodology: string;     // How it was computed (human readable)
  
  // Derivation details (for derived metrics)
  formula?: string;        // e.g., "ARR = 12 × MRR"
  inputs?: MetricInput[];  // Source values used in calculation
  
  // Provenance (for reported metrics)
  provenance?: MetricProvenance;
  
  // Quality & validation
  sanityChecks: SanityCheck[];
  warnings: string[];      // e.g., "Burn is 0 because net cash flow is positive"
  
  // Metadata
  definition: string;      // 1-2 lines: what this metric means in general
  lastUpdated?: string;    // ISO 8601
};

/**
 * Helper to format currency values
 */
export function formatCurrency(value: number | null, currency: string = "USD"): string {
  if (value === null) return "—";
  
  const symbol = currency === "NOK" ? "kr " : currency === "EUR" ? "€" : "$";
  const formatted = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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
 * Helper to format months
 */
export function formatMonths(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(1)} months`;
}

/**
 * Get metric definition (what the metric means)
 */
export function getMetricDefinition(metric: MetricType): string {
  const definitions: Record<MetricType, string> = {
    mrr: "Monthly Recurring Revenue: Predictable revenue from subscriptions or recurring contracts, recognized monthly.",
    arr: "Annual Recurring Revenue: Annualized value of recurring revenue (MRR × 12). Shows annual run-rate.",
    growth_mom: "Month-over-Month Growth: Percentage change in MRR compared to previous month. Indicates momentum.",
    burn: "Monthly Cash Outflow (Burn Rate): Net cash spent per month. When positive, company is burning capital. When zero, company is cash-flow positive.",
    runway: "Runway: Number of months company can operate at current burn rate before running out of cash. Only applicable when burning cash.",
    churn: "Customer Churn Rate: Percentage of customers lost in a period. Calculated as (customers lost / customers at period start) × 100."
  };
  
  return definitions[metric];
}

/**
 * Mock examples for testing
 */
export const MOCK_MRR_DETAILS: MetricDetails = {
  metric: "mrr",
  value: 212000,
  formattedValue: "$212,000",
  currency: "USD",
  period: "2026-01",
  status: "reported",
  confidence: "high",
  explanation: "Monthly recurring revenue from active subscriptions and contracts.",
  methodology: "Extracted from Google Sheets 'Financials' tab, column 'MRR (USD)'.",
  provenance: {
    sheetName: "Financials",
    range: "B12",
    timestamp: "2026-01-15T10:30:00Z",
    source: "sheet",
  },
  sanityChecks: [
    { name: "Value is positive", passed: true },
    { name: "Within expected range (0 - 10M)", passed: true },
    { name: "Consistent with historical trend", passed: true },
  ],
  warnings: [],
  definition: getMetricDefinition("mrr"),
  lastUpdated: "2026-01-15T10:30:00Z",
};

export const MOCK_RUNWAY_NOT_APPLICABLE: MetricDetails = {
  metric: "runway",
  value: null,
  formattedValue: "—",
  period: "2026-01",
  status: "not_applicable",
  confidence: "high",
  explanation: "Company is cash-flow positive (not burning cash). Runway calculation not applicable.",
  methodology: "Burn rate is $0 because net cash flow is positive. When not burning cash, runway is undefined.",
  formula: "runway = cash_balance / burn_rate",
  inputs: [
    { label: "Cash Balance", range: "D12", rawValue: "$737,000", parsedValue: 737000 },
    { label: "Burn Rate", range: "C12", rawValue: "$0", parsedValue: 0 },
  ],
  sanityChecks: [
    { name: "Burn rate is zero or negative", passed: true, note: "Company is profitable or breaking even" },
    { name: "Runway not shown when burn = 0", passed: true },
  ],
  warnings: [
    "Cash-flow positive: Company is not burning cash (profitable or breaking even).",
    "Runway calculation not applicable in this scenario.",
  ],
  definition: getMetricDefinition("runway"),
  lastUpdated: "2026-01-15T10:30:00Z",
};

export const MOCK_ARR_DERIVED: MetricDetails = {
  metric: "arr",
  value: 2544000,
  formattedValue: "$2,544,000",
  currency: "USD",
  period: "2026-01",
  status: "derived",
  confidence: "high",
  explanation: "Derived from MRR using annualization formula (MRR × 12).",
  methodology: "Calculated automatically from reported MRR. Assumes consistent monthly recurring revenue.",
  formula: "ARR = 12 × MRR",
  inputs: [
    { label: "MRR", range: "B12", rawValue: "$212,000", parsedValue: 212000 },
  ],
  sanityChecks: [
    { name: "Derived from valid MRR", passed: true },
    { name: "Within expected range", passed: true },
  ],
  warnings: ["Assumes MRR remains consistent month-to-month."],
  definition: getMetricDefinition("arr"),
  lastUpdated: "2026-01-15T10:30:00Z",
};
