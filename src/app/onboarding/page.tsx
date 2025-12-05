"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

type FormState = {
  name: string;
  industry: string;
  website: string;
  mrr: string;
  burnRate: string;
  runwayMonths: string;
  churn: string;
  growth: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    name: "",
    industry: "",
    website: "",
    mrr: "",
    burnRate: "",
    runwayMonths: "",
    churn: "",
    growth: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // 1) Hent innlogget bruker
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setError("You need to log in before creating a company.");
      // Valgfritt: send brukeren til login
      router.push("/login");
      return;
    }

    // 2) Bygg payload til Supabase
    const payload = {
      name: form.name.trim(),
      industry: form.industry.trim() || null,
      website_url: form.website.trim() || null,
      mrr: form.mrr ? Number(form.mrr.replace(/\s/g, "")) : null,
      burn_rate: form.burnRate
        ? Number(form.burnRate.replace(/\s/g, ""))
        : null,
      runway_months: form.runwayMonths
        ? Number(form.runwayMonths.replace(/\s/g, ""))
        : null,
      churn: form.churn ? Number(form.churn.replace(",", ".")) : null,
      growth_percent: form.growth
        ? Number(form.growth.replace(",", "."))
        : null,

      // 🔥 Viktig: koble selskapet til innlogget bruker
      owner_id: user.id,
    };

    // 3) Insert i `public.companies`
    const { data, error: insertError } = await supabase
      .from("companies")
      .insert([payload])
      .select()
      .single();

    setLoading(false);

    if (insertError) {
      console.error(insertError);
      setError(
        insertError.message || "Could not create company. Please try again."
      );
      return;
    }

    // 4) Videre til dashboard (eller company-profile)
    if (data) {
      router.push("/company-dashboard");
    }
  }

  return (
    <main className="min-h-screen bg-[#050712] text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-6">
        <header className="space-y-2 text-center">
          <p className="text-xs font-semibold tracking-[0.3em] text-sky-400 uppercase">
            Get started
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold">
            Create your first company profile.
          </h1>
          <p className="text-sm text-slate-400">
            We’ll use this to generate your KPI dashboard and investor view.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-slate-800 bg-slate-950/80 p-6"
        >
          {/* Selskapinfo */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-100">
              Company info
            </h2>

            <div className="space-y-2">
              <label className="text-xs text-slate-400">Company name</label>
              <Input
                required
                className="bg-slate-900 border-slate-700"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400">Industry</label>
              <Input
                placeholder="SaaS, Fintech, Marketplace…"
                className="bg-slate-900 border-slate-700"
                value={form.industry}
                onChange={(e) => updateField("industry", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400">
                Website (optional)
              </label>
              <Input
                type="url"
                placeholder="https://yourcompany.com"
                className="bg-slate-900 border-slate-700"
                value={form.website}
                onChange={(e) => updateField("website", e.target.value)}
              />
            </div>
          </div>

          {/* Første KPI-er */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-100">
              First KPIs (optional)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-400">MRR (NOK)</label>
                <Input
                  inputMode="numeric"
                  className="bg-slate-900 border-slate-700"
                  value={form.mrr}
                  onChange={(e) => updateField("mrr", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400">
                  Burn rate (NOK / month)
                </label>
                <Input
                  inputMode="numeric"
                  className="bg-slate-900 border-slate-700"
                  value={form.burnRate}
                  onChange={(e) => updateField("burnRate", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400">
                  Runway (months)
                </label>
                <Input
                  inputMode="numeric"
                  className="bg-slate-900 border-slate-700"
                  value={form.runwayMonths}
                  onChange={(e) =>
                    updateField("runwayMonths", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400">Churn (%)</label>
                <Input
                  inputMode="decimal"
                  className="bg-slate-900 border-slate-700"
                  value={form.churn}
                  onChange={(e) => updateField("churn", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400">Growth (%)</label>
                <Input
                  inputMode="decimal"
                  className="bg-slate-900 border-slate-700"
                  value={form.growth}
                  onChange={(e) => updateField("growth", e.target.value)}
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-400">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold"
          >
            {loading ? "Creating company..." : "Create company"}
          </Button>

          <p className="text-[11px] text-slate-500 text-center">
            Your company will be linked to your current MCP account so you can
            edit the profile and share investor views later.
          </p>
        </form>
      </div>
    </main>
  );
}