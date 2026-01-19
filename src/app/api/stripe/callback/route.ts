import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { encryptText } from "@/lib/server/crypto";

export const dynamic = "force-dynamic";

function getBaseUrl(req: Request) {
  const envBase = process.env.BASE_URL;
  if (envBase) return envBase.replace(/\/$/, "");
  const url = new URL(req.url);
  return url.origin;
}

function safeMsg(msg: string) {
  // keep it short & URL safe (no secrets)
  return encodeURIComponent(msg.slice(0, 140));
}

export async function GET(req: Request) {
  const baseUrl = getBaseUrl(req);

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return NextResponse.redirect(
        `${baseUrl}/company-dashboard?stripe=error&msg=${safeMsg("Missing code or state")}`
      );
    }

    // state format: `${companyId}:${nonce}`
    const [companyId, nonce] = state.split(":");
    if (!companyId || !nonce) {
      return NextResponse.redirect(
        `${baseUrl}/company-dashboard?stripe=error&msg=${safeMsg("Invalid state format")}`
      );
    }

    // Fetch integration row and verify state / expiry / pending
    const { data: integration, error: integErr } = await supabaseAdmin
      .from("integrations")
      .select("company_id, provider, status, oauth_state, oauth_state_expires_at")
      .eq("company_id", companyId)
      .eq("provider", "stripe")
      .maybeSingle();

    if (integErr || !integration) {
      return NextResponse.redirect(
        `${baseUrl}/company-dashboard?companyId=${companyId}&stripe=error&msg=${safeMsg("Integration record not found")}`
      );
    }

    if (integration.status !== "pending") {
      return NextResponse.redirect(
        `${baseUrl}/company-dashboard?companyId=${companyId}&stripe=error&msg=${safeMsg("Stripe connection is not pending")}`
      );
    }

    if (!integration.oauth_state || integration.oauth_state !== state) {
      return NextResponse.redirect(
        `${baseUrl}/company-dashboard?companyId=${companyId}&stripe=error&msg=${safeMsg("State mismatch. Please try again.")}`
      );
    }

    if (!integration.oauth_state_expires_at) {
      return NextResponse.redirect(
        `${baseUrl}/company-dashboard?companyId=${companyId}&stripe=error&msg=${safeMsg("State missing expiry. Please try again.")}`
      );
    }

    const exp = new Date(integration.oauth_state_expires_at).getTime();
    if (Number.isNaN(exp) || Date.now() > exp) {
      // expire pending
      await supabaseAdmin
        .from("integrations")
        .update({
          status: "not_connected",
          oauth_state: null,
          oauth_state_expires_at: null,
          last_error: "OAuth state expired",
          last_error_at: new Date().toISOString(),
        })
        .eq("company_id", companyId)
        .eq("provider", "stripe");

      return NextResponse.redirect(
        `${baseUrl}/company-dashboard?companyId=${companyId}&stripe=error&msg=${safeMsg("Session expired. Please connect again.")}`
      );
    }

    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    const clientId = process.env.STRIPE_CLIENT_ID;
    const redirectUri = process.env.STRIPE_CONNECT_REDIRECT_URI;

    if (!stripeSecret) {
      return NextResponse.redirect(
        `${baseUrl}/company-dashboard?companyId=${companyId}&stripe=error&msg=${safeMsg("Server missing STRIPE_SECRET_KEY")}`
      );
    }
    if (!clientId || !clientId.startsWith("ca_")) {
      return NextResponse.redirect(
        `${baseUrl}/company-dashboard?companyId=${companyId}&stripe=error&msg=${safeMsg("Server missing STRIPE_CLIENT_ID")}`
      );
    }
    if (!redirectUri) {
      return NextResponse.redirect(
        `${baseUrl}/company-dashboard?companyId=${companyId}&stripe=error&msg=${safeMsg("Server missing STRIPE_CONNECT_REDIRECT_URI")}`
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

      await supabaseAdmin
        .from("integrations")
        .update({
          last_error: errMsg,
          last_error_at: new Date().toISOString(),
        })
        .eq("company_id", companyId)
        .eq("provider", "stripe");

      return NextResponse.redirect(
        `${baseUrl}/company-dashboard?companyId=${companyId}&stripe=error&msg=${safeMsg(errMsg)}`
      );
    }

    const stripeUserId: string | undefined = tokenJson.stripe_user_id; // acct_...
    const accessToken: string | undefined = tokenJson.access_token;

    if (!stripeUserId || !accessToken) {
      const errMsg = "Stripe response missing stripe_user_id or access_token";
      await supabaseAdmin
        .from("integrations")
        .update({
          last_error: errMsg,
          last_error_at: new Date().toISOString(),
        })
        .eq("company_id", companyId)
        .eq("provider", "stripe");

      return NextResponse.redirect(
        `${baseUrl}/company-dashboard?companyId=${companyId}&stripe=error&msg=${safeMsg(errMsg)}`
      );
    }

    // Encrypt access token for storage
    const accessTokenEncrypted = encryptText(accessToken);

    const nowIso = new Date().toISOString();
    const maskedAcct =
      stripeUserId.length > 8
        ? `${stripeUserId.slice(0, 5)}_****${stripeUserId.slice(-4)}`
        : stripeUserId;

    // Persist connected status and clear oauth_state fields
    await supabaseAdmin
      .from("integrations")
      .update({
        status: "connected",
        stripe_account_id: stripeUserId,
        oauth_access_token_encrypted: accessTokenEncrypted,
        connected_at: nowIso,
        last_verified_at: nowIso,
        oauth_state: null,
        oauth_state_expires_at: null,
        masked: maskedAcct, // optional: reuse existing masked field
        last_error: null,
        last_error_at: null,
      })
      .eq("company_id", companyId)
      .eq("provider", "stripe");

    // Redirect back to dashboard
    return NextResponse.redirect(
      `${baseUrl}/company-dashboard?companyId=${encodeURIComponent(companyId)}&stripe=connected`
    );
  } catch (e) {
    console.error("[api/stripe/callback] error", e);
    const baseUrl = getBaseUrl(req);
    return NextResponse.redirect(
      `${baseUrl}/company-dashboard?stripe=error&msg=${safeMsg("Unexpected error in callback")}`
    );
  }
}