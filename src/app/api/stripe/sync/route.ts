import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/sync
 * 
 * DEPRECATED: This endpoint is deprecated.
 * 
 * Stripe sync is now handled by MCP server.
 * This endpoint returns 410 Gone to prevent accidental use.
 * 
 * To sync Stripe data, use /api/agent/run-all which calls MCP's run_kpi_refresh tool.
 */
export async function POST(req: Request) {
  return NextResponse.json(
    {
      ok: false,
      error: "Stripe sync is handled by MCP. This endpoint is deprecated.",
      message: "Use /api/agent/run-all to trigger MCP's KPI refresh which includes Stripe sync.",
    },
    { status: 410 } // 410 Gone - resource is no longer available
  );
}
