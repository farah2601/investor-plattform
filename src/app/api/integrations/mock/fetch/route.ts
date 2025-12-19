// app/api/integrations/mock/fetch/route.ts

import { NextResponse } from "next/server";

/**
 * Mock-integrasjon for selskapsdata.
 * Senere erstattes dette av Stripe / regnskap / CRM / etc.
 */
export async function POST(req: Request) {
  const body = await req.json();
  const { companyId } = body;

  if (!companyId) {
    return NextResponse.json(
      { error: "companyId is required" },
      { status: 400 }
    );
  }

  // Simuler litt variasjon per selskap
  const seed = companyId.length;

  const mockData = {
    mrr: 15000 + seed * 120,
    churnRate: 0.03,
    cac: 1800,
    ltv: 24000,
    cashBurn: 9000,
    runwayMonths: 14,
  };

  return NextResponse.json({
    companyId,
    source: "mock",
    data: mockData,
    fetchedAt: new Date().toISOString(),
  });
}