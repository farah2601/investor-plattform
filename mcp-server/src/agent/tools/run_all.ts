// mcp-server/src/agent/run_all.ts
import { supabase } from "../../db/supabase";
import { runKpiRefresh } from "../tools/run_kpi_refresh";
import { generateInsights } from "../tools/generate_insights";
import { runProfileRefresh } from "../tools/run_profile_refresh";

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

  // 1) KPI
  await logAgentStep({ companyId, step: "run_kpi_refresh", status: "START" });
  try {
    const kpiRes = await runKpiRefresh({ companyId });
    await logAgentStep({ companyId, step: "run_kpi_refresh", status: "SUCCESS" });

    // 2) Insights
    await logAgentStep({ companyId, step: "generate_insights", status: "START" });
    const insightsRes = await generateInsights({ companyId });
    await logAgentStep({ companyId, step: "generate_insights", status: "SUCCESS" });

    // 3) Profile
    await logAgentStep({ companyId, step: "run_profile_refresh", status: "START" });
    const profileRes = await runProfileRefresh({ companyId });
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
  } catch (err) {
    // ⚠️ Stopper på første feil (som kravene sier).
    // Vi logger FAIL på riktig steg der feilen oppstår inne i try-blokken over.
    // Men hvis feilen skjer mellom steg, logges her:
    await logAgentStep({ companyId, step: "run_all", status: "FAIL", error: err });

    return {
      ok: false,
      companyId,
      error: String((err as any)?.message ?? err),
    };
  }
}