"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAll = runAll;
// mcp-server/src/agent/tools/run_all.ts
const supabase_1 = require("../../db/supabase");
const run_kpi_refresh_1 = require("./run_kpi_refresh");
const run_insights_refresh_1 = require("./run_insights_refresh");
const run_profile_refresh_1 = require("./run_profile_refresh");
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
    const steps = [];
    // a) run_kpi_refresh
    await logAgentStep({ companyId, step: "run_kpi_refresh", status: "START" });
    try {
        const kpiRes = await (0, run_kpi_refresh_1.runKpiRefresh)({ companyId });
        await logAgentStep({ companyId, step: "run_kpi_refresh", status: "SUCCESS" });
        steps.push({ step: "run_kpi_refresh", ok: true, data: kpiRes });
    }
    catch (err) {
        await logAgentStep({ companyId, step: "run_kpi_refresh", status: "FAIL", error: err });
        steps.push({ step: "run_kpi_refresh", ok: false, error: String(err?.message ?? err) });
        return {
            ok: false,
            companyId,
            error: `run_kpi_refresh failed: ${String(err?.message ?? err)}`,
            steps,
        };
    }
    // b) run_insights_refresh
    await logAgentStep({ companyId, step: "run_insights_refresh", status: "START" });
    try {
        const insightsRes = await (0, run_insights_refresh_1.runInsightsRefresh)({ companyId });
        await logAgentStep({ companyId, step: "run_insights_refresh", status: "SUCCESS" });
        steps.push({ step: "run_insights_refresh", ok: true, data: insightsRes });
    }
    catch (err) {
        await logAgentStep({ companyId, step: "run_insights_refresh", status: "FAIL", error: err });
        steps.push({ step: "run_insights_refresh", ok: false, error: String(err?.message ?? err) });
        return {
            ok: false,
            companyId,
            error: `run_insights_refresh failed: ${String(err?.message ?? err)}`,
            steps,
        };
    }
    // c) run_profile_refresh
    await logAgentStep({ companyId, step: "run_profile_refresh", status: "START" });
    try {
        const profileRes = await (0, run_profile_refresh_1.runProfileRefresh)({ companyId });
        await logAgentStep({ companyId, step: "run_profile_refresh", status: "SUCCESS" });
        steps.push({ step: "run_profile_refresh", ok: true, data: profileRes });
    }
    catch (err) {
        await logAgentStep({ companyId, step: "run_profile_refresh", status: "FAIL", error: err });
        steps.push({ step: "run_profile_refresh", ok: false, error: String(err?.message ?? err) });
        return {
            ok: false,
            companyId,
            error: `run_profile_refresh failed: ${String(err?.message ?? err)}`,
            steps,
        };
    }
    // Summary
    const successCount = steps.filter((s) => s.ok).length;
    const failCount = steps.filter((s) => !s.ok).length;
    return {
        ok: true,
        companyId,
        steps,
        summary: {
            total: steps.length,
            successCount,
            failCount,
        },
    };
}
