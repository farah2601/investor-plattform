// mcp-server/src/agent/tools/generate_insights.ts
import { supabase } from "../../db/supabase";
import { openai } from "../../llm/openai";
import { env } from "../../env";

const DEPLOY_SIGNATURE = "LLM_V1_2026-01-05";

// Demo fallback (ALLTID signert)
const DEMO_INSIGHTS = [
  "VALYXO: Revenue is trending up compared to last period.",
  "VALYXO: Churn looks stable, keep monitoring.",
  "VALYXO: Consider improving conversion to increase MRR.",
];

function ensureSigned(lines: string[]) {
  return lines.map((l) => (l.startsWith("VALYXO:") ? l : `VALYXO: ${l}`));
}

export async function generateInsights(input: any) {
  const companyId = input?.companyId as string | undefined;
  if (!companyId) return { ok: false, error: "Missing companyId" };

  console.log("[generateInsights] DEPLOY_SIGNATURE=", DEPLOY_SIGNATURE);
  console.log("[generateInsights] LLM_PROVIDER env =", env.LLM_PROVIDER);
  console.log("[generateInsights] process.env.LLM_PROVIDER =", process.env.LLM_PROVIDER);
  console.log("[generateInsights] hasOpenAIKey =", Boolean(process.env.OPENAI_API_KEY));

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("mrr, churn, growth_percent, burn_rate, runway_months, arr")
    .eq("id", companyId)
    .single();

  if (companyError) throw companyError;
  if (!company) throw new Error("Company not found");

  let finalInsights: string[] = DEMO_INSIGHTS;

  if (env.LLM_PROVIDER === "openai") {
    const prompt = `
You are a startup analyst writing concise investor insights.

Company KPIs:
- MRR: ${company.mrr ?? "n/a"}
- ARR: ${company.arr ?? "n/a"}
- Burn rate: ${company.burn_rate ?? "n/a"}
- Runway months: ${company.runway_months ?? "n/a"}
- Churn: ${company.churn ?? "n/a"}
- Growth percent: ${company.growth_percent ?? "n/a"}

Task:
Generate exactly 3 short, clear insights.
Each insight must be one sentence.

IMPORTANT:
Each insight MUST start with the prefix "VALYXO:".
Return ONLY the 3 insights as separate lines.
No bullets, no numbering.
`.trim();

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
      });

      const raw = completion.choices?.[0]?.message?.content ?? "";
      console.log("[generateInsights] raw from OpenAI:\n", raw);

      // Ta alle linjer, trim, fjern tomme, ta 3 første
      const lines = raw
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 3);

      // Sørg for at alt blir signert uansett
      const signed = ensureSigned(lines);

      if (signed.length === 3) {
        finalInsights = signed;
      } else {
        console.warn("[generateInsights] Invalid LLM output, using DEMO_INSIGHTS");
        finalInsights = DEMO_INSIGHTS;
      }
    } catch (err) {
      console.error("[generateInsights] OpenAI error, using DEMO_INSIGHTS:", err);
      finalInsights = DEMO_INSIGHTS;
    }
  } else {
    console.log("[generateInsights] LLM_PROVIDER not openai, using DEMO_INSIGHTS");
    finalInsights = DEMO_INSIGHTS;
  }

  console.log("[generateInsights] finalInsights:", finalInsights);

  const { error } = await supabase
    .from("companies")
    .update({
      latest_insights: finalInsights,
      last_agent_run_at: new Date().toISOString(),
      last_agent_run_by: "valyxo-agent",
      latest_insights_generated_at: new Date().toISOString(),
      latest_insights_generated_by: env.LLM_PROVIDER === "openai" ? "openai" : "demo",
    })
    .eq("id", companyId);

  if (error) throw error;

  return {
    ok: true,
    companyId,
    insights: finalInsights,
    savedToDb: true,
  };
}