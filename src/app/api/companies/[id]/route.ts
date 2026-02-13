import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
} as const;

function isValidUUID(str: string | null | undefined): boolean {
  if (!str) return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

type CompanyRow = Record<string, unknown> & {
  investor_view_config?: Record<string, unknown> | null;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    console.log("[api/companies] companyId:", companyId);
    console.log("[api/companies] hasServiceRole:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log("[api/companies] hasUrl:", !!process.env.NEXT_PUBLIC_SUPABASE_URL);

    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: "Missing company ID" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    if (!isValidUUID(companyId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid company ID format (must be UUID)" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn("[api/companies] Missing Supabase env (url or service role)");
      return NextResponse.json(
        { ok: false, error: "Server misconfigured: missing Supabase env" },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    let company: CompanyRow | null = null;
    let companyError: { message?: string; code?: string } | null = null;

    let result = await supabaseAdmin
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
        runway_status,
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
        brand_color,
        investor_view_config,
        preferred_metrics
      `)
      .eq("id", companyId)
      .maybeSingle();

    company = result.data as CompanyRow | null;
    companyError = result.error;

    if (companyError && (companyError.message?.includes("column") || companyError.message?.includes("does not exist") || companyError.code === "42703")) {
      console.warn("[api/companies/[id]] New columns not found, fetching without them. Run migrations to enable all features.");
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

      company = fallbackResult.data as CompanyRow | null;
      companyError = fallbackResult.error;

      if (company) {
        company.logo_url = null;
        company.header_style = "minimal";
        company.brand_color = null;
        company.runway_status = null;
        company.investor_view_config = { arrMrr: true, burnRunway: true, growthCharts: true, aiInsights: false, showForecast: true };
        company.preferred_metrics = null;
      }
    }

    if (companyError) {
      console.error("[api/companies] Supabase error:", companyError);
      const message = typeof companyError.message === "string" ? companyError.message : "Failed to fetch company";
      return NextResponse.json(
        { ok: false, error: message },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    if (!company) {
      return NextResponse.json(
        { ok: false, error: "Company not found" },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    if (!company.investor_view_config || typeof company.investor_view_config !== "object") {
      company.investor_view_config = { arrMrr: true, burnRunway: true, growthCharts: true, aiInsights: false, showForecast: true };
    }

    return NextResponse.json(
      { ok: true, company },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err: unknown) {
    console.error("[api/companies/[id]] Unexpected error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500, headers: NO_STORE_HEADERS }
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

const DEFAULT_INVESTOR_VIEW = {
  arrMrr: true,
  burnRunway: true,
  growthCharts: true,
  aiInsights: false,
  showForecast: true,
};

export async function PATCH(
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

    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return NextResponse.json({ error: authError || "Unauthorized" }, { status: 401 });
    }

    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id, owner_id")
      .eq("id", companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (company.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const config = {
      arrMrr: typeof body.arrMrr === "boolean" ? body.arrMrr : DEFAULT_INVESTOR_VIEW.arrMrr,
      burnRunway: typeof body.burnRunway === "boolean" ? body.burnRunway : DEFAULT_INVESTOR_VIEW.burnRunway,
      growthCharts: typeof body.growthCharts === "boolean" ? body.growthCharts : DEFAULT_INVESTOR_VIEW.growthCharts,
      aiInsights: typeof body.aiInsights === "boolean" ? body.aiInsights : DEFAULT_INVESTOR_VIEW.aiInsights,
      showForecast: typeof body.showForecast === "boolean" ? body.showForecast : DEFAULT_INVESTOR_VIEW.showForecast,
    };

    const { error: updateError } = await supabaseAdmin
      .from("companies")
      .update({ investor_view_config: config })
      .eq("id", companyId);

    if (updateError) {
      console.error("[api/companies/[id]] PATCH investor_view_config error:", updateError);
      const msg = updateError.message || "";
      const isMissingColumn =
        msg.includes("investor_view_config") ||
        (msg.includes("column") && msg.includes("does not exist")) ||
        (updateError as any).code === "42703";
      const errorMessage = isMissingColumn
        ? "Investor view config requires a database migration. Run: supabase db push or apply migration 20250126_investor_view_config."
        : "Failed to update investor view";
      return NextResponse.json(
        { error: errorMessage, details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, config });
  } catch (err: any) {
    console.error("[api/companies/[id]] PATCH unexpected error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
