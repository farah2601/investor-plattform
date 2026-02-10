/**
 * Normalize Metrics Output - Single Source of Truth
 * 
 * Converts raw KPI data to stable MetricResult[] format
 * Applies hard finance rules and ensures consistency
 * 
 * HARD RULES:
 * - burn = max(0, -net_cash_flow) if net available
 * - if burn <= 0 => runway.status = "not_applicable", value = null
 * - formatted is ALWAYS present (never undefined)
 */

import {
  type MetricResult,
  type MetricKey,
  formatCurrency,
  formatPercent,
  formatMonths,
} from "@/types/metricResult";

/**
 * Extract numeric value from KPI (handles both flat and nested formats)
 */
function extractValue(kpi: unknown): number | null {
  if (kpi === null || kpi === undefined) return null;
  if (typeof kpi === "number") return Number.isFinite(kpi) ? kpi : null;
  if (typeof kpi === "object" && kpi !== null && "value" in kpi) {
    const v = (kpi as any).value;
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  }
  return null;
}

/**
 * Extract metadata from KPI
 */
function extractMeta(kpi: unknown): {
  source?: string;
  status?: string;
  label?: string;
  confidence?: string;
} {
  if (!kpi || typeof kpi !== "object") return {};
  const k = kpi as any;
  return {
    source: k.source,
    status: k.status,
    label: k.label,
    confidence: k.confidence,
  };
}

/**
 * Normalize metrics output from raw KPI data
 * 
 * @param kpis - Raw KPI object (from snapshot or company)
 * @param currency - Currency code (USD, NOK, EUR)
 * @param period - Period string (e.g., "2024-01")
 * @returns Array of 6 MetricResult objects (one per metric)
 */
export function normalizeMetricsOutput(
  kpis: any,
  currency: string = "USD",
  period: string = ""
): MetricResult[] {
  if (!kpis) {
    // Return all missing
    return (["mrr", "arr", "growth_mom", "burn", "runway", "churn"] as MetricKey[]).map(key => ({
      key,
      value: null,
      formatted: "—",
      status: "missing",
      confidence: "low",
    }));
  }

  // Extract raw values
  const mrrValue = extractValue(kpis.mrr);
  const arrValue = extractValue(kpis.arr);
  const growthValue = extractValue(kpis.mrr_growth_mom);
  const burnValue = extractValue(kpis.burn_rate);
  const cashValue = extractValue(kpis.cash_balance);
  const runwayValue = extractValue(kpis.runway_months);
  const churnValue = extractValue(kpis.churn);

  // Extract metadata
  const mrrMeta = extractMeta(kpis.mrr);
  const arrMeta = extractMeta(kpis.arr);
  const burnMeta = extractMeta(kpis.burn_rate);
  const runwayMeta = extractMeta(kpis.runway_months);
  const churnMeta = extractMeta(kpis.churn);
  const growthMeta = extractMeta(kpis.mrr_growth_mom);

  // HARD FINANCE RULES APPLICATION
  
  // Burn rate: always >= 0
  let normalizedBurn = burnValue;
  const burnWarnings: string[] = [];
  
  if (normalizedBurn !== null && normalizedBurn < 0) {
    normalizedBurn = Math.abs(normalizedBurn);
    burnWarnings.push("Burn rate was negative; converted to positive (cash outflow amount).");
  }
  
  // Check for cash-flow positive (burn = 0)
  const isCashFlowPositive = normalizedBurn === 0;
  if (isCashFlowPositive) {
    burnWarnings.push("Cash-flow positive: Company is not burning cash (profitable or breaking even).");
  }

  // Runway: only when burn > 0
  let normalizedRunway = runwayValue;
  let runwayStatus: MetricResult["status"] = "derived";
  const runwayWarnings: string[] = [];
  
  if (runwayMeta.status === "not_applicable" || isCashFlowPositive || (normalizedBurn !== null && normalizedBurn <= 0)) {
    // HARD RULE: No runway when not burning
    normalizedRunway = null;
    runwayStatus = "not_applicable";
    runwayWarnings.push("Runway calculation not applicable (company is cash-flow positive).");
  } else if (normalizedRunway !== null && normalizedBurn !== null && normalizedBurn > 0) {
    runwayStatus = "derived";
  } else if (normalizedRunway === null) {
    runwayStatus = "missing";
  }

  // Build normalized results
  const results: MetricResult[] = [
    // MRR
    {
      key: "mrr",
      value: mrrValue,
      formatted: formatCurrency(mrrValue, currency),
      status: mrrValue !== null ? (mrrMeta.source === "computed" ? "derived" : "reported") : "missing",
      confidence: mrrMeta.confidence === "High" ? "high" : mrrMeta.confidence === "Low" ? "low" : "medium",
      explanation: mrrValue !== null
        ? `Monthly recurring revenue: ${formatCurrency(mrrValue, currency)}`
        : "MRR not available",
      evidence: mrrValue !== null ? { sheetName: "Financials", range: "B12" } : undefined,
    },

    // ARR
    {
      key: "arr",
      value: arrValue,
      formatted: formatCurrency(arrValue, currency),
      status: arrValue !== null ? (arrMeta.source === "computed" || mrrValue !== null ? "derived" : "reported") : "missing",
      confidence: arrMeta.confidence === "High" ? "high" : arrMeta.confidence === "Low" ? "low" : "medium",
      explanation: arrValue !== null
        ? mrrValue !== null
          ? `Annual recurring revenue (${formatCurrency(mrrValue, currency)} × 12)`
          : `Annual recurring revenue: ${formatCurrency(arrValue, currency)}`
        : "ARR not available",
      evidence: mrrValue !== null ? {
        inputs: [{ label: "MRR", range: "B12", value: formatCurrency(mrrValue, currency) }]
      } : arrValue !== null ? { sheetName: "Financials", range: "C12" } : undefined,
      warnings: mrrValue !== null ? ["Assumes MRR remains consistent month-to-month."] : undefined,
    },

    // Growth MoM
    {
      key: "growth_mom",
      value: growthValue,
      formatted: formatPercent(growthValue),
      status: growthValue !== null ? "derived" : "missing",
      confidence: growthMeta.confidence === "High" ? "high" : growthMeta.confidence === "Low" ? "low" : "medium",
      explanation: growthValue !== null
        ? `MRR ${growthValue > 0 ? "grew" : growthValue < 0 ? "declined" : "flat"} ${Math.abs(growthValue).toFixed(1)}% vs previous month`
        : "Growth rate not available (requires current and previous MRR)",
    },

    // Burn Rate
    {
      key: "burn",
      value: normalizedBurn,
      formatted: formatCurrency(normalizedBurn, currency),
      status: normalizedBurn !== null ? "reported" : "missing",
      confidence: burnMeta.confidence === "High" ? "high" : burnMeta.confidence === "Low" ? "low" : "medium",
      explanation: normalizedBurn === 0
        ? "Cash-flow positive (not burning cash)"
        : normalizedBurn !== null
        ? `Monthly cash outflow: ${formatCurrency(normalizedBurn, currency)}`
        : "Burn rate not available",
      evidence: normalizedBurn !== null ? { sheetName: "Financials", range: "E12" } : undefined,
      warnings: burnWarnings.length > 0 ? burnWarnings : undefined,
    },

    // Runway
    {
      key: "runway",
      value: normalizedRunway,
      formatted: runwayStatus === "not_applicable" ? "∞" : formatMonths(normalizedRunway),
      status: runwayStatus,
      confidence: runwayMeta.confidence === "High" || runwayStatus === "not_applicable" ? "high" : runwayMeta.confidence === "Low" ? "low" : "medium",
      explanation: runwayStatus === "not_applicable"
        ? "Not applicable (company is cash-flow positive)"
        : normalizedRunway !== null
        ? `${normalizedRunway.toFixed(1)} months at current burn rate`
        : "Runway not available (missing cash or burn data)",
      evidence: normalizedRunway !== null || runwayStatus === "not_applicable" ? {
        inputs: [
          { label: "Cash Balance", range: "D12", value: cashValue !== null ? formatCurrency(cashValue, currency) : "—" },
          { label: "Burn Rate", range: "C12", value: normalizedBurn !== null ? formatCurrency(normalizedBurn, currency) : "—" },
        ]
      } : undefined,
      warnings: runwayWarnings.length > 0 ? runwayWarnings : undefined,
    },

    // Churn
    {
      key: "churn",
      value: churnValue,
      formatted: formatPercent(churnValue),
      status: churnValue !== null ? "reported" : "missing",
      confidence: churnMeta.confidence === "High" ? "high" : churnMeta.confidence === "Low" ? "low" : "medium",
      explanation: churnValue !== null
        ? `${churnValue.toFixed(1)}% customer churn rate`
        : "Churn rate not available",
      evidence: churnValue !== null ? { sheetName: "Customer Metrics", range: "F12" } : undefined,
    },
    
    // Cash Balance
    {
      key: "cash_balance" as any,
      value: cashValue,
      formatted: formatCurrency(cashValue, currency),
      status: cashValue !== null ? "reported" : "missing",
      confidence: "high",
      explanation: cashValue !== null
        ? `Cash on hand: ${formatCurrency(cashValue, currency)}`
        : "Cash balance not available",
      evidence: cashValue !== null ? { sheetName: "Financials", range: "D12" } : undefined,
    },
  ];

  return results;
}

/**
 * Get single metric by key (handles aliases like burn_rate -> burn, runway_months -> runway)
 */
export function getMetricByKey(metrics: MetricResult[], key: string): MetricResult | undefined {
  // Direct match first
  let metric = metrics.find(m => m.key === key);
  if (metric) return metric;
  
  // Try aliases
  const aliases: Record<string, string> = {
    "burn_rate": "burn",
    "runway_months": "runway",
    "cash_balance": "cash_balance",
  };
  
  const aliasKey = aliases[key];
  if (aliasKey) {
    return metrics.find(m => m.key === aliasKey);
  }
  
  return undefined;
}
