"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAllCompanies = runAllCompanies;
const zod_1 = require("zod");
const supabase_1 = require("../../db/supabase");
const run_all_1 = require("./run_all");
const InputSchema = zod_1.z.object({
    limit: zod_1.z.number().int().positive().max(5000).optional(),
});
async function runAllCompanies(input) {
    const parsed = InputSchema.safeParse(input ?? {});
    if (!parsed.success) {
        return { ok: false, error: "Invalid input", issues: parsed.error.format() };
    }
    const { limit } = parsed.data;
    // Hent selskaper
    const q = supabase_1.supabase.from("companies").select("id").order("created_at", { ascending: false });
    const { data, error } = limit ? await q.limit(limit) : await q;
    if (error) {
        return { ok: false, error: "Failed to load companies", details: error.message };
    }
    const companies = data ?? [];
    const results = [];
    const errors = [];
    for (const c of companies) {
        const companyId = c.id;
        try {
            const result = await (0, run_all_1.runAll)(companyId);
            if (result.ok) {
                results.push({ companyId, ok: true, data: result });
            }
            else {
                results.push({ companyId, ok: false, error: result.error });
                errors.push({ companyId, error: result.error || "Unknown error" });
            }
        }
        catch (e) {
            const errorMsg = e?.message ?? "Unknown error";
            results.push({ companyId, ok: false, error: errorMsg });
            errors.push({ companyId, error: errorMsg });
            // Continue on error - soft fail
        }
    }
    const successCount = results.filter((r) => r.ok).length;
    const failCount = results.filter((r) => !r.ok).length;
    return {
        ok: true,
        total: companies.length,
        successCount,
        failCount,
        results,
        errors,
    };
}
