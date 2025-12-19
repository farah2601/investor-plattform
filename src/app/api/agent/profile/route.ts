import { NextResponse } from "next/server";
import { refreshCompanyProfile } from "@/lib/agent/profile/profileAgent";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const companyId = body.companyId as string | undefined;

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  try {
    const result = await refreshCompanyProfile(companyId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[/api/agent/profile] failed", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
