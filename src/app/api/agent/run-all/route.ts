import { NextResponse } from "next/server";
import { getMcpBaseUrl, getMcpSecret } from "@/lib/mcp";
import { requireAuthAndCompanyAccess } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/agent/run-all
 * 
 * Pure gateway to MCP server's /tools/run_all endpoint.
 * 
 * This route:
 * 1) Validates request payload (companyId required)
 * 2) Requires authentication and company access
 * 3) Calls MCP /tools/run_all with { companyId }
 * 4) Returns MCP response to client (pass through ok/error)
 * 
 * NO Sheets sync, NO matching logic, NO DB writes (except logs if already used).
 */
export async function POST(req: Request) {
  try {
    // 1) Get MCP configuration (fail loudly if missing)
    let MCP_URL: string;
    let MCP_SECRET: string;
    
    try {
      MCP_URL = getMcpBaseUrl();
      MCP_SECRET = getMcpSecret();
    } catch (configError: any) {
      console.error("[api/agent/run-all] MCP configuration error:", configError.message);
      return NextResponse.json(
        { ok: false, error: configError?.message || "MCP configuration error" },
        { status: 500 }
      );
    }

    // 2) Validate request payload
    const body = await req.json().catch(() => ({}));
    const { companyId } = body;

    if (!companyId || typeof companyId !== "string") {
      console.error("[api/agent/run-all] Missing companyId in request body");
      return NextResponse.json(
        { ok: false, error: "Missing companyId" },
        { status: 400 }
      );
    }

    // 3) Require authentication and company access
    const { user, res: authRes } = await requireAuthAndCompanyAccess(req, companyId);
    if (authRes || !user) {
      return authRes || NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 4) Call MCP /tools/run_all
    const url = `${MCP_URL}/tools/run_all`;
    console.log("[api/agent/run-all] Calling MCP run_all for companyId:", companyId);

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-mcp-secret": MCP_SECRET,
        },
        body: JSON.stringify({ companyId }),
        cache: "no-store",
      });
    } catch (e: any) {
      // Network error - MCP unreachable
      console.error("[api/agent/run-all] MCP unreachable:", e.message);
      return NextResponse.json(
        {
          ok: false,
          error: "MCP server unreachable",
          details: e?.message || String(e),
        },
        { status: 502 }
      );
    }

    // 5) Parse MCP response
    const text = await res.text().catch(() => "");
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // Invalid JSON response
      console.error("[api/agent/run-all] MCP returned invalid JSON:", text.substring(0, 200));
      return NextResponse.json(
        {
          ok: false,
          error: "MCP returned invalid response",
          raw: text.substring(0, 200),
        },
        { status: 502 }
      );
    }

    // 6) Pass through MCP response
    if (!res.ok) {
      console.error("[api/agent/run-all] MCP returned error:", res.status, data);
      // Pass through MCP error response
      return NextResponse.json(
        data || { ok: false, error: "MCP returned error", status: res.status },
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
      );
    }

    // Success - pass through MCP response
    console.log("[api/agent/run-all] MCP run_all completed:", data?.ok ? "success" : "failed");
    return NextResponse.json(data || { ok: true });
  } catch (err: any) {
    console.error("[api/agent/run-all] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}