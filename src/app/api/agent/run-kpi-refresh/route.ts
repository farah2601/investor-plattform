import { NextRequest, NextResponse } from "next/server";
import { getMcpBaseUrl, getMcpSecret } from "@/lib/mcp";

export const runtime = "nodejs"; // important: we need to use fetch against localhost (mcp-server)

export async function POST(req: NextRequest) {
  try {
    let MCP_URL: string;
    let MCP_SECRET: string;
    try {
      MCP_URL = getMcpBaseUrl();
      MCP_SECRET = getMcpSecret();
    } catch (configError: any) {
      return NextResponse.json(
        { ok: false, error: configError?.message || "MCP configuration error" },
        { status: 500 }
      );
    }

    const body = await req.json();

    // (valgfritt men fint) enkel sjekk
    if (!body?.companyId) {
      return NextResponse.json(
        { ok: false, error: "Missing companyId" },
        { status: 400 }
      );
    }

    const r = await fetch(`${MCP_URL}/tools/run_kpi_refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mcp-secret": MCP_SECRET,
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