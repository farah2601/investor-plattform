"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runKpiRefresh = runKpiRefresh;
const zod_1 = require("zod");
const supabase_1 = require("../../db/supabase");
const InputSchema = zod_1.z.object({
    companyId: zod_1.z.string().uuid(),
});
async function runKpiRefresh(input) {
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
        arr: null,
        burn_rate: null,
        runway_months: null,
        growth_percent: null,
    };
    const nowIso = new Date().toISOString();
    const agentBy = "valyxo-agent";
    // Skriv KPI-felter til DB (bruk eksisterende last_agent_run_at/by kolonner)
    const { error: updateError } = await supabase_1.supabase
        .from("companies")
        .update({
        mrr: kpis.mrr,
        arr: kpis.arr,
        burn_rate: kpis.burn_rate,
        runway_months: kpis.runway_months,
        churn: kpis.churn,
        growth_percent: kpis.growth_percent,
        last_agent_run_at: nowIso,
        last_agent_run_by: agentBy,
    })
        .eq("id", companyId);
    if (updateError) {
        console.error("[runKpiRefresh] DB update error:", updateError);
        throw updateError;
    }
    return {
        ok: true,
        companyId,
        updated: {
            mrr: kpis.mrr,
            arr: kpis.arr,
            burn_rate: kpis.burn_rate,
            runway_months: kpis.runway_months,
            churn: kpis.churn,
            growth_percent: kpis.growth_percent,
        },
        last_agent_run_at: nowIso,
        last_agent_run_by: agentBy,
    };
}
