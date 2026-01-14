"use strict";
// mcp-server/src/agent/tools/run_insights_refresh.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInsightsRefresh = runInsightsRefresh;
const supabase_1 = require("../../db/supabase");
const env_1 = require("../../env");
const openai_1 = require("../../llm/openai");
const generate_insights_1 = require("./generate_insights");
const PREFIX = "VALYXO:";
function ensurePrefix(lines) {
    return lines.map((l) => (l.trim().startsWith(PREFIX) ? l.trim() : `${PREFIX} ${l.trim()}`));
}
async function runInsightsRefresh(input) {
    const companyId = input?.companyId;
    if (!companyId)
        return { ok: false, error: "Missing companyId" };
    // 1) ALWAYS compute deterministic insights first (facts)
    const det = await (0, generate_insights_1.generateInsights)({ companyId });
    if (!det?.ok)
        return det;
    const deterministicBullets = det.insights ?? [];
    const basedOnSnapshotDate = det.based_on_snapshot_date ?? null;
    const nowIso = new Date().toISOString();
    // 2) If LLM disabled -> return deterministic as-is
    if (env_1.env.LLM_PROVIDER !== "openai") {
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
You are rewriting investor insights for clarity and tone ONLY. You are NOT generating insights.

CRITICAL RULES:
- You MUST keep the meaning identical.
- You MUST NOT introduce any new numbers, KPIs, percentages, or claims.
- You MUST NOT remove important qualifiers (e.g., "high", "low", "trending up", "short").
- You MUST NOT change any numerical values.
- You MUST NOT add or remove any factual information.
- Keep exactly the same number of lines as input (${deterministicBullets.length} lines).
- Each line MUST start with "${PREFIX}".
- You may only improve wording, grammar, and clarity.

Input insights (these are FACTS - do not change meaning or numbers):
${deterministicBullets.map((b, i) => `${i + 1}. ${b}`).join("\n")}

Output format: Return exactly ${deterministicBullets.length} lines, each starting with "${PREFIX}".
`.trim();
    let rewritten = deterministicBullets;
    try {
        const completion = await openai_1.openai.chat.completions.create({
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
        }
        else {
            // If line count doesn't match, reject LLM output and use deterministic
            console.warn(`[runInsightsRefresh] LLM returned ${lines.length} lines, expected ${deterministicBullets.length}. Using deterministic insights.`);
            rewritten = deterministicBullets;
        }
    }
    catch (e) {
        // If rewrite fails, keep deterministic
        rewritten = deterministicBullets;
    }
    // 4) Save narrative separately (recommended)
    await supabase_1.supabase
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
        narrative: rewritten, // optional: return rewritten too
        generatedAt: nowIso,
        generatedBy: "deterministic+language",
        based_on_snapshot_date: basedOnSnapshotDate,
        savedToDb: true,
    };
}
