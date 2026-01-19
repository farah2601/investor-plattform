import { NextResponse } from "next/server";
import { encryptText, decryptText } from "@/lib/server/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sample = "hello";
    const encrypted = encryptText(sample);
    const decrypted = decryptText(encrypted);

    return NextResponse.json({
      ok: true,
      parts: encrypted.split(".").length,   // forvent 3 når vi bruker "iv.tag.ciphertext"
      roundtrip: decrypted === sample,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "unknown error" },
      { status: 500 }
    );
  }
}