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

export async function POST(
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

    console.log("[api/companies/[id]/kpi-history/backfill] Backfilling for companyId:", companyId);

    // Fetch current snapshot from companies table
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("arr, mrr, burn_rate")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError) {
      console.error("[api/companies/[id]/kpi-history/backfill] Database error:", companyError);
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

    // Create 2 historical records: 30 days ago and now
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const records = [
      {
        company_id: companyId,
        recorded_at: thirtyDaysAgo.toISOString(),
        arr: company.arr,
        mrr: company.mrr,
        burn_rate: company.burn_rate,
      },
      {
        company_id: companyId,
        recorded_at: now.toISOString(),
        arr: company.arr,
        mrr: company.mrr,
        burn_rate: company.burn_rate,
      },
    ];

    console.log("[api/companies/[id]/kpi-history/backfill] Inserting", records.length, "records");

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("company_kpi_history")
      .insert(records)
      .select();

    if (insertError) {
      console.error("[api/companies/[id]/kpi-history/backfill] Insert error:", insertError);
      return NextResponse.json(
        { ok: false, error: "Failed to insert history", details: insertError.message },
        { status: 500 }
      );
    }

    console.log("[api/companies/[id]/kpi-history/backfill] Successfully inserted", inserted?.length || 0, "records");

    return NextResponse.json(
      { ok: true, inserted: inserted?.length || 0 },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/companies/[id]/kpi-history/backfill] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    );
  }
}
