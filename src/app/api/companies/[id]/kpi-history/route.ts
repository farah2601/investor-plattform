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

type KpiHistoryRow = {
  recorded_at: string;
  mrr: number | null;
  arr: number | null;
  burn_rate: number | null;
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;

    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: "Missing company ID" },
        { status: 400 }
      );
    }

    if (!isValidUUID(companyId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid company ID format (must be UUID)" },
        { status: 400 }
      );
    }

    // Fetch last 90 data points, sorted ascending by recorded_at
    console.log("[api/companies/[id]/kpi-history] Fetching history for companyId:", companyId);
    
    const { data, error } = await supabaseAdmin
      .from("company_kpi_history")
      .select("recorded_at, mrr, arr, burn_rate")
      .eq("company_id", companyId)
      .order("recorded_at", { ascending: false })
      .limit(90);

    if (error) {
      console.error("[api/companies/[id]/kpi-history] Database error:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch KPI history", details: error.message },
        { status: 500 }
      );
    }

    // Reverse to get ascending order (oldest first for charts)
    const history: KpiHistoryRow[] = (data || []).reverse();
    
    console.log("[api/companies/[id]/kpi-history] Returning", history.length, "rows");

    return NextResponse.json(
      { ok: true, history },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/companies/[id]/kpi-history] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    );
  }
}

