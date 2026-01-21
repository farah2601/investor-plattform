import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { encryptText } from "@/lib/server/crypto";
import { getStripeClient } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

function getBaseUrl(req: Request): string {
  // Prefer BASE_URL env variable, fallback to request origin
  const envBase = process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL;
  if (envBase) {
    // Normalize to ensure www for valyxo.com
    const normalized = envBase.replace(/\/$/, "");
    if (normalized.includes("valyxo.com") && !normalized.includes("www.")) {
      return normalized.replace("valyxo.com", "www.valyxo.com");
    }
    return normalized;
  }
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

function truncate(s: string, n = 600) {
  if (!s) return s;
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function safeMsg(msg: string) {
  // keep it short & URL safe (no secrets)
  return encodeURIComponent(msg.slice(0, 140));
}

/**
 * Handle Account Links return (no OAuth code/state)
 * Verifies account status using stripe_account_id from DB
 */
async function handleAccountLinksReturn(
  companyId: string,
  baseUrl: string,
  dashboardPath: string
): Promise<NextResponse> {
  try {
    // Get integration with stripe_account_id
    const { data: integration, error: integError } = await supabaseAdmin
      .from("integrations")
      .select("stripe_account_id, status")
      .eq("company_id", companyId)
      .eq("provider", "stripe")
      .maybeSingle();

    if (integError) {
      console.error("[api/stripe/callback] Database error:", integError);
      return NextResponse.redirect(
        `${baseUrl}${dashboardPath}?companyId=${encodeURIComponent(companyId)}&stripe=error&msg=${safeMsg("Failed to fetch integration")}`
      );
    }

    if (!integration?.stripe_account_id) {
      return NextResponse.redirect(
        `${baseUrl}${dashboardPath}?companyId=${encodeURIComponent(companyId)}&stripe=error&msg=${safeMsg("No Stripe account found")}`
      );
    }

    // Verify account status with Stripe
    const stripe = getStripeClient();
    let account;
    try {
      account = await stripe.accounts.retrieve(integration.stripe_account_id);
    } catch (stripeError: any) {
      console.error("[api/stripe/callback] Failed to retrieve account:", stripeError);
      return NextResponse.redirect(
        `${baseUrl}${dashboardPath}?companyId=${encodeURIComponent(companyId)}&stripe=error&msg=${safeMsg("Failed to verify Stripe account")}`
      );
    }

    // Check if account is onboarded
    const isOnboarded = account.details_submitted && account.charges_enabled;
    const now = new Date().toISOString();
    
    // Generate masked account ID
    const maskedAcct =
      integration.stripe_account_id.length > 8
        ? `acct_****${integration.stripe_account_id.slice(-4)}`
        : integration.stripe_account_id;

    if (isOnboarded) {
      // Account is fully onboarded - mark as connected
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
        console.error("[api/stripe/callback] Failed to update status:", updateError);
        // Still redirect to success since account is onboarded
      }

      return NextResponse.redirect(
        `${baseUrl}${dashboardPath}?companyId=${encodeURIComponent(companyId)}&stripe=connected`
      );
    } else {
      // Account exists but not fully onboarded - keep as pending
      const { error: updateError } = await supabaseAdmin
        .from("integrations")
        .update({
          status: "pending",
          last_verified_at: now,
          masked: maskedAcct,
        })
        .eq("company_id", companyId)
        .eq("provider", "stripe");

      if (updateError) {
        console.error("[api/stripe/callback] Failed to update pending status:", updateError);
      }

      // Redirect with pending status - frontend will handle showing "Finish onboarding"
      return NextResponse.redirect(
        `${baseUrl}${dashboardPath}?companyId=${encodeURIComponent(companyId)}&stripe=pending`
      );
    }
  } catch (error: unknown) {
    console.error("[api/stripe/callback] Error handling Account Links return:", error);
    return NextResponse.redirect(
      `${baseUrl}${dashboardPath}?companyId=${encodeURIComponent(companyId)}&stripe=error&msg=${safeMsg("Unexpected error")}`
    );
  }
}

/**
 * Handle OAuth callback (with code and state)
 */
async function handleOAuthCallback(
  code: string,
  state: string,
  baseUrl: string,
  dashboardPath: string
): Promise<NextResponse> {
  // Extract companyId and nonce from state
  if (!state.includes(":")) {
    console.error("[api/stripe/callback] Invalid state format - missing colon");
    return NextResponse.redirect(
      `${baseUrl}${dashboardPath}?stripe=error&msg=${safeMsg("Invalid callback")}`
    );
  }

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
  // Enhanced logging for state mismatch debugging (no secrets)
  if (!integration.oauth_state || integration.oauth_state !== state) {
    console.error("[api/stripe/callback] State mismatch - possible CSRF attack or double-click", {
      companyId,
      receivedState: state,
      storedState: integration.oauth_state,
      storedStateLength: integration.oauth_state?.length || 0,
      receivedStateLength: state.length,
      integrationStatus: integration.status,
      oauthStateExpiresAt: integration.oauth_state_expires_at,
      statesMatch: integration.oauth_state === state,
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

  // Log environment variables for debugging (safe - only suffix/prefix, not full secrets)
  console.log("[stripe] secret suffix:", stripeSecret?.slice(-6));
  console.log("[stripe] client id:", process.env.STRIPE_CLIENT_ID);
  console.log("[stripe] redirect uri:", process.env.STRIPE_CONNECT_REDIRECT_URI);

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

  // Mode mismatch guard: check test vs live
  const isLiveSecret = stripeSecret.startsWith("sk_live_");
  const isTestSecret = stripeSecret.startsWith("sk_test_");
  if (!isTestSecret && !isLiveSecret) {
    console.error("[api/stripe/callback] STRIPE_SECRET_KEY format invalid - must start with sk_test_ or sk_live_");
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
      `${baseUrl}${dashboardPath}?companyId=${encodeURIComponent(companyId)}&stripe=error&msg=${safeMsg("Stripe setup mismatch (test vs live). Switch keys or connect mode.")}`
    );
  }

  // CRITICAL: redirect_uri must match EXACTLY what was used in /api/stripe/connect authorizeUrl
  // Log redirect_uri for debugging (safe - it's a URL, not a secret)
  console.log("[stripe oauth callback] redirect_uri:", redirectUri);
  console.log("[stripe oauth callback] client_id prefix:", clientId.substring(0, 10));
  console.log("[stripe oauth callback] secret_key mode:", isTestSecret ? "test" : isLiveSecret ? "live" : "unknown");

  // Exchange code -> token
  const form = new URLSearchParams();
  form.set("grant_type", "authorization_code");
  form.set("code", code);
  form.set("client_secret", stripeSecret);
  // CRITICAL: redirect_uri must match EXACTLY what was sent in authorizeUrl
  // Stripe validates this string match, so any difference (trailing slash, encoding, etc.) will fail
  form.set("redirect_uri", redirectUri);

  // Log request details BEFORE sending (safe - no secrets exposed)
  console.log("[stripe oauth token exchange] Request details:", {
    grant_type: "authorization_code",
    code_length: code.length,
    code_prefix: code.substring(0, 10) + "...", // First 10 chars only
    redirect_uri: redirectUri, // Safe to log - it's a URL
    redirect_uri_length: redirectUri.length,
    client_secret_prefix: stripeSecret.substring(0, 10) + "...", // First 10 chars only
    client_secret_length: stripeSecret.length,
    form_body_length: form.toString().length,
  });

  // Log the exact redirect_uri that will be sent (for comparison with /connect)
  console.log("[stripe oauth token exchange] redirect_uri being sent:", JSON.stringify(redirectUri));

  const tokenRes = await fetch("https://connect.stripe.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  // Read raw response text first, then try JSON.parse
  const raw = await tokenRes.text();
  let tokenJson: any = null;
  try {
    tokenJson = JSON.parse(raw);
  } catch {
    tokenJson = { parse_error: true };
  }

  if (!tokenRes.ok || tokenJson.error) {
    // Extract Stripe error details (safe - no secrets)
    const stripeError = tokenJson?.error || null;
    const stripeDesc = tokenJson?.error_description || null;

    // Determine mode for logging
    const envMode = isTestSecret ? "test" : isLiveSecret ? "live" : "unknown";
    const clientMode = clientId.startsWith("ca_") ? "connect" : "unknown";

    // Log comprehensive error details (never log secrets)
    console.error("[stripe oauth token] status:", tokenRes.status);
    console.error("[stripe oauth token] tokenJson:", {
      error: stripeError,
      error_description: stripeDesc ? truncate(stripeDesc) : null,
      parse_error: tokenJson.parse_error || false,
    });
    console.error("[stripe oauth token] raw_truncated:", truncate(raw));
    console.error("[stripe oauth token] env_mode:", envMode);
    console.error("[stripe oauth token] client_mode:", clientMode);
    // Log redirect_uri used in token exchange for comparison with /connect
    console.error("[stripe oauth token] redirect_uri used:", redirectUri);

    // Check for mode mismatch (live secret but test flow detected)
    // Note: We can't directly detect if user is in test connect flow from callback,
    // but we log the mode info above for diagnosis
    if (isLiveSecret && stripeError === "invalid_grant") {
      console.error("[stripe oauth] mode mismatch: live secret but token exchange failed - possible test/live mismatch");
    }

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

    // Create user-friendly error message
    let userMsg = "Token exchange failed";
    if (stripeDesc) {
      // Sanitize Stripe's error description for user display
      const lowerDesc = stripeDesc.toLowerCase();
      const sanitized = (lowerDesc.includes("test") || lowerDesc.includes("live"))
        ? "Stripe auth failed. Check Stripe app keys (test vs live)."
        : "Stripe auth failed. Try again.";
      userMsg = sanitized;
    } else if (stripeError) {
      userMsg = "Stripe auth failed. Try again.";
    }

    return NextResponse.redirect(
      `${baseUrl}${dashboardPath}?companyId=${encodeURIComponent(companyId)}&stripe=error&msg=${safeMsg(userMsg)}`
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
}

export async function GET(req: Request) {
  const baseUrl = getBaseUrl(req);
  const dashboardPath = getDashboardPath();

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    
    // Check for Account Links return (stripe=return in query params)
    // Account Links mode doesn't use OAuth code/state
    const stripeParam = url.searchParams.get("stripe");
    const companyIdFromQuery = url.searchParams.get("companyId");

    // Validate query params - log all callback query keys for debugging
    const allQueryKeys = Array.from(url.searchParams.keys());
    console.log("[api/stripe/callback] query params:", allQueryKeys);

    // If this is an Account Links return (stripe=return or stripe=refresh)
    if (stripeParam === "return" || stripeParam === "refresh") {
      // Require companyId in query params for Account Links mode
      if (!companyIdFromQuery) {
        console.error("[api/stripe/callback] Account Links return missing companyId");
        return NextResponse.redirect(
          `${baseUrl}${dashboardPath}?stripe=error&msg=${safeMsg("Missing company ID")}`
        );
      }

      if (stripeParam === "refresh") {
        // Link expired - just redirect with refresh status
        return NextResponse.redirect(
          `${baseUrl}${dashboardPath}?companyId=${encodeURIComponent(companyIdFromQuery)}&stripe=refresh`
        );
      }

      // Handle Account Links return (verify account status)
      return handleAccountLinksReturn(companyIdFromQuery, baseUrl, dashboardPath);
    }

    // OAuth mode: require code and state
    if (!code || !state) {
      console.error("[api/stripe/callback] Missing code or state parameter (OAuth mode)", {
        hasCode: !!code,
        hasState: !!state,
        allParams: allQueryKeys,
      });
      // If companyId is available, include it in redirect
      if (companyIdFromQuery) {
        return NextResponse.redirect(
          `${baseUrl}${dashboardPath}?companyId=${encodeURIComponent(companyIdFromQuery)}&stripe=error&msg=${safeMsg("Invalid callback - missing OAuth parameters")}`
        );
      }
      // Cannot extract companyId without state, redirect without it
      return NextResponse.redirect(
        `${baseUrl}${dashboardPath}?stripe=error&msg=${safeMsg("Invalid callback - missing OAuth parameters")}`
      );
    }

    // Handle OAuth callback
    return handleOAuthCallback(code, state, baseUrl, dashboardPath);
  } catch (e) {
    console.error("[api/stripe/callback] Unexpected error:", e);
    const baseUrl = getBaseUrl(req);
    const dashboardPath = getDashboardPath();
    // Try to extract companyId from query params for redirect
    try {
      const url = new URL(req.url);
      const companyId = url.searchParams.get("companyId");
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
      `${baseUrl}${dashboardPath}?stripe=error&msg=${safeMsg("Unexpected error")}`
    );
  }
}
