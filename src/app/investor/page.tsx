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
  company_id: string;
  companies: InvestorCompany | InvestorCompany[] | null;
};

// Små helpers
function formatMoney(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("nb-NO") + " kr";
}

function formatPercent(value: number | null) {
  if (value == null) return "—";
  return `${value.toString().replace(".", ",")} %`;
}

// 👇 VIKTIG: vi tar inn `searchParams` her
export default async function InvestorPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;

  // For debugging: se hva Next faktisk sender inn
  // (kan fjernes når alt funker)
  console.log("searchParams i investor-side:", searchParams);

  if (!token) {
    return (
      <main className="min-h-screen bg-[#050712] text-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
          <h1 className="text-xl font-semibold mb-2">Ugyldig lenke</h1>
          <p className="text-sm text-slate-300">
            Mangler <code>token</code> i URL-en. Sørg for at lenken ser slik ut:
          </p>
          <p className="mt-2 text-xs text-slate-400">
            <code>/investor?token=...</code>
          </p>
        </div>
      </main>
    );
  }

  // 1) Slå opp investor_link via token
  const { data: link, error: linkError } = await supabase
    .from("investor_links")
    .select("*, access_requests(*)")
    .eq("access_token", token)
    .maybeSingle();

  if (linkError || !link || !link.access_requests) {
    return (
      <main className="min-h-screen bg-[#050712] text-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full rounded-2xl border border-red-500/40 bg-red-950/40 p-6">
          <h1 className="text-xl font-semibold mb-2">Ugyldig eller utløpt lenke</h1>
          <p className="text-sm text-red-100">
            Klarte ikke å finne en gyldig investor-tilgang for denne lenken.
            Be selskapet sende deg en ny lenke.
          </p>
        </div>
      </main>
    );
  }

  // 2) Hent selskap tilknyttet forespørselen
  const request = link.access_requests as InvestorRequestWithCompany;

  const { data: companiesData } = await supabase
    .from("companies")
    .select(
      `
        id,
        name,
        industry,
        mrr,
        arr,
        burn_rate,
        runway_months,
        churn,
        growth_percent
      `
    )
    .eq("id", request.company_id)
    .limit(1);

  const company = (companiesData?.[0] as InvestorCompany) ?? null;

  const createdAt = request.created_at ? new Date(request.created_at) : null;
  const createdAtText = createdAt
    ? createdAt.toLocaleDateString("nb-NO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "ikke registrert";

  // 3) Selve investorvisningen (samme som du hadde)
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
            <p>Land: Norge (demo)</p>
          </div>
        </header>

        {/* KPI-kort osv – behold alt du hadde her */}
        {/* ... (her kan du lime inn resten av KPI/graf/AI-seksjonene dine uendret) ... */}

        <p className="text-[11px] text-slate-500 pt-4">
          Sist oppdatert: {createdAtText} • Datakilde: (placeholder – Tripletex,
          Fiken, Pipedrive kobles til senere)
        </p>
      </div>
    </main>
  );
}