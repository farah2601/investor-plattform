"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runProfileRefresh = runProfileRefresh;
const zod_1 = require("zod");
const supabase_1 = require("../../db/supabase");
const logger_1 = require("../../logging/logger");
const InputSchema = zod_1.z.object({
    companyId: zod_1.z.string().uuid(),
});
async function runProfileRefresh(input) {
    const parsed = InputSchema.safeParse(input);
    if (!parsed.success) {
        return { ok: false, error: "Invalid input", issues: parsed.error.format() };
    }
    const { companyId } = parsed.data;
    await (0, logger_1.logAgentEvent)(companyId, "run_profile_refresh", "start", "Starting profile refresh", { companyId });
    // 1) Hent sources (website + linkedin) fra companies
    const { data: company, error: fetchErr } = await supabase_1.supabase
        .from("companies")
        .select("id, website_url, linkedin_urls, name")
        .eq("id", companyId)
        .maybeSingle();
    if (fetchErr) {
        await (0, logger_1.logAgentEvent)(companyId, "run_profile_refresh", "fail", "Failed fetching company sources", { fetchErr });
        throw fetchErr;
    }
    if (!company) {
        await (0, logger_1.logAgentEvent)(companyId, "run_profile_refresh", "fail", "Company not found", { companyId });
        return { ok: false, error: "Company not found" };
    }
    // 2) Placeholder “profil-generator” (byttes ut med ekte scraping/LLM senere)
    const updatedFields = {
        problem: "Placeholder problem (replace with real generation later).",
        solution: "Placeholder solution (replace with real generation later).",
        why_now: "Placeholder why now (replace with real generation later).",
        market: "Placeholder market summary (replace with real generation later).",
        product_details: `Generated from sources: website=${company.website_url ?? "n/a"} linkedin=${Array.isArray(company.linkedin_urls) ? company.linkedin_urls.join(", ") : "n/a"}`,
        // team kan dere fylle senere når scraping er på plass
    };
    // 3) Oppdater companies
    const { error: updErr } = await supabase_1.supabase
        .from("companies")
        .update(updatedFields)
        .eq("id", companyId);
    if (updErr) {
        await (0, logger_1.logAgentEvent)(companyId, "run_profile_refresh", "fail", "Failed updating company profile fields", { updErr });
        throw updErr;
    }
    await (0, logger_1.logAgentEvent)(companyId, "run_profile_refresh", "success", "Profile refresh completed", { updatedFields });
    return { ok: true, companyId, updatedFields };
}
