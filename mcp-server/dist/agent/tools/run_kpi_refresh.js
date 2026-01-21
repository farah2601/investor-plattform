"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runKpiRefresh = runKpiRefresh;
const zod_1 = require("zod");
const supabase_1 = require("../../db/supabase");
const fetchGoogleSheetsData_1 = require("../data/fetchGoogleSheetsData");
const InputSchema = zod_1.z.object({
    companyId: zod_1.z.string().uuid(),
});
/**
 * KPI Refresh: Reads KPI values from Google Sheets directly and creates snapshots
 * Processes all configured sheets and merges the data
 */
async function runKpiRefresh(input) {
    const parsed = InputSchema.safeParse(input);
    if (!parsed.success) {
        throw new Error("Invalid input for run_kpi_refresh");
    }
    const { companyId } = parsed.data;
    // Read company to get Google Sheets config
    const { data: company, error: readError } = await supabase_1.supabase
        .from("companies")
        .select("id, google_sheets_url, google_sheets_tab, mrr, arr, burn_rate, runway_months, churn, growth_percent, lead_velocity")
        .eq("id", companyId)
        .single();
    if (readError) {
        console.error("[runKpiRefresh] DB read error:", readError);
        throw readError;
    }
    if (!company) {
        throw new Error(`Company ${companyId} not found`);
    }
    // If Google Sheets is configured, read directly from sheets
    const hasSheetsConfig = !!company.google_sheets_url;
    if (hasSheetsConfig) {
        console.log("[runKpiRefresh] Google Sheets configured - fetching data from sheets");
        try {
            // Fetch and parse all Google Sheets data
            const snapshots = await (0, fetchGoogleSheetsData_1.fetchGoogleSheetsData)(company.google_sheets_url, company.google_sheets_tab);
            if (snapshots.length === 0) {
                console.warn("[runKpiRefresh] No snapshots found in Google Sheets");
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
                    sheetsConfigured: true,
                    message: "No snapshots found in Google Sheets - using current DB values",
                };
            }
            // Find latest snapshot
            const latestSnapshot = snapshots.reduce((latest, current) => {
                return current.period_date > latest.period_date ? current : latest;
            }, snapshots[0]);
            console.log("[runKpiRefresh] Latest snapshot from sheets:", latestSnapshot);
            // Update companies table with latest snapshot values
            const updatePayload = {
                google_sheets_last_sync_at: new Date().toISOString(),
                google_sheets_last_sync_by: "valyxo-agent",
            };
            if (latestSnapshot.mrr !== null)
                updatePayload.mrr = Math.round(latestSnapshot.mrr);
            if (latestSnapshot.arr !== null)
                updatePayload.arr = Math.round(latestSnapshot.arr);
            if (latestSnapshot.burn_rate !== null)
                updatePayload.burn_rate = Math.round(latestSnapshot.burn_rate);
            if (latestSnapshot.churn !== null)
                updatePayload.churn = latestSnapshot.churn;
            if (latestSnapshot.growth_percent !== null)
                updatePayload.growth_percent = latestSnapshot.growth_percent;
            if (latestSnapshot.runway_months !== null)
                updatePayload.runway_months = latestSnapshot.runway_months;
            if (latestSnapshot.lead_velocity !== null)
                updatePayload.lead_velocity = Math.round(latestSnapshot.lead_velocity);
            // Update companies table
            const { error: updateError } = await supabase_1.supabase
                .from("companies")
                .update(updatePayload)
                .eq("id", companyId);
            if (updateError) {
                console.error("[runKpiRefresh] Failed to update companies table:", updateError);
                throw updateError;
            }
            // Upsert snapshots into kpi_snapshots table
            const now = new Date().toISOString();
            const snapshotsToUpsert = snapshots.map((snapshot) => {
                const kpisObject = {
                    source: "google-sheets",
                };
                // Only include non-null values in kpis object
                if (snapshot.arr !== null)
                    kpisObject.arr = snapshot.arr;
                if (snapshot.mrr !== null)
                    kpisObject.mrr = snapshot.mrr;
                if (snapshot.burn_rate !== null)
                    kpisObject.burn_rate = snapshot.burn_rate;
                if (snapshot.churn !== null)
                    kpisObject.churn = snapshot.churn;
                if (snapshot.growth_percent !== null)
                    kpisObject.growth_percent = snapshot.growth_percent;
                if (snapshot.runway_months !== null)
                    kpisObject.runway_months = snapshot.runway_months;
                if (snapshot.lead_velocity !== null)
                    kpisObject.lead_velocity = snapshot.lead_velocity;
                if (snapshot.cash_balance !== null)
                    kpisObject.cash_balance = snapshot.cash_balance;
                if (snapshot.customers !== null)
                    kpisObject.customers = snapshot.customers;
                return {
                    company_id: companyId,
                    period_date: snapshot.period_date,
                    effective_date: new Date(snapshot.period_date).toISOString(),
                    kpis: kpisObject,
                };
            });
            // Upsert snapshots
            const { error: upsertError } = await supabase_1.supabase
                .from("kpi_snapshots")
                .upsert(snapshotsToUpsert, {
                onConflict: "company_id,period_date",
            });
            if (upsertError) {
                console.error("[runKpiRefresh] Failed to upsert snapshots:", upsertError);
                // Don't throw - companies table was updated successfully
            }
            else {
                console.log(`[runKpiRefresh] Upserted ${snapshotsToUpsert.length} snapshots to kpi_snapshots table`);
            }
            return {
                ok: true,
                companyId,
                kpis: {
                    mrr: latestSnapshot.mrr,
                    arr: latestSnapshot.arr,
                    burn_rate: latestSnapshot.burn_rate,
                    runway_months: latestSnapshot.runway_months,
                    churn: latestSnapshot.churn,
                    growth_percent: latestSnapshot.growth_percent,
                    lead_velocity: latestSnapshot.lead_velocity,
                },
                sheetsConfigured: true,
                snapshotsCreated: snapshotsToUpsert.length,
                message: `Read ${snapshots.length} snapshots from Google Sheets and updated DB`,
            };
        }
        catch (error) {
            console.error("[runKpiRefresh] Error reading from Google Sheets:", error);
            // Fallback to DB values if sheets fetch fails
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
                sheetsConfigured: true,
                error: error.message,
                message: "Failed to read from Google Sheets - using cached DB values",
            };
        }
    }
    // No sheets configured - return current DB values
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
        sheetsConfigured: false,
        message: "No Google Sheets configured - using current DB values",
    };
}
