// mcp-server/src/agent/tools/generate_insights.ts
import { supabase } from "../../db/supabase";
import { getOpenAI } from "../../llm/openai";
import { env } from "../../env";

// Demo fallback (kun hvis LLM_PROVIDER ikke er "openai")
const DEMO_INSIGHTS = [
  "VALYXO: Revenue is trending up compared to last period.",
  "VALYXO: Churn looks stable, keep monitoring.",
  "VALYXO: Consider improving conversion to increase MRR.",
];
console.log("[generateInsights] DEPLOY_SIGNATURE=LLM_V1_2026-01-05");
console.log("[generateInsights] LLM_PROVIDER env =", env.LLM_PROVIDER);
console.log("[generateInsights] process.env.LLM_PROVIDER =", process.env.LLM_PROVIDER);
console.log("[generateInsights] hasOpenAIKey =", Boolean(process.env.OPENAI_API_KEY));

export async function generateInsights(input: any) {
  const companyId = input?.companyId as string | undefined;

  if (!companyId) {
    return { ok: false, error: "Missing companyId" };
  }

  // 1) Hent KPI-er til prompten
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("mrr, churn, growth_percent, burn_rate, runway_months, arr")
    .eq("id", companyId)
    .single();

  if (companyError) throw companyError;
  if (!company) throw new Error("Company not found");

  let finalInsights: string[];

  // 2) Sjekk LLM_PROVIDER - hvis ikke "openai", bruk demo
  if (env.LLM_PROVIDER !== "openai") {
    console.log("[generateInsights] LLM_PROVIDER is not 'openai', using demo insights");
    finalInsights = DEMO_INSIGHTS;
  } else {
    // 3) Kjør OpenAI
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
If an insight does not start with "VALYXO:", the response is invalid.

Return ONLY the 3 insights as separate lines.
No bullets, no numbering.
`.trim();

    try {
      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Fixed: was "gpt-4.1-mini" (doesn't exist)
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
      });

      const raw = completion.choices?.[0]?.message?.content ?? "";

      // 4) Parse og verifiser: kun linjer som starter med VALYXO:
      const signedInsights = raw
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .filter((l) => l.startsWith("VALYXO:"))
        .slice(0, 3);

      // Hvis LLM ikke følger format → fallback til demo
      if (signedInsights.length !== 3) {
        console.warn(
          `[generateInsights] LLM output invalid. Expected 3 lines starting with "VALYXO:", got ${signedInsights.length}. Raw:\n${raw}`
        );
        finalInsights = DEMO_INSIGHTS;
      } else {
        finalInsights = signedInsights;
      }
    } catch (err) {
      console.error("[generateInsights] OpenAI error:", err);
      // Fallback til demo ved feil
      finalInsights = DEMO_INSIGHTS;
    }
  }

  // 5) Skriv til DB (bruk samme finalInsights for både DB og retur)
  const { error } = await supabase
    .from("companies")
    .update({
      latest_insights: finalInsights, // jsonb - samme liste som returneres
      last_agent_run_at: new Date().toISOString(),
      last_agent_run_by: "valyxo-agent",
    })
    .eq("id", companyId);

  if (error) throw error;

  // 6) Returner respons (samme liste som ble lagret)
  return {
    ok: true,
    companyId,
    insights: finalInsights, // Samme som ble lagret i DB
    savedToDb: true,
  };
}
