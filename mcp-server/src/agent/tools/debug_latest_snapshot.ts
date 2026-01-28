import { z } from "zod";
import { getLatestValidSnapshot, extractKpiValue, extractKpiSource } from "../../utils/kpi_snapshots";

const InputSchema = z.object({
  companyId: z.string().uuid(),
});

type KpiSummary = {
  value: number | null;
  source: string | null;
  updated_at: string | null;
};

function readKpiSummary(kpis: Record<string, unknown> | null, key: string): KpiSummary {
  if (!kpis || typeof kpis !== "object") {
    return { value: null, source: null, updated_at: null };
  }
  const raw = kpis[key];
  
  // Use shared utilities for consistency (handles both old flat format and new nested format)
  const value = extractKpiValue(raw);
  const source = extractKpiSource(raw);
  
  // Extract updated_at if present (new format only)
  let updated_at: string | null = null;
  if (raw && typeof raw === "object" && raw !== null && "updated_at" in raw) {
    const obj = raw as Record<string, unknown>;
    updated_at = typeof obj.updated_at === "string" ? obj.updated_at : null;
  }
  
  return { value, source, updated_at };
}

export async function debugLatestSnapshot(input: unknown) {
  const parsed = InputSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return { ok: false, error: "Invalid input", issues: parsed.error.format() };
  }

  const { companyId } = parsed.data;

  const { found, scannedCount } = await getLatestValidSnapshot(companyId);

  if (!found) {
    return {
      ok: true,
      companyId,
      latestPeriodDate: null,
      message: `No valid snapshots found (scanned ${scannedCount})`,
      latestKpis: {
        mrr: { value: null, source: null, updated_at: null },
        burn_rate: { value: null, source: null, updated_at: null },
        runway_months: { value: null, source: null, updated_at: null },
        churn: { value: null, source: null, updated_at: null },
        mrr_growth_mom: { value: null, source: null, updated_at: null },
      },
      hasKpisKeys: [],
      recentSnapshots: [],
    };
  }

  const latestKpis = found.kpis;

  return {
    ok: true,
    companyId,
    latestPeriodDate: found.period_date,
    message: `Picked latest VALID snapshot (scanned ${scannedCount})`,
    latestKpis: {
      mrr: readKpiSummary(latestKpis, "mrr"),
      burn_rate: readKpiSummary(latestKpis, "burn_rate"),
      runway_months: readKpiSummary(latestKpis, "runway_months"),
      churn: readKpiSummary(latestKpis, "churn"),
      mrr_growth_mom: readKpiSummary(latestKpis, "mrr_growth_mom"),
    },
    hasKpisKeys: latestKpis && typeof latestKpis === "object"
      ? Object.keys(latestKpis).slice(0, 30)
      : [],
    recentSnapshots: [{
      period_date: found.period_date,
      created_at: found.created_at,
      effective_date: found.effective_date,
    }],
  };
}
