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

type SnapshotRow = {
  period_date: string;
  kpis: {
    arr?: number | null;
    mrr?: number | null;
    burn_rate?: number | null;
    churn?: number | null;
    growth_percent?: number | null;
    runway_months?: number | null;
    lead_velocity?: number | null;
    cash_balance?: number | null;
    customers?: number | null;
    source?: string;
  } | null;
};

type ChartDataPoint = {
  date: string;  // ISO date "YYYY-MM-DD"
  label: string; // Month short name "Jan", "Feb", etc.
  value: number | null;
};


/**
 * Format date to short month label (e.g., "Jan", "Feb")
 */
function formatMonthLabel(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
  } catch {
    return dateStr.slice(0, 7);
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const companyId = url.searchParams.get("companyId");

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

    console.log("[api/kpi/snapshots] Fetching snapshots for companyId:", companyId);

    // Fetch snapshots for the company, ordered by period_date ASC (oldest first)
    // CRITICAL: Only select period_date and kpis (JSONB), NOT numeric columns
    // Limit to last 12 snapshots for charts (get all, then take last 12)
    const { data, error } = await supabaseAdmin
      .from("kpi_snapshots")
      .select("period_date, kpis")
      .eq("company_id", companyId)
      .order("period_date", { ascending: true });

    if (error) {
      console.error("[api/kpi/snapshots] Database error:", error);
      
      // Check if table doesn't exist
      if (error.message?.includes("does not exist") || error.code === "PGRST116" || error.code === "42P01") {
        return NextResponse.json(
          { 
            ok: false, 
            error: "kpi_snapshots table does not exist",
            details: error.message,
            code: error.code,
          },
          {
            status: 500,
            headers: {
              "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            },
          }
        );
      }
      
      return NextResponse.json(
        { 
          ok: false, 
          error: "Failed to fetch KPI snapshots", 
          details: error.message, 
          code: error.code 
        },
        { status: 500 }
      );
    }

    // Data is already sorted by period_date ASC (oldest first)
    // Take last 12 snapshots for charts (or all if less than 12)
    const allData = (data || []) as SnapshotRow[];
    const sortedData = allData.length > 12 ? allData.slice(-12) : allData;
    console.log("[api/kpi/snapshots] companyId", companyId, "total rows", allData.length, "returning", sortedData.length);
    console.log("[api/kpi/snapshots] sample", sortedData.slice(0, 2));

    // Build chart series directly from database rows (not generating months)
    // Use actual period_date values from the database
    const arrSeries: ChartDataPoint[] = [];
    const mrrSeries: ChartDataPoint[] = [];
    const burnSeries: ChartDataPoint[] = [];

    // Process each snapshot row from the database
    for (const snapshot of sortedData) {
      if (!snapshot.period_date) continue;
      
      const kpis = snapshot.kpis || null;
      
      // Extract values from kpis JSONB
      const arr = kpis?.arr !== undefined && kpis.arr !== null ? Number(kpis.arr) : null;
      const mrr = kpis?.mrr !== undefined && kpis.mrr !== null ? Number(kpis.mrr) : null;
      const burn = kpis?.burn_rate !== undefined && kpis.burn_rate !== null ? Number(kpis.burn_rate) : null;
      
      // Format period_date as ISO date string (YYYY-MM-DD)
      const dateStr = snapshot.period_date;
      // Create label from period_date
      const label = formatMonthLabel(dateStr);
      
      arrSeries.push({ date: dateStr, label, value: arr });
      mrrSeries.push({ date: dateStr, label, value: mrr });
      burnSeries.push({ date: dateStr, label, value: burn });
    }

    console.log("[api/kpi/snapshots] Returning", sortedData.length, "snapshots with chart series:", {
      arrSeriesLength: arrSeries.length,
      mrrSeriesLength: mrrSeries.length,
      burnSeriesLength: burnSeries.length,
    });

    // Get latest snapshot (last item in sortedData)
    const latest = sortedData.length > 0 ? sortedData[sortedData.length - 1] : null;

    return NextResponse.json(
      {
        ok: true,
        companyId,
        rows: sortedData, // Return full rows array for backward compatibility with dashboard
        rowsCount: sortedData.length, // Return count
        latest: latest ? {
          period_date: latest.period_date,
          kpis: latest.kpis,
        } : null,
        arrSeries,
        mrrSeries,
        burnSeries,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/kpi/snapshots] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    );
  }
}

