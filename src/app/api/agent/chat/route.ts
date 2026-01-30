import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAuthAndCompanyAccess } from "@/lib/server/auth";
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
    const { companyId, message } = body;

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

    const { user, res: authRes } = await requireAuthAndCompanyAccess(req, companyId);
    if (authRes || !user) {
      return authRes ?? NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "OpenAI er ikke satt opp. Legg til OPENAI_API_KEY i .env eller .env.local (i prosjektroten) og start appen på nytt.",
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

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are the Valyxo assistant. You help founders with metrics, Google Sheets sync, KPI data, and the Valyxo platform. Context for this company: ${context} Answer briefly and helpfully. If the user reports something wrong (e.g. wrong numbers, sync issues), suggest checking the sheet layout, re-running sync, or that metrics come from Google Sheets (and optionally Stripe). Reply in the same language as the user.`,
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
