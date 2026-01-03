// app/api/integrations/mock/fetch/route.ts

import { NextResponse } from "next/server";

/**
 * Mock integration for company data.
 * Later this will be replaced by Stripe / accounting / CRM / etc.
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

  // Simulate some variation per company
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