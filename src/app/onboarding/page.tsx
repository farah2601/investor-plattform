"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    industry: "",
    website: "",
    mrr: "",
    arr: "",
    burn_rate: "",
    runway_months: "",
    churn: "",
    growth_percent: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name: form.name,
      industry: form.industry || null,
      website: form.website || null,
      mrr: form.mrr ? Number(form.mrr) : null,
      arr: form.arr ? Number(form.arr) : null,
      burn_rate: form.burn_rate ? Number(form.burn_rate) : null,
      runway_months: form.runway_months ? Number(form.runway_months) : null,
      churn: form.churn ? Number(form.churn) : null,
      growth_percent: form.growth_percent ? Number(form.growth_percent) : null,
    };

    const { error } = await supabase.from("companies").insert([payload]);

    setLoading(false);

    if (error) {
      alert("Kunne ikke opprette selskap: " + error.message);
      return;
    }

    router.push("/company-dashboard");
  }

  return (
    <main className="min-h-screen bg-[#050712] text-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl bg-[#0B0E17] border border-slate-800 rounded-2xl p-8 shadow-xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Opprett selskap</h1>
          <p className="text-sm text-slate-400">
            Fyll inn grunnleggende informasjon for å komme i gang.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* COMPANY SECTION */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Selskapsinfo</h2>

            <Input
              className="bg-slate-900 border-slate-700"
              placeholder="Selskapsnavn *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />

            <Input
              className="bg-slate-900 border-slate-700"
              placeholder="Bransje (valgfri)"
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
            />

            <Input
              className="bg-slate-900 border-slate-700"
              placeholder="Website (valgfri)"
              value={form.website}
              onChange={(e) =>
                setForm({ ...form, website: e.target.value })
              }
            />
          </section>

          {/* KPI SECTION */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Første KPI-er (valgfritt)</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                className="bg-slate-900 border-slate-700"
                placeholder="MRR (kr)"
                value={form.mrr}
                onChange={(e) =>
                  setForm({ ...form, mrr: e.target.value })
                }
              />

              <Input
                className="bg-slate-900 border-slate-700"
                placeholder="ARR (kr)"
                value={form.arr}
                onChange={(e) =>
                  setForm({ ...form, arr: e.target.value })
                }
              />

              <Input
                className="bg-slate-900 border-slate-700"
                placeholder="Burn rate (kr/mnd)"
                value={form.burn_rate}
                onChange={(e) =>
                  setForm({ ...form, burn_rate: e.target.value })
                }
              />

              <Input
                className="bg-slate-900 border-slate-700"
                placeholder="Runway (måneder)"
                value={form.runway_months}
                onChange={(e) =>
                  setForm({ ...form, runway_months: e.target.value })
                }
              />

              <Input
                className="bg-slate-900 border-slate-700"
                placeholder="Churn (%)"
                value={form.churn}
                onChange={(e) =>
                  setForm({ ...form, churn: e.target.value })
                }
              />

              <Input
                className="bg-slate-900 border-slate-700"
                placeholder="Growth (%)"
                value={form.growth_percent}
                onChange={(e) =>
                  setForm({ ...form, growth_percent: e.target.value })
                }
              />
            </div>
          </section>

          {/* SUBMIT BUTTON */}
          <Button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500"
            disabled={loading}
          >
            {loading ? "Oppretter..." : "Opprett selskap"}
          </Button>
        </form>
      </div>
    </main>
  );
}