import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAuthAndCompanyAccess, verifyInvestorToken } from "@/lib/server/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function extractKpiValue(kpi: unknown): number | null {
  if (kpi === null || kpi === undefined) return null;
  if (typeof kpi === "number") return isNaN(kpi) ? null : kpi;
  if (typeof kpi === "object" && kpi !== null && "value" in kpi) {
    const v = (kpi as { value: unknown }).value;
    if (typeof v === "number") return isNaN(v) ? null : v;
    if (v === null) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  }
  const n = Number(kpi);
  return isNaN(n) ? null : n;
}

/**
 * POST /api/agent/chat
 *
 * Chat with the Valyxo AI agent. Sends user message + company/KPI context to OpenAI,
 * returns assistant reply. Use when something is wrong (metrics, sync, sheets) to get help.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { companyId, message, investorToken } = body;

    if (!companyId || typeof companyId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing companyId" },
        { status: 400 }
      );
    }
    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { ok: false, error: "Missing or empty message" },
        { status: 400 }
      );
    }

    // 1) Logged-in user with company access (dashboard)
    const { user, res: authRes } = await requireAuthAndCompanyAccess(req, companyId);
    if (!authRes && user) {
      // Authorized via Bearer + company access
    } else {
      // 2) Public investor page: verify shareable link token
      const token = typeof investorToken === "string" ? investorToken.trim() : "";
      if (!token) {
        return authRes ?? NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
      }
      const { companyId: linkCompanyId, error: linkError } = await verifyInvestorToken(token);
      if (linkError || !linkCompanyId || linkCompanyId !== companyId) {
        return NextResponse.json(
          { ok: false, error: linkError ?? "Invalid or expired investor link" },
          { status: 401 }
        );
      }
    }

    // OPENAI_API_KEY: lokalt fra .env/.env.local; på Vercel fra Project Settings → Environment Variables
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "OpenAI er ikke satt opp. Legg til OPENAI_API_KEY i .env/.env.local (lokalt) eller i Vercel → Project Settings → Environment Variables (deploy), og start appen på nytt.",
        },
        { status: 503 }
      );
    }

    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .maybeSingle();

    const { data: snapshots } = await supabaseAdmin
      .from("kpi_snapshots")
      .select("period_date, kpis")
      .eq("company_id", companyId)
      .order("period_date", { ascending: false })
      .limit(5);

    let context = `Company: ${company?.name ?? companyId}.`;
    if (snapshots && snapshots.length > 0) {
      const lines = snapshots.map((s) => {
        const k = (s.kpis ?? {}) as Record<string, unknown>;
        const mrr = extractKpiValue(k.mrr);
        const arr = extractKpiValue(k.arr);
        const burn = extractKpiValue(k.burn_rate);
        const cash = extractKpiValue(k.cash_balance);
        const runway = extractKpiValue(k.runway_months);
        const parts = [s.period_date];
        if (mrr != null) parts.push(`MRR ${mrr}`);
        if (arr != null) parts.push(`ARR ${arr}`);
        if (burn != null) parts.push(`Burn ${burn}`);
        if (cash != null) parts.push(`Cash ${cash}`);
        if (runway != null) parts.push(`Runway ${runway}m`);
        return parts.join(", ");
      });
      context += ` Latest KPI snapshots (period, values): ${lines.join("; ")}.`;
    } else {
      context += " No KPI snapshots yet.";
    }

    // Fetch recent agent run events so the AI can answer "what happened in the last run"
    const { data: agentLogs } = await supabaseAdmin
      .from("agent_logs")
      .select("tool_name, status, message, meta, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(25);

    if (agentLogs && agentLogs.length > 0) {
      const logLines = agentLogs.map((log) => {
        const at = log.created_at
          ? new Date(log.created_at).toISOString().replace("T", " ").slice(0, 19)
          : "?";
        const meta = log.meta as Record<string, unknown> | null;
        const err = meta?.error && typeof meta.error === "object" && "message" in meta.error
          ? String((meta.error as { message?: unknown }).message ?? "")
          : "";
        let extra = err ? ` (error: ${err})` : "";
        if (log.status === "success" && meta?.result && typeof meta.result === "object") {
          const res = meta.result as Record<string, unknown>;
          if (typeof res.message === "string") {
            extra = ` (${res.message})`;
          } else if (res.sheetsProcessed != null || res.snapshotsUpserted != null || res.stripeProcessed != null) {
            const parts: string[] = [];
            if (res.sheetsProcessed != null) parts.push(`${res.sheetsProcessed} sheet rows`);
            if (res.stripeProcessed != null) parts.push(`${res.stripeProcessed} stripe rows`);
            if (res.snapshotsUpserted != null) parts.push(`${res.snapshotsUpserted} snapshots written`);
            if (parts.length) extra = ` (${parts.join(", ")})`;
          } else if (res.kpiRefreshed === true || res.insightsGenerated === true) {
            const parts: string[] = [];
            if (res.kpiRefreshed === true) parts.push("KPI refreshed");
            if (res.insightsGenerated === true) parts.push("insights generated");
            if (parts.length) extra = ` (${parts.join(", ")})`;
          }
        }
        return `[${at}] ${log.tool_name} ${log.status}: ${log.message ?? ""}${extra}`;
      });
      context += ` Last agent run events (newest first): ${logLines.join("; ")}.`;
    } else {
      context += " No agent run events yet.";
    }

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are the Valyxo Agent. Always refer to yourself only as "Valyxo Agent". Never mention OpenAI, GPT, or any other AI provider or technology—you are Valyxo Agent. You help founders with metrics, Google Sheets sync, KPI data, and the Valyxo platform. Context for this company: ${context} You have access to "Last agent run events" above—use them to explain what happened in the last run. When the user asks what happened in the last run (e.g. "hva skjedde i siste kjøring?"), give a clear, step-by-step explanation: which steps ran (KPI refresh, insights, etc.), what each step did, and the outcome (e.g. how many sheet rows were processed, how many snapshots were written, whether insights were generated). Be explanatory and concrete, not just brief. If something failed, explain which step failed and why from the error message. For other questions, answer helpfully. Reply in the same language as the user.`,
        },
        { role: "user", content: message.trim() },
      ],
      temperature: 0.4,
      max_tokens: 800,
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ??
      "I couldn't generate a reply. Please try again.";

    return NextResponse.json({ ok: true, reply });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/agent/chat] Error:", msg);
    return NextResponse.json(
      { ok: false, error: msg || "Chat failed" },
      { status: 500 }
    );
  }
}
