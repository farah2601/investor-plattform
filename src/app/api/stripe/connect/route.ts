import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAuthAndCompanyAccess } from "@/lib/server/auth";
import { getStripeClient } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

/**
 * Get base URL for redirects
 * Ensures we use https://www.valyxo.com (no non-www) for production
 */
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
  // Fallback to request origin (works for localhost and production)
  try {
    const url = new URL(req.url);
    return url.origin;
  } catch {
    // Final fallback to default production URL
    return "https://www.valyxo.com";
  }
}

/**
 * GET /api/stripe/connect
 * 
 * Initiates Stripe Connect flow using either Account Links (default) or OAuth.
 * Requires authentication and company access.
 * 
 * Query: ?companyId=...
 * 
 * Returns JSON with authorizeUrl (client will redirect to it) and mode.
 * 
 * Mode selection:
 * - STRIPE_CONNECT_MODE="account_links" (default): Uses server-side Stripe SDK
 * - STRIPE_CONNECT_MODE="oauth": Uses OAuth redirect flow (requires STRIPE_CLIENT_ID)
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const companyId = url.searchParams.get("companyId");
    
    if (!companyId) {
      return NextResponse.json({ ok: false, error: "Missing companyId" }, { status: 400 });
    }

    // Verify authentication and company access
    const { user, res: authRes } = await requireAuthAndCompanyAccess(req, companyId);
    if (authRes || !user) {
      return authRes || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Auto-detect mode based on available environment variables
    // This ensures backward compatibility with existing OAuth setups
    let mode: "account_links" | "oauth";
    
    if (process.env.STRIPE_CONNECT_MODE) {
      // Explicit mode override
      mode = process.env.STRIPE_CONNECT_MODE as "account_links" | "oauth";
    } else {
      // Auto-detect: prefer OAuth if CLIENT_ID is configured, otherwise use Account Links
      const hasOAuthConfig = !!(process.env.STRIPE_CLIENT_ID && process.env.STRIPE_CONNECT_REDIRECT_URI);
      mode = hasOAuthConfig ? "oauth" : "account_links";
      
      console.log("[api/stripe/connect] Auto-detected mode:", mode, {
        hasClientId: !!process.env.STRIPE_CLIENT_ID,
        hasRedirectUri: !!process.env.STRIPE_CONNECT_REDIRECT_URI,
        hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
      });
    }

    // TEST env consistency check: log mode without exposing secrets
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    const isTestSecret = stripeSecret?.startsWith("sk_test_") ?? false;
    const isLiveSecret = stripeSecret?.startsWith("sk_live_") ?? false;
    const envMode = isTestSecret ? "test" : isLiveSecret ? "live" : "unknown";
    const clientId = process.env.STRIPE_CLIENT_ID;
    const hasClientId = !!clientId;
    console.log("[api/stripe/connect] env check:", {
      envMode,
      hasClientId,
      clientIdPrefix: clientId?.substring(0, 3) || "missing", // Only log prefix, not full ID
      mode,
    });

    // Generate nonce and state for tracking (used in both modes)
    const nonce = crypto.randomUUID();
    const state = `${companyId}:${nonce}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    if (mode === "oauth") {
      // OAuth mode: require STRIPE_CLIENT_ID and STRIPE_CONNECT_REDIRECT_URI
      const clientId = process.env.STRIPE_CLIENT_ID;
      if (!clientId) {
        console.error("[api/stripe/connect] OAuth mode requires STRIPE_CLIENT_ID");
        return NextResponse.json(
          { ok: false, error: "STRIPE_CLIENT_ID must be set for OAuth mode" },
          { status: 500 }
        );
      }

      if (!clientId.startsWith("ca_")) {
        console.error("[api/stripe/connect] STRIPE_CLIENT_ID is invalid - must start with 'ca_'");
        return NextResponse.json(
          { ok: false, error: "STRIPE_CLIENT_ID must be a Connect Client ID starting with ca_" },
          { status: 500 }
        );
      }

      const redirectUri = process.env.STRIPE_CONNECT_REDIRECT_URI;
      if (!redirectUri) {
        console.error("[api/stripe/connect] OAuth mode requires STRIPE_CONNECT_REDIRECT_URI");
        return NextResponse.json(
          { ok: false, error: "STRIPE_CONNECT_REDIRECT_URI must be set for OAuth mode" },
          { status: 400 }
        );
      }

      // Store OAuth state for CSRF protection
      await supabaseAdmin
        .from("integrations")
        .upsert(
          {
            company_id: companyId,
            provider: "stripe",
            status: "pending",
            oauth_state: state,
            oauth_state_expires_at: expiresAt,
            updated_at: now,
          },
          { onConflict: "company_id,provider" }
        );

      // CRITICAL: redirect_uri must match EXACTLY what's used in /api/stripe/callback token exchange
      // Log redirect_uri for debugging (safe - it's a URL, not a secret)
      console.log("[api/stripe/connect] redirect_uri:", redirectUri);

      const stripeAuthorizeUrl =
        `https://connect.stripe.com/oauth/authorize` +
        `?response_type=code` +
        `&client_id=${encodeURIComponent(clientId)}` +
        `&scope=read_write` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${encodeURIComponent(state)}`;

      return NextResponse.json({
        ok: true,
        authorizeUrl: stripeAuthorizeUrl,
        mode: "oauth",
      });
    } else {
      // Account Links mode (default): use server-side Stripe SDK
      try {
        // Validate Stripe is configured before attempting API calls
        if (!process.env.STRIPE_SECRET_KEY) {
          console.error("[api/stripe/connect] STRIPE_SECRET_KEY is missing");
          return NextResponse.json(
            { 
              ok: false, 
              error: "STRIPE_SECRET_KEY is not configured",
              details: "Please add STRIPE_SECRET_KEY to your environment variables"
            },
            { status: 500 }
          );
        }

        const stripe = getStripeClient();
        const baseUrl = getBaseUrl(req);

        // Get existing integration to check for stripe_account_id
        const { data: existingIntegration } = await supabaseAdmin
          .from("integrations")
          .select("stripe_account_id")
          .eq("company_id", companyId)
          .eq("provider", "stripe")
          .maybeSingle();

        let stripeAccountId = existingIntegration?.stripe_account_id;

        // Create or reuse Stripe Express account
        if (!stripeAccountId) {
          console.log(`[api/stripe/connect] Creating new Stripe Express account for company ${companyId}`);
          // Use idempotency key to prevent duplicate accounts on retries
          const accountIdempotencyKey = `create-account-${companyId}`;
          const account = await stripe.accounts.create(
            { type: "express" },
            { idempotencyKey: accountIdempotencyKey }
          );
          stripeAccountId = account.id;
        } else {
          console.log(`[api/stripe/connect] Reusing existing Stripe account ${stripeAccountId} for company ${companyId}`);
        }

        // Create Account Link for onboarding
        // CRITICAL: return_url and refresh_url MUST include companyId
        // Use idempotency key to prevent duplicate links on retries
        const linkIdempotencyKey = `create-link-${companyId}-${nonce}`;
        const accountLink = await stripe.accountLinks.create(
          {
            account: stripeAccountId,
            refresh_url: `${baseUrl}/company-dashboard?companyId=${encodeURIComponent(companyId)}&stripe=refresh`,
            return_url: `${baseUrl}/company-dashboard?companyId=${encodeURIComponent(companyId)}&stripe=return`,
            type: "account_onboarding",
          },
          { idempotencyKey: linkIdempotencyKey }
        );

        // Update integrations row with pending status and account ID
        await supabaseAdmin
          .from("integrations")
          .upsert(
            {
              company_id: companyId,
              provider: "stripe",
              status: "pending",
              stripe_account_id: stripeAccountId,
              oauth_state: state, // Store state for consistency
              oauth_state_expires_at: expiresAt,
              updated_at: now,
            },
            { onConflict: "company_id,provider" }
          );

        return NextResponse.json({
          ok: true,
          authorizeUrl: accountLink.url,
          mode: "account_links",
        });
      } catch (stripeError: any) {
        const errorMessage = stripeError?.message || "Unknown error";
        const errorType = stripeError?.type || "Unknown";
        const errorCode = stripeError?.code || stripeError?.statusCode || "unknown";
        
        console.error("[api/stripe/connect] Stripe API error:", {
          message: errorMessage,
          type: errorType,
          code: errorCode,
          details: stripeError?.raw?.message || null,
        });
        
        // Update integration with error status
        try {
          await supabaseAdmin
            .from("integrations")
            .update({
              status: "not_connected",
              updated_at: new Date().toISOString(),
            })
            .eq("company_id", companyId)
            .eq("provider", "stripe");
        } catch (dbError) {
          console.error("[api/stripe/connect] Failed to update error status:", dbError);
        }

        // Provide more specific error messages
        let userMessage = "Failed to create Stripe account link";
        if (errorMessage.includes("You can only create new accounts if you've signed up for Connect")) {
          userMessage = "Stripe Connect is not enabled on your account. Please enable Stripe Connect in your Stripe Dashboard (https://dashboard.stripe.com/settings/connect).";
        } else if (errorMessage.includes("No such account")) {
          userMessage = "Stripe account not found. Please try connecting again.";
        } else if (errorMessage.includes("Invalid API Key") || errorMessage.includes("No API key provided")) {
          userMessage = "Invalid Stripe API key. Please check your STRIPE_SECRET_KEY configuration.";
        } else if (errorMessage.includes("You cannot perform this operation")) {
          userMessage = "Stripe operation not allowed. Please check your Stripe account permissions.";
        } else if (errorMessage.includes("STRIPE_SECRET_KEY")) {
          userMessage = "Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment variables.";
        }

        return NextResponse.json(
          { 
            ok: false, 
            error: userMessage,
            details: errorMessage,
            code: errorCode,
          },
          { status: 500 }
        );
      }
    }
  } catch (error: unknown) {
    console.error("[api/stripe/connect] Unexpected error:", error);
    return NextResponse.json(
      { ok: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
