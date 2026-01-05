import { z } from "zod";
import { supabase } from "../../db/supabase";
import { runAll } from "./run_all";

const InputSchema = z.object({
  limit: z.number().int().positive().max(5000).optional(),
});

export async function runAllCompanies(input: unknown) {
  const parsed = InputSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return { ok: false, error: "Invalid input", issues: parsed.error.format() };
  }

  const { limit } = parsed.data;

  // Hent selskaper
  const q = supabase.from("companies").select("id").order("created_at", { ascending: false });
  const { data, error } = limit ? await q.limit(limit) : await q;

  if (error) {
    return { ok: false, error: "Failed to load companies", details: error.message };
  }

  const companies = data ?? [];
  const results: Array<{ companyId: string; ok: boolean; data?: any; error?: string }> = [];
  const errors: Array<{ companyId: string; error: string }> = [];

  for (const c of companies) {
    const companyId = c.id as string;
    try {
      const result = await runAll(companyId);
      if (result.ok) {
        results.push({ companyId, ok: true, data: result });
      } else {
        results.push({ companyId, ok: false, error: result.error });
        errors.push({ companyId, error: result.error || "Unknown error" });
      }
    } catch (e: any) {
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