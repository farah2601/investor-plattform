import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // important: we need to use fetch against localhost (mcp-server)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // (valgfritt men fint) enkel sjekk
    if (!body?.companyId) {
      return NextResponse.json(
        { ok: false, error: "Missing companyId" },
        { status: 400 }
      );
    }

    const MCP_URL = process.env.MCP_SERVER_URL || "http://localhost:3001";
    const secret = process.env.VALYXO_SECRET;

    if (!secret) {
      return NextResponse.json(
        { ok: false, error: "Missing VALYXO_SECRET in env" },
        { status: 500 }
      );
    }

    const r = await fetch(`${MCP_URL}/tools/run_kpi_refresh`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-valyxo-secret": secret,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await r.json().catch(() => null);

    if (!r.ok) {
      return NextResponse.json(
        { ok: false, error: "MCP error", status: r.status, data },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}