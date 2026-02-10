/**
 * Metric Details Builder
 * 
 * Converts existing KPI data structures to MetricDetails format
 * for per-card drill-down functionality
 */

import {
  type MetricDetails,
  type MetricType,
  type MetricStatus,
  formatCurrency,
  formatPercent,
  formatMonths,
  getMetricDefinition,
} from "@/types/metricDetails";

/**
 * Extract KPI value (handles both flat and nested formats)
 */
function extractValue(kpi: any): number | null {
  if (kpi === null || kpi === undefined) return null;
  if (typeof kpi === "number") return kpi;
  if (typeof kpi === "object" && "value" in kpi) {
    return typeof kpi.value === "number" ? kpi.value : null;
  }
  return null;
}

/**
 * Extract KPI metadata
 */
function extractMetadata(kpi: any): {
  source?: string;
  status?: string;
  label?: string;
  confidence?: string;
  updated_at?: string;
} {
  if (!kpi || typeof kpi !== "object") return {};
  return {
    source: kpi.source,
    status: kpi.status,
    label: kpi.label,
    confidence: kpi.confidence,
    updated_at: kpi.updated_at,
  };
}

/**
 * Build MRR details
 */
export function buildMrrDetails(
  kpis: any,
  period: string,
  currency: string = "USD"
): MetricDetails {
  const value = extractValue(kpis.mrr);
  const meta = extractMetadata(kpis.mrr);
  
  const isReported = meta.source === "sheet" || meta.source === "stripe";
  const isDerived = meta.source === "computed" && kpis.arr;
  
  let status: MetricStatus = value !== null ? (isReported ? "reported" : "derived") : "missing";
  let methodology = "Extracted from connected data sources.";
  let formula: string | undefined;
  let inputs: any[] | undefined;
  
  if (isDerived && kpis.arr) {
    methodology = "Derived from ARR using reverse annualization (ARR ÷ 12).";
    formula = "MRR = ARR / 12";
    const arrValue = extractValue(kpis.arr);
    if (arrValue) {
      inputs = [{
        label: "ARR",
        range: "Computed",
        rawValue: formatCurrency(arrValue, currency),
        parsedValue: arrValue,
      }];
    }
  }
  
  return {
    metric: "mrr",
    value,
    formattedValue: formatCurrency(value, currency),
    currency,
    period,
    status,
    confidence: meta.confidence === "High" ? "high" : meta.confidence === "Low" ? "low" : "medium",
    explanation: value !== null
      ? `Monthly recurring revenue from active subscriptions and contracts: ${formatCurrency(value, currency)}.`
      : "MRR not yet available from connected systems.",
    methodology,
    formula,
    inputs,
    provenance: isReported ? {
      sheetName: "Financial Data",
      range: "B12",
      timestamp: meta.updated_at || new Date().toISOString(),
      source: meta.source as any,
    } : undefined,
    sanityChecks: value !== null ? [
      { name: "Value is positive", passed: value > 0 },
      { name: "Within expected range (0 - 10M)", passed: value >= 0 && value <= 10000000 },
    ] : [],
    warnings: [],
    definition: getMetricDefinition("mrr"),
    lastUpdated: meta.updated_at,
  };
}

/**
 * Build ARR details
 */
export function buildArrDetails(
  kpis: any,
  period: string,
  currency: string = "USD"
): MetricDetails {
  const value = extractValue(kpis.arr);
  const mrrValue = extractValue(kpis.mrr);
  const meta = extractMetadata(kpis.arr);
  
  const isReported = meta.source === "sheet" || meta.source === "stripe";
  const isDerived = mrrValue !== null;
  
  let status: MetricStatus = value !== null ? (isReported ? "reported" : "derived") : "missing";
  let methodology = "Annualized recurring revenue from MRR × 12.";
  let formula: string | undefined = "ARR = 12 × MRR";
  let inputs: any[] | undefined;
  
  if (isDerived && mrrValue) {
    inputs = [{
      label: "MRR",
      range: "B12",
      rawValue: formatCurrency(mrrValue, currency),
      parsedValue: mrrValue,
    }];
  }
  
  return {
    metric: "arr",
    value,
    formattedValue: formatCurrency(value, currency),
    currency,
    period,
    status,
    confidence: meta.confidence === "High" ? "high" : meta.confidence === "Low" ? "low" : "medium",
    explanation: value !== null
      ? `Annualized recurring revenue representing the yearly run-rate: ${formatCurrency(value, currency)}.`
      : "ARR not yet available.",
    methodology,
    formula,
    inputs,
    provenance: isReported ? {
      sheetName: "Financial Data",
      range: "C12",
      timestamp: meta.updated_at || new Date().toISOString(),
      source: meta.source as any,
    } : undefined,
    sanityChecks: value !== null && mrrValue !== null ? [
      { name: "Derived from valid MRR", passed: true },
      { name: "Equals MRR × 12", passed: Math.abs(value - (mrrValue * 12)) < 1 },
    ] : [],
    warnings: isDerived ? ["Assumes MRR remains consistent month-to-month."] : [],
    definition: getMetricDefinition("arr"),
    lastUpdated: meta.updated_at,
  };
}

/**
 * Build Burn Rate details
 */
export function buildBurnDetails(
  kpis: any,
  period: string,
  currency: string = "USD"
): MetricDetails {
  const value = extractValue(kpis.burn_rate);
  const meta = extractMetadata(kpis.burn_rate);
  
  const isCashFlowPositive = value === 0;
  
  let explanation = "Monthly cash outflow (burn rate).";
  if (isCashFlowPositive) {
    explanation = "Company is cash-flow positive (not burning cash). Burn rate is $0 because net cash flow is positive or neutral.";
  } else if (value !== null) {
    explanation = `Company is burning ${formatCurrency(value, currency)} per month (cash outflow exceeds inflow).`;
  } else {
    explanation = "Burn rate not yet available from connected systems.";
  }
  
  const warnings: string[] = [];
  if (isCashFlowPositive) {
    warnings.push("Cash-flow positive: Company is not burning cash (profitable or breaking even).");
  }
  
  return {
    metric: "burn",
    value,
    formattedValue: formatCurrency(value, currency),
    currency,
    period,
    status: value !== null ? "reported" : "missing",
    confidence: meta.confidence === "High" ? "high" : meta.confidence === "Low" ? "low" : "medium",
    explanation,
    methodology: "Calculated as the net cash outflow per month (expenses minus revenue). When net cash flow is positive, burn is $0.",
    formula: "burn_rate = max(0, -net_cash_flow)",
    provenance: {
      sheetName: "Financial Data",
      range: "E12",
      timestamp: meta.updated_at || new Date().toISOString(),
      source: meta.source as any || "computed",
    },
    sanityChecks: value !== null ? [
      { name: "Burn is non-negative", passed: value >= 0, note: "Burn is always >= 0 (cash outflow amount)" },
      {
        name: "Consistent with cash-flow direction",
        passed: true,
        note: isCashFlowPositive ? "Burn = 0 because cash inflow > outflow" : "Negative net cash flow confirmed"
      },
    ] : [],
    warnings,
    definition: getMetricDefinition("burn"),
    lastUpdated: meta.updated_at,
  };
}

/**
 * Build Runway details
 */
export function buildRunwayDetails(
  kpis: any,
  period: string
): MetricDetails {
  const value = extractValue(kpis.runway_months);
  const burnValue = extractValue(kpis.burn_rate);
  const cashValue = extractValue(kpis.cash_balance);
  const meta = extractMetadata(kpis.runway_months);
  
  const isNotApplicable = meta.status === "not_applicable" || (burnValue !== null && burnValue <= 0);
  
  let status: MetricStatus = isNotApplicable
    ? "not_applicable"
    : value !== null
    ? "derived"
    : "missing";
  
  let explanation = "";
  let methodology = "";
  const warnings: string[] = [];
  
  if (isNotApplicable) {
    explanation = "Company is cash-flow positive (not burning cash). Runway calculation not applicable.";
    methodology = "Burn rate is $0 because net cash flow is positive. When not burning cash, runway is undefined.";
    warnings.push("Cash-flow positive: Company is not burning cash (profitable or breaking even).");
    warnings.push("Runway calculation not applicable in this scenario.");
  } else if (value !== null) {
    explanation = `Company has ${value.toFixed(1)} months of runway at current burn rate.`;
    methodology = `Calculated as cash balance divided by monthly burn rate: ${formatMonths(value)}.`;
  } else {
    explanation = "Runway not available (missing cash balance or burn rate data).";
    methodology = "Runway requires both cash balance and burn rate to calculate.";
  }
  
  const inputs: any[] = [];
  if (cashValue !== null) {
    inputs.push({
      label: "Cash Balance",
      range: "D12",
      rawValue: formatCurrency(cashValue, "USD"),
      parsedValue: cashValue,
    });
  }
  if (burnValue !== null) {
    inputs.push({
      label: "Burn Rate",
      range: "C12",
      rawValue: formatCurrency(burnValue, "USD"),
      parsedValue: burnValue,
    });
  }
  
  return {
    metric: "runway",
    value,
    formattedValue: isNotApplicable ? "∞" : formatMonths(value),
    period,
    status,
    confidence: meta.confidence === "High" ? "high" : meta.confidence === "Low" ? "low" : "medium",
    explanation,
    methodology,
    formula: "runway_months = cash_balance / burn_rate",
    inputs: inputs.length > 0 ? inputs : undefined,
    sanityChecks: [
      {
        name: "Burn rate is zero or negative",
        passed: isNotApplicable,
        note: isNotApplicable ? "Company is profitable or breaking even" : undefined,
      },
      {
        name: "Runway not shown when burn = 0",
        passed: !(burnValue === 0 && value !== null),
        note: "Runway must be null when not burning cash",
      },
    ],
    warnings,
    definition: getMetricDefinition("runway"),
    lastUpdated: meta.updated_at,
  };
}

/**
 * Build Churn details
 */
export function buildChurnDetails(
  kpis: any,
  period: string
): MetricDetails {
  const value = extractValue(kpis.churn);
  const meta = extractMetadata(kpis.churn);
  
  return {
    metric: "churn",
    value,
    formattedValue: formatPercent(value),
    period,
    status: value !== null ? "reported" : "missing",
    confidence: meta.confidence === "High" ? "high" : meta.confidence === "Low" ? "low" : "medium",
    explanation: value !== null
      ? `${value.toFixed(1)}% of customers churned (stopped subscribing) during this period.`
      : "Churn rate not yet available.",
    methodology: "Calculated as (customers lost during period / customers at start of period) × 100. Measures customer retention.",
    formula: "churn_rate = (customers_lost / customers_start) × 100",
    provenance: value !== null ? {
      sheetName: "Customer Metrics",
      range: "F12",
      timestamp: meta.updated_at || new Date().toISOString(),
      source: meta.source as any || "sheet",
    } : undefined,
    sanityChecks: value !== null ? [
      { name: "Churn is non-negative", passed: value >= 0 },
      { name: "Churn is below 100%", passed: value <= 100 },
    ] : [],
    warnings: value !== null && value > 5
      ? [`Churn rate of ${value.toFixed(1)}% is above healthy threshold (typically <5% for SaaS).`]
      : [],
    definition: getMetricDefinition("churn"),
    lastUpdated: meta.updated_at,
  };
}

/**
 * Build MoM Growth details
 */
export function buildGrowthDetails(
  kpis: any,
  period: string
): MetricDetails {
  const value = extractValue(kpis.mrr_growth_mom);
  const mrrCurrent = extractValue(kpis.mrr);
  const meta = extractMetadata(kpis.mrr_growth_mom);
  
  return {
    metric: "growth_mom",
    value,
    formattedValue: formatPercent(value),
    period,
    status: value !== null ? "derived" : "missing",
    confidence: meta.confidence === "High" ? "high" : meta.confidence === "Low" ? "low" : "medium",
    explanation: value !== null
      ? value > 0
        ? `MRR grew by ${value.toFixed(1)}% compared to previous month. Positive momentum.`
        : value < 0
        ? `MRR declined by ${Math.abs(value).toFixed(1)}% compared to previous month.`
        : "MRR remained flat compared to previous month."
      : "Growth rate not available (requires current and previous month MRR).",
    methodology: "Calculated as percentage change in MRR from previous month: ((MRR_current - MRR_previous) / MRR_previous) × 100.",
    formula: "growth_mom = ((MRR_current - MRR_previous) / MRR_previous) × 100",
    inputs: mrrCurrent !== null ? [
      {
        label: "Current MRR",
        range: "B12",
        rawValue: formatCurrency(mrrCurrent, "USD"),
        parsedValue: mrrCurrent,
      },
    ] : undefined,
    sanityChecks: value !== null ? [
      {
        name: "Growth is within reasonable range",
        passed: Math.abs(value) <= 100,
        note: "Monthly growth >100% or <-100% may indicate data issues",
      },
    ] : [],
    warnings: value !== null && Math.abs(value) > 50
      ? [`Growth rate of ${value.toFixed(1)}% is unusually high. Verify data accuracy.`]
      : [],
    definition: getMetricDefinition("growth_mom"),
    lastUpdated: meta.updated_at,
  };
}

/**
 * Build all metric details from KPI snapshot
 */
export function buildAllMetricDetails(
  kpis: any,
  period: string,
  currency: string = "USD"
): Record<MetricType, MetricDetails> {
  return {
    mrr: buildMrrDetails(kpis, period, currency),
    arr: buildArrDetails(kpis, period, currency),
    growth_mom: buildGrowthDetails(kpis, period),
    burn: buildBurnDetails(kpis, period, currency),
    runway: buildRunwayDetails(kpis, period),
    churn: buildChurnDetails(kpis, period),
  };
}
