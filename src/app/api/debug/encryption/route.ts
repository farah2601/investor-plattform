import { NextResponse } from "next/server";
import { encryptText, decryptText } from "@/lib/server/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sample = "hello";
    const enc = encryptText(sample);
    const dec = decryptText(enc);

    return NextResponse.json({
      ok: true,
      parts: enc.split(".").length,
      roundtrip: dec === sample,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "unknown error" },
      { status: 500 }
    );
  }
}