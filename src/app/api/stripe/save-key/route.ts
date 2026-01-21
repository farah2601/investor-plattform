// src/app/api/stripe/save-key/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { encryptText } from "@/lib/server/crypto";
import { requireAuthAndCompanyAccess } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

function maskKey(key: string): string {
  if (!key || key.length < 12) return "****";
  const prefix = key.substring(0, 8);
  const suffix = key.substring(key.length - 4);
  return `${prefix}${"*".repeat(Math.max(0, key.length - 12))}${suffix}`;
}

export async function POST(req: Request) {
  const body = await req.json();
  const { companyId, secretKey } = body;

  if (!companyId || typeof companyId !== "string") {
    return NextResponse.json({ ok: false, error: "Missing companyId" }, { status: 400 });
  }

  // ✅ Auth + access check
  const { res } = await requireAuthAndCompanyAccess(req, companyId);
  if (res) return res;

  if (!secretKey || typeof secretKey !== "string") {
    console.error("[save-key] Missing secretKey");
    return NextResponse.json({ ok: false, error: "Missing secretKey" }, { status: 400 });
  }

  console.log("[save-key] Validating key format...", { prefix: secretKey.substring(0, 8) });

  if (!secretKey.startsWith("sk_")) {
    console.error("[save-key] Invalid Stripe key format - must start with sk_");
    return NextResponse.json({ ok: false, error: "Invalid Stripe key format - must start with sk_" }, { status: 400 });
  }

  // Stripe verify
  console.log("[save-key] Verifying key with Stripe API...");
  try {
    const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" as any });
    await stripe.balance.retrieve();
    console.log("[save-key] ✅ Stripe API verification successful");
  } catch (err: any) {
    console.error("[save-key] ❌ Stripe API verification failed:", err.message);
    return NextResponse.json({ ok: false, error: "Invalid Stripe key. Please check your key and try again." }, { status: 400 });
  }

  console.log("[save-key] Encrypting key...");
  let encrypted: string;
  try {
    encrypted = encryptText(secretKey);
  } catch (err: any) {
    console.error("[save-key] ❌ Encryption failed:", err.message);
    return NextResponse.json({ ok: false, error: "Encryption failed. Please contact support." }, { status: 500 });
  }

  const masked = maskKey(secretKey);
  const now = new Date().toISOString();

  console.log("[save-key] Saving to database...");
  const { error: dbError } = await supabaseAdmin
    .from("integrations")
    .upsert(
      {
        company_id: companyId,
        provider: "stripe",
        secret_encrypted: encrypted,
        status: "connected",
        masked,
        last_verified_at: now,
        updated_at: now,
      },
      { onConflict: "company_id,provider" }
    );

  if (dbError) {
    console.error("[save-key] ❌ Database error:", dbError);
    return NextResponse.json({ ok: false, error: "Failed to save integration" }, { status: 500 });
  }

  console.log("[save-key] ✅ Successfully saved Stripe integration");
  return NextResponse.json({ ok: true, connected: true, masked, lastVerifiedAt: now });
}
/*
 * Testing:
 * 
 * 1. Check status:
 *    curl "http://localhost:3000/api/stripe/status?companyId=UUID" | jq
 * 
 * 2. Save key:
 *    curl -X POST "http://localhost:3000/api/stripe/save-key" \
 *      -H "Content-Type: application/json" \
 *      -d '{"companyId":"UUID","secretKey":"sk_live_..."}' | jq
 * 
 * 3. Disconnect:
 *    curl -X POST "http://localhost:3000/api/stripe/disconnect" \
 *      -H "Content-Type: application/json" \
 *      -d '{"companyId":"UUID"}' | jq
 */
