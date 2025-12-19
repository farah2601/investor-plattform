import { z } from "zod";
import { supabase } from "../../db/supabase";
import { logAgentEvent } from "../../logging/logger";

const InputSchema = z.object({
  companyId: z.string().uuid(),
});

export async function runProfileRefresh(input: unknown) {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input", issues: parsed.error.format() };
  }

  const { companyId } = parsed.data;

  await logAgentEvent(
    companyId,
    "run_profile_refresh",
    "start",
    "Starting profile refresh",
    { companyId }
  );

  // 1) Hent sources (website + linkedin) fra companies
  const { data: company, error: fetchErr } = await supabase
    .from("companies")
    .select("id, website_url, linkedin_urls, name")
    .eq("id", companyId)
    .maybeSingle();

  if (fetchErr) {
    await logAgentEvent(companyId, "run_profile_refresh", "fail", "Failed fetching company sources", { fetchErr });
    throw fetchErr;
  }

  if (!company) {
    await logAgentEvent(companyId, "run_profile_refresh", "fail", "Company not found", { companyId });
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
  const { error: updErr } = await supabase
    .from("companies")
    .update(updatedFields)
    .eq("id", companyId);

  if (updErr) {
    await logAgentEvent(companyId, "run_profile_refresh", "fail", "Failed updating company profile fields", { updErr });
    throw updErr;
  }

  await logAgentEvent(
    companyId,
    "run_profile_refresh",
    "success",
    "Profile refresh completed",
    { updatedFields }
  );

  return { ok: true, companyId, updatedFields };
}