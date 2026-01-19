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
      .select("status, secret_encrypted, masked, last_verified_at, stripe_account_id, connected_at, oauth_state_expires_at")
      .eq("company_id", companyId)
      .eq("provider", "stripe")
      .maybeSingle();

    if (error) {
      // Check if error is due to missing columns
      const errorMessage = error.message || "";
      if (errorMessage.includes("does not exist") || errorMessage.includes("column")) {
        console.error("[api/stripe/status] Database schema error - columns may not exist yet:", errorMessage);
        // Return not connected if schema is not ready
        return NextResponse.json({
          ok: true,
          status: "not_connected",
          stripeAccountId: null,
          connectedAt: null,
          lastVerifiedAt: null,
          masked: null,
          pendingExpiresAt: null,
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

    // If no row exists, return not_connected
    if (!data) {
      return NextResponse.json({
        ok: true,
        status: "not_connected",
        stripeAccountId: null,
        connectedAt: null,
        lastVerifiedAt: null,
        masked: null,
        pendingExpiresAt: null,
      });
    }

    // Deterministic pending cleanup: If status="pending" but state expired or missing, treat as not_connected
    const isPendingStatus = data.status === "pending";
    let shouldCleanupPending = false;

    if (isPendingStatus) {
      if (!data.oauth_state_expires_at) {
        // Pending but no expiration - treat as not_connected
        shouldCleanupPending = true;
      } else {
        const expiresAt = new Date(data.oauth_state_expires_at).getTime();
        if (Number.isNaN(expiresAt) || Date.now() > expiresAt) {
          // Pending but expired - treat as not_connected
          shouldCleanupPending = true;
        }
      }
    }

    // Best-effort cleanup of expired pending state (fire and forget)
    if (shouldCleanupPending) {
      console.log("[api/stripe/status] Cleaning up expired pending state for companyId:", companyId);
      // Use void to explicitly ignore the promise result
      void (async () => {
        try {
          const { error: updateError } = await supabaseAdmin
            .from("integrations")
            .update({
              status: "not_connected",
              oauth_state: null,
              oauth_state_expires_at: null,
            })
            .eq("company_id", companyId)
            .eq("provider", "stripe");
          if (updateError) {
            console.error("[api/stripe/status] Failed to cleanup expired pending state:", updateError);
          }
        } catch (err: unknown) {
          console.error("[api/stripe/status] Error during cleanup:", err);
        }
      })();
    }

    // Determine connection status from DB:
    // - "connected": status === "connected" AND (stripe_account_id exists OR secret_encrypted exists)
    // - "pending": status === "pending" AND state not expired
    // - "not_connected": otherwise
    const hasOAuthConnection = !!data?.stripe_account_id;
    const hasManualConnection = !!data?.secret_encrypted && !hasOAuthConnection; // Manual if secret exists but no OAuth
    const isConnected = data?.status === "connected" && (hasOAuthConnection || hasManualConnection);
    const isPending = isPendingStatus && !shouldCleanupPending;

    // Return explicit status string: "not_connected" | "pending" | "connected"
    let statusString: "not_connected" | "pending" | "connected" = "not_connected";
    if (isConnected) {
      statusString = "connected";
    } else if (isPending) {
      statusString = "pending";
    }

    // Extract stripe account ID (only if OAuth connection exists)
    // Return masked/placeholder, never the actual account ID
    const stripeAccountId = hasOAuthConnection && data?.stripe_account_id
      ? data.stripe_account_id.length > 8
        ? `${data.stripe_account_id.slice(0, 5)}_****${data.stripe_account_id.slice(-4)}`
        : "***"
      : null;

    // Return stable response shape
    return NextResponse.json({
      ok: true,
      status: statusString,
      stripeAccountId,
      connectedAt: data?.connected_at || null,
      lastVerifiedAt: data?.last_verified_at || null,
      masked: data?.masked || stripeAccountId || null, // Prefer stored masked, fallback to generated
      pendingExpiresAt: isPending && data?.oauth_state_expires_at ? data.oauth_state_expires_at : null,
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
