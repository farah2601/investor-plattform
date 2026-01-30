import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { extractKpiValue } from "@/lib/server/kpiSnapshot";
import { requireAuthAndCompanyAccess } from "@/lib/server/auth";

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

    const { res: authRes } = await requireAuthAndCompanyAccess(req, companyId);
    if (authRes) return authRes;

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

    // Extract KPI values from kpis JSONB (handles both flat numbers and {value, source} format)
    const kpis = latestSnapshot.kpis as Record<string, unknown>;
    const updatePayload: Record<string, number> = {};

    const mrr = extractKpiValue(kpis?.mrr);
    if (mrr != null) updatePayload.mrr = mrr;
    const arr = extractKpiValue(kpis?.arr);
    if (arr != null) updatePayload.arr = arr;
    const burnRate = extractKpiValue(kpis?.burn_rate);
    if (burnRate != null) updatePayload.burn_rate = burnRate;
    const churn = extractKpiValue(kpis?.churn);
    if (churn != null) updatePayload.churn = churn;
    const growthPercent = extractKpiValue(kpis?.growth_percent);
    if (growthPercent != null) updatePayload.growth_percent = growthPercent;
    const runwayMonths = extractKpiValue(kpis?.runway_months);
    if (runwayMonths != null) updatePayload.runway_months = runwayMonths;
    const leadVelocity = extractKpiValue(kpis?.lead_velocity);
    if (leadVelocity != null) updatePayload.lead_velocity = leadVelocity;

    console.log("[refresh-from-snapshots] Updating companies with:", {
      companyId,
      periodDate: latestSnapshot.period_date,
      updatePayload,
    });

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({
        ok: true,
        companyId,
        periodDate: latestSnapshot.period_date,
        updated: {},
        message: "No KPI values to update in latest snapshot",
      });
    }

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
