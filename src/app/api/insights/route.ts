import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json({ ok: false, error: "Missing companyId" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
    .from("companies")
    .select("latest_insights, latest_insights_generated_at, based_on_snapshot_date")
    .eq("id", companyId)
    .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      insights: data?.latest_insights ?? [],
      generatedAt: data?.latest_insights_generated_at ?? null,
      basedOnSnapshotDate: data?.based_on_snapshot_date ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}