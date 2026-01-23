import { z } from "zod";
import { supabase } from "../../db/supabase";
import { loadSheetsKpisForCompany } from "../../sources/sheets";
import { loadStripeKpisForCompany } from "../../sources/stripe";
import {
  applySourcePriority,
  computeDerivedMetrics,
  extractKpiValue,
  type KpiSnapshotKpis,
} from "../../utils/kpi_snapshots";

const InputSchema = z.object({
  companyId: z.string().uuid(),
});

// Type definitions for meta objects
type SheetsMeta = {
  sheetId?: string;
  tab?: string;
  range?: string;
  detectedLayout?: string;
  parsedRows?: number;
  skippedRows?: number;
  mapping_used?: Record<string, string>;
};

type StripeMeta = {
  stripe_account_id?: string;
  mode?: "test" | "live";
  method?: "billing" | "payments";
  range?: {
    from: string;
    to: string;
  };
  notes?: string[];
};

type CompanyUpdates = {
  google_sheets_last_sync_at?: string;
  google_sheets_last_sync_by?: string;
};

/**
 * KPI Refresh: Fetches Google Sheets + Stripe data and writes to kpi_snapshots
 * 
 * This is the ONLY place that fetches and writes KPI data.
 * Next.js is just a gateway - all matching, source priority, and snapshot writing happens here.
 */
export async function runKpiRefresh(input: unknown) {
  const parsed = InputSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid input for run_kpi_refresh");
  }

  const { companyId } = parsed.data;

  // Load sheets KPIs for this company
  let sheetRows: Array<{
    source: "google_sheets";
    period_date: string;
    kpis: Record<string, number | null>;
    meta: SheetsMeta;
  }> = [];

  try {
    sheetRows = await loadSheetsKpisForCompany(companyId);
    console.log(`[runKpiRefresh] Loaded ${sheetRows.length} sheet rows for company ${companyId}`);
  } catch (sheetsError: unknown) {
    const errorMessage = sheetsError instanceof Error ? sheetsError.message : String(sheetsError);
    console.error(`[runKpiRefresh] Failed to load sheets for company ${companyId}:`, errorMessage);
    // If sheets fail, continue without sheets data (don't crash)
  }

  // Load Stripe KPIs for this company
  // Use period dates from sheets, or default to current month if no sheets
  const periodDates = sheetRows.length > 0
    ? sheetRows.map(r => r.period_date)
    : undefined; // Will default to current month in loadStripeKpisForCompany

  let stripeRows: Array<{
    source: "stripe";
    period_date: string;
    kpis: Partial<Record<string, number | null>>;
    meta: StripeMeta;
  }> = [];

  let stripeMethod: "billing" | "payments" | null = null;

  try {
    stripeRows = await loadStripeKpisForCompany(companyId, periodDates);
    if (stripeRows.length > 0) {
      stripeMethod = stripeRows[0].meta.method ?? null;
    }
    console.log(`[runKpiRefresh] Loaded ${stripeRows.length} stripe rows for company ${companyId}, method: ${stripeMethod}`);
  } catch (stripeError: unknown) {
    const errorMessage = stripeError instanceof Error ? stripeError.message : String(stripeError);
    console.error(`[runKpiRefresh] Failed to load stripe for company ${companyId}:`, errorMessage);
    // If stripe fails, continue without stripe data (don't crash)
  }

  // Collect all unique period dates from both sources
  const allPeriodDates = new Set<string>();
  for (const row of sheetRows) {
    allPeriodDates.add(row.period_date);
  }
  for (const row of stripeRows) {
    allPeriodDates.add(row.period_date);
  }

  if (allPeriodDates.size === 0) {
    console.log(`[runKpiRefresh] No periods to process for company ${companyId}`);
    return {
      ok: true,
      companyId,
      sheetsProcessed: 0,
      stripeProcessed: 0,
      snapshotsUpserted: 0,
      message: "No Google Sheets or Stripe data found",
    };
  }

  const nowIso = new Date().toISOString();
  const snapshotsToUpsert: Array<{
    company_id: string;
    period_date: string;
    kpis: KpiSnapshotKpis;
    effective_date: string;
  }> = [];

  // Process each period
  for (const periodDate of Array.from(allPeriodDates).sort()) {
    // Get sheet data for this period
    const sheetRow = sheetRows.find(r => r.period_date === periodDate);
    const sheetKpis = sheetRow?.kpis || null;

    // Get stripe data for this period
    const stripeRow = stripeRows.find(r => r.period_date === periodDate);
    const stripeKpis = stripeRow?.kpis || null;

    // Fetch existing snapshot for this period
    const { data: existingSnapshot } = await supabase
      .from("kpi_snapshots")
      .select("kpis")
      .eq("company_id", companyId)
      .eq("period_date", periodDate)
      .maybeSingle();

    // Type assertion: DB may return flat or nested format, but applySourcePriority handles both
    const existingKpis = (existingSnapshot?.kpis ?? null) as KpiSnapshotKpis | null;

    // Apply source priority to merge sheet and stripe KPIs
    // Convert Partial<Record> to Record by filling undefined with null
    const stripeKpisNormalized: Record<string, number | null> | null = stripeKpis
      ? Object.fromEntries(
          Object.entries(stripeKpis).map(([key, value]) => [key, value ?? null])
        )
      : null;

    const { mergedKpis } = applySourcePriority(
      existingKpis,
      sheetKpis,
      stripeKpisNormalized,
      stripeMethod,
      nowIso
    );

    // Get previous month's MRR for growth calculation
    const period = new Date(periodDate + "T00:00:00Z");
    const previousMonth = new Date(period);
    previousMonth.setUTCMonth(previousMonth.getUTCMonth() - 1);
    const previousPeriodDate = `${previousMonth.getUTCFullYear()}-${String(previousMonth.getUTCMonth() + 1).padStart(2, "0")}-01`;

    let previousMonthMrr: number | null = null;
    try {
      const { data: previousSnapshot } = await supabase
        .from("kpi_snapshots")
        .select("kpis")
        .eq("company_id", companyId)
        .eq("period_date", previousPeriodDate)
        .maybeSingle();

      if (previousSnapshot?.kpis) {
        previousMonthMrr = extractKpiValue(previousSnapshot.kpis.mrr);
      }
    } catch (err) {
      console.warn(`[runKpiRefresh] Could not fetch previous month MRR for ${periodDate}:`, err);
    }

    // Extract numeric values for computeDerivedMetrics (it expects numbers, not KpiValue objects)
    const mrrVal = extractKpiValue(mergedKpis.mrr);
    const burnVal = extractKpiValue(mergedKpis.burn_rate);
    const cashVal = extractKpiValue(mergedKpis.cash_balance);

    // Compute derived metrics (only if missing and never overwrite non-null source values)
    const computedMetrics = computeDerivedMetrics(
      mrrVal,
      burnVal,
      cashVal,
      previousMonthMrr
    );

    // Only set computed values if they're missing or from computed (not stripe/sheet/manual)
    if (mergedKpis.arr.value === null || mergedKpis.arr.source === "computed") {
      mergedKpis.arr = computedMetrics.arr;
    }
    if (mergedKpis.mrr_growth_mom.value === null || mergedKpis.mrr_growth_mom.source === "computed") {
      mergedKpis.mrr_growth_mom = computedMetrics.mrr_growth_mom;
    }
    if (mergedKpis.runway_months.value === null || mergedKpis.runway_months.source === "computed") {
      mergedKpis.runway_months = computedMetrics.runway_months;
    }

    snapshotsToUpsert.push({
      company_id: companyId,
      period_date: periodDate,
      kpis: mergedKpis,
      effective_date: nowIso,
    });
  }

  // Upsert snapshots
  let upsertedCount = 0;
  if (snapshotsToUpsert.length > 0) {
    const { data: upsertedData, error: upsertError } = await supabase
      .from("kpi_snapshots")
      .upsert(snapshotsToUpsert, {
        onConflict: "company_id,period_date",
      })
      .select();

    if (upsertError) {
      console.error("[runKpiRefresh] Failed to upsert snapshots:", upsertError);
      throw new Error(`Failed to upsert snapshots: ${upsertError.message}`);
    }

    upsertedCount = upsertedData?.length || 0;
    console.log(`[runKpiRefresh] Upserted ${upsertedCount} snapshots for company ${companyId}`);
  }

  // Update companies sync metadata
  const updates: CompanyUpdates = {};
  if (sheetRows.length > 0) {
    updates.google_sheets_last_sync_at = nowIso;
    updates.google_sheets_last_sync_by = "mcp";
  }

  if (Object.keys(updates).length > 0) {
    await supabase
      .from("companies")
      .update(updates)
      .eq("id", companyId);
  }

  return {
    ok: true,
    companyId,
    sheetsProcessed: sheetRows.length,
    stripeProcessed: stripeRows.length,
    snapshotsUpserted: upsertedCount,
    message: `Processed ${sheetRows.length} sheet rows, ${stripeRows.length} stripe rows, and upserted ${upsertedCount} snapshots`,
  };
}
