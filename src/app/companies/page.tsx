import { supabase } from "../lib/supabaseClient";
import { CompaniesList } from "./CompaniesList";

export default async function CompaniesPage() {
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, industry, growth_status, runway_months")
    .order("name", { ascending: true });

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-900 border border-red-800/60 rounded-2xl p-6">
          <h1 className="text-xl font-semibold mb-2">Feil ved henting</h1>
          <p className="text-sm text-slate-300">{error.message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-4xl mx-auto py-10 px-4 space-y-6">
        <header className="space-y-2">
          <p className="text-[11px] tracking-[0.25em] text-slate-500 uppercase">
            Offentlig liste
          </p>
          <h1 className="text-3xl font-bold">Offentlig selskapsoversikt</h1>
          <p className="text-sm text-slate-400 max-w-xl">
            Investorer får et raskt overblikk over runway, vekst og risiko.
          </p>
        </header>

        <CompaniesList initialCompanies={(data ?? []) as any[]} />
      </div>
    </main>
  );
}