// mcp-server/src/agent/tools/run_all.ts
import { supabase } from "../../db/supabase";
import { runKpiRefresh } from "./run_kpi_refresh";
import { runInsightsRefresh } from "./run_insights_refresh";
import { runProfileRefresh } from "./run_profile_refresh";

type StepStatus = "START" | "SUCCESS" | "FAIL";

async function logAgentStep(params: {
  companyId: string;
  step: string;
  status: StepStatus;
  error?: unknown;
}) {
  const { companyId, step, status, error } = params;

  await supabase.from("agent_logs").insert([
    {
      company_id: companyId,
      step,
      status,
      error: error ? String((error as any)?.message ?? error) : null,
    },
  ]);
}

export async function runAll(companyId: string) {
  if (!companyId) return { ok: false, error: "Missing companyId" };

  const steps: Array<{ step: string; ok: boolean; data?: any; error?: string }> = [];

  // a) run_kpi_refresh
  await logAgentStep({ companyId, step: "run_kpi_refresh", status: "START" });
  try {
    const kpiRes = await runKpiRefresh({ companyId });
    await logAgentStep({ companyId, step: "run_kpi_refresh", status: "SUCCESS" });
    steps.push({ step: "run_kpi_refresh", ok: true, data: kpiRes });
  } catch (err: any) {
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
    const insightsRes = await runInsightsRefresh({ companyId });
    await logAgentStep({ companyId, step: "run_insights_refresh", status: "SUCCESS" });
    steps.push({ step: "run_insights_refresh", ok: true, data: insightsRes });
  } catch (err: any) {
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
    const profileRes = await runProfileRefresh({ companyId });
    await logAgentStep({ companyId, step: "run_profile_refresh", status: "SUCCESS" });
    steps.push({ step: "run_profile_refresh", ok: true, data: profileRes });
  } catch (err: any) {
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