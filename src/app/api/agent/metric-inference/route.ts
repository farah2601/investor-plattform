import { NextRequest, NextResponse } from "next/server";
import { getMcpBaseUrl, getMcpSecret } from "@/lib/mcp";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const MCP_URL = getMcpBaseUrl();
    const MCP_SECRET = getMcpSecret();

    const body = await req.json().catch(() => ({}));
    if (!body?.companyId) {
      return NextResponse.json(
        { ok: false, error: "Missing companyId" },
        { status: 400 }
      );
    }

    const r = await fetch(`${MCP_URL}/tools/metric_inference`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mcp-secret": MCP_SECRET,
      },
      body: JSON.stringify({ companyId: body.companyId }),
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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500 }
    );
  }
}
