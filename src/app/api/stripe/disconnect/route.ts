import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAuthAndCompanyAccess } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/disconnect
 * 
 * Disconnects Stripe integration for a company.
 * Requires authentication and company access.
 * 
 * Body: { companyId: string }
 * 
 * Returns:
 * - { ok: true, connected: false }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { companyId } = body;

    if (!companyId || typeof companyId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid companyId" },
        { status: 400 }
      );
    }

    // Verify authentication and company access
    const { user, res: authRes } = await requireAuthAndCompanyAccess(req, companyId);
    if (authRes || !user) {
      return authRes || NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date().toISOString();

    // Update integration to disconnected state
    const { error: dbError } = await supabaseAdmin
      .from("integrations")
      .update({
        status: "disconnected",
        secret_encrypted: null,
        masked: null,
        updated_at: now,
      })
      .eq("company_id", companyId)
      .eq("provider", "stripe");

    if (dbError) {
      const errorMessage = dbError.message || "";
      // Check if error is due to missing columns - if so, just update status
      if (errorMessage.includes("does not exist") || errorMessage.includes("column")) {
        console.warn("[api/stripe/disconnect] Some columns don't exist, updating status only");
        const { error: statusError } = await supabaseAdmin
          .from("integrations")
          .update({
            status: "disconnected",
            updated_at: now,
          })
          .eq("company_id", companyId)
          .eq("provider", "stripe");
        
        if (statusError) {
          console.error("[api/stripe/disconnect] Database error:", statusError);
          return NextResponse.json(
            { ok: false, error: "Failed to disconnect integration" },
            { status: 500 }
          );
        }
      } else {
        console.error("[api/stripe/disconnect] Database error:", dbError);
        return NextResponse.json(
          { ok: false, error: "Failed to disconnect integration" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      connected: false,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[api/stripe/disconnect] Unexpected error:", errorMessage);
    return NextResponse.json(
      { ok: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
