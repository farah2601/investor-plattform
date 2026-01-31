import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getExchangeRate } from "@/lib/exchangeRate";
import { getAuthenticatedUser, verifyCompanyAccess } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const MONETARY_KPI_KEYS = ["mrr", "arr", "burn_rate", "cash_balance", "net_revenue", "net_revenue_booked"];

function convertKpisObject(kpis: unknown, rate: number): Record<string, unknown> {
  if (!kpis || typeof kpis !== "object" || kpis === null) {
    return {};
  }
  const out = JSON.parse(JSON.stringify(kpis)) as Record<string, unknown>;
  for (const key of MONETARY_KPI_KEYS) {
    const v = out[key];
    if (v === null || v === undefined) continue;
    if (typeof v === "number" && Number.isFinite(v)) {
      out[key] = Math.round(v * rate * 100) / 100;
      continue;
    }
    if (typeof v === "object" && v !== null && "value" in v) {
      const obj = v as { value: unknown; source?: unknown; updated_at?: unknown };
      if (typeof obj.value === "number" && Number.isFinite(obj.value)) {
        out[key] = { ...obj, value: Math.round(obj.value * rate * 100) / 100 };
      }
    }
  }
  return out;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: companyId } = await params;
    const { ok: hasAccess } = await verifyCompanyAccess(user.id, companyId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!companyId) {
      return NextResponse.json({ error: "Missing company ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const toCurrency = (body.toCurrency || body.kpi_currency || "USD").toUpperCase();
    const payload: Record<string, unknown> = {
      kpi_currency: toCurrency,
      ...(body.runway_months !== undefined && { runway_months: body.runway_months }),
      ...(body.churn !== undefined && { churn: body.churn }),
      ...(body.growth_percent !== undefined && { growth_percent: body.growth_percent }),
      ...(body.kpi_scale !== undefined && { kpi_scale: body.kpi_scale }),
      ...(body.mrr !== undefined && { mrr: body.mrr }),
      ...(body.arr !== undefined && { arr: body.arr }),
      ...(body.burn_rate !== undefined && { burn_rate: body.burn_rate }),
    };

    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id, kpi_currency, mrr, arr, burn_rate")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError || !company) {
      return NextResponse.json(
        { error: "Company not found", details: companyError?.message },
        { status: 404 }
      );
    }

    const fromCurrency = (company.kpi_currency || "USD").toUpperCase();
    if (fromCurrency === toCurrency) {
      const { error: updateError } = await supabaseAdmin
        .from("companies")
        .update(payload)
        .eq("id", companyId);
      if (updateError) {
        return NextResponse.json(
          { error: "Failed to update company", details: updateError.message },
          { status: 500 }
        );
      }
      return NextResponse.json({ ok: true, converted: false, message: "Currency unchanged; KPIs updated." });
    }

    const rate = await getExchangeRate(fromCurrency, toCurrency);
    if (rate === null) {
      return NextResponse.json(
        { error: "Exchange rate unavailable for this currency pair" },
        { status: 400 }
      );
    }

    const conv = (n: number | null) =>
      n != null && Number.isFinite(n) ? Math.round(n * rate * 100) / 100 : n;

    const newMrr = conv(company.mrr ?? null);
    const newArr = conv(company.arr ?? null);
    const newBurnRate = conv(company.burn_rate ?? null);

    const updateCompany: Record<string, unknown> = {
      ...payload,
      mrr: newMrr,
      arr: newArr,
      burn_rate: newBurnRate,
    };

    const { error: updateCompanyError } = await supabaseAdmin
      .from("companies")
      .update(updateCompany)
      .eq("id", companyId);

    if (updateCompanyError) {
      return NextResponse.json(
        { error: "Failed to update company", details: updateCompanyError.message },
        { status: 500 }
      );
    }

    const { data: snapshots, error: snapError } = await supabaseAdmin
      .from("kpi_snapshots")
      .select("id, kpis")
      .eq("company_id", companyId);

    if (!snapError && snapshots?.length) {
      for (const row of snapshots as { id: string; kpis: unknown }[]) {
        const convertedKpis = convertKpisObject(row.kpis, rate);
        await supabaseAdmin
          .from("kpi_snapshots")
          .update({ kpis: convertedKpis })
          .eq("id", row.id);
      }
    }

    return NextResponse.json({
      ok: true,
      converted: true,
      fromCurrency,
      toCurrency,
      rate,
      mrr: newMrr,
      arr: newArr,
      burn_rate: newBurnRate,
      snapshotsUpdated: snapshots?.length ?? 0,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
