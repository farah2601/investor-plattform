import { supabaseAdmin } from "../../src/lib/supabaseAdmin";
import { runAgentForCompany } from "./index";

type RunAllResult = {
  totalCompanies: number;
  successCount: number;
  failCount: number;
  results: Array<{
    companyId: string;
    success: boolean;
    error?: string;
  }>;
};

async function getAllCompanyIds(): Promise<string[]> {
  const ids: string[] = [];
  const pageSize = 500;
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;

    const { data, error } = await supabaseAdmin
      .from("companies")
      .select("id")
      .range(from, to);

    if (error) throw new Error(`Failed to fetch companies: ${error.message}`);
    if (!data || data.length === 0) break;

    ids.push(...data.map((r: any) => r.id));
    if (data.length < pageSize) break;

    from += pageSize;
  }

  return ids;
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>
) {
  const queue = [...items];
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (!item) return;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

/**
 * Kjør agenten for alle selskaper (cron).
 * - Henter alle companies.id
 * - Kjører runAgentForCompany per selskap
 */
export async function runAgentForAllCompaniesCron(): Promise<RunAllResult> {
  const companyIds = await getAllCompanyIds();

  const results: RunAllResult["results"] = [];
  let successCount = 0;
  let failCount = 0;

  // Litt concurrency for fart uten å DDOS’e egne routes
  await runWithConcurrency(companyIds, 3, async (companyId) => {
    const r = await runAgentForCompany({
      companyId,
      trigger: "cron",
    });

    results.push({
      companyId,
      success: r.success,
      error: r.error,
    });

    if (r.success) successCount += 1;
    else failCount += 1;
  });

  return {
    totalCompanies: companyIds.length,
    successCount,
    failCount,
    results,
  };
}
