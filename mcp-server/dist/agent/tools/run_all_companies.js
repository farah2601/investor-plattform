"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAllCompanies = runAllCompanies;
const zod_1 = require("zod");
const supabase_1 = require("../../db/supabase");
const orchestrator_1 = require("../orchestrator");
const InputSchema = zod_1.z.object({
    limit: zod_1.z.number().int().positive().max(5000).optional(),
});
async function runAllCompanies(input) {
    const parsed = InputSchema.safeParse(input ?? {});
    if (!parsed.success) {
        return { ok: false, error: "Invalid input", issues: parsed.error.format() };
    }
    const { limit } = parsed.data;
    // Hent selskaper (starter enkelt: alle)
    const q = supabase_1.supabase.from("companies").select("id").order("created_at", { ascending: false });
    const { data, error } = limit ? await q.limit(limit) : await q;
    if (error) {
        return { ok: false, error: "Failed to load companies", details: error.message };
    }
    const companies = data ?? [];
    const results = [];
    for (const c of companies) {
        try {
            const companyId = c.id;
            const kpi = await (0, orchestrator_1.runAgent)({ tool: "run_kpi_refresh", input: { companyId } });
            const insights = await (0, orchestrator_1.runAgent)({ tool: "generate_insights", input: { companyId } });
            const profile = await (0, orchestrator_1.runAgent)({ tool: "run_profile_refresh", input: { companyId } });
            results.push({ companyId, ok: true, toolResults: { kpi, insights, profile } });
        }
        catch (e) {
            results.push({ companyId: c.id, ok: false, error: e?.message ?? "Unknown error" });
            // soft fail: fortsetter videre
        }
    }
    return {
        ok: true,
        total: companies.length,
        successCount: results.filter(r => r.ok).length,
        failCount: results.filter(r => !r.ok).length,
        results,
    };
}
