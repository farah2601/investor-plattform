/**
 * KPI Snapshot utilities for MCP
 * 
 * Handles merging, computing derived metrics, and snapshot operations.
 */

import { supabase } from "../db/supabase";

type KpiSource = "stripe" | "sheet" | "manual" | "computed";

type KpiValue = {
  value: number | null;
  source: KpiSource;
  updated_at: string | null;
};

export type KpiSnapshotKpis = {
  mrr: KpiValue;
  arr: KpiValue;
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
  updated_at: string | null = null
): KpiValue {
  return {
    value,
    source,
    updated_at: updated_at || (value !== null ? new Date().toISOString() : null),
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
 * Compute derived metrics from base metrics
 * 
 * Takes numeric values (not KpiValue objects) and returns computed KpiValue objects.
 */
export function computeDerivedMetrics(
  mrr: number | null,
  burnRate: number | null,
  cashBalance: number | null,
  previousMonthMrr: number | null
): {
  arr: KpiValue;
  mrr_growth_mom: KpiValue;
  runway_months: KpiValue;
} {
  const now = new Date().toISOString();

  // ARR = MRR * 12 (run-rate)
  const arrValue = mrr !== null ? mrr * 12 : null;
  const arr = createKpiValue(arrValue, "computed", arrValue !== null ? now : null);

  // MRR Growth MoM
  let mrrGrowthValue: number | null = null;
  if (mrr !== null && previousMonthMrr !== null && previousMonthMrr > 0) {
    mrrGrowthValue = ((mrr - previousMonthMrr) / previousMonthMrr) * 100;
  }
  const mrr_growth_mom = createKpiValue(
    mrrGrowthValue,
    "computed",
    mrrGrowthValue !== null ? now : null
  );

  // Runway months = cash_balance / burn_rate
  let runwayValue: number | null = null;
  if (cashBalance !== null && burnRate !== null && burnRate > 0) {
    runwayValue = cashBalance / burnRate;
  }
  const runway_months = createKpiValue(
    runwayValue,
    "computed",
    runwayValue !== null ? now : null
  );

  return {
    arr,
    mrr_growth_mom,
    runway_months,
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
