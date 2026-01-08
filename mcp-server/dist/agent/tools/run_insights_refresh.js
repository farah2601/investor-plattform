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
    // CRITICAL: Always fetch the LATEST company row from Supabase RIGHT BEFORE generating insights
    // This ensures we use the most recent KPI values after any Sheets sync
    const { data: company, error: companyError } = await supabase_1.supabase
        .from("companies")
        .select("id, name, industry, mrr, arr, burn_rate, runway_months, churn, growth_percent, lead_velocity, google_sheets_last_sync_at, google_sheets_last_sync_by, last_agent_run_at, last_agent_run_by, kpi_currency, kpi_scale")
        .eq("id", companyId)
        .single();
    if (companyError)
        throw companyError;
    if (!company)
        throw new Error("Company not found");
    const nowIso = new Date().toISOString();
    // Format KPIs for prompt
    const kpiStrings = (0, kpi_format_1.formatKpisForPrompt)(company);
    // Build KPI context object for LLM
    const kpiContext = {
        companyName: company.name || "Unknown",
        industry: company.industry || null,
        kpis: {
            mrr: company.mrr,
            arr: company.arr,
            burn_rate: company.burn_rate,
            runway_months: company.runway_months,
            churn: company.churn,
            growth_percent: company.growth_percent,
            lead_velocity: company.lead_velocity,
        },
        lastSheetsSyncAt: company.google_sheets_last_sync_at,
        lastSheetsSyncBy: company.google_sheets_last_sync_by,
    };
    // Track which KPIs have actual values (not null)
    const usedKpis = Object.entries(kpiContext.kpis)
        .filter(([_, value]) => value !== null && value !== undefined)
        .map(([key]) => key);
    // Dev logging: log KPIs being used
    if (process.env.NODE_ENV !== "production") {
        console.log("[runInsightsRefresh] KPIs used for insights:", {
            companyId,
            companyName: company.name,
            usedKpis,
            kpiValues: kpiContext.kpis,
            lastSheetsSync: company.google_sheets_last_sync_at,
        });
    }
    let finalInsights = [];
    let generatedBy = "valyxo-agent";
    // Check if we have ANY real KPI data - if not, use demo only if DB error
    const hasRealKpiData = usedKpis.length > 0;
    // 2) Sjekk LLM_PROVIDER - hvis ikke "openai", bruk demo
    if (env_1.env.LLM_PROVIDER !== "openai") {
        console.log("[runInsightsRefresh] LLM_PROVIDER is not 'openai', using demo insights");
        if (!hasRealKpiData) {
            finalInsights = DEMO_INSIGHTS;
            generatedBy = "demo";
        }
        else {
            // Even if not OpenAI, try to generate basic insights from real data
            finalInsights = [
                `VALYXO: ${company.name} has ${usedKpis.length} KPI metrics available.`,
                `VALYXO: Latest data sync: ${company.google_sheets_last_sync_at ? new Date(company.google_sheets_last_sync_at).toLocaleDateString() : "never"}.`,
                `VALYXO: Connect Google Sheets to enable AI-powered insights.`,
            ];
            generatedBy = "demo_with_data";
        }
    }
    else {
        generatedBy = "openai";
        // Calculate derived metrics for prompt
        const mrr = company.mrr;
        const arr = company.arr;
        const burnRate = company.burn_rate;
        const runwayMonths = company.runway_months;
        const churn = company.churn;
        const growthPercent = company.growth_percent;
        const leadVelocity = company.lead_velocity;
        // Derived calculations (for LLM context, not stored)
        const estimatedArr = mrr && !arr ? mrr * 12 : null;
        const churnWarning = churn && churn > 5;
        const runwayWarning = runwayMonths && runwayMonths < 6;
        const growthWarning = growthPercent !== null && growthPercent < 5;
        // Format estimated ARR if needed
        let estimatedArrNote = "";
        if (estimatedArr) {
            const currency = company.kpi_currency || "USD";
            const scale = company.kpi_scale || "unit";
            const formatted = (0, kpi_format_1.formatKpisForPrompt)({ arr: estimatedArr, kpi_currency: currency, kpi_scale: scale });
            estimatedArrNote = `\nNOTE: ARR is not set, but MRR suggests estimated ARR ≈ ${formatted.arr_str} (estimate, not stored).`;
        }
        const sheetsSyncInfo = company.google_sheets_last_sync_at
            ? `Based on Google Sheets sync at ${new Date(company.google_sheets_last_sync_at).toLocaleString()}.`
            : "No Google Sheets sync detected. Connect Sheets to get real-time KPIs.";
        const prompt = `
You are a startup analyst writing concise, concrete investor insights based on KPI data.

COMPANY CONTEXT:
- Name: ${company.name || "Unknown"}
- Industry: ${company.industry || "Not specified"}
- ${sheetsSyncInfo}

KPI DATA (use exact numbers, mark missing as "not available"):
${JSON.stringify(kpiContext.kpis, null, 2)}

FORMATTED KPIs:
- ${kpiStrings.mrr_str}
- ${kpiStrings.arr_str}
- ${kpiStrings.burn_rate_str}
- ${kpiStrings.runway_str}
- ${kpiStrings.churn_str}
- ${kpiStrings.growth_str}
- ${kpiStrings.lead_velocity_str}
${estimatedArrNote}

TASK:
Generate 4-7 short, concrete insights (one sentence each) covering:
1. Health metrics: runway, churn, burn rate (with specific numbers)
2. Growth metrics: growth_percent, lead_velocity (with specific numbers)
3. Revenue quality: MRR/ARR trends, churn impact (with specific numbers)
4. Action items: 1-3 concrete recommendations based on the data

CRITICAL REQUIREMENTS:
- Each insight MUST start with "VALYXO:"
- ALWAYS include specific numbers when available (e.g., "MRR is $255k", "Burn rate is $92k/mo", "Churn is 2.5%", "Runway is 12 months")
- If a KPI field is null/missing, explicitly state what's missing and what should be connected/added (e.g., "Runway months not set - connect cash balance to calculate runway")
- Flag warnings if: runway < 6 months, churn > 5%, burn rate high relative to revenue, growth < 5%
- Be concrete and actionable - no generic statements like "looks stable" without numbers
- Use the exact numbers from the KPI data above
${churnWarning ? "- WARNING: Churn is ${churn}% (above 5% threshold) - flag this prominently" : ""}
${runwayWarning ? "- WARNING: Runway is ${runwayMonths} months (below 6 months) - flag this prominently" : ""}
${growthWarning ? "- WARNING: Growth is ${growthPercent}% (below 5% threshold) - flag this prominently" : ""}

OUTPUT FORMAT:
Return ONLY the insights as separate lines (one per line).
No bullets, no numbering, no extra text.
Each line must start with "VALYXO:"
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
            // Accept 3-6 insights (not just 3)
            const signedInsights = raw
                .split("VALYXO:")
                .map((s) => s.trim())
                .filter(Boolean)
                .map((s) => `VALYXO: ${s.replace(/^[:\-\s]+/, "")}`) // fjerner ": -  " i starten
                .slice(0, 6); // Allow up to 6 insights
            // Validate: must have at least 3 insights
            if (signedInsights.length < 3) {
                console.warn(`[runInsightsRefresh] Invalid LLM output. Expected 3-6 VALYXO insights. Got ${signedInsights.length}. Raw:\n${raw}`);
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
    console.log("[runInsightsRefresh] writing insights and agent run metadata", {
        companyId,
        generatedBy,
        generatedAt: nowIso,
        insightsCount: finalInsights.length,
    });
    // 4) Skriv til DB - latest_insights fields + last_agent_run_at/by
    const { error: updateError } = await supabase_1.supabase
        .from("companies")
        .update({
        latest_insights: finalInsights,
        latest_insights_generated_at: nowIso,
        latest_insights_generated_by: generatedBy,
        // CRITICAL: Update last_agent_run_at and last_agent_run_by
        last_agent_run_at: nowIso,
        last_agent_run_by: "valyxo-agent",
    })
        .eq("id", companyId);
    if (updateError) {
        console.error("[runInsightsRefresh] DB update error:", updateError);
        throw updateError;
    }
    // 5) Returner structured output
    return {
        ok: true,
        companyId,
        insights: finalInsights,
        meta: {
            usedKpis,
            companyId,
            generatedAt: nowIso,
            companyName: company.name,
            hasRealKpiData: usedKpis.length > 0,
            lastSheetsSync: company.google_sheets_last_sync_at,
        },
        generatedAt: nowIso,
        generatedBy,
        savedToDb: true,
    };
}
