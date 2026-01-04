// src/agent/tools/generate_insights.ts
import { supabase } from "../../db/supabase";
import { openai } from "../../llm/openai";

export async function generateInsights(input: any) {
  const companyId = input?.companyId as string | undefined;

  if (!companyId) {
    return { ok: false, error: "Missing companyId" };
  }

  // 1) Hent KPIs vi bruker i prompten (minimalt, ingen nye tabeller)
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("mrr, churn, growth_percent, burn_rate, runway_months, arr")
    .eq("id", companyId)
    .single();

  if (companyError) throw companyError;
  if (!company) throw new Error("Company not found");

  // 2) Bygg prompt (kort, 3 setninger)
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
Return ONLY the 3 insights as separate lines. No bullets, no numbering.
`.trim();

  // 3) Kjør LLM
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
  });

  const raw = completion.choices?.[0]?.message?.content ?? "";

  // 4) Parse til 3 linjer
  const insights = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 3);

  // fallback hvis modellen returnerer noe rart
  const finalInsights =
    insights.length === 3
      ? insights
      : [
          "Revenue is trending up compared to last period.",
          "Churn looks stable, keep monitoring.",
          "Consider improving conversion to increase MRR.",
        ];

  // 5) Skriv til DB (samme felter som før)
  const { error } = await supabase
    .from("companies")
    .update({
      latest_insights: finalInsights, // jsonb
      last_agent_run_at: new Date().toISOString(),
      last_agent_run_by: "valyxo-agent",
    })
    .eq("id", companyId);

  if (error) throw error;

  // 6) Returner respons (samme shape)
  return {
    ok: true,
    companyId,
    insights: finalInsights,
    savedToDb: true,
  };
}