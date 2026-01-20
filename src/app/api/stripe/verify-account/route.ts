import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAuthAndCompanyAccess } from "@/lib/server/auth";
import { getStripeClient } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/verify-account
 * 
 * Verifies and completes Account Links onboarding for a Stripe Express account.
 * Called after user returns from Stripe onboarding flow.
 * 
 * Body: { companyId: string }
 * 
 * Returns: { ok: true, connected: boolean } or error
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { companyId } = body;

    if (!companyId) {
      return NextResponse.json({ ok: false, error: "Missing companyId" }, { status: 400 });
    }

    // Verify authentication and company access
    const { user, res: authRes } = await requireAuthAndCompanyAccess(req, companyId);
    if (authRes || !user) {
      return authRes || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get integration with stripe_account_id
    const { data: integration, error: integError } = await supabaseAdmin
      .from("integrations")
      .select("stripe_account_id, status")
      .eq("company_id", companyId)
      .eq("provider", "stripe")
      .maybeSingle();

    if (integError) {
      console.error("[api/stripe/verify-account] Database error:", integError);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch integration" },
        { status: 500 }
      );
    }

    if (!integration?.stripe_account_id) {
      return NextResponse.json(
        { ok: false, error: "No Stripe account found for this company" },
        { status: 404 }
      );
    }

    // Verify account status with Stripe
    const stripe = getStripeClient();
    try {
      const account = await stripe.accounts.retrieve(integration.stripe_account_id);

      // Check if account is onboarded
      const isOnboarded = account.details_submitted && account.charges_enabled;
      
      if (isOnboarded) {
        // Account is fully onboarded - mark as connected
        const now = new Date().toISOString();
        
        // Generate masked account ID
        const maskedAcct =
          integration.stripe_account_id.length > 8
            ? `acct_****${integration.stripe_account_id.slice(-4)}`
            : integration.stripe_account_id;
        
        const { error: updateError } = await supabaseAdmin
          .from("integrations")
          .update({
            status: "connected",
            connected_at: now,
            last_verified_at: now,
            masked: maskedAcct,
            oauth_state: null,
            oauth_state_expires_at: null,
          })
          .eq("company_id", companyId)
          .eq("provider", "stripe");

        if (updateError) {
          console.error("[api/stripe/verify-account] Failed to update status:", updateError);
          return NextResponse.json(
            { ok: false, error: "Failed to update connection status" },
            { status: 500 }
          );
        }

        return NextResponse.json({
          ok: true,
          connected: true,
        });
      } else {
        // Account exists but not fully onboarded - keep as pending
        const now = new Date().toISOString();
        const maskedAcct =
          integration.stripe_account_id.length > 8
            ? `acct_****${integration.stripe_account_id.slice(-4)}`
            : integration.stripe_account_id;
        
        await supabaseAdmin
          .from("integrations")
          .update({
            status: "pending",
            last_verified_at: now,
            masked: maskedAcct,
          })
          .eq("company_id", companyId)
          .eq("provider", "stripe");

        return NextResponse.json({
          ok: true,
          connected: false,
          details: account.details_submitted ? "Account partially onboarded" : "Account onboarding incomplete",
        });
      }
    } catch (stripeError: any) {
      console.error("[api/stripe/verify-account] Stripe API error:", stripeError?.message || "Unknown error");
      return NextResponse.json(
        { 
          ok: false, 
          error: "Failed to verify Stripe account",
          details: stripeError?.message || "Unknown Stripe error",
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error("[api/stripe/verify-account] Unexpected error:", error);
    return NextResponse.json(
      { ok: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
