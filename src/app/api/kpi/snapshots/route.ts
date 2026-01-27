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

export type SnapshotRow = {
  period_date: string;
  kpis: unknown;
};

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
    // Return ALL snapshots - client-side will handle filtering and dense series building
    const allData = (data || []) as SnapshotRow[];
    
    const DEBUG = true;
    if (DEBUG) {
      console.log("[api/kpi/snapshots] companyId", companyId, "total rows", allData.length, "returning all snapshots");
    }

    // Get latest snapshot (last item in allData)
    const latest = allData.length > 0 ? allData[allData.length - 1] : null;

    // Extract sources metadata from latest snapshot (if new format)
    // This lets UI display "Source of truth" for each metric
    const sources: Record<string, string> | null = (() => {
      if (!latest?.kpis) return null;
      
      const kpis = latest.kpis;
      const result: Record<string, string> = {};
      
      // Check each KPI - if it's new format {value, source, updated_at}, extract source
      const kpiKeys = ["mrr", "arr", "mrr_growth_mom", "churn", "net_revenue", "failed_payment_rate", "refund_rate", "burn_rate", "cash_balance", "customers", "runway_months"] as const;
      
      for (const key of kpiKeys) {
        const kpi = kpis[key as keyof typeof kpis];
        if (kpi && typeof kpi === "object" && "source" in kpi) {
          const kpiValue = kpi as { source?: unknown };
          if (typeof kpiValue.source === "string") {
            result[key] = kpiValue.source;
          }
        }
      }
      
      return Object.keys(result).length > 0 ? result : null;
    })();

    return NextResponse.json(
      {
        ok: true,
        companyId,
        rows: allData, // Return ALL raw snapshot rows (client builds chart series with dense axis)
        rowsCount: allData.length, // Return count
        latest: latest ? {
          period_date: latest.period_date,
          kpis: latest.kpis,
        } : null,
        sources, // Metric metadata: source of truth for each KPI (new format only)
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

