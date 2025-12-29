"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAll = runAll;
// mcp-server/src/agent/run_all.ts
const supabase_1 = require("../../db/supabase");
const run_kpi_refresh_1 = require("../tools/run_kpi_refresh");
const generate_insights_1 = require("../tools/generate_insights");
const run_profile_refresh_1 = require("../tools/run_profile_refresh");
async function logAgentStep(params) {
    const { companyId, step, status, error } = params;
    await supabase_1.supabase.from("agent_logs").insert([
        {
            company_id: companyId,
            step,
            status,
            error: error ? String(error?.message ?? error) : null,
        },
    ]);
}
async function runAll(companyId) {
    if (!companyId)
        return { ok: false, error: "Missing companyId" };
    // 1) KPI
    await logAgentStep({ companyId, step: "run_kpi_refresh", status: "START" });
    try {
        const kpiRes = await (0, run_kpi_refresh_1.runKpiRefresh)({ companyId });
        await logAgentStep({ companyId, step: "run_kpi_refresh", status: "SUCCESS" });
        // 2) Insights
        await logAgentStep({ companyId, step: "generate_insights", status: "START" });
        const insightsRes = await (0, generate_insights_1.generateInsights)({ companyId });
        await logAgentStep({ companyId, step: "generate_insights", status: "SUCCESS" });
        // 3) Profile
        await logAgentStep({ companyId, step: "run_profile_refresh", status: "START" });
        const profileRes = await (0, run_profile_refresh_1.runProfileRefresh)({ companyId });
        await logAgentStep({ companyId, step: "run_profile_refresh", status: "SUCCESS" });
        return {
            ok: true,
            companyId,
            steps: [
                { step: "run_kpi_refresh", ok: true, data: kpiRes },
                { step: "generate_insights", ok: true, data: insightsRes },
                { step: "run_profile_refresh", ok: true, data: profileRes },
            ],
        };
    }
    catch (err) {
        // ⚠️ Stopper på første feil (som kravene sier).
        // Vi logger FAIL på riktig steg der feilen oppstår inne i try-blokken over.
        // Men hvis feilen skjer mellom steg, logges her:
        await logAgentStep({ companyId, step: "run_all", status: "FAIL", error: err });
        return {
            ok: false,
            companyId,
            error: String(err?.message ?? err),
        };
    }
}
