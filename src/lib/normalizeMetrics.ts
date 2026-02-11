/**
 * Normalize KPI data from snapshots/sheets into MetricResult format
 * for per-card details and display.
 * ARR is never shown without classification (run-rate vs observed); never imply contract-backed ARR.
 */

import { formatCurrency, formatPercent, type MetricResult } from "@/types/metricResult";
import { extractArrMetadata } from "@/lib/kpi/kpi_extract";

function extractValue(kpi: unknown): number | null {
  if (kpi === null || kpi === undefined) return null;
  if (typeof kpi === "number") return Number.isFinite(kpi) ? kpi : null;
  if (typeof kpi === "object" && kpi !== null && "value" in kpi) {
    const v = (kpi as { value: unknown }).value;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(kpi);
  return Number.isFinite(n) ? n : null;
}

export function normalizeMetricsOutput(
  kpis: unknown,
  currency: string = "USD",
  _period: string = ""
): MetricResult[] {
  const k = (kpis != null && typeof kpis === "object" ? kpis : {}) as Record<string, unknown>;
  const mrrValue = extractValue(k.mrr);
  const arrValue = extractValue(k.arr);
  const burnRate = extractValue(k.burn_rate);
  const cashBalance = extractValue(k.cash_balance);
  const runwayMonths = extractValue(k.runway_months);
  const churnValue = extractValue(k.churn);
  const growthValue = extractValue(k.mrr_growth_mom);
  const netRevenueValue = extractValue(k.net_revenue);
  const customersValue = extractValue(k.customers);

  const runwayMeta = k.runway_months && typeof k.runway_months === "object"
    ? (k.runway_months as { status?: string })
    : {};

  const result: MetricResult[] = [];

  result.push({
    key: "mrr",
    value: mrrValue,
    formatted: formatCurrency(mrrValue, currency),
    status: mrrValue !== null ? "reported" : undefined,
    explanation: mrrValue !== null
      ? `Monthly recurring revenue: ${formatCurrency(mrrValue, currency)}`
      : undefined,
  });

  const arrMeta = extractArrMetadata(kpis);
  const arrType = arrMeta?.arr_type ?? "run_rate_arr";
  const arrMethod = arrMeta?.arr_method ?? "annualized";
  const arrMonthsUsed = arrMeta?.arr_months_used;
  const arrExplanation =
    arrValue !== null
      ? arrType === "observed_arr" && arrMonthsUsed != null
        ? `Based on average MRR over the last ${arrMonthsUsed} months, annualized. Not contract-backed unless explicitly provided.`
        : `Run-rate ARR: annualized from current MRR (${formatCurrency(mrrValue ?? 0, currency)} × 12). Not contract-backed.`
      : undefined;

  result.push({
    key: "arr",
    value: arrValue,
    formatted: formatCurrency(arrValue, currency),
    status: arrValue !== null ? "reported" : undefined,
    explanation: arrExplanation,
    source: k.arr && typeof k.arr === "object" && "source" in k.arr ? (k.arr as { source?: string }).source : undefined,
    arr_type: arrType,
    arr_method: arrMethod,
    ...(arrMonthsUsed != null && { arr_months_used: arrMonthsUsed }),
  });

  const burnValue = burnRate ?? 0;
  const burnStatus = burnRate !== null ? "reported" : "computed";
  result.push({
    key: "burn",
    value: burnValue,
    formatted: formatCurrency(burnValue, currency),
    status: burnValue === 0 ? "reported" : burnStatus,
    explanation: burnValue === 0
      ? "Cash-flow positive this month."
      : `Monthly cash outflow: ${formatCurrency(burnValue, currency)}`,
    warnings: burnValue === 0 ? undefined : undefined,
  });

  const runwayValue = runwayMeta.status === "not_applicable" ? null : runwayMonths;
  const runwayStatus = runwayMeta.status === "not_applicable"
    ? "not_applicable"
    : runwayValue !== null
      ? "derived"
      : undefined;
  result.push({
    key: "runway",
    value: runwayValue,
    formatted: runwayValue !== null ? `${runwayValue.toFixed(1)} months` : "—",
    status: runwayStatus,
    explanation: runwayValue !== null
      ? `Months of runway at current burn: ${runwayValue.toFixed(1)}`
      : runwayStatus === "not_applicable"
        ? "Company is cash-flow positive."
        : undefined,
  });

  result.push({
    key: "churn",
    value: churnValue,
    formatted: churnValue !== null ? formatPercent(churnValue) : "—",
    status: churnValue !== null ? "reported" : undefined,
    explanation: churnValue !== null
      ? `Monthly churn rate: ${churnValue.toFixed(1)}%`
      : undefined,
  });

  result.push({
    key: "growth_mom",
    value: growthValue,
    formatted: growthValue !== null ? formatPercent(growthValue) : "—",
    status: growthValue !== null ? "computed" : undefined,
    explanation: growthValue !== null
      ? `Month-over-month growth: ${growthValue.toFixed(1)}%`
      : undefined,
  });

  result.push({
    key: "cash",
    value: cashBalance,
    formatted: formatCurrency(cashBalance, currency),
    status: cashBalance !== null ? "reported" : undefined,
    explanation: cashBalance !== null
      ? `Cash on hand: ${formatCurrency(cashBalance, currency)}`
      : undefined,
  });

  result.push({
    key: "cash_balance",
    value: cashBalance,
    formatted: formatCurrency(cashBalance, currency),
    status: cashBalance !== null ? "reported" : undefined,
    explanation: cashBalance !== null
      ? `Cash on hand: ${formatCurrency(cashBalance, currency)}`
      : undefined,
  });

  if (netRevenueValue !== null || netRevenueValue === null) {
    result.push({
      key: "net_revenue",
      value: netRevenueValue,
      formatted: formatCurrency(netRevenueValue, currency),
      status: netRevenueValue !== null ? "reported" : undefined,
      explanation: netRevenueValue !== null
        ? `Net revenue (payments minus refunds): ${formatCurrency(netRevenueValue, currency)}`
        : undefined,
    });
  }

  if (customersValue !== null || customersValue === null) {
    result.push({
      key: "customers",
      value: customersValue,
      formatted: customersValue != null ? customersValue.toLocaleString("en-US") : "—",
      status: customersValue != null ? "reported" : undefined,
      explanation: customersValue != null
        ? `Active paying customers: ${customersValue.toLocaleString()}`
        : undefined,
    });
  }

  return result;
}
