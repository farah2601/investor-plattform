"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInsightsRefresh = runInsightsRefresh;
// mcp-server/src/agent/tools/run_insights_refresh.ts
const supabase_1 = require("../../db/supabase");
const openai_1 = require("../../llm/openai");
const env_1 = require("../../env");
const kpi_format_1 = require("../utils/kpi_format");
// Demo fallback (kun hvis LLM_PROVIDER ikke er "openai" eller ved feil)
const DEMO_INSIGHTS = [
    "VALYXO: Revenue is trending up compared to last period.",
    "VALYXO: Churn looks stable, keep monitoring.",
    "VALYXO: Consider improving conversion to increase MRR.",
];
async function runInsightsRefresh(input) {
    const companyId = input?.companyId;
    if (!companyId) {
        return { ok: false, error: "Missing companyId" };
    }
    // 1) Hent KPI-er til prompten (inkludert currency/scale for formatering)
    const { data: company, error: companyError } = await supabase_1.supabase
        .from("companies")
        .select("mrr, churn, growth_percent, burn_rate, runway_months, arr, kpi_currency, kpi_scale")
        .eq("id", companyId)
        .single();
    if (companyError)
        throw companyError;
    if (!company)
        throw new Error("Company not found");
    const nowIso = new Date().toISOString();
    // Format KPIs for prompt
    const kpiStrings = (0, kpi_format_1.formatKpisForPrompt)(company);
    let finalInsights = [];
    let generatedBy = "valyxo-agent"; // default
    // 2) Sjekk LLM_PROVIDER - hvis ikke "openai", bruk demo
    if (env_1.env.LLM_PROVIDER !== "openai") {
        console.log("[runInsightsRefresh] LLM_PROVIDER is not 'openai', using demo insights");
        finalInsights = DEMO_INSIGHTS;
        generatedBy = "demo";
    }
    else {
        generatedBy = "openai";
        const prompt = `
You are a startup analyst writing concise investor insights.

Company KPIs:
- ${kpiStrings.mrr_str}
- ${kpiStrings.arr_str}
- ${kpiStrings.burn_rate_str}
- ${kpiStrings.runway_str}
- ${kpiStrings.churn_str}
- ${kpiStrings.growth_str}

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
            const completion = await openai_1.openai.chat.completions.create({
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
                console.warn(`[runInsightsRefresh] Invalid LLM output. Expected 3 VALYXO insights. Got ${signedInsights.length}. Raw:\n${raw}`);
                finalInsights = DEMO_INSIGHTS;
                generatedBy = "demo_fallback_invalid_format";
            }
            else {
                finalInsights = signedInsights;
            }
        }
        catch (err) {
            console.error("[runInsightsRefresh] OpenAI error:", err);
            finalInsights = DEMO_INSIGHTS;
            generatedBy = "demo_fallback_openai_error";
        }
    }
    console.log("[runInsightsRefresh] writing generated_by/at", {
        companyId,
        generatedBy,
        generatedAt: nowIso,
    });
    // 4) Skriv til DB - ONLY latest_insights fields
    const { error: updateError } = await supabase_1.supabase
        .from("companies")
        .update({
        latest_insights: finalInsights,
        latest_insights_generated_at: nowIso,
        latest_insights_generated_by: generatedBy,
    })
        .eq("id", companyId);
    if (updateError) {
        console.error("[runInsightsRefresh] DB update error:", updateError);
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
