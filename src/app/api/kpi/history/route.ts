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
 * Format date to YYYY-MM for grouping
 */
function toMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Format date to YYYY-MM-01 for output
 */
function toMonthStart(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

type KpiHistoryRow = {
  recorded_at: string;
  mrr: number | null;
  arr: number | null;
  burn_rate: number | null;
  churn: number | null;
  growth_percent: number | null;
  runway_months: number | null;
};

type OutputRow = {
  month: string;
  arr: number | null;
  mrr: number | null;
  burn_rate: number | null;
  churn: number | null;
  growth_percent: number | null;
  runway_months: number | null;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const companyId = url.searchParams.get("companyId");
    const monthsParam = url.searchParams.get("months");
    const months = monthsParam ? parseInt(monthsParam, 10) : 12;

    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: "Missing companyId query parameter" },
        { status: 400 }
      );
    }

    if (!isValidUUID(companyId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid companyId format (must be UUID)" },
        { status: 400 }
      );
    }

    if (isNaN(months) || months < 1 || months > 120) {
      return NextResponse.json(
        { ok: false, error: "Invalid months parameter (must be 1-120)" },
        { status: 400 }
      );
    }

    console.log("[api/kpi/history] Fetching history for companyId:", companyId, "months:", months);

    // Calculate the "since" date (months + 1 to ensure we capture the full range)
    const sinceDate = new Date();
    sinceDate.setMonth(sinceDate.getMonth() - months);
    sinceDate.setDate(1);
    sinceDate.setHours(0, 0, 0, 0);

    // Fetch all history rows since the start date, ordered by recorded_at DESC
    const { data, error } = await supabaseAdmin
      .from("company_kpi_history")
      .select("recorded_at, mrr, arr, burn_rate, churn, growth_percent, runway_months")
      .eq("company_id", companyId)
      .gte("recorded_at", sinceDate.toISOString())
      .order("recorded_at", { ascending: false });

    if (error) {
      console.error("[api/kpi/history] Database error:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch KPI history", details: error.message },
        { status: 500 }
      );
    }

    // Group by month and take the latest row per month
    const monthMap = new Map<string, KpiHistoryRow>();
    
    for (const row of (data || []) as KpiHistoryRow[]) {
      const monthKey = toMonthKey(row.recorded_at);
      // Since we ordered DESC, the first row we see for each month is the latest
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, row);
      }
    }

    // Convert to output format and sort chronologically
    const output: OutputRow[] = Array.from(monthMap.entries())
      .map(([, row]) => ({
        month: toMonthStart(row.recorded_at),
        arr: row.arr,
        mrr: row.mrr,
        burn_rate: row.burn_rate,
        churn: row.churn,
        growth_percent: row.growth_percent,
        runway_months: row.runway_months,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    console.log("[api/kpi/history] Returning", output.length, "months of data");

    return NextResponse.json(
      {
        ok: true,
        companyId,
        months,
        data: output,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/kpi/history] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    );
  }
}
