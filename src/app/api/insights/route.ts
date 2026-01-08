import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { companyId } = await req.json();

    if (!companyId) {
      return NextResponse.json({ ok: false, error: "Missing companyId" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("companies")
      .select("latest_insights, last_agent_run_at")
      .eq("id", companyId)
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      insights: data?.latest_insights ?? [],
      generatedAt: data?.last_agent_run_at ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}