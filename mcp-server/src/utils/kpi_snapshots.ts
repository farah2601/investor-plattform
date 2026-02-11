/**
 * KPI Snapshot utilities for MCP
 * 
 * Handles merging, computing derived metrics, and snapshot operations.
 * 
 * FINANCE RULES APPLIED:
 * - burn_rate is always >= 0 (never negative)
 * - runway = null when burn <= 0 (cash-flow positive)
 * - Hard validation prevents sign confusion
 */

import { supabase } from "../db/supabase";
import { applyFinanceRules, validateFinanceRules } from "./finance_rules";

type KpiSource = "stripe" | "sheet" | "manual" | "computed";

type KpiValue = {
  value: number | null;
  source: KpiSource;
  updated_at: string | null;
  status?: "active" | "not_applicable" | "derived" | "missing";
  label?: string;
  confidence?: "High" | "Medium" | "Low";
};

/** ARR classification: run-rate (MRR×12) vs observed (multi-month average×12). */
export type ArrType = "run_rate_arr" | "observed_arr";
/** How ARR was computed: annualized from latest month vs averaged over months. */
export type ArrMethod = "averaged" | "annualized";

/** ARR KPI may carry classification so UI never shows unlabeled ARR. */
export type ArrKpiValue = KpiValue & {
  arr_type?: ArrType;
  arr_months_used?: number;
  arr_method?: ArrMethod;
};

export type KpiSnapshotKpis = {
  mrr: KpiValue;
  arr: ArrKpiValue;
  mrr_growth_mom: KpiValue;
  churn: KpiValue;
  net_revenue: KpiValue;
  net_revenue_booked: KpiValue;
  failed_payment_rate: KpiValue;
  refund_rate: KpiValue;
  burn_rate: KpiValue;
  cash_balance: KpiValue;
  customers: KpiValue;
  runway_months: KpiValue;
};

const KPI_KEYS: Array<keyof KpiSnapshotKpis> = [
  "mrr",
  "arr",
  "mrr_growth_mom",
  "churn",
  "net_revenue",
  "net_revenue_booked",
  "failed_payment_rate",
  "refund_rate",
  "burn_rate",
  "cash_balance",
  "customers",
  "runway_months",
];

function createKpiValue(
  value: number | null,
  source: KpiSource,
  updated_at: string | null = null,
  options?: {
    status?: "active" | "not_applicable" | "derived" | "missing";
    label?: string;
    confidence?: "High" | "Medium" | "Low";
  }
): KpiValue {
  return {
    value,
    source,
    updated_at: updated_at || (value !== null ? new Date().toISOString() : null),
    ...(options?.status && { status: options.status }),
    ...(options?.label && { label: options.label }),
    ...(options?.confidence && { confidence: options.confidence }),
  };
}

/**
 * Extract numeric value from KPI (handles both old flat format and new nested format)
 */
export function extractKpiValue(kpi: unknown): number | null {
  if (kpi === null || kpi === undefined) {
    return null;
  }

  // New format: {value, source, updated_at}
  if (typeof kpi === "object" && kpi !== null && "value" in kpi) {
    const kpiValue = kpi as { value: unknown };
    if (typeof kpiValue.value === "number") {
      return kpiValue.value;
    }
    if (kpiValue.value === null) {
      return null;
    }
    const num = Number(kpiValue.value);
    return isNaN(num) ? null : num;
  }

  // Old format: direct number
  if (typeof kpi === "number") {
    return kpi;
  }

  const num = Number(kpi);
  return isNaN(num) ? null : num;
}

/**
 * Extract source from KPI
 */
export function extractKpiSource(kpi: unknown): KpiSource | null {
  if (kpi === null || kpi === undefined) {
    return null;
  }

  if (typeof kpi === "object" && kpi !== null && "source" in kpi) {
    const kpiValue = kpi as { source: unknown };
    if (typeof kpiValue.source === "string") {
      return kpiValue.source as KpiSource;
    }
  }

  return null;
}

/** Structural break threshold: if month-over-month relative change exceeds this, use run-rate. */
const ARR_STRUCTURAL_BREAK_THRESHOLD = 0.5;

export type ArrWithTypeResult = {
  value: number | null;
  arr_type: ArrType;
  arr_months_used?: number;
  arr_method: ArrMethod;
};

/**
 * Compute ARR with classification (mechanical only, no LLM).
 * - observed_arr: when >= 6 consecutive months of MRR exist, no large structural break; use avg(MRR)*12.
 *   If >= 12 months, use last 12 months.
 * - run_rate_arr: otherwise; latest MRR × 12, labeled as annualized from current MRR.
 */
export function computeArrWithType(
  currentPeriodMrr: number | null,
  mrrSeries: Array<{ period_date: string; mrr: number }>,
  currentPeriodDate: string
): ArrWithTypeResult {
  if (currentPeriodMrr === null) {
    return { value: null, arr_type: "run_rate_arr", arr_method: "annualized" };
  }

  const sorted = [...mrrSeries].filter((p) => p.mrr != null && Number.isFinite(p.mrr));
  const upToCurrent = sorted.filter((p) => p.period_date <= currentPeriodDate);
  const descending = [...upToCurrent].sort((a, b) => b.period_date.localeCompare(a.period_date));
  const last12 = descending.slice(0, 12);
  const last6 = descending.slice(0, 6);

  const hasStructuralBreak = (window: Array<{ period_date: string; mrr: number }>): boolean => {
    for (let i = 1; i < window.length; i++) {
      const prev = window[i].mrr;
      const curr = window[i - 1].mrr;
      if (prev <= 0) continue;
      const pct = Math.abs((curr - prev) / prev);
      if (pct > ARR_STRUCTURAL_BREAK_THRESHOLD) return true;
    }
    return false;
  };

  if (last12.length >= 12) {
    const rev = [...last12].reverse();
    if (!hasStructuralBreak(rev)) {
      const avg = rev.reduce((s, p) => s + p.mrr, 0) / 12;
      return {
        value: avg * 12,
        arr_type: "observed_arr",
        arr_months_used: 12,
        arr_method: "averaged",
      };
    }
  }

  if (last6.length >= 6) {
    const rev = [...last6].reverse();
    if (!hasStructuralBreak(rev)) {
      const avg = rev.reduce((s, p) => s + p.mrr, 0) / 6;
      return {
        value: avg * 12,
        arr_type: "observed_arr",
        arr_months_used: 6,
        arr_method: "averaged",
      };
    }
  }

  return {
    value: currentPeriodMrr * 12,
    arr_type: "run_rate_arr",
    arr_method: "annualized",
  };
}

export function createArrKpiValue(
  value: number | null,
  source: KpiSource,
  updated_at: string | null,
  arr_type: ArrType,
  arr_method: ArrMethod,
  arr_months_used?: number
): ArrKpiValue {
  const base = createKpiValue(value, source, updated_at);
  return {
    ...base,
    arr_type,
    arr_method,
    ...(arr_months_used != null && { arr_months_used }),
  };
}

/**
 * Merge sheet values into existing snapshot KPIs with safe merge rules
 * 
 * Rules:
 * - If existing KPI is from "stripe" or "manual" with non-null value -> keep it
 * - If existing KPI value is null -> allow sheet to fill it
 * - If existing KPI is "sheet" -> overwrite with new sheet value (latest wins)
 * - If sheet value is null -> do NOT overwrite an existing non-null value
 */
export function mergeSheetValuesIntoKpis(
  existingKpis: any,
  sheetValues: Record<string, number | null>,
  updatedAtIso: string
): KpiSnapshotKpis {
  const now = updatedAtIso || new Date().toISOString();
  
  const result: Partial<KpiSnapshotKpis> = {};

  for (const kpiKey of KPI_KEYS) {
    const existingKpi = existingKpis?.[kpiKey];
    const existingValue = extractKpiValue(existingKpi);
    const existingSource = extractKpiSource(existingKpi);
    const sheetValue = sheetValues[kpiKey] ?? null;

    let finalValue: number | null = null;
    let finalSource: KpiSource = "sheet";
    let finalUpdatedAt: string | null = null;

    if (existingValue !== null) {
      // Existing value exists
      if (existingSource === "stripe" || existingSource === "manual") {
        // Preserve Stripe/manual values
        finalValue = existingValue;
        finalSource = existingSource;
        if (existingKpi && typeof existingKpi === "object" && "updated_at" in existingKpi) {
          finalUpdatedAt = existingKpi.updated_at as string | null;
        }
      } else if (existingSource === "sheet") {
        // Overwrite sheet values (latest wins)
        finalValue = sheetValue;
        finalSource = "sheet";
        finalUpdatedAt = sheetValue !== null ? now : null;
      } else {
        // Old format or unknown source - treat as sheet if sheet value exists
        if (sheetValue !== null) {
          finalValue = sheetValue;
          finalSource = "sheet";
          finalUpdatedAt = now;
        } else {
          finalValue = existingValue;
          finalSource = existingSource || "sheet";
        }
      }
    } else {
      // Existing value is null - allow sheet to fill it
      finalValue = sheetValue;
      finalSource = "sheet";
      finalUpdatedAt = sheetValue !== null ? now : null;
    }

    result[kpiKey] = createKpiValue(finalValue, finalSource, finalUpdatedAt);
  }

  return result as KpiSnapshotKpis;
}

/**
 * Compute derived metrics from base metrics.
 * Fills in the 6 core metrics (mrr, arr, mrr_growth_mom, burn_rate, runway_months, churn)
 * when they can be derived from other available data. Churn cannot be derived and is never computed here.
 *
 * Takes numeric values (not KpiValue objects) and returns computed KpiValue objects.
 * - arr is NOT set here; run_kpi_refresh sets typed ARR (run_rate_arr vs observed_arr).
 * - mrr from arr when mrr missing (mrr = arr / 12)
 * - runway_months from cash_balance / burn_rate
 * - burn_rate from cash_balance / runway_months when burn missing
 * - mrr_growth_mom from current MRR and previous month MRR
 */
export function computeDerivedMetrics(
  mrr: number | null,
  arrFromMerged: number | null,
  burnRate: number | null,
  cashBalance: number | null,
  runwayMonthsFromMerged: number | null,
  previousMonthMrr: number | null
): {
  mrr: KpiValue;
  arr: KpiValue;
  mrr_growth_mom: KpiValue;
  burn_rate: KpiValue;
  runway_months: KpiValue;
} {
  const now = new Date().toISOString();

  // Effective MRR: use mrr if present, else derive from ARR (mrr = arr / 12)
  const effectiveMrr = mrr !== null ? mrr : (arrFromMerged !== null ? arrFromMerged / 12 : null);
  const mrrKpi = createKpiValue(effectiveMrr, "computed", effectiveMrr !== null ? now : null);

  // ARR is set by run_kpi_refresh with classification (run_rate_arr / observed_arr). Placeholder here.
  const arrValue = effectiveMrr !== null ? effectiveMrr * 12 : null;
  const arr = createKpiValue(arrValue, "computed", arrValue !== null ? now : null) as ArrKpiValue;

  // MRR Growth MoM
  let mrrGrowthValue: number | null = null;
  if (effectiveMrr !== null && previousMonthMrr !== null && previousMonthMrr > 0) {
    mrrGrowthValue = ((effectiveMrr - previousMonthMrr) / previousMonthMrr) * 100;
  }
  const mrr_growth_mom = createKpiValue(
    mrrGrowthValue,
    "computed",
    mrrGrowthValue !== null ? now : null
  );

  // Effective burn: use burn_rate if present, else derive from cash_balance / runway_months
  const effectiveBurn =
    burnRate !== null
      ? burnRate
      : cashBalance !== null && runwayMonthsFromMerged !== null && runwayMonthsFromMerged > 0
        ? cashBalance / runwayMonthsFromMerged
        : null;
  const burn_rate = createKpiValue(
    effectiveBurn,
    "computed",
    effectiveBurn !== null ? now : null
  );

  // Runway months = cash_balance / burn_rate
  // SYSTEM RULE: If burn <= 0, company is cash-flow positive (not burning cash)
  let runwayValue: number | null = null;
  let runwayOptions: {
    status?: "active" | "not_applicable" | "derived" | "missing";
    label?: string;
    confidence?: "High" | "Medium" | "Low";
  } | undefined;

  if (effectiveBurn !== null && effectiveBurn <= 0) {
    // Cash-flow positive: not burning cash (profitable or breaking even)
    runwayValue = null;
    runwayOptions = {
      status: "not_applicable",
      label: "Cash-flow positive",
      confidence: "High",
    };
  } else if (cashBalance !== null && effectiveBurn !== null && effectiveBurn > 0) {
    // Normal case: burning cash, calculate runway
    runwayValue = cashBalance / effectiveBurn;
    runwayOptions = {
      status: "active",
      confidence: "High",
    };
  }

  const runway_months = createKpiValue(
    runwayValue,
    "computed",
    runwayValue !== null ? now : null,
    runwayOptions
  );

  // APPLY HARD FINANCE RULES: Validate and correct burn/runway
  const burnValue = effectiveBurn;
  const cashValue = cashBalance;
  const runwayValueBeforeRules = runwayValue;
  
  // Apply finance rules (no net_cash_flow in this context, rely on reported burn)
  const financeMetrics = applyFinanceRules(
    null, // no net_cash_flow here
    burnValue,
    cashValue,
    { preferReportedBurn: true }
  );
  
  // Validate the results
  const validation = validateFinanceRules(financeMetrics);
  if (!validation.valid) {
    console.error("[computeDerivedMetrics] Finance rule violations:", validation.errors);
  }
  
  // Apply corrected burn and runway
  const correctedBurnRate = financeMetrics.burn_rate !== null 
    ? createKpiValue(financeMetrics.burn_rate, "computed", now)
    : burn_rate;
  
  const correctedRunway = financeMetrics.runway_status === "not_applicable"
    ? createKpiValue(
        null,
        "computed",
        null,
        {
          status: "not_applicable",
          label: "Cash-flow positive",
          confidence: "High",
        }
      )
    : financeMetrics.runway_months !== null
    ? createKpiValue(
        financeMetrics.runway_months,
        "computed",
        now,
        {
          status: "active",
          confidence: "High",
        }
      )
    : createKpiValue(null, "computed");
  
  return {
    mrr: mrrKpi,
    arr,
    mrr_growth_mom,
    burn_rate: correctedBurnRate,
    runway_months: correctedRunway,
  };
}

/**
 * Get default empty KPI snapshot
 */
export function getDefaultKpiSnapshot(): KpiSnapshotKpis {
  const now = new Date().toISOString();
  return {
    mrr: createKpiValue(null, "computed"),
    arr: createKpiValue(null, "computed"),
    mrr_growth_mom: createKpiValue(null, "computed"),
    churn: createKpiValue(null, "computed"),
    net_revenue: createKpiValue(null, "computed"),
    net_revenue_booked: createKpiValue(null, "computed"),
    failed_payment_rate: createKpiValue(null, "computed"),
    refund_rate: createKpiValue(null, "computed"),
    burn_rate: createKpiValue(null, "computed"),
    cash_balance: createKpiValue(null, "computed"),
    customers: createKpiValue(null, "computed"),
    runway_months: createKpiValue(null, "computed"),
  };
}

/**
 * Apply source priority to merge sheet and stripe KPIs.
 * Only values from the current run (sheet or stripe) are used; no fallback to existing snapshot values.
 *
 * Priority rules:
 * - mrr/arr -> Stripe (billing) if present, else Sheets
 * - net_revenue/refund_rate/failed_payment_rate -> Stripe then Sheets
 * - burn_rate/runway_months/cash_balance -> Sheets then Stripe
 * - churn -> Sheets then Stripe
 * - customers -> Stripe then Sheets
 *
 * Returns merged KPIs and source metadata.
 */
export function applySourcePriority(
  existingKpis: any,
  sheetKpis: Record<string, number | null> | null,
  stripeKpis: Record<string, number | null> | null,
  stripeMethod: "billing" | "payments" | null,
  nowIso: string
): {
  mergedKpis: KpiSnapshotKpis;
  kpiSources: Record<string, KpiSource>;
} {
  const now = nowIso || new Date().toISOString();
  const result: Partial<KpiSnapshotKpis> = {};
  const kpiSources: Record<string, KpiSource> = {};

  // Only new data from this run: do not initialize from existing snapshots
  for (const key of KPI_KEYS) {
    result[key] = createKpiValue(null, "computed");
  }

  // Apply source priority per KPI (sheet and stripe only; no fallback to existing)
  for (const key of KPI_KEYS) {
    const sheetValue = sheetKpis?.[key] ?? null;
    const stripeValue = stripeKpis?.[key] ?? null;

    let finalValue: number | null = null;
    let finalSource: KpiSource = "computed";
    let finalUpdatedAt: string | null = null;

    if (key === "mrr" || key === "arr") {
      if (stripeValue !== null && stripeMethod === "billing") {
        finalValue = stripeValue;
        finalSource = "stripe";
        finalUpdatedAt = now;
      } else if (sheetValue !== null) {
        finalValue = sheetValue;
        finalSource = "sheet";
        finalUpdatedAt = now;
      }
    } else if (key === "net_revenue" || key === "net_revenue_booked" || key === "refund_rate" || key === "failed_payment_rate") {
      if (stripeValue !== null) {
        finalValue = stripeValue;
        finalSource = "stripe";
        finalUpdatedAt = now;
      } else if (sheetValue !== null) {
        finalValue = sheetValue;
        finalSource = "sheet";
        finalUpdatedAt = now;
      }
    } else if (key === "burn_rate" || key === "cash_balance" || key === "runway_months") {
      if (sheetValue !== null) {
        finalValue = sheetValue;
        finalSource = "sheet";
        finalUpdatedAt = now;
      } else if (stripeValue !== null) {
        finalValue = stripeValue;
        finalSource = "stripe";
        finalUpdatedAt = now;
      }
    } else if (key === "churn") {
      if (sheetValue !== null) {
        finalValue = sheetValue;
        finalSource = "sheet";
        finalUpdatedAt = now;
      } else if (stripeValue !== null) {
        finalValue = stripeValue;
        finalSource = "stripe";
        finalUpdatedAt = now;
      }
    } else if (key === "customers") {
      if (stripeValue !== null) {
        finalValue = stripeValue;
        finalSource = "stripe";
        finalUpdatedAt = now;
      } else if (sheetValue !== null) {
        finalValue = sheetValue;
        finalSource = "sheet";
        finalUpdatedAt = now;
      }
    } else {
      if (sheetValue !== null) {
        finalValue = sheetValue;
        finalSource = "sheet";
        finalUpdatedAt = now;
      } else if (stripeValue !== null) {
        finalValue = stripeValue;
        finalSource = "stripe";
        finalUpdatedAt = now;
      }
    }

    result[key] = createKpiValue(finalValue, finalSource, finalUpdatedAt);
    if (finalValue !== null) {
      kpiSources[key] = finalSource;
    }
  }

  return {
    mergedKpis: result as KpiSnapshotKpis,
    kpiSources,
  };
}

/**
 * Check if a snapshot is valid (has at least one key KPI)
 */
function isValidSnapshotByKpis(kpis: unknown): boolean {
  if (!kpis || typeof kpis !== "object" || kpis === null) {
    return false;
  }

  const kpisObj = kpis as Record<string, unknown>;
  const mrr = extractKpiValue(kpisObj.mrr);
  const netRevenue = extractKpiValue(kpisObj.net_revenue);
  const burnRate = extractKpiValue(kpisObj.burn_rate);
  const cashBalance = extractKpiValue(kpisObj.cash_balance);
  const customers = extractKpiValue(kpisObj.customers);

  return (
    mrr !== null ||
    netRevenue !== null ||
    burnRate !== null ||
    cashBalance !== null ||
    customers !== null
  );
}

/**
 * Get the latest valid snapshot for a company
 * A snapshot is valid if at least one of mrr, net_revenue, burn_rate, cash_balance, or customers is non-null
 */
export async function getLatestValidSnapshot(companyId: string): Promise<{
  found: {
    period_date: string;
    kpis: Record<string, unknown>;
    created_at: string | null;
    effective_date: string | null;
  } | null;
  scannedCount: number;
}> {
  // Fetch all snapshots ordered by period_date descending (newest first)
  const { data, error } = await supabase
    .from("kpi_snapshots")
    .select("period_date, kpis, created_at, effective_date")
    .eq("company_id", companyId)
    .order("period_date", { ascending: false });

  if (error) {
    throw error;
  }

  const snapshots = data || [];
  let scannedCount = 0;

  // Find the first valid snapshot
  for (const snapshot of snapshots) {
    scannedCount++;
    if (isValidSnapshotByKpis(snapshot.kpis)) {
      return {
        found: {
          period_date: snapshot.period_date,
          kpis: snapshot.kpis as Record<string, unknown>,
          created_at: snapshot.created_at,
          effective_date: snapshot.effective_date,
        },
        scannedCount,
      };
    }
  }

  // No valid snapshot found
  return {
    found: null,
    scannedCount,
  };
}
