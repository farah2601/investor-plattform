import { NextRequest, NextResponse } from "next/server";
import { getMcpBaseUrl, getMcpSecret } from "@/lib/mcp";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // 1) Get MCP configuration (fail loudly if missing)
    let MCP_URL: string;
    let MCP_SECRET: string;
    try {
      MCP_URL = getMcpBaseUrl();
      MCP_SECRET = getMcpSecret();
      console.log("[api/agent/metric-inference] MCP_URL:", MCP_URL);
      console.log("[api/agent/metric-inference] MCP_SECRET exists:", !!MCP_SECRET);
    } catch (configError: any) {
      console.error("[api/agent/metric-inference] MCP configuration error:", configError.message);
      return NextResponse.json(
        { ok: false, error: configError?.message || "MCP configuration error" },
        { status: 500 }
      );
    }

    // 2) Validate request payload
    const body = await req.json().catch(() => ({}));
    if (!body?.companyId) {
      return NextResponse.json(
        { ok: false, error: "Missing companyId" },
        { status: 400 }
      );
    }

    // 3) Call MCP server
    let res: Response;
    const fetchUrl = `${MCP_URL}/tools/metric_inference`;
    console.log("[api/agent/metric-inference] Calling MCP server:", fetchUrl);
    console.log("[api/agent/metric-inference] CompanyId:", body.companyId);
    try {
      res = await fetch(fetchUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-mcp-secret": MCP_SECRET,
        },
        body: JSON.stringify({ companyId: body.companyId }),
        cache: "no-store",
      });
      console.log("[api/agent/metric-inference] Response status:", res.status);
      console.log("[api/agent/metric-inference] Response ok:", res.ok);
    } catch (fetchError: any) {
      console.error("[api/agent/metric-inference] Fetch error:", fetchError.message);
      console.error("[api/agent/metric-inference] Fetch error stack:", fetchError.stack);
      return NextResponse.json(
        { 
          ok: false, 
          error: `Failed to connect to MCP server at ${MCP_URL}: ${fetchError.message}`,
          details: "Make sure MCP server is running"
        },
        { status: 500 }
      );
    }

    // 4) Parse response (try text first, then JSON)
    const text = await res.text().catch((err) => {
      console.error("[api/agent/metric-inference] Error reading response text:", err);
      return "";
    });
    console.log("[api/agent/metric-inference] Response text length:", text?.length || 0);
    const data = (() => {
      if (!text) {
        console.warn("[api/agent/metric-inference] Empty response text");
        return null;
      }
      try {
        const parsed = JSON.parse(text);
        console.log("[api/agent/metric-inference] Successfully parsed JSON response");
        return parsed;
      } catch (parseError) {
        console.error("[api/agent/metric-inference] JSON parse error:", parseError);
        // If not JSON, return raw text
        return { raw: text.substring(0, 500) };
      }
    })();

    // 5) Handle non-OK responses
    if (!res.ok) {
      console.error(`[api/agent/metric-inference] MCP server error (${res.status}):`, data);
      return NextResponse.json(
        { 
          ok: false, 
          error: data?.error || `MCP server returned ${res.status}`,
          status: res.status,
          data: data || null
        },
        { status: res.status >= 400 && res.status < 600 ? res.status : 500 }
      );
    }

    // 6) Success
    return NextResponse.json(data || { ok: true });
  } catch (err: any) {
    console.error("[api/agent/metric-inference] Unexpected error:", err);
    return NextResponse.json(
      { 
        ok: false, 
        error: err?.message || "Unknown error",
        details: err?.stack?.substring(0, 200)
      },
      { status: 500 }
    );
  }
}
