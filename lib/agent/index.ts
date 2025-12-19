// lib/agent/index.ts

import { generateInsights } from "./ai/insights";
import { fetchCompanyData } from "./data/fetchCompanyData";
import { calculateKpis, saveSnapshot, getLatestKpis } from "./kpiEngine";
import { refreshCompanyProfile } from "./profile/profileAgent";
import { supabaseAdmin } from "../../src/app/lib/supabaseAdmin";

// --- Typer (duplisert for å unngå path-problemer) ---
export type KpiRecord = {
  [key: string]: number | null | undefined;
};

export type RawCompanyData = {
  [key: string]: number | undefined;
};

export type KpiSnapshot = {
  companyId: string;
  kpis: KpiRecord;
  effectiveDate: string;
  createdAt: string;
};

// Re-eksporter kjernefunksjoner
export { calculateKpis, saveSnapshot, getLatestKpis };

// --- Agent-kjøretyper ---
export type AgentRunTrigger = "cron" | "manual" | "admin";

export type AgentRunContext = {
  companyId: string;
  trigger: AgentRunTrigger;
  options?: Record<string, unknown>;
};

export type AgentRunResult = {
  companyId: string;
  success: boolean;
  error?: string;
  snapshot?: KpiSnapshot | null;
  insights?: string[];
  insightsGeneratedAt?: string;
  profileUpdatedAt?: string;
};

// --- Kjøre agent for ett selskap ---
export async function runAgentForCompany(
  ctx: AgentRunContext
): Promise<AgentRunResult> {
  try {
    // 1) Hent rådata
    const raw = await fetchCompanyData(ctx.companyId);

    // 2) Beregn KPI-er
    const kpis = calculateKpis(raw.data);

    // 3) Lagre snapshot
    const snapshot = await saveSnapshot(ctx.companyId, kpis);

    // 4) Insights
    const insightResult = await generateInsights();

    // 5) Profil refresh (soft-fail anbefalt)
    try {
      await refreshCompanyProfile(ctx.companyId);
    } catch (e) {
      console.warn("[Valyxo Agent] profile refresh failed (soft)", e);
    }

    // 6) Lagre agent-metadata for UI (Valyxo Agent)
    const { error: metaError } = await supabaseAdmin
      .from("companies")
      .update({
        last_agent_run_at: new Date().toISOString(),
        last_agent_run_by: "valyxo_agent",

        latest_insights: insightResult.insights,
        latest_insights_generated_at: insightResult.generatedAt,
        latest_insights_generated_by: "valyxo_agent",
      })
      .eq("id", ctx.companyId);

    if (metaError) {
      // Soft-fail: agent-run regnes som vellykket selv om UI-metadata ikke ble lagret
      console.warn("[Valyxo Agent] failed to save agent UI metadata", metaError);
    }

    return {
      companyId: ctx.companyId,
      success: true,
      snapshot,
      insights: insightResult.insights,
      insightsGeneratedAt: insightResult.generatedAt,
      profileUpdatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[Valyxo Agent] runAgentForCompany failed", err);

    return {
      companyId: ctx.companyId,
      success: false,
      error: err instanceof Error ? err.message : "Unknown MCP Agent error",
    };
  }
}

// --- Stub for cron-kjøring (dere bruker scheduler.ts / cron route for real) ---
export async function runAgentForAllCompanies(): Promise<AgentRunResult[]> {
  return [];
}
