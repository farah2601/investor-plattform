import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/server/auth";

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

    // Try to fetch with branding columns first, fallback to without them if they don't exist
    let { data: company, error: companyError } = await supabaseAdmin
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
        based_on_snapshot_date,
        logo_url,
        header_style,
        brand_color
      `)
      .eq("id", companyId)
      .maybeSingle();

    // If query fails due to missing columns (likely migration not run), try without branding columns
    if (companyError && (companyError.message?.includes("column") || companyError.message?.includes("does not exist") || companyError.code === "42703")) {
      console.warn("[api/companies/[id]] Branding columns not found, fetching without them. Run migration to enable branding features.");
      const fallbackResult = await supabaseAdmin
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
      
      // Type assertion to handle missing branding fields
      company = fallbackResult.data as typeof company;
      companyError = fallbackResult.error;
      
      // Add default branding fields if they don't exist
      if (company) {
        (company as any).logo_url = null;
        (company as any).header_style = "minimal";
        (company as any).brand_color = null;
      }
    }

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

export async function DELETE(
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

    // Verify user is authenticated
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return NextResponse.json({ error: authError || "Unauthorized" }, { status: 401 });
    }

    // Verify company exists and user owns it
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id, owner_id")
      .eq("id", companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Verify ownership
    if (company.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete company (cascade will handle related records)
    const { error: deleteError } = await supabaseAdmin
      .from("companies")
      .delete()
      .eq("id", companyId);

    if (deleteError) {
      console.error("[api/companies/[id]] Delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete company", details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, message: "Company deleted successfully" });
  } catch (err: any) {
    console.error("[api/companies/[id]] Unexpected error during delete:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

