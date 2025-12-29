import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const MCP_URL = process.env.MCP_SERVER_URL; // lokalt: http://localhost:3001
    const MCP_SECRET = process.env.MCP_SERVER_SECRET;

    if (!MCP_URL) {
      return NextResponse.json({ ok: false, error: "Missing MCP_SERVER_URL" }, { status: 500 });
    }
    if (!MCP_SECRET) {
      return NextResponse.json({ ok: false, error: "Missing MCP_SERVER_SECRET" }, { status: 500 });
    }

    const res = await fetch(`${MCP_URL}/tools/run_all`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mcp-secret": MCP_SECRET,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: data?.error || "MCP run_all failed", data },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}