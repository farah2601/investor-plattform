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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;

    if (!companyId) {
      return NextResponse.json({ error: "Missing company ID" }, { status: 400 });
    }

    if (!isValidUUID(companyId)) {
      return NextResponse.json(
        { error: "Invalid company ID format (must be UUID)" },
        { status: 400 }
      );
    }

    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select(`
        id,
        name,
        industry,
        google_sheets_url,
        google_sheets_tab,
        google_sheets_last_sync_at,
        google_sheets_last_sync_by,
        profile_published,
        mrr,
        arr,
        burn_rate,
        runway_months,
        churn,
        growth_percent,
        lead_velocity,
        last_agent_run_at,
        last_agent_run_by,
        latest_insights,
        latest_insights_generated_at,
        latest_insights_generated_by,
        based_on_snapshot_date
      `)
      .eq("id", companyId)
      .maybeSingle();

    if (companyError) {
      console.error("[api/companies/[id]] Database error:", companyError);
      return NextResponse.json(
        { error: "Failed to fetch company", details: companyError.message },
        { status: 500 }
      );
    }

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json(
      { ok: true, company },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (err: any) {
    console.error("[api/companies/[id]] Unexpected error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { 
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  }
}

