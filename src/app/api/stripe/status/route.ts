import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAuthAndCompanyAccess } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/stripe/status
 * 
 * Returns Stripe integration status for a company (no secrets).
 * Requires authentication and company access.
 * 
 * Query: ?companyId=...
 * 
 * Returns:
 * - { ok: true, connected: boolean, status, masked, lastVerifiedAt }
 * - Never returns secret_encrypted
 */
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

    // Verify authentication and company access
    const { user, res: authRes } = await requireAuthAndCompanyAccess(req, companyId);
    if (authRes || !user) {
      return authRes || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Fetch integration status
    // Only select safe fields - never return secret_encrypted or stripe_account_id value
    const { data, error } = await supabaseAdmin
      .from("integrations")
      .select("status, secret_encrypted, masked, last_verified_at, stripe_account_id, connected_at")
      .eq("company_id", companyId)
      .eq("provider", "stripe")
      .maybeSingle();

    if (error) {
      // Check if error is due to missing columns
      const errorMessage = error.message || "";
      if (errorMessage.includes("does not exist") || errorMessage.includes("column")) {
        console.error("[api/stripe/status] Database schema error - columns may not exist yet");
        // Return not connected if schema is not ready
        return NextResponse.json({
          ok: true,
          connected: false,
          status: null,
          masked: null,
          lastVerifiedAt: null,
        });
      }
      console.error("[api/stripe/status] Database error:", {
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint,
        code: (error as any).code,
      });
      return NextResponse.json(
        { ok: false, error: "Failed to fetch status" },
        { status: 500 }
      );
    }

    // Determine connection status:
    // - connected: status === "connected" AND (stripe_account_id exists OR secret_encrypted exists for OAuth vs manual)
    // - pending: status === "pending" OR (status === "connected" but neither stripe_account_id nor secret_encrypted)
    const hasOAuthConnection = !!data?.stripe_account_id;
    const hasManualConnection = !!data?.secret_encrypted;
    const connected = data?.status === "connected" && (hasOAuthConnection || hasManualConnection);
    const pending = data?.status === "pending" || (data?.status === "connected" && !hasOAuthConnection && !hasManualConnection);

    // Return safe fields only - never include secret_encrypted or stripe_account_id value
    return NextResponse.json({
      ok: true,
      connected,
      pending,
      status: data?.status || null,
      masked: data?.masked || null,
      lastVerifiedAt: data?.last_verified_at || null,
      connectedAt: data?.connected_at || null,
      stripeAccountId: hasOAuthConnection ? "***" : null, // Return placeholder, not actual ID
      hasOAuthConnection: hasOAuthConnection, // Boolean - indicates OAuth connection exists
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[api/stripe/status] Unexpected error:", errorMessage);
    return NextResponse.json(
      { ok: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
