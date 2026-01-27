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

    const { data: existing } = await supabaseAdmin
      .from("companies")
      .select("metrics_excluded_sources")
      .eq("id", companyId)
      .single();

    const cur = (existing as any)?.metrics_excluded_sources;
    const prev = cur && typeof cur === "object" ? { ...cur } : {};
    const stripe = typeof body.stripe === "boolean" ? body.stripe : (!!prev.stripe);
    const sheets = typeof body.sheets === "boolean" ? body.sheets : (!!prev.sheets);
    const config = { stripe, sheets };

    const { error: updateError } = await supabaseAdmin
      .from("companies")
      .update({ metrics_excluded_sources: config })
      .eq("id", companyId);

    if (updateError) {
      console.error("[api/companies/[id]/metrics-excluded] PATCH error:", updateError);
      const msg = updateError.message || "";
      const isMissingColumn =
        msg.includes("metrics_excluded_sources") ||
        (msg.includes("column") && msg.includes("does not exist")) ||
        (updateError as any).code === "42703";
      const errorMessage = isMissingColumn
        ? "metrics_excluded_sources requires migration 20250127_metrics_excluded_sources."
        : "Failed to update metrics excluded sources";
      return NextResponse.json(
        { error: errorMessage, details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, config });
  } catch (err: any) {
    console.error("[api/companies/[id]/metrics-excluded] Unexpected error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
