import { z } from "zod";
import { supabase } from "../../db/supabase";
import { runAgent } from "../orchestrator";

const InputSchema = z.object({
  limit: z.number().int().positive().max(5000).optional(),
});

export async function runAllCompanies(input: unknown) {
  const parsed = InputSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return { ok: false, error: "Invalid input", issues: parsed.error.format() };
  }

  const { limit } = parsed.data;

  // Hent selskaper (starter enkelt: alle)
  const q = supabase.from("companies").select("id").order("created_at", { ascending: false });
  const { data, error } = limit ? await q.limit(limit) : await q;

  if (error) {
    return { ok: false, error: "Failed to load companies", details: error.message };
  }

  const companies = data ?? [];
  const results: Array<{ companyId: string; ok: boolean; toolResults?: any; error?: string }> = [];

  for (const c of companies) {
    try {
      const companyId = c.id as string;

      const kpi = await runAgent({ tool: "run_kpi_refresh", input: { companyId } });
      const insights = await runAgent({ tool: "generate_insights", input: { companyId } });
      const profile = await runAgent({ tool: "run_profile_refresh", input: { companyId } });

      results.push({ companyId, ok: true, toolResults: { kpi, insights, profile } });
    } catch (e: any) {
      results.push({ companyId: c.id as string, ok: false, error: e?.message ?? "Unknown error" });
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