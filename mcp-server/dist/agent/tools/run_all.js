"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAll = runAll;
// mcp-server/src/agent/tools/run_all.ts
const supabase_1 = require("../../db/supabase");
const run_kpi_refresh_1 = require("./run_kpi_refresh");
const run_profile_refresh_1 = require("./run_profile_refresh");
const generate_insights_1 = require("./generate_insights");
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
    // b) generate_insights (deterministic - facts from kpi_snapshots)
    await logAgentStep({ companyId, step: "generate_insights", status: "START" });
    try {
        const insightsRes = await (0, generate_insights_1.generateInsights)({ companyId });
        await logAgentStep({ companyId, step: "generate_insights", status: "SUCCESS" });
        steps.push({ step: "generate_insights", ok: true, data: insightsRes });
    }
    catch (err) {
        await logAgentStep({ companyId, step: "generate_insights", status: "FAIL", error: err });
        steps.push({ step: "generate_insights", ok: false, error: String(err?.message ?? err) });
        return {
            ok: false,
            companyId,
            error: `generate_insights failed: ${String(err?.message ?? err)}`,
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
    // Extract insights from generate_insights step if available
    const insightsStep = steps.find((s) => s.step === "generate_insights");
    const insights = insightsStep?.ok && insightsStep?.data?.insights ? insightsStep.data.insights : [];
    // Ensure last_agent_run_at is updated (should already be done by run_insights_refresh, but ensure it)
    const nowIso = new Date().toISOString();
    await supabase_1.supabase
        .from("companies")
        .update({
        last_agent_run_at: nowIso,
        last_agent_run_by: "valyxo-agent",
    })
        .eq("id", companyId);
    return {
        ok: true,
        companyId,
        insights,
        steps,
        summary: {
            total: steps.length,
            successCount,
            failCount,
        },
    };
}
