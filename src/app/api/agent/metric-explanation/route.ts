import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAuthAndCompanyAccess } from "@/lib/server/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const METRIC_LABELS: Record<string, string> = {
  mrr: "MRR (Monthly Recurring Revenue)",
  arr: "ARR (Annual Recurring Revenue)",
  mrr_growth_mom: "Growth (month-over-month)",
  burn_rate: "Burn rate",
  runway_months: "Runway",
  churn: "Churn",
  cash_balance: "Cash balance",
  customers: "Customers",
  net_revenue: "Net revenue",
};

const SOURCE_LABELS: Record<string, string> = {
  sheet: "Google Sheets",
  stripe: "Stripe",
  manual: "Manual",
  computed: "Computed",
};

function extractKpiValue(kpi: unknown): number | null {
  if (kpi === null || kpi === undefined) return null;
  if (typeof kpi === "number") return Number.isFinite(kpi) ? kpi : null;
  if (typeof kpi === "object" && kpi !== null && "value" in kpi) {
    const v = (kpi as { value: unknown }).value;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(kpi);
  return Number.isFinite(n) ? n : null;
}

function getKpiSource(kpis: Record<string, unknown>, key: string): string | null {
  const kpi = kpis[key];
  if (kpi && typeof kpi === "object" && "source" in kpi) {
    const s = (kpi as { source?: unknown }).source;
    return typeof s === "string" ? s : null;
  }
  return null;
}

/**
 * POST /api/agent/metric-explanation
 *
 * Returns an LLM-generated explanation for one metric: how we got the value (or why it's missing).
 * Used by the metric details panel.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { companyId, metricKey } = body;

    if (!companyId || typeof companyId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing companyId" },
        { status: 400 }
      );
    }
    if (!metricKey || typeof metricKey !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing metricKey" },
        { status: 400 }
      );
    }

    const { res: authRes } = await requireAuthAndCompanyAccess(req, companyId);
    if (authRes) {
      return authRes;
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "OPENAI_API_KEY not configured" },
        { status: 503 }
      );
    }

    const { data: snapshotRows } = await supabaseAdmin
      .from("kpi_snapshots")
      .select("period_date, kpis")
      .eq("company_id", companyId)
      .order("period_date", { ascending: true });

    const rows = (snapshotRows ?? []) as Array<{ period_date: string; kpis: unknown }>;
    const latest = rows.length > 0 ? rows[rows.length - 1] : null;
    const kpis = (latest?.kpis && typeof latest.kpis === "object" ? latest.kpis : {}) as Record<string, unknown>;

    const value = extractKpiValue(kpis[metricKey]);
    const source = getKpiSource(kpis, metricKey);
    const period = latest?.period_date ?? null;
    const label = METRIC_LABELS[metricKey] ?? metricKey;
    const sourceLabel = source ? SOURCE_LABELS[source] ?? source : null;

    const hasValue = value !== null && value !== undefined;
    const context = [
      `Metric: ${label} (key: ${metricKey}).`,
      hasValue
        ? `Current value: ${value}. Source: ${sourceLabel ?? "unknown"}. Period: ${period ?? "latest"}.`
        : `No value found for this metric. Source in snapshot: ${sourceLabel ?? "none"}. Period: ${period ?? "no snapshot"}.`,
      "Other metrics in snapshot (for context): " +
        Object.keys(kpis)
          .filter((k) => k !== metricKey)
          .slice(0, 12)
          .join(", ") +
        ".",
    ].join(" ");

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant explaining how a financial metric was obtained. Write in English only. Be brief (2–4 sentences). " +
            "If the metric has a value: explain where it came from (e.g. Google Sheets, Stripe, or computed from other numbers) and how it was derived if relevant (e.g. ARR = MRR × 12, runway = cash / burn). " +
            "If the metric has no value: explain why we could not find it (e.g. no column mapped to this metric, sheet not synced, or data not available for this period). Do not invent numbers.",
        },
        {
          role: "user",
          content: `Context: ${context}\n\nWrite a short explanation for the user.`,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const text = completion.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) {
      return NextResponse.json(
        { ok: false, error: "Empty explanation from model" },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, explanation: text });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/agent/metric-explanation]", msg);
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500 }
    );
  }
}
