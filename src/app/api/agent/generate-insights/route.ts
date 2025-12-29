import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const MCP_URL = process.env.MCP_SERVER_URL;
    const MCP_SECRET = process.env.MCP_SERVER_SECRET;

    if (!MCP_URL) {
      return NextResponse.json({ ok: false, error: "Missing MCP_SERVER_URL" }, { status: 500 });
    }
    if (!MCP_SECRET) {
      return NextResponse.json({ ok: false, error: "Missing MCP_SERVER_SECRET" }, { status: 500 });
    }

    const res = await fetch(`${MCP_URL}/tools/generate_insights`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-mcp-secret": MCP_SECRET,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await res.text();
    const data = (() => {
      try { return JSON.parse(text); } catch { return { raw: text }; }
    })();

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: data?.error || "MCP request failed", data },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}