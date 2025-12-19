// src/agent/tools/generate_insights.ts
import { supabase } from "../../db/supabase"; // <- bruk din eksisterende supabase-client import

export async function generateInsights(input: any) {
  const companyId = input?.companyId;
  if (!companyId) {
    return { ok: false, error: "Missing companyId" };
  }

  // 1) Lag insights (demo først)
  const insights = [
    "Revenue is trending up compared to last period.",
    "Churn looks stable, keep monitoring.",
    "Consider improving conversion to increase MRR.",
  ];

  // 2) Skriv til DB (companies.latest_insights + last_agent_run_*)
  const { error } = await supabase
    .from("companies")
    .update({
      latest_insights: insights, // jsonb
      last_agent_run_at: new Date().toISOString(),
      last_agent_run_by: "valyxo-agent",
    })
    .eq("id", companyId);

  if (error) {
    throw error;
  }

  // 3) Returner respons
  return {
    ok: true,
    companyId,
    insights,
    savedToDb: true,
  };
}