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
    return NextResponse.json({ ok: false, error: "Missing secretKey" }, { status: 400 });
  }

  if (!secretKey.startsWith("sk_")) {
    return NextResponse.json({ ok: false, error: "Invalid Stripe key format" }, { status: 400 });
  }

  // Stripe verify
  try {
    const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" as any });
    await stripe.balance.retrieve();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid Stripe key. Please check your key and try again." }, { status: 400 });
  }

  const encrypted = encryptText(secretKey);
  const masked = maskKey(secretKey);
  const now = new Date().toISOString();

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
    return NextResponse.json({ ok: false, error: "Failed to save integration" }, { status: 500 });
  }

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
