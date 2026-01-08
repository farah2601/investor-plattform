"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runKpiRefresh = runKpiRefresh;
const zod_1 = require("zod");
const supabase_1 = require("../../db/supabase");
const InputSchema = zod_1.z.object({
    companyId: zod_1.z.string().uuid(),
});
/**
 * KPI Refresh: Reads latest KPI values from companies table
 * CRITICAL: Does NOT write mock/placeholder values. Only reads current state.
 * KPI values are updated by Google Sheets sync (/api/sheets/sync), not by this function.
 */
async function runKpiRefresh(input) {
    const parsed = InputSchema.safeParse(input);
    if (!parsed.success) {
        throw new Error("Invalid input for run_kpi_refresh");
    }
    const { companyId } = parsed.data;
    // Read latest KPI values from companies table (no updates, just read)
    const { data: company, error: readError } = await supabase_1.supabase
        .from("companies")
        .select("id, mrr, arr, burn_rate, runway_months, churn, growth_percent, lead_velocity, google_sheets_url, google_sheets_last_sync_at, google_sheets_last_sync_by")
        .eq("id", companyId)
        .single();
    if (readError) {
        console.error("[runKpiRefresh] DB read error:", readError);
        throw readError;
    }
    if (!company) {
        throw new Error(`Company ${companyId} not found`);
    }
    // CRITICAL GUARD: If Google Sheets is configured, NEVER overwrite KPI snapshot fields
    // KPI values are managed by Google Sheets sync, not by this agent tool
    const hasSheetsConfig = !!(company.google_sheets_url || company.google_sheets_last_sync_by === "google-sheets");
    // If Google Sheets is configured and sync was very recent, wait a bit and retry once
    // This handles race conditions where sync just completed but DB hasn't propagated yet
    if (hasSheetsConfig && company.google_sheets_last_sync_at) {
        const syncTime = new Date(company.google_sheets_last_sync_at).getTime();
        const now = Date.now();
        const timeSinceSync = now - syncTime;
        // If sync was very recent (< 3 seconds ago), wait a bit and retry once
        if (timeSinceSync < 3000 && timeSinceSync >= 0) {
            console.log(`[runKpiRefresh] Recent sync detected (${Math.round(timeSinceSync)}ms ago), waiting for DB consistency...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Retry read to get updated values
            const { data: retryCompany, error: retryError } = await supabase_1.supabase
                .from("companies")
                .select("id, mrr, arr, burn_rate, runway_months, churn, growth_percent, lead_velocity, google_sheets_last_sync_at, google_sheets_last_sync_by")
                .eq("id", companyId)
                .single();
            if (!retryError && retryCompany) {
                console.log("[runKpiRefresh] Retry read successful, using updated values");
                Object.assign(company, retryCompany);
            }
            else if (retryError) {
                console.warn("[runKpiRefresh] Retry read failed, using original values:", retryError.message);
            }
        }
    }
    if (hasSheetsConfig) {
        console.log("[runKpiRefresh] Google Sheets configured - skipping KPI updates (KPIs managed by Sheets sync)");
        // Return current KPI state without any updates
        return {
            ok: true,
            companyId,
            kpis: {
                mrr: company.mrr,
                arr: company.arr,
                burn_rate: company.burn_rate,
                runway_months: company.runway_months,
                churn: company.churn,
                growth_percent: company.growth_percent,
                lead_velocity: company.lead_velocity,
            },
            lastSheetsSync: {
                at: company.google_sheets_last_sync_at,
                by: company.google_sheets_last_sync_by,
            },
            sheetsConfigured: true,
            message: "KPIs managed by Google Sheets sync - no updates performed",
        };
    }
    // Return current KPI state (no updates to DB)
    return {
        ok: true,
        companyId,
        kpis: {
            mrr: company.mrr,
            arr: company.arr,
            burn_rate: company.burn_rate,
            runway_months: company.runway_months,
            churn: company.churn,
            growth_percent: company.growth_percent,
            lead_velocity: company.lead_velocity,
        },
        lastSheetsSync: {
            at: company.google_sheets_last_sync_at,
            by: company.google_sheets_last_sync_by,
        },
    };
}
