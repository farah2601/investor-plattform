import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;

    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: "Missing companyId" },
        { status: 400 }
      );
    }

    // Get latest snapshot from kpi_snapshots
    const { data: latestSnapshot, error: snapshotError } = await supabaseAdmin
      .from("kpi_snapshots")
      .select("period_date, kpis")
      .eq("company_id", companyId)
      .order("period_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (snapshotError) {
      console.error("[refresh-from-snapshots] Error fetching snapshot:", snapshotError);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch latest snapshot", details: snapshotError.message },
        { status: 500 }
      );
    }

    if (!latestSnapshot || !latestSnapshot.kpis) {
      return NextResponse.json(
        { ok: false, error: "No snapshots found for this company" },
        { status: 404 }
      );
    }

    // Extract KPI values from kpis JSONB
    const kpis = latestSnapshot.kpis as any;
    const updatePayload: any = {};

    if (kpis.mrr !== null && kpis.mrr !== undefined) {
      updatePayload.mrr = Math.round(Number(kpis.mrr));
    }
    if (kpis.arr !== null && kpis.arr !== undefined) {
      updatePayload.arr = Math.round(Number(kpis.arr));
    }
    if (kpis.burn_rate !== null && kpis.burn_rate !== undefined) {
      updatePayload.burn_rate = Math.round(Number(kpis.burn_rate));
    }
    if (kpis.churn !== null && kpis.churn !== undefined) {
      updatePayload.churn = Number(kpis.churn);
    }
    if (kpis.growth_percent !== null && kpis.growth_percent !== undefined) {
      updatePayload.growth_percent = Number(kpis.growth_percent);
    }
    if (kpis.runway_months !== null && kpis.runway_months !== undefined) {
      updatePayload.runway_months = Number(kpis.runway_months);
    }
    if (kpis.lead_velocity !== null && kpis.lead_velocity !== undefined) {
      updatePayload.lead_velocity = Math.round(Number(kpis.lead_velocity));
    }

    console.log("[refresh-from-snapshots] Updating companies with:", {
      companyId,
      periodDate: latestSnapshot.period_date,
      updatePayload,
    });

    // Update companies table
    const { data: updatedCompany, error: updateError } = await supabaseAdmin
      .from("companies")
      .update(updatePayload)
      .eq("id", companyId)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error("[refresh-from-snapshots] Update error:", updateError);
      return NextResponse.json(
        { ok: false, error: "Failed to update company", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      companyId,
      periodDate: latestSnapshot.period_date,
      updated: updatePayload,
      company: updatedCompany,
    });
  } catch (err: any) {
    console.error("[refresh-from-snapshots] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
