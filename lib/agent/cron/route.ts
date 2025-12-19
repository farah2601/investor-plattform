import { NextResponse } from "next/server";
import { runAgentForAllCompaniesCron } from "@/lib/agent/scheduler";

export async function POST(req: Request) {
  // Enkelt sikkerhetslag: krev secret header
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAgentForAllCompaniesCron();
    return NextResponse.json({
      ok: true,
      ...result,
      ranAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[/api/agent/cron] failed", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
