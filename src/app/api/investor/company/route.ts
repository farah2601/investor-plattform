import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../.././lib/supabaseAdmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  // 1) Finn investor_link
  const { data: linkRow, error: linkError } = await supabaseAdmin
    .from("investor_links")
    .select("id, access_token, expires_at, company_id, request_id")
    .eq("access_token", token)
    .maybeSingle();

  if (linkError || !linkRow) {
    return NextResponse.json(
      { error: "Invalid or expired investor link", details: linkError?.message ?? null },
      { status: 401 }
    );
  }

  // 2) expiry check (server)
  if (linkRow.expires_at && new Date(linkRow.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Investor link expired" }, { status: 401 });
  }

  // 3) companyId: use company_id if it exists, otherwise fallback via access_requests
  let companyId = linkRow.company_id as string | null;

  if (!companyId && linkRow.request_id) {
    const { data: requestRow, error: requestError } = await supabaseAdmin
      .from("access_requests")
      .select("company_id")
      .eq("id", linkRow.request_id)
      .maybeSingle();

    if (requestError || !requestRow?.company_id) {
      return NextResponse.json(
        { error: "Could not resolve company for this investor link", details: requestError?.message ?? null },
        { status: 500 }
      );
    }

    companyId = requestRow.company_id as string;
  }

  if (!companyId) {
    return NextResponse.json({ error: "No company attached to this investor link" }, { status: 500 });
  }

  // 4) Fetch company (including agent metadata)
  const { data: companyRow, error: companyError } = await supabaseAdmin
    .from("companies")
    .select(`
      id,
      name,
      industry,
      stage,
      description,
      website_url,
      profile_published,
      updated_at,

      last_agent_run_at,
      last_agent_run_by,

      latest_insights,
      latest_insights_generated_at,
      latest_insights_generated_by
    `)
    .eq("id", companyId)
    .maybeSingle();

  if (companyError || !companyRow) {
    return NextResponse.json(
      { error: "Company not found for this investor link", details: companyError?.message ?? null },
      { status: 404 }
    );
  }

  return NextResponse.json({
    company: companyRow,
    linkMeta: { expires_at: linkRow.expires_at ?? null },
  });
}