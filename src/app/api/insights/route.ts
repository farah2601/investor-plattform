import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const companyId = body?.companyId;

    if (!companyId) {
      return NextResponse.json({ ok: false, error: "Missing companyId" }, { status: 400 });
    }

    // Snakk med MCP-serveren
    const mcpUrl = process.env.MCP_SERVER_URL || "http://localhost:3001";

    const resp = await fetch(`${mcpUrl}/tools/generate_insights`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-valyxo-secret": process.env.VALYXO_SECRET || "",
      },
      body: JSON.stringify({ companyId }),
    });

    const data = await resp.json();

    return NextResponse.json(data, { status: resp.status });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}