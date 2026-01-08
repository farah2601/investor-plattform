import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isValidUUID(str: string | null | undefined): boolean {
  if (!str) return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Generate array of start-of-month dates for the last N months (including current month)
 */
function generateMonthStarts(months: number): Date[] {
  const result: Date[] = [];
  const now = new Date();
  
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1, 12, 0, 0, 0);
    result.push(d);
  }
  
  // Return in chronological order (oldest first)
  return result.reverse();
}

/**
 * Format date to YYYY-MM-DD for comparison
 */
function toMonthKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { companyId } = body;

    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: "Missing companyId" },
        { status: 400 }
      );
    }

    if (!isValidUUID(companyId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid companyId format (must be UUID)" },
        { status: 400 }
      );
    }

    console.log("[api/kpi/backfill] Starting backfill for companyId:", companyId);

    // 1. Fetch current snapshot from companies table
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("mrr, arr, burn_rate, churn, growth_percent, runway_months")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError) {
      console.error("[api/kpi/backfill] Failed to fetch company:", companyError);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch company", details: companyError.message },
        { status: 500 }
      );
    }

    if (!company) {
      return NextResponse.json(
        { ok: false, error: "Company not found" },
        { status: 404 }
      );
    }

    // 2. Fetch existing history to avoid duplicates
    const { data: existingHistory, error: historyError } = await supabaseAdmin
      .from("company_kpi_history")
      .select("recorded_at")
      .eq("company_id", companyId);

    if (historyError) {
      console.error("[api/kpi/backfill] Failed to fetch history:", historyError);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch existing history", details: historyError.message },
        { status: 500 }
      );
    }

    // 3. Build set of existing months
    const existingMonths = new Set<string>();
    for (const row of existingHistory || []) {
      existingMonths.add(toMonthKey(row.recorded_at));
    }

    console.log("[api/kpi/backfill] Existing months:", Array.from(existingMonths));

    // 4. Generate 12 months of dates
    const monthStarts = generateMonthStarts(12);
    
    // 5. Find missing months
    const recordsToInsert: {
      company_id: string;
      recorded_at: string;
      mrr: number | null;
      arr: number | null;
      burn_rate: number | null;
      churn: number | null;
      growth_percent: number | null;
      runway_months: number | null;
    }[] = [];

    for (const monthDate of monthStarts) {
      const monthKey = toMonthKey(monthDate);
      if (!existingMonths.has(monthKey)) {
        recordsToInsert.push({
          company_id: companyId,
          recorded_at: monthDate.toISOString(),
          mrr: company.mrr ?? null,
          arr: company.arr ?? null,
          burn_rate: company.burn_rate ?? null,
          churn: company.churn ?? null,
          growth_percent: company.growth_percent ?? null,
          runway_months: company.runway_months ?? null,
        });
      }
    }

    console.log("[api/kpi/backfill] Records to insert:", recordsToInsert.length);

    // 6. Insert missing records
    if (recordsToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from("company_kpi_history")
        .insert(recordsToInsert);

      if (insertError) {
        console.error("[api/kpi/backfill] Insert error:", insertError);
        return NextResponse.json(
          { ok: false, error: "Failed to insert history", details: insertError.message },
          { status: 500 }
        );
      }
    }

    console.log("[api/kpi/backfill] ✅ Successfully backfilled", recordsToInsert.length, "records");

    return NextResponse.json(
      { ok: true, inserted: recordsToInsert.length },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/kpi/backfill] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    );
  }
}
