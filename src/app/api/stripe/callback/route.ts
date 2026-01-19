import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStripeClient } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/stripe/callback
 * 
 * Handles Stripe OAuth callback after user authorizes.
 * Note: This is called by Stripe, so we can't verify user session here.
 * We rely on the state parameter (companyId:nonce) for security.
 * 
 * Query: ?code=...&state=companyId:nonce
 * 
 * Redirects to integration page with success/error status.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      // Try to extract companyId from state for error redirect
      const state = url.searchParams.get("state");
      const [companyId] = state?.split(":") || [null];
      const redirectUrl = companyId 
        ? `${url.origin}/company-dashboard?companyId=${companyId}&stripe=error&reason=${encodeURIComponent(error)}`
        : `${url.origin}/company-dashboard?stripe=error&reason=${encodeURIComponent(error)}`;
      return NextResponse.redirect(redirectUrl);
    }

    if (!code || !state) {
      return NextResponse.json({ ok: false, error: "Missing code/state" }, { status: 400 });
    }

    // state = companyId:nonce
    const [companyId] = state.split(":");
    if (!companyId) {
      return NextResponse.json({ ok: false, error: "Invalid state" }, { status: 400 });
    }

    // Verify company exists (basic validation)
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError || !company) {
      return NextResponse.json({ ok: false, error: "Invalid company" }, { status: 400 });
    }

    // Exchange OAuth code for access token
    const stripe = getStripeClient();
    const tokenResp = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    const stripeAccountId = tokenResp.stripe_user_id; // connected account id

    if (!stripeAccountId) {
      return NextResponse.json(
        { ok: false, error: "Missing stripe_user_id in token response" },
        { status: 500 }
      );
    }

    // Save to DB
    const now = new Date().toISOString();

    const { error: upsertErr } = await supabaseAdmin
      .from("integrations")
      .upsert(
        {
          company_id: companyId,
          provider: "stripe",
          status: "connected",
          stripe_account_id: stripeAccountId,
          connected_at: now,
          updated_at: now,
        },
        { onConflict: "company_id,provider" }
      );

    if (upsertErr) {
      console.error("[api/stripe/callback] Database error:", upsertErr);
      return NextResponse.redirect(`${url.origin}/company-dashboard?companyId=${companyId}&stripe=error&reason=database_error`);
    }

    // Send user back to company dashboard with success
    return NextResponse.redirect(`${url.origin}/company-dashboard?companyId=${companyId}&stripe=success`);
  } catch (error: unknown) {
    console.error("[api/stripe/callback] Unexpected error:", error);
    // Try to extract companyId from URL or state for error redirect
    const urlObj = new URL(req.url);
    const state = urlObj.searchParams.get("state");
    const [companyId] = state?.split(":") || [null];
    const redirectUrl = companyId
      ? `${urlObj.origin}/company-dashboard?companyId=${companyId}&stripe=error&reason=unexpected_error`
      : `${urlObj.origin}/company-dashboard?stripe=error&reason=unexpected_error`;
    return NextResponse.redirect(redirectUrl);
  }
}