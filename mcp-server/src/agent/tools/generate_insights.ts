// mcp-server/src/agent/tools/generate_insights.ts
import { supabase } from "../../db/supabase";
import { extractKpiValue } from "../../utils/kpi_snapshots";

type KPIMap = Record<string, unknown>;

type SnapshotRow = {
  period_date: string; // YYYY-MM-DD
  kpis: KPIMap;        // jsonb (nested { value, source, updated_at } or flat number)
};

const PREFIX = "VALYXO:";

function fmt(v: number | null, digits = 0): string {
  if (v === null) return "n/a";
  return digits > 0 ? v.toFixed(digits) : String(v);
}

function getKpi(kpis: KPIMap, key: string): number | null {
  return extractKpiValue(kpis?.[key]);
}

function trend(values: Array<number | null>): "up" | "down" | "flat" | "unknown" {
  const xs = values.filter((v): v is number => typeof v === "number");
  if (xs.length < 2) return "unknown";
  const first = xs[0];
  const last = xs[xs.length - 1];
  if (last > first) return "up";
  if (last < first) return "down";
  return "flat";
}

function buildDeterministicInsights(
  latestKpis: KPIMap,
  history: Array<{ date: string; kpis: KPIMap }>
): string[] {
  const bullets: string[] = [];

  // Stable series from history (always same order)
  const mrrSeries = history.map(h => getKpi(h.kpis, "mrr"));
  const burnSeries = history.map(h => getKpi(h.kpis, "burn_rate"));
  const churnSeries = history.map(h => getKpi(h.kpis, "churn"));
  const runwaySeries = history.map(h => getKpi(h.kpis, "runway_months"));
  const growthSeries = history.map(h => getKpi(h.kpis, "growth_percent") ?? getKpi(h.kpis, "mrr_growth_mom"));

  const mrr = getKpi(latestKpis, "mrr");
  const burn = getKpi(latestKpis, "burn_rate");
  const churn = getKpi(latestKpis, "churn");
  const runway = getKpi(latestKpis, "runway_months");
  const growth = getKpi(latestKpis, "growth_percent") ?? getKpi(latestKpis, "mrr_growth_mom");
  const arr = getKpi(latestKpis, "arr");

  // 1) MRR trend
  const mrrT = trend(mrrSeries);
  if (mrr !== null) {
    if (mrrT === "up") bullets.push(`${PREFIX} MRR is trending up; latest is ${fmt(mrr)}.`);
    else if (mrrT === "down") bullets.push(`${PREFIX} MRR is trending down; latest is ${fmt(mrr)}.`);
    else if (mrrT === "flat") bullets.push(`${PREFIX} MRR looks flat; latest is ${fmt(mrr)}.`);
    else bullets.push(`${PREFIX} Latest MRR is ${fmt(mrr)}.`);
  } else {
    bullets.push(`${PREFIX} MRR is not available in the latest snapshot.`);
  }

  // 2) Burn + runway sanity
  const burnT = trend(burnSeries);
  if (burn !== null) {
    if (burnT === "up") bullets.push(`${PREFIX} Burn rate is increasing; latest is ${fmt(burn)}.`);
    else if (burnT === "down") bullets.push(`${PREFIX} Burn rate is decreasing; latest is ${fmt(burn)}.`);
    else if (burnT === "flat") bullets.push(`${PREFIX} Burn rate looks stable; latest is ${fmt(burn)}.`);
    else bullets.push(`${PREFIX} Latest burn rate is ${fmt(burn)}.`);
  } else {
    bullets.push(`${PREFIX} Burn rate is not available in the latest snapshot.`);
  }

  if (runway !== null) {
    if (runway < 6) bullets.push(`${PREFIX} Runway is short (${fmt(runway, 1)} months); prioritize extending runway.`);
    else if (runway < 12) bullets.push(`${PREFIX} Runway is moderate (${fmt(runway, 1)} months); keep a close eye on burn.`);
    else bullets.push(`${PREFIX} Runway is healthy (${fmt(runway, 1)} months) at current burn.`);
  } else {
    bullets.push(`${PREFIX} Runway is not available in the latest snapshot.`);
  }

  // 3) Churn threshold
  if (churn !== null) {
    const churnPct = churn * 100;
    if (churnPct >= 5) bullets.push(`${PREFIX} Churn is high (${fmt(churnPct, 1)}%); retention should be a focus.`);
    else if (churnPct >= 2) bullets.push(`${PREFIX} Churn is moderate (${fmt(churnPct, 1)}%); continue retention improvements.`);
    else bullets.push(`${PREFIX} Churn is low (${fmt(churnPct, 1)}%); retention looks strong.`);
  } else {
    bullets.push(`${PREFIX} Churn is not available in the latest snapshot.`);
  }

  // 4) Growth
  const gT = trend(growthSeries);
  if (growth !== null) {
    if (gT === "up") bullets.push(`${PREFIX} Growth is improving; latest is ${fmt(growth, 1)}%.`);
    else if (gT === "down") bullets.push(`${PREFIX} Growth is slowing; latest is ${fmt(growth, 1)}%.`);
    else if (gT === "flat") bullets.push(`${PREFIX} Growth is stable; latest is ${fmt(growth, 1)}%.`);
    else bullets.push(`${PREFIX} Latest growth is ${fmt(growth, 1)}%.`);
  } else {
    bullets.push(`${PREFIX} Growth is not available in the latest snapshot.`);
  }

  // Optional: ARR mention (if present)
  if (arr !== null) {
    bullets.push(`${PREFIX} ARR is ${fmt(arr)} based on the latest snapshot.`);
  }

  // Keep it 3–7 bullets stable
  return bullets.slice(0, 7);
}

export async function generateInsights(input: any) {
  const companyId = input?.companyId as string | undefined;
  if (!companyId) return { ok: false, error: "Missing companyId" };

  // 1) SOURCE OF TRUTH: kpi_snapshots
  const { data: snapshots, error: snapErr } = await supabase
    .from("kpi_snapshots")
    .select("period_date, kpis")
    .eq("company_id", companyId)
    .order("period_date", { ascending: true })
    .limit(12);

  if (snapErr) throw snapErr;

  const rows = (snapshots ?? []) as SnapshotRow[];
  if (!rows.length) {
    // store empty insights (optional)
    await supabase
      .from("companies")
      .update({
        latest_insights: [],
        latest_insights_generated_by: "deterministic",
        latest_insights_generated_at: new Date().toISOString(),
        based_on_snapshot_date: null,
        last_agent_run_at: new Date().toISOString(),
        last_agent_run_by: "valyxo-agent",
      
      })
      .eq("id", companyId);

    return { ok: true, companyId, insights: [], based_on_snapshot_date: null };
  }

  const latest = rows[rows.length - 1];
  const latestKpis = latest.kpis || {};
  const history = rows.map(r => ({ date: r.period_date, kpis: r.kpis || {} }));

  // 2) Deterministic insights
  const bullets = buildDeterministicInsights(latestKpis, history);

  const nowIso = new Date().toISOString();

  // 3) Save for fast UI
  const { data: updated, error: updateError } = await supabase
  .from("companies")
  .update({
    latest_insights: bullets,
    latest_insights_generated_by: "deterministic",
    latest_insights_generated_at: nowIso,
    based_on_snapshot_date: latest.period_date, // må være "YYYY-MM-DD"
    last_agent_run_at: nowIso,
    last_agent_run_by: "valyxo-agent",
  })
  .eq("id", companyId)
  .select("based_on_snapshot_date")
  .single();

if (updateError) throw updateError;

console.log("[generate_insights] saved based_on_snapshot_date =", updated?.based_on_snapshot_date);

  return {
    ok: true,
    companyId,
    insights: bullets,
    generatedAt: nowIso,
    generatedBy: "deterministic",
    based_on_snapshot_date: latest.period_date,
    savedToDb: true,
  };
}