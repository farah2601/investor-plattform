// mcp-server/src/agent/tools/run_insights_refresh.ts

import { supabase } from "../../db/supabase";
import { env } from "../../env";
import { openai } from "../../llm/openai";
import { generateInsights } from "./generate_insights";

const PREFIX = "VALYXO:";

function ensurePrefix(lines: string[]) {
  return lines.map((l) => (l.trim().startsWith(PREFIX) ? l.trim() : `${PREFIX} ${l.trim()}`));
}

export async function runInsightsRefresh(input: any) {
  const companyId = input?.companyId as string | undefined;
  if (!companyId) return { ok: false, error: "Missing companyId" };

  // 1) ALWAYS compute deterministic insights first (facts)
  const det = await generateInsights({ companyId });
  if (!det?.ok) return det;

  const deterministicBullets: string[] = det.insights ?? [];
  const basedOnSnapshotDate = det.based_on_snapshot_date ?? null;
  const nowIso = new Date().toISOString();

  // 2) If LLM disabled -> return deterministic as-is
  if (env.LLM_PROVIDER !== "openai") {
    return {
      ok: true,
      companyId,
      insights: deterministicBullets,
      generatedAt: nowIso,
      generatedBy: "deterministic",
      based_on_snapshot_date: basedOnSnapshotDate,
      savedToDb: true,
      note: "LLM disabled; returned deterministic insights",
    };
  }

  // 3) LLM is allowed ONLY to rewrite language (no new facts)
  // CRITICAL: This is a language-only rewrite. Facts are immutable.
  const prompt = `
You are rewriting investor insights for clarity and tone ONLY. You are NOT generating insights. Interpretation of language only—no numbers, no facts, no inference.

CRITICAL RULES:
- Keep meaning identical. Do not change any numbers, percentages, or quantitative claims.
- Do not remove qualifiers ("high", "low", "trending up", "short").
- Do not add or remove factual information.
- Keep exactly ${deterministicBullets.length} lines. Each line MUST start with "${PREFIX}".
- You may only improve wording, grammar, and clarity. Prefer rejection over guessing.

Input (FACTS—do not change meaning or numbers):
${deterministicBullets.map((b, i) => `${i + 1}. ${b}`).join("\n")}

Output: Exactly ${deterministicBullets.length} lines, each starting with "${PREFIX}".
`.trim();

  let rewritten: string[] = deterministicBullets;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";
    const lines = raw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((line) => {
        // Remove numbering if present (e.g., "1. VALYXO: ..." -> "VALYXO: ...")
        return line.replace(/^\d+\.\s*/, "").trim();
      });

    // enforce format + count
    if (lines.length === deterministicBullets.length) {
      rewritten = ensurePrefix(lines);
    } else {
      // If line count doesn't match, reject LLM output and use deterministic
      console.warn(
        `[runInsightsRefresh] LLM returned ${lines.length} lines, expected ${deterministicBullets.length}. Using deterministic insights.`
      );
      rewritten = deterministicBullets;
    }
  } catch (e) {
    // If rewrite fails, keep deterministic
    rewritten = deterministicBullets;
  }

  // 4) Save narrative separately (recommended)
  await supabase
    .from("companies")
    .update({
      latest_insights_narrative: rewritten,
      latest_insights_narrative_generated_at: nowIso,
      latest_insights_narrative_generated_by: "openai-language-only",
      // keep last_agent_run fields if you want, but do NOT overwrite deterministic
    })
    .eq("id", companyId);

  return {
    ok: true,
    companyId,
    insights: deterministicBullets, // still return deterministic as canonical
    narrative: rewritten,           // optional: return rewritten too
    generatedAt: nowIso,
    generatedBy: "deterministic+language",
    based_on_snapshot_date: basedOnSnapshotDate,
    savedToDb: true,
  };
}