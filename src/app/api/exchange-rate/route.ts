import { NextResponse } from "next/server";
import { getExchangeRate } from "@/lib/exchangeRate";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from") || "USD";
  const to = url.searchParams.get("to") || "USD";
  const rate = await getExchangeRate(from, to);
  if (rate === null) {
    return NextResponse.json(
      { ok: false, error: "Unsupported currency pair or rate unavailable" },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true, rate, from, to });
}
