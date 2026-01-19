import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/stripe/health
 * 
 * Debug endpoint to check Stripe Connect environment variables.
 * Returns boolean flags only (no secret values).
 * 
 * Returns:
 * - { hasClientId: boolean, hasRedirectUri: boolean }
 */
export async function GET(req: Request) {
  try {
    const hasClientId = !!process.env.STRIPE_CLIENT_ID;
    const hasRedirectUri = !!process.env.STRIPE_CONNECT_REDIRECT_URI;

    return NextResponse.json({
      hasClientId,
      hasRedirectUri,
    });
  } catch (error: unknown) {
    console.error("[api/stripe/health] Unexpected error:", error);
    return NextResponse.json(
      { ok: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
