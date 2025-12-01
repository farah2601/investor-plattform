// src/app/investor/page.tsx
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

type InvestorLinkWithRequest = {
  id: string;
  access_token: string;
  expires_at: string;
  access_requests: InvestorRequestWithCompany | null;
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
  searchParams: { token?: string };
}) {
  const token = searchParams.token;

  // 1) Mangler token i URL
  if (!token) {
    return (
      <main className="min-h-screen bg-[#050712] text-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
          <h1 className="text-xl font-semibold mb-2">Ugyldig lenke</h1>
          <p className="text-sm text-slate-300">
            Mangler <code>token</code> i URL-en. Sørg for at lenken ser slik ut:
          </p>
          <p className="mt-2 text-xs font-mono text-slate-400 break-all">
            /investor?token=…
          </p>
        </div>
      </main>
    );
  }

  // 2) Hent investor_link + tilhørende forespørsel + selskap basert på token
  const { data: linkRow, error: linkError } = await supabase
    .from("investor_links")
    .select(
      `
      id,
      access_token,
      expires_at,
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
    .maybeSingle<InvestorLinkWithRequest>();

  // 3) Teknisk feil mot Supabase
  if (linkError) {
    return (
      <main className="min-h-screen bg-[#050712] text-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full rounded-2xl border border-red-500/40 bg-red-950/40 p-6">
          <h1 className="text-xl font-semibold mb-2">Teknisk feil</h1>
          <p className="text-sm text-red-100">
            Klarte ikke å hente data for investorvisning.
          </p>
          <pre className="mt-3 text-xs text-red-200 whitespace-pre-wrap">
            {linkError.message}
          </pre>
        </div>
      </main>
    );
  }

  // 4) Ugyldig / utløpt token
  if (!linkRow || !linkRow.access_requests) {
    return (
      <main className="min-h-screen bg-[#050712] text-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
          <h1 className="text-xl font-semibold mb-2">
            Ugyldig eller utløpt lenke
          </h1>
          <p className="text-sm text-slate-300">
            Vi fant ingen aktiv investor-tilgang for denne lenken. Be
            selskapet sende deg en ny lenke.
          </p>
        </div>
      </main>
    );
  }

  const req = linkRow.access_requests;
  let company: InvestorCompany | null = null;

  if (Array.isArray(req.companies)) {
    company = req.companies[0] ?? null;
  } else {
    company = req.companies;
  }

  const createdAt = req.created_at ? new Date(req.created_at) : null;
  const createdAtText = createdAt
    ? createdAt.toLocaleDateString("nb-NO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "ikke registrert";

  return (
    <main className="min-h-screen bg-[#050712] text-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
        {/* HEADER */}
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
            <p>Land: Norge (demo)</p>
          </div>
        </header>

        {/* KPI-KORT */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-slate-300">
            KPI-oversikt (placeholder / manuelt satt)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <KpiCard
              label="MRR"
              value={formatMoney(company?.mrr ?? null)}
              sublabel="+12 % siste 3 mnd (placeholder)"
            />
            <KpiCard
              label="ARR"
              value={formatMoney(company?.arr ?? null)}
              sublabel="Årlig gjentakende inntekt (MVP-demo)"
            />
            <KpiCard
              label="Burn rate"
              value={formatMoney(company?.burn_rate ?? null)}
              sublabel="per måned (demo)"
            />
            <KpiCard
              label="Runway"
              value={
                company?.runway_months != null
                  ? `${company.runway_months} mnd`
                  : "—"
              }
              sublabel="Estimert levetid med dagens burn"
            />
            <KpiCard
              label="Churn"
              value={formatPercent(company?.churn ?? null)}
              sublabel="Basert på MRR-churn (demo)"
            />
            <KpiCard
              label="Growth"
              value={formatPercent(company?.growth_percent ?? null)}
              sublabel="MRR-vekst siste 12 mnd (demo)"
            />
          </div>
        </section>

        {/* GRAFER */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-200">
              Grafer (placeholder-data)
            </h2>
            <p className="text-xs text-slate-500">
              Demo-data – ekte tall kobles på senere
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-[#13171E] border border-white/10 rounded-xl p-6">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs text-slate-400 uppercase">
                  MRR siste 12 måneder
                </p>
                <p className="text-[10px] text-slate-500">Placeholder</p>
              </div>
              <MrrChart />
            </div>

            <div className="bg-[#13171E] border border-white/10 rounded-xl p-4 hover:bg-[#1B2029] transition-colors">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs text-slate-400 uppercase">
                  Burn / kostnader siste 12 måneder
                </p>
                <p className="text-[10px] text-slate-500">Placeholder</p>
              </div>
              <BurnChart />
            </div>
          </div>
        </section>

        {/* AI-INNSIKT */}
        <section className="bg-[#13171E] border border-white/10 rounded-xl p-5 backdrop-blur-sm">
          <p className="text-xs text-slate-400 uppercase mb-2">
            AI-generert innsikt (placeholder)
          </p>
          <ul className="space-y-1 text-sm text-slate-200">
            <li>
              • Selskapet har stabil runway på{" "}
              {company?.runway_months ?? "ukjent"} mnd (demo).
            </li>
            <li>
              • MRR er ca{" "}
              {company?.mrr?.toLocaleString("nb-NO") ?? "ukjent"} kr (demo).
            </li>
            <li>• Ingen økt churn observert siste kvartal (demo-tekst).</li>
          </ul>
        </section>

        {/* FOOTER */}
        <p className="text-[11px] text-slate-500 pt-4">
          Sist oppdatert: {createdAtText} • Datakilde: (placeholder – Tripletex,
          Fiken, Pipedrive kobles til senere)
        </p>
      </div>
    </main>
  );
}