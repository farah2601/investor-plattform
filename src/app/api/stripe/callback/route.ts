import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { encryptText } from "@/lib/server/crypto";

export const dynamic = "force-dynamic";

function getBaseUrl(req: Request): string {
  // Prefer BASE_URL env variable, fallback to request origin
  const envBase = process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL;
  if (envBase) return envBase.replace(/\/$/, "");
  const url = new URL(req.url);
  return url.origin;
}

/**
 * Get dashboard path for redirects.
 * IMPORTANT: This callback is called by Stripe (external redirect), so we cannot
 * rely on Authorization headers. We must redirect to a known, existing route.
 * The correct dashboard route is /company-dashboard (not /company).
 */
function getDashboardPath(): string {
  // Always use /company-dashboard - this is the actual route that exists
  // Do NOT use /company, /companies, or /dashboard as they may not exist
  return "/company-dashboard";
}

function safeMsg(msg: string) {
  // keep it short & URL safe (no secrets)
  return encodeURIComponent(msg.slice(0, 140));
}

export async function GET(req: Request) {
  const baseUrl = getBaseUrl(req);
  const dashboardPath = getDashboardPath();

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    // Validate query params
    if (!code || !state) {
      console.error("[api/stripe/callback] Missing code or state parameter");
      // Cannot extract companyId without state, redirect without it
      return NextResponse.redirect(
        `${baseUrl}${dashboardPath}?stripe=error&msg=${safeMsg("Invalid callback")}`
      );
    }

    // Validate state format: must contain ":"
    if (!state.includes(":")) {
      console.error("[api/stripe/callback] Invalid state format - missing colon");
      return NextResponse.redirect(
        `${baseUrl}${dashboardPath}?stripe=error&msg=${safeMsg("Invalid callback")}`
      );
    }

    // Extract companyId and nonce from state
    const [companyId, nonce] = state.split(":");
    if (!companyId || !nonce) {
      console.error("[api/stripe/callback] Invalid state format - missing companyId or nonce");
      return NextResponse.redirect(
        `${baseUrl}${dashboardPath}?stripe=error&msg=${safeMsg("Invalid callback")}`
      );
    }

    // Lookup integrations row
    const { data: integration, error: integErr } = await supabaseAdmin
      .from("integrations")
      .select("company_id, provider, status, oauth_state, oauth_state_expires_at")
      .eq("company_id", companyId)
      .eq("provider", "stripe")
      .maybeSingle();

    // Validate: row must exist
    if (integErr) {
      console.error("[api/stripe/callback] Database error fetching integration:", integErr);
      return NextResponse.redirect(
        `${baseUrl}${dashboardPath}?companyId=${encodeURIComponent(companyId)}&stripe=error&msg=${safeMsg("Database error")}`
      );
    }

    if (!integration) {
      console.error("[api/stripe/callback] Integration record not found for companyId:", companyId);
      return NextResponse.redirect(
        `${baseUrl}${dashboardPath}?companyId=${encodeURIComponent(companyId)}&stripe=error&msg=${safeMsg("Connection not found")}`
      );
    }

    // Validate: status must be "pending"
    if (integration.status !== "pending") {
      console.error("[api/stripe/callback] Integration status is not pending:", integration.status);
      return NextResponse.redirect(
        `${baseUrl}${dashboardPath}?companyId=${encodeURIComponent(companyId)}&stripe=error&msg=${safeMsg("Connection not pending")}`
      );
    }

    // Validate: oauth_state must match EXACTLY
    if (!integration.oauth_state || integration.oauth_state !== state) {
      console.error("[api/stripe/callback] State mismatch - possible CSRF attack", {
        stored: integration.oauth_state,
        received: state,
      });
      return NextResponse.redirect(
        `${baseUrl}${dashboardPath}?companyId=${encodeURIComponent(companyId)}&stripe=error&msg=${safeMsg("Security validation failed")}`
      );
    }

    // Validate: oauth_state_expires_at must exist and not be expired
    if (!integration.oauth_state_expires_at) {
      console.error("[api/stripe/callback] State missing expiry");
      // Cleanup and redirect
      await supabaseAdmin
        .from("integrations")
        .update({
          status: "not_connected",
          oauth_state: null,
          oauth_state_expires_at: null,
        })
        .eq("company_id", companyId)
        .eq("provider", "stripe");
      return NextResponse.redirect(
        `${baseUrl}${dashboardPath}?companyId=${encodeURIComponent(companyId)}&stripe=error`
      );
    }

    const exp = new Date(integration.oauth_state_expires_at).getTime();
    if (Number.isNaN(exp) || Date.now() > exp) {
      console.error("[api/stripe/callback] State expired");
      // Cleanup expired pending state
      await supabaseAdmin
        .from("integrations")
        .update({
          status: "not_connected",
          oauth_state: null,
          oauth_state_expires_at: null,
        })
        .eq("company_id", companyId)
        .eq("provider", "stripe");

      return NextResponse.redirect(
        `${baseUrl}${dashboardPath}?companyId=${encodeURIComponent(companyId)}&stripe=error&msg=${safeMsg("Session expired")}`
      );
    }

    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    const clientId = process.env.STRIPE_CLIENT_ID;
    const redirectUri = process.env.STRIPE_CONNECT_REDIRECT_URI;

    // Validate environment variables
    if (!stripeSecret) {
      console.error("[api/stripe/callback] STRIPE_SECRET_KEY is missing");
      await supabaseAdmin
        .from("integrations")
        .update({
          status: "not_connected",
          oauth_state: null,
          oauth_state_expires_at: null,
        })
        .eq("company_id", companyId)
        .eq("provider", "stripe");
      return NextResponse.redirect(
        `${baseUrl}${dashboardPath}?companyId=${encodeURIComponent(companyId)}&stripe=error&msg=${safeMsg("Server configuration error")}`
      );
    }
    if (!clientId || !clientId.startsWith("ca_")) {
      console.error("[api/stripe/callback] STRIPE_CLIENT_ID is invalid");
      await supabaseAdmin
        .from("integrations")
        .update({
          status: "not_connected",
          oauth_state: null,
          oauth_state_expires_at: null,
        })
        .eq("company_id", companyId)
        .eq("provider", "stripe");
      return NextResponse.redirect(
        `${baseUrl}${dashboardPath}?companyId=${encodeURIComponent(companyId)}&stripe=error&msg=${safeMsg("Server configuration error")}`
      );
    }
    if (!redirectUri) {
      console.error("[api/stripe/callback] STRIPE_CONNECT_REDIRECT_URI is missing");
      await supabaseAdmin
        .from("integrations")
        .update({
          status: "not_connected",
          oauth_state: null,
          oauth_state_expires_at: null,
        })
        .eq("company_id", companyId)
        .eq("provider", "stripe");
      return NextResponse.redirect(
        `${baseUrl}${dashboardPath}?companyId=${encodeURIComponent(companyId)}&stripe=error&msg=${safeMsg("Server configuration error")}`
      );
    }

    // Exchange code -> token
    const form = new URLSearchParams();
    form.set("grant_type", "authorization_code");
    form.set("code", code);
    form.set("client_secret", stripeSecret);
    // Including redirect_uri is often safer (must match the authorize call)
    form.set("redirect_uri", redirectUri);

    const tokenRes = await fetch("https://connect.stripe.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    const tokenJson = (await tokenRes.json()) as any;

    if (!tokenRes.ok || tokenJson.error) {
      const errMsg =
        tokenJson?.error_description ||
        tokenJson?.error ||
        `Stripe token exchange failed (${tokenRes.status})`;

      console.error("[api/stripe/callback] Token exchange failed:", errMsg);

      // Update status to not_connected on error and clear state
      await supabaseAdmin
        .from("integrations")
        .update({
          status: "not_connected",
          oauth_state: null,
          oauth_state_expires_at: null,
        })
        .eq("company_id", companyId)
        .eq("provider", "stripe");

      return NextResponse.redirect(
        `${baseUrl}${dashboardPath}?companyId=${encodeURIComponent(companyId)}&stripe=error&msg=${safeMsg("Token exchange failed")}`
      );
    }

    const stripeUserId: string | undefined = tokenJson.stripe_user_id; // acct_...
    const accessToken: string | undefined = tokenJson.access_token;

    // Require stripe_user_id (acct_...)
    if (!stripeUserId || !accessToken) {
      const errMsg = "Stripe response missing stripe_user_id or access_token";
      console.error("[api/stripe/callback] Missing required fields in token response:", {
        hasUserId: !!stripeUserId,
        hasAccessToken: !!accessToken,
      });

      // Update status to not_connected on error and clear state
      await supabaseAdmin
        .from("integrations")
        .update({
          status: "not_connected",
          oauth_state: null,
          oauth_state_expires_at: null,
        })
        .eq("company_id", companyId)
        .eq("provider", "stripe");

      return NextResponse.redirect(
        `${baseUrl}${dashboardPath}?companyId=${encodeURIComponent(companyId)}&stripe=error&msg=${safeMsg("Invalid response from Stripe")}`
      );
    }

    // Encrypt access_token for storage
    const accessTokenEncrypted = encryptText(accessToken);

    const nowIso = new Date().toISOString();
    // Generate masked account ID: "acct_****" + last 4 chars
    const maskedAcct =
      stripeUserId.length > 8
        ? `acct_****${stripeUserId.slice(-4)}`
        : stripeUserId;

    // Persist connected status and clear oauth_state fields
    // Store encrypted access token in secret_encrypted (used for both OAuth and manual keys)
    const { error: updateErr } = await supabaseAdmin
      .from("integrations")
      .update({
        status: "connected",
        stripe_account_id: stripeUserId,
        secret_encrypted: accessTokenEncrypted,
        connected_at: nowIso, // Set if null
        last_verified_at: nowIso,
        oauth_state: null,
        oauth_state_expires_at: null,
        masked: maskedAcct, // Masked account ID for display
      })
      .eq("company_id", companyId)
      .eq("provider", "stripe");

    if (updateErr) {
      console.error("[api/stripe/callback] Failed to update integration:", updateErr);
      // Still redirect - connection succeeded, just DB update failed
    }

    // Redirect back to dashboard with success
    return NextResponse.redirect(
      `${baseUrl}${dashboardPath}?companyId=${encodeURIComponent(companyId)}&stripe=connected`
    );
  } catch (e) {
    console.error("[api/stripe/callback] Unexpected error:", e);
    const baseUrl = getBaseUrl(req);
    const dashboardPath = getDashboardPath();
    // Try to extract companyId from state for redirect
    try {
      const url = new URL(req.url);
      const state = url.searchParams.get("state");
      const companyId = state?.split(":")[0];
      if (companyId) {
        return NextResponse.redirect(
          `${baseUrl}${dashboardPath}?companyId=${encodeURIComponent(companyId)}&stripe=error&msg=${safeMsg("Unexpected error")}`
        );
      }
    } catch {
      // Ignore
    }
    // Final fallback: no companyId available
    return NextResponse.redirect(
      `${baseUrl}${dashboardPath}?stripe=error&msg=${safeMsg("Invalid callback")}`
    );
  }
}