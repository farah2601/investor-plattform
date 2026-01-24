import { supabase } from "@/app/lib/supabaseClient";
import { CompaniesList } from "./CompaniesList";
import { ValyxoLogo } from "@/components/brand/ValyxoLogo";
import Link from "next/link";

export default async function CompaniesPage() {
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, industry, growth_status, runway_months")
    .order("name", { ascending: true });

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-900 border border-red-800/60 rounded-2xl p-6">
          <h1 className="text-xl font-semibold mb-2">Error loading</h1>
          <p className="text-sm text-slate-300">{error.message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-4xl mx-auto py-10 px-6 space-y-6">
        {/* Logo at very top of content, visually separated */}
        <div className="mb-6 flex justify-center">
          <ValyxoLogo size={44} priority className="opacity-95" />
        </div>

        <header className="space-y-2">
          <Link 
            href="/" 
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors block mb-3"
          >
            ← Back to home
          </Link>
          <p className="text-[11px] tracking-[0.25em] text-slate-500 uppercase">
            Public list
          </p>
          <h1 className="text-3xl font-bold">Public company overview</h1>
          <p className="text-sm text-slate-400 max-w-xl">
            Investors get a quick overview of runway, growth and risk.
          </p>
        </header>

        <CompaniesList initialCompanies={(data ?? []) as any[]} />
      </div>
    </main>
  );
}