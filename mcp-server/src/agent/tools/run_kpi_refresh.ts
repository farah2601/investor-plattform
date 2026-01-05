import { z } from "zod";
import { supabase } from "../../db/supabase";

const InputSchema = z.object({
  companyId: z.string().uuid(),
});

export async function runKpiRefresh(input: unknown) {
  const parsed = InputSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid input for run_kpi_refresh");
  }

  const { companyId } = parsed.data;

  // 🧠 Her kommer ekte KPI-jobb senere
  // For nå: placeholder KPI-verdier
  const kpis = {
    revenue: 123,
    mrr: 45,
    churn: 0.02,
    arr: null as number | null,
    burn_rate: null as number | null,
    runway_months: null as number | null,
    growth_percent: null as number | null,
  };

  const nowIso = new Date().toISOString();

  // Skriv KPI-felter til DB
  const { error: updateError } = await supabase
    .from("companies")
    .update({
      mrr: kpis.mrr,
      arr: kpis.arr,
      burn_rate: kpis.burn_rate,
      runway_months: kpis.runway_months,
      churn: kpis.churn,
      growth_percent: kpis.growth_percent,
      kpi_refreshed_at: nowIso,
      kpi_refreshed_by: "valyxo-agent",
    })
    .eq("id", companyId);

  if (updateError) {
    console.error("[runKpiRefresh] DB update error:", updateError);
    throw updateError;
  }

  return {
    ok: true,
    companyId,
    result: {
      refreshedAt: nowIso,
      kpis,
    },
  };
}