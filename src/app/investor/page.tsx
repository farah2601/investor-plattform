import { supabase } from "../lib/supabaseClient";
import { KpiCard } from "../../components/ui/KpiCard";
import { MrrChart } from "../../components/ui/MrrChart";
import { BurnChart } from "../../components/ui/BurnChart";

type InvestorCompany = {
  id: string;
  name: string;
  industry: string | null;
  mrr: number | null;
  arr: number | null;
  burn_rate: number | null;
  runway_months: number | null;
  churn: number | null;
  growth_percent: number | null;
};

type InvestorRequestWithCompany = {
  id: string;
  created_at: string;
  investor_name: string;
  investor_email: string;
  investor_company: string | null;
  message: string | null;
  companies: InvestorCompany | InvestorCompany[] | null;
};

function formatMoney(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("nb-NO") + " kr";
}

function formatPercent(value: number | null) {
  if (value == null) return "—";
  return `${value.toString().replace(".", ",")} %`;
}

export default async function InvestorPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  // 🔥 Viktig — må await'es i Vercel PROD
  const { token } = await searchParams;

  // ❌ Ingen token = vis feilmelding
  if (!token) {
    return (
      <main className="min-h-screen bg-[#050712] text-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
          <h1 className="text-xl font-semibold mb-2">Ugyldig lenke</h1>
          <p className="text-sm text-slate-300">
            Mangler <code>token</code> i URL-en. Bruk en lenke som:
            <br />
            <code>/investor?token=...</code>
          </p>
        </div>
      </main>
    );
  }

  // 🔥 2) Hent investor-link etter token
  const { data: link, error: linkError } = await supabase
    .from("investor_links")
    .select(
      `
      id,
      access_token,
      expires_at,
      request_id,
      access_requests (
        id,
        created_at,
        investor_name,
        investor_email,
        investor_company,
        message,
        companies (
          id,
          name,
          industry,
          mrr,
          arr,
          burn_rate,
          runway_months,
          churn,
          growth_percent
        )
      )
    `
    )
    .eq("access_token", token)
    .maybeSingle();

  if (linkError || !link) {
    return (
      <main className="min-h-screen bg-[#050712] text-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full rounded-2xl border border-red-500/40 bg-red-950/40 p-6">
          <h1 className="text-xl font-bold mb-2">Ugyldig eller utløpt lenke</h1>
          <p className="text-sm text-red-100">
            Kunne ikke finne investor-tilgang for denne tokenen.
          </p>
        </div>
      </main>
    );
  }

  const req = link.access_requests as unknown as InvestorRequestWithCompany;

  // Normaliser company
  let company: InvestorCompany | null = null;
  if (Array.isArray(req.companies)) {
    company = req.companies[0] ?? null;
  } else {
    company = req.companies;
  }

  const createdAt = req.created_at ? new Date(req.created_at) : null;
  const createdAtText = createdAt
    ? createdAt.toLocaleDateString("nb-NO")
    : "ukjent dato";

  return (
    <main className="min-h-screen bg-[#050712] text-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">

        <header className="space-y-3">
          <p className="text-xs tracking-[0.2em] text-slate-500 uppercase">
            Investorvisning
          </p>
          <h1 className="text-3xl font-bold">
            {company?.name ?? "Ukjent selskap"}
          </h1>
          <div className="text-sm text-slate-400 space-y-1">
            <p>Bransje: {company?.industry ?? "Ikke oppgitt"}</p>
            <p>Stage: Seed (demo)</p>
          </div>
        </header>

        <section className="space-y-4">
          <h2 className="text-sm font-medium text-slate-300">
            KPI-oversikt
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <KpiCard label="MRR" value={formatMoney(company?.mrr ?? null)} />
            <KpiCard label="ARR" value={formatMoney(company?.arr ?? null)} />
            <KpiCard label="Burn rate" value={formatMoney(company?.burn_rate ?? null)} />
            <KpiCard
              label="Runway"
              value={
                company?.runway_months != null
                  ? `${company.runway_months} mnd`
                  : "—"
              }
            />
            <KpiCard label="Churn" value={formatPercent(company?.churn ?? null)} />
            <KpiCard
              label="Growth"
              value={formatPercent(company?.growth_percent ?? null)}
            />
          </div>
        </section>

        {/* Grafer */}
        <section className="grid md:grid-cols-2 gap-4">
          <div className="bg-[#13171E] border border-white/10 rounded-xl p-6">
            <p className="text-xs text-slate-400 mb-2">MRR siste 12 måneder</p>
            <MrrChart />
          </div>

          <div className="bg-[#13171E] border border-white/10 rounded-xl p-6">
            <p className="text-xs text-slate-400 mb-2">
              Burn / kostnader siste 12 måneder
            </p>
            <BurnChart />
          </div>
        </section>

        <p className="text-xs text-slate-500">
          Sist oppdatert: {createdAtText}
        </p>
      </div>
    </main>
  );
}