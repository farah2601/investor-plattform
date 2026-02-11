import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VALID_METRIC_KEYS = [
  "cash_balance",
  "burn_rate",
  "runway_months",
  "churn",
  "mrr",
  "arr",
  "net_revenue",
  "customers",
  "mrr_growth_mom",
] as const;

function isValidUUID(str: string | null | undefined): boolean {
  if (!str) return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

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
    const raw = body.metrics;
    const metrics: string[] = Array.isArray(raw)
      ? raw
          .filter((m: unknown) => typeof m === "string")
          .filter((k) => VALID_METRIC_KEYS.includes(k as any))
      : [];

    const value = metrics.length > 0 ? metrics : null;

    const { error: updateError } = await supabaseAdmin
      .from("companies")
      .update({ preferred_metrics: value })
      .eq("id", companyId);

    if (updateError) {
      console.error("[api/companies/[id]/preferred-metrics] PATCH error:", updateError);
      const msg = updateError.message || "";
      const isMissingColumn =
        msg.includes("preferred_metrics") ||
        (msg.includes("column") && msg.includes("does not exist")) ||
        (updateError as any).code === "42703";
      const errorMessage = isMissingColumn
        ? "preferred_metrics requires migration 20260202_add_preferred_metrics."
        : "Failed to update preferred metrics";
      return NextResponse.json(
        { error: errorMessage, details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, metrics: value });
  } catch (err: any) {
    console.error("[api/companies/[id]/preferred-metrics] Unexpected error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
