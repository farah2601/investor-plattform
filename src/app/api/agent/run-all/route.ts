import { NextResponse } from "next/server";
import { getMcpBaseUrl, getMcpSecret } from "@/lib/mcp";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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

    const body = await req.json().catch(() => ({}));
    const { companyId } = body;

    // Add detailed logging
    console.log("[api/agent/run-all] Received request body:", body);
    console.log("[api/agent/run-all] Extracted companyId:", companyId);

    if (!companyId) {
      console.error("[api/agent/run-all] Missing companyId in request body");
      return NextResponse.json(
        { ok: false, error: "Missing companyId", receivedBody: body },
        { status: 400 }
      );
    }

    // CRITICAL: Before running agent, sync Google Sheets if configured
    // This ensures KPIs are up-to-date before insights generation
    try {
      const { data: company } = await supabaseAdmin
        .from("companies")
        .select("id, google_sheets_url, google_sheets_last_sync_by")
        .eq("id", companyId)
        .maybeSingle();

      if (company && (company.google_sheets_url || company.google_sheets_last_sync_by === "google-sheets")) {
        console.log("[api/agent/run-all] Google Sheets configured, syncing KPIs first...");
        
        // Call internal sheets sync endpoint (use relative URL for same-origin request)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
        const syncRes = await fetch(`${baseUrl}/api/sheets/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId }),
          cache: "no-store",
        });

        if (syncRes.ok) {
          const syncData = await syncRes.json().catch(() => ({}));
          console.log("[api/agent/run-all] Sheets sync completed:", syncData?.ok ? "success" : "failed");
          
          // CRITICAL: Wait a moment for database transaction to commit
          // Then verify the update is visible before calling MCP
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
          
          // Verify the update is visible by reading back from DB
          const { data: verifyCompany } = await supabaseAdmin
            .from("companies")
            .select("mrr, arr, burn_rate, churn, growth_percent, runway_months, google_sheets_last_sync_at")
            .eq("id", companyId)
            .maybeSingle();
          
          if (verifyCompany) {
            console.log("[api/agent/run-all] Verified updated KPIs:", {
              mrr: verifyCompany.mrr,
              arr: verifyCompany.arr,
              burn_rate: verifyCompany.burn_rate,
              churn: verifyCompany.churn,
              growth_percent: verifyCompany.growth_percent,
              runway_months: verifyCompany.runway_months,
              lastSync: verifyCompany.google_sheets_last_sync_at,
            });
          } else {
            console.warn("[api/agent/run-all] Could not verify updated KPIs - company not found");
          }
        } else {
          console.warn("[api/agent/run-all] Sheets sync failed, continuing with agent run anyway");
        }
      }
    } catch (syncError: any) {
      console.warn("[api/agent/run-all] Error during sheets sync, continuing with agent run:", syncError.message);
      // Don't fail the entire request if sync fails
    }

    const url = `${MCP_URL}/tools/run_all`;

    // Temporary logging to verify MCP URL being used
    console.log("[api/agent/run-all] MCP_URL resolved:", MCP_URL);
    console.log("[api/agent/run-all] calling:", url);

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
      console.error("[api/agent/run-all] fetch threw:", e);
      return NextResponse.json(
        {
          ok: false,
          error: "fetch failed (could not reach MCP)",
          details: e?.message || String(e),
          mcpUrl: MCP_URL,
          attemptedUrl: url,
        },
        { status: 500 }
      );
    }

    const text = await res.text().catch(() => "");
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      console.error("[api/agent/run-all] MCP non-200:", res.status, data);
      return NextResponse.json(
        {
          ok: false,
          error: "MCP returned error",
          status: res.status,
          data,
          attemptedUrl: url,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, fromMcp: data });
  } catch (err: any) {
    console.error("[api/agent/run-all] unexpected:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}