import { NextResponse } from "next/server";

export async function GET() {
  const insights = [
    "MRR opp ~8 % siste 30 dager, drevet hovedsakelig av ekspansjon hos eksisterende kunder.",
    "Burn er stabil – runway estimert til rundt 13 måneder på dagens nivå.",
    "Netto churn under 3 % siste kvartal, og trenden er svakt fallende.",
  ];

  return NextResponse.json({
    insights,
    generatedAt: new Date().toISOString(),
  });
}
