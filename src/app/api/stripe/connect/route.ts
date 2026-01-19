import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAuthAndCompanyAccess } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/stripe/connect
 * 
 * Initiates Stripe OAuth Connect flow.
 * Requires authentication and company access.
 * 
 * Query: ?companyId=...
 * 
 * Returns JSON with authorizeUrl (client will redirect to it).
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

    // Validate STRIPE_CLIENT_ID exists and is a Connect Client ID (starts with "ca_")
    const clientId = process.env.STRIPE_CLIENT_ID;
    if (!clientId) {
      console.error("[api/stripe/connect] STRIPE_CLIENT_ID environment variable is not set");
      return NextResponse.json(
        { ok: false, error: "STRIPE_CLIENT_ID must be set to a Connect Client ID starting with ca_" },
        { status: 500 }
      );
    }

    if (!clientId.startsWith("ca_")) {
      console.error("[api/stripe/connect] STRIPE_CLIENT_ID is invalid - must start with 'ca_' (Connect Client ID), got:", clientId.substring(0, 10) + "...");
      return NextResponse.json(
        { ok: false, error: "STRIPE_CLIENT_ID must be set to a Connect Client ID starting with ca_" },
        { status: 500 }
      );
    }

    // Validate STRIPE_CONNECT_REDIRECT_URI exists (single source of truth)
    const redirectUri = process.env.STRIPE_CONNECT_REDIRECT_URI;
    if (!redirectUri) {
      console.error("[api/stripe/connect] STRIPE_CONNECT_REDIRECT_URI environment variable is not set");
      return NextResponse.json(
        { ok: false, error: "STRIPE_CONNECT_REDIRECT_URI must be set" },
        { status: 400 }
      );
    }

    

    const nonce = crypto.randomUUID();
const state = `${companyId}:${nonce}`;

const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

await supabaseAdmin
  .from("integrations")
  .upsert(
    {
      company_id: companyId,
      provider: "stripe",
      status: "pending",
      oauth_state: state,
      oauth_state_expires_at: expiresAt,
      last_error: null,
      last_error_at: null,
    },
    { onConflict: "company_id,provider" }
  );

    const stripeAuthorizeUrl =
      `https://connect.stripe.com/oauth/authorize` +
      `?response_type=code` +
      `&client_id=${encodeURIComponent(clientId)}` +
      `&scope=read_write` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(state)}`;

    // Return JSON instead of redirecting
    return NextResponse.json({
      ok: true,
      authorizeUrl: stripeAuthorizeUrl,
    });
  } catch (error: unknown) {
    console.error("[api/stripe/connect] Unexpected error:", error);
    return NextResponse.json(
      { ok: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}