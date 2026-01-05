/// mcp-server/src/agent/tools/generate_insights.ts
import { supabase } from "../../db/supabase";
import { openai } from "../../llm/openai";
import { env } from "../../env";

// Demo fallback (kun hvis LLM_PROVIDER ikke er "openai" eller ved feil)
const DEMO_INSIGHTS = [
  "VALYXO: Revenue is trending up compared to last period.",
  "VALYXO: Churn looks stable, keep monitoring.",
  "VALYXO: Consider improving conversion to increase MRR.",
];

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

  const nowIso = new Date().toISOString();

  let finalInsights: string[] = [];
  let generatedBy: string = "valyxo-agent"; // default

  // 2) Sjekk LLM_PROVIDER - hvis ikke "openai", bruk demo
  if (env.LLM_PROVIDER !== "openai") {
    console.log("[generateInsights] LLM_PROVIDER is not 'openai', using demo insights");
    finalInsights = DEMO_INSIGHTS;
    generatedBy = "demo";
  } else {
    generatedBy = "openai";

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
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
      });

      const raw = completion.choices?.[0]?.message?.content ?? "";

      // 3) Parse ROBUST: splitt på "VALYXO:" og bygg tilbake
      // (fanger både linjer, bullets, nummerering osv.)
      const signedInsights = raw
        .split("VALYXO:")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => `VALYXO: ${s.replace(/^[:\-\s]+/, "")}`) // fjerner ": -  " i starten
        .slice(0, 3);

      // Hvis ikke eksakt 3 → fallback
      if (signedInsights.length !== 3) {
        console.warn(
          `[generateInsights] Invalid LLM output. Expected 3 VALYXO insights. Got ${signedInsights.length}. Raw:\n${raw}`
        );
        finalInsights = DEMO_INSIGHTS;
        generatedBy = "demo_fallback_invalid_format";
      } else {
        finalInsights = signedInsights;
      }
    } catch (err) {
      console.error("[generateInsights] OpenAI error:", err);
      finalInsights = DEMO_INSIGHTS;
      generatedBy = "demo_fallback_openai_error";
    }
  }

  console.log("[generateInsights] writing generated_by/at", {
    companyId,
    generatedBy,
    generatedAt: nowIso,
  });

  // 4) Skriv til DB (HER er fiksen)
  const { error: updateError } = await supabase
    .from("companies")
    .update({
      latest_insights: finalInsights,
      latest_insights_generated_at: nowIso,
      latest_insights_generated_by: generatedBy,

      last_agent_run_at: nowIso,
      last_agent_run_by: "valyxo-agent",
    })
    .eq("id", companyId);

  if (updateError) {
    console.error("[generateInsights] DB update error:", updateError);
    throw updateError;
  }

  // 5) Returner respons
  return {
    ok: true,
    companyId,
    insights: finalInsights,
    generatedAt: nowIso,
    generatedBy,
    savedToDb: true,
  };
}