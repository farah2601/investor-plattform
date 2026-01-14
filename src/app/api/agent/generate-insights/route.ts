import { NextResponse } from "next/server";
import { getMcpBaseUrl, getMcpSecret } from "@/lib/mcp";

export const runtime = "nodejs";

export async function POST(req: Request) {
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