import { NextResponse } from "next/server";
import { getMcpBaseUrl } from "@/lib/mcp";
import { requireAuthAndCompanyAccess } from "@/lib/server/auth";


export const dynamic = "force-dynamic";

/**
 * POST /api/agent/run
 * 
 * Server-side proxy to MCP server's /tools/run_all endpoint.
 * 
 * This route:
 * 1) Validates request payload (companyId required)
 * 2) Requires authentication and company access
 * 3) Reads MCP server URL from env (MCP_URL, MCP_SERVER_URL, RAILWAY_BASE_URL)
 * 4) Reads MCP secret from env (MCP_SECRET, MCP_SERVER_SECRET, VALYXO_SECRET)
 * 5) Calls MCP /tools/run_all with secret header
 * 6) Returns MCP response to client
 * 
 * Secrets are never logged - only env var names and lengths are logged.
 */
export async function POST(req: Request) {
  try {
    // 1) Get MCP configuration
    let mcpBaseUrl: string;
    let mcpSecret: string;
    let secretEnvName: string;
    
    try {
      mcpBaseUrl = getMcpBaseUrl();
      
      // Get secret and track which env var was used (first non-empty, trimmed)
      const mcpSecretEnv = process.env.MCP_SECRET?.trim();
      const mcpServerSecretEnv = process.env.MCP_SERVER_SECRET?.trim();
      const valyxoSecretEnv = process.env.VALYXO_SECRET?.trim();
      
      if (mcpSecretEnv && mcpSecretEnv.length > 0) {
        mcpSecret = mcpSecretEnv;
        secretEnvName = "MCP_SECRET";
      } else if (mcpServerSecretEnv && mcpServerSecretEnv.length > 0) {
        mcpSecret = mcpServerSecretEnv;
        secretEnvName = "MCP_SERVER_SECRET";
      } else if (valyxoSecretEnv && valyxoSecretEnv.length > 0) {
        mcpSecret = valyxoSecretEnv;
        secretEnvName = "VALYXO_SECRET";
      } else {
        throw new Error("MCP secret not found in environment variables");
      }
      
      // Log which env var was used and header presence (not the secret itself)
      console.log("[api/agent/run] Using secret from:", secretEnvName);
      console.log("[api/agent/run] Secret length:", mcpSecret.length);
      console.log("[api/agent/run] Header will be present:", true);
    } catch (configError: unknown) {
      const errorMsg = configError instanceof Error ? configError.message : "MCP configuration error";
      console.error("[api/agent/run] MCP configuration error:", errorMsg);
      return NextResponse.json(
        { ok: false, error: "MCP configuration error" },
        { status: 500 }
      );
    }

    // 2) Validate request payload
    const body = await req.json().catch(() => ({}));
    const { companyId } = body;

    if (!companyId || typeof companyId !== "string") {
      console.error("[api/agent/run] Missing companyId in request body");
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
    const url = `${mcpBaseUrl}/tools/run_all`;
    console.log("[api/agent/run] Calling MCP run_all for companyId:", companyId);

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-mcp-secret": mcpSecret,
        },
        body: JSON.stringify({ companyId }),
        cache: "no-store",
      });
    } catch (fetchError: unknown) {
      // Network error - MCP unreachable
      const errorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
      console.error("[api/agent/run] MCP unreachable:", errorMsg);
      return NextResponse.json(
        {
          ok: false,
          error: "MCP server unreachable",
        },
        { status: 502 }
      );
    }

    // 5) Parse MCP response
    const text = await res.text().catch(() => "");
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // Invalid JSON response
      console.error("[api/agent/run] MCP returned invalid JSON:", text.substring(0, 200));
      return NextResponse.json(
        {
          ok: false,
          error: "MCP returned invalid response",
        },
        { status: 502 }
      );
    }

    // 6) Handle non-2xx responses
    if (!res.ok) {
      console.error("[api/agent/run] MCP returned error:", res.status);
      const errorData = typeof data === "object" && data !== null && "error" in data
        ? { ok: false, error: String(data.error) }
        : { ok: false, error: "Unauthorized" };
      
      return NextResponse.json(
        errorData,
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
      );
    }

    // Success - pass through MCP response
    const successData = typeof data === "object" && data !== null ? data : { ok: true };
    console.log("[api/agent/run] MCP run_all completed:", "ok" in successData && successData.ok ? "success" : "failed");
    return NextResponse.json(successData);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/agent/run] Unexpected error:", errorMsg);
    return NextResponse.json(
      { ok: false, error: "Unknown server error" },
      { status: 500 }
    );
  }
}
