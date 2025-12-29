// mcp-server/src/agent/tools/run_profile_refresh.ts
import { supabase } from "../../db/supabase";

type StepStatus = "START" | "SUCCESS" | "FAIL";

async function logAgentStep(params: {
  companyId: string;
  step: string;
  status: StepStatus;
  error?: unknown;
}) {
  const { companyId, step, status, error } = params;

  // Viktig: kun felter som faktisk finnes i agent_logs.
  // (Unngå f.eks. actor="system" hvis actor er uuid-kolonne.)
  await supabase.from("agent_logs").insert([
    {
      company_id: companyId,
      step,
      status,
      error: error ? String((error as any)?.message ?? error) : null,
    },
  ]);
}

export async function runProfileRefresh(input: { companyId: string }) {
  const companyId = input?.companyId;
  if (!companyId) return { ok: false, error: "Missing companyId" };

  await logAgentStep({ companyId, step: "run_profile_refresh", status: "START" });

  try {
    // ✅ DEMO/PLACEHOLDER (IKKE LLM)
    const updatedFields = {
      problem: "Placeholder problem (replace with real generation later).",
      solution: "Placeholder solution (replace with real generation later).",
      why_now: "Placeholder why now (replace with real generation later).",
      market: "Placeholder market summary (replace with real generation later).",
      product_details: "Generated from sources: website=n/a linkedin=n/a",
    };

    const { error } = await supabase
      .from("companies")
      .update({
        ...updatedFields,
        last_agent_run_at: new Date().toISOString(),
        last_agent_run_by: "valyxo-agent",
      })
      .eq("id", companyId);

    if (error) throw error;

    await logAgentStep({ companyId, step: "run_profile_refresh", status: "SUCCESS" });

    return { ok: true, companyId, updatedFields };
  } catch (err) {
    await logAgentStep({
      companyId,
      step: "run_profile_refresh",
      status: "FAIL",
      error: err,
    });
    throw err;
  }
}