import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/kpi/snapshot-upsert
 * 
 * DEPRECATED: This endpoint is deprecated.
 * 
 * KPI snapshot writing is now handled by MCP server.
 * This endpoint returns 410 Gone to prevent accidental use.
 * 
 * To create/update snapshots, use /api/agent/run-all which calls MCP's run_kpi_refresh tool.
 * For manual KPI entry, use the UI which will trigger MCP.
 */
export async function POST(req: Request) {
  return NextResponse.json(
    {
      ok: false,
      error: "KPI snapshot writing is handled by MCP. This endpoint is deprecated.",
      message: "Use /api/agent/run-all to trigger MCP's KPI refresh which handles snapshot creation/updates.",
    },
    { status: 410 } // 410 Gone - resource is no longer available
  );
}
