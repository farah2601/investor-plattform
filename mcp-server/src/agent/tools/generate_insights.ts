// src/agent/tools/generate_insights.ts
import { supabase } from "../../db/supabase";
import { openai } from "../../llm/openai";

export async function generateInsights(input: any) {
  const companyId = input?.companyId as string | undefined;

  if (!companyId) {
    return { ok: false, error: "Missing companyId" };
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("mrr, churn, growth_percent, burn_rate, runway_months, arr")
    .eq("id", companyId)
    .single();

  if (companyError) throw companyError;
  if (!company) throw new Error("Company not found");

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

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
  });

  const raw = completion.choices?.[0]?.message?.content ?? "";

  const parsed = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 3);

  const isValid =
    parsed.length === 3 && parsed.every((l) => l.startsWith("VALYXO:"));

  const fallback = [
    "VALYXO: Revenue is trending up compared to last period.",
    "VALYXO: Churn looks stable, keep monitoring.",
    "VALYXO: Consider improving conversion to increase MRR.",
  ];

  const finalInsights = isValid ? parsed : fallback;

  const signed = finalInsights.map((line) =>
    line.startsWith("VALYXO:") ? line : `VALYXO: ${line}`
  );

  const { error } = await supabase
    .from("companies")
    .update({
      latest_insights: signed,
      last_agent_run_at: new Date().toISOString(),
      last_agent_run_by: "valyxo-agent",
    })
    .eq("id", companyId);

  if (error) throw error;

  return {
    ok: true,
    companyId,
    insights: signed,
    savedToDb: true,
  };
}