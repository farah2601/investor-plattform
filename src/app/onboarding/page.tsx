"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "../../app/lib/supabaseClient";
import { cn } from "@/lib/utils";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ValyxoLogo } from "../../components/brand/ValyxoLogo";
import { X, ArrowLeft } from "lucide-react";

type Step = 1 | 2 | 3;

const industries = ["SaaS", "Fintech", "Healthtech", "E-commerce", "Marketplace", "AI/ML", "Climate", "Other"] as const;
const stages = ["Pre-seed", "Seed", "Series A", "Series B+"] as const;

type FormState = {
  companyName: string;
  industry: string;
  stage: string;
  country: string;

  website: string;
  mrr: string;
  burnRate: string;
  runwayMonths: string;
  churn: string;
  growth: string;
};


const primaryCta =
  "h-12 w-full rounded-xl bg-[#2B74FF] text-white font-medium shadow-[0_1px_0_rgba(255,255,255,0.08)_inset] hover:bg-[#2B74FF]/90 active:bg-[#2B74FF]/85 disabled:opacity-50 disabled:pointer-events-none";
const secondaryCta =
  "h-12 w-full rounded-xl border border-slate-800 bg-transparent text-slate-200 hover:bg-white/5 disabled:opacity-50 disabled:pointer-events-none";

export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    companyName: "",
    industry: "",
    stage: "",
    country: "",

    website: "",
    mrr: "",
    burnRate: "",
    runwayMonths: "",
    churn: "",
    growth: "",
  });

  const isStep1Valid = useMemo(() => {
    return Boolean(form.companyName.trim() && form.industry && form.stage && form.country.trim());
  }, [form.companyName, form.industry, form.stage, form.country]);

  function next() {
    if (step < 3) setStep((s) => (s + 1) as Step);
  }

  function back() {
    if (step > 1) setStep((s) => (s - 1) as Step);
  }

  function handleExit() {
    router.push("/");
  }

  async function handleFinish() {
    setError(null);
    setIsLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsLoading(false);
      router.push("/login");
      return;
    }

    const payload = {
      name: form.companyName.trim(),
      industry: form.industry.trim() || null,
      website_url: form.website.trim() || null,

      mrr: form.mrr ? Number(form.mrr.replace(/\s/g, "")) : null,
      burn_rate: form.burnRate ? Number(form.burnRate.replace(/\s/g, "")) : null,
      runway_months: form.runwayMonths ? Number(form.runwayMonths.replace(/\s/g, "")) : null,
      churn: form.churn ? Number(form.churn.replace(",", ".")) : null,
      growth_percent: form.growth ? Number(form.growth.replace(",", ".")) : null,

      owner_id: user.id,
    };

    const { data, error: insertError } = await supabase.from("companies").insert([payload]).select().single();

    if (insertError) {
      console.error(insertError);
      setError(insertError.message || "Could not create company. Please try again.");
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    if (data) router.push("/company");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(1200px_600px_at_20%_0%,rgba(43,116,255,0.10),transparent_55%),radial-gradient(900px_500px_at_80%_20%,rgba(43,116,255,0.06),transparent_60%)]" />

      <header className="relative border-b border-slate-900/70 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <ValyxoLogo size={32} priority />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    s === step ? "bg-[#2B74FF]" : s < step ? "bg-[#2B74FF]/50" : "bg-slate-800"
                  )}
                />
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExit}
              className="text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="relative flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {step === 1 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 shadow-[0_0_0_1px_rgba(30,41,59,0.35)_inset] p-6">
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-slate-50">Company basics</h1>
                <p className="text-slate-400">Tell us about your company</p>
              </div>

              <div className="mt-7 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Company name</label>
                  <Input
                    value={form.companyName}
                    onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                    placeholder="Acme Inc."
                    className="h-11 bg-slate-900 border-slate-700"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Industry</label>
                  <div className="grid grid-cols-2 gap-2">
                    {industries.map((ind) => (
                      <button
                        key={ind}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, industry: ind }))}
                        className={cn(
                          "h-10 px-4 rounded-lg text-sm font-medium transition-colors border",
                          form.industry === ind
                            ? "bg-[#2B74FF] text-white border-[#2B74FF]"
                            : "bg-slate-900/40 text-slate-200 border-slate-800 hover:bg-white/5"
                        )}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Stage</label>
                  <div className="grid grid-cols-2 gap-2">
                    {stages.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, stage: st }))}
                        className={cn(
                          "h-10 px-4 rounded-lg text-sm font-medium transition-colors border",
                          form.stage === st
                            ? "bg-[#2B74FF] text-white border-[#2B74FF]"
                            : "bg-slate-900/40 text-slate-200 border-slate-800 hover:bg-white/5"
                        )}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Country</label>
                  <Input
                    value={form.country}
                    onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                    placeholder="Norway"
                    className="h-11 bg-slate-900 border-slate-700"
                  />
                </div>
              </div>

              {error && <p className="mt-4 text-xs text-rose-400">{error}</p>}

              <div className="mt-8 space-y-3">
                <Button type="button" onClick={next} disabled={!isStep1Valid} className={primaryCta}>
                  Continue
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExit}
                  className={secondaryCta}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Exit
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 shadow-[0_0_0_1px_rgba(30,41,59,0.35)_inset] p-6">
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-slate-50">Connect data</h1>
                <p className="text-slate-400">Link your data sources</p>
              </div>

              <div className="mt-7 space-y-3">
                <div className="flex items-center justify-between p-4 bg-slate-950/40 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900/60 rounded-lg flex items-center justify-center border border-slate-800">
                      <span className="text-lg">💳</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-100">Stripe</p>
                      <p className="text-xs text-slate-500">Revenue & payments</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 px-2 py-1 bg-black/20 border border-slate-800 rounded-md">
                    Coming soon
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-950/40 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900/60 rounded-lg flex items-center justify-center border border-slate-800">
                      <span className="text-lg">📊</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-100">CRM</p>
                      <p className="text-xs text-slate-500">Pipeline & deals</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 px-2 py-1 bg-black/20 border border-slate-800 rounded-md">
                    Coming soon
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-[#2B74FF]/10 rounded-xl border border-[#2B74FF]/25">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#2B74FF]/15 rounded-lg flex items-center justify-center border border-[#2B74FF]/25">
                      <span className="text-lg">📈</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-100">Manual KPI</p>
                      <p className="text-xs text-slate-400">Enter data manually</p>
                    </div>
                  </div>
                  <span className="text-xs text-[#2B74FF] px-2 py-1 bg-[#2B74FF]/10 rounded-md font-medium border border-[#2B74FF]/20">
                    Available
                  </span>
                </div>
              </div>

              <div className="mt-5 p-4 bg-slate-950/40 rounded-xl border border-slate-800">
                <p className="text-sm text-slate-400 leading-relaxed">
                  <span className="text-[#2B74FF] font-medium">Valyxo Agent</span> will keep this updated automatically once
                  connected.
                </p>
              </div>

              <div className="mt-8 space-y-3">
                <Button type="button" className={primaryCta} onClick={next}>
                  Continue with Manual KPI
                </Button>

                <Button type="button" variant="outline" className={secondaryCta} onClick={back}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 shadow-[0_0_0_1px_rgba(30,41,59,0.35)_inset] p-6 text-center">
              {isLoading ? (
                <div className="space-y-6">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-[#2B74FF]/10 flex items-center justify-center border border-[#2B74FF]/20">
                    <div className="w-8 h-8 border-2 border-[#2B74FF] border-t-transparent rounded-full animate-spin" />
                  </div>

                  <div className="space-y-2">
                    <h1 className="text-2xl font-semibold text-slate-50">Preparing your view</h1>
                    <p className="text-slate-400">Setting up your investor dashboard...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>

                  <div className="space-y-2">
                    <h1 className="text-2xl font-semibold text-slate-50">You're all set</h1>
                    <p className="text-slate-400">Your investor view is ready</p>
                  </div>

                  {error && <p className="text-xs text-rose-400">{error}</p>}

                  <Button type="button" className={primaryCta} onClick={handleFinish} disabled={isLoading}>
                    Go to Dashboard
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}