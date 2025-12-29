import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { companyId } = await req.json();

    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: "Missing companyId" },
        { status: 400 }
      );
    }

    const MCP_URL = process.env.MCP_SERVER_URL;
    const MCP_SECRET = process.env.MCP_SERVER_SECRET;

    if (!MCP_URL || !MCP_SECRET) {
      return NextResponse.json(
        { ok: false, error: "MCP config missing" },
        { status: 500 }
      );
    }

    const res = await fetch(`${MCP_URL}/tools/get_agent_logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mcp-secret": MCP_SECRET,
      },
      body: JSON.stringify({ companyId }),
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: data?.error || "MCP error" },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}