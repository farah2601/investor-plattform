"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { KpiCard } from "../../components/ui/KpiCard";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type RequestItem = {
  id: string;
  created_at: string;
  company_id: string;
  investor_name: string;
  investor_email: string;
  investor_company: string | null;
  message: string | null;
  status: string;
  companies?: {
    name: string;
  } | null;
  link?: {
    id: string;
    access_token: string;
    expires_at: string;
  } | null;
};

type CompanyKpi = {
  id: string;
  name: string;
  industry: string | null;
  mrr: number | null;
  arr: number | null;
  burn_rate: number | null;
  runway_months: number | null;
  churn: number | null;
  growth_percent: number | null;
  lead_velocity: number | null;
};

function formatMoney(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("nb-NO") + " kr";
}

function formatPercent(value: number | null) {
  if (value == null) return "—";
  return value.toString().replace(".", ",") + " %";
}

function RequestActions({
  req,
  onUpdated,
}: {
  req: RequestItem;
  onUpdated: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  async function updateStatus(status: string) {
    startTransition(async () => {
      const { error: updateError } = await supabase
        .from("access_requests")
        .update({ status })
        .eq("id", req.id);

      if (updateError) {
        console.error("Feil ved oppdatering av status", updateError);
        alert("Feil ved oppdatering: " + updateError.message);
        return;
      }

      if (status === "approved") {
        const { data: existing, error: existingError } = await supabase
          .from("investor_links")
          .select("*")
          .eq("request_id", req.id)
          .maybeSingle();

        if (existingError) {
          console.error("Feil ved henting av eksisterende link", existingError);
        }

        if (!existing) {
          const token =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : Math.random().toString(36).slice(2) +
                Math.random().toString(36).slice(2);

          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);

          const { error: insertError } = await supabase
            .from("investor_links")
            .insert([
              {
                access_token: token,
                request_id: req.id,
                expires_at: expiresAt.toISOString(),
              },
            ]);

          if (insertError) {
            console.error("Feil ved oppretting av link", insertError);
            alert(
              "Feil ved oppretting av tilgangslenke: " +
                insertError.message
            );
          }
        }
      }

      await onUpdated();
    });
  }

  return (
    <div className="flex gap-2 mt-3">
      <Button
        size="sm"
        className="bg-emerald-600 hover:bg-emerald-500 text-white"
        onClick={() => updateStatus("approved")}
        disabled={isPending}
      >
        Godkjenn
      </Button>

      <Button
        size="sm"
        variant="destructive"
        onClick={() => updateStatus("rejected")}
        disabled={isPending}
      >
        Avslå
      </Button>
    </div>
  );
}

const INTEGRATIONS = [
  { id: "tripletex", category: "Regnskap", name: "Tripletex", status: "Not connected" },
  { id: "fiken", category: "Regnskap", name: "Fiken", status: "Not connected" },
  { id: "pipedrive", category: "CRM", name: "Pipedrive", status: "Not connected" },
  { id: "hubspot", category: "CRM", name: "HubSpot", status: "Not connected" },
  { id: "sheets", category: "Sheets", name: "Google Sheets", status: "Connected" },
];

export default function CompanyDashboard() {
  const router = useRouter();

  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [company, setCompany] = useState<CompanyKpi | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 🔐 ny state: har vi sjekket auth?
  const [authChecked, setAuthChecked] = useState(false);

  // KPI-modal-state
  const [kpiDialogOpen, setKpiDialogOpen] = useState(false);
  const [savingKpi, setSavingKpi] = useState(false);
  const [kpiForm, setKpiForm] = useState({
    mrr: "",
    arr: "",
    burn_rate: "",
    runway_months: "",
    churn: "",
    growth_percent: "",
  });

  // 🔐 AUTH-SJEKK
  useEffect(() => {
    async function checkAuthAndLoad() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Ikke logget inn → send til login
      if (!session) {
        router.replace("/login");
        return;
      }

      // Logget inn → last data
      setAuthChecked(true);
      await loadData();
    }

    checkAuthAndLoad();
  }, [router]);

  async function loadData() {
    setError(null);

    // 1) Forespørsler + selskap-navn
    const { data: reqs, error: reqError } = await supabase
      .from("access_requests")
      .select("*, companies(name)")
      .order("created_at", { ascending: false });

    if (reqError) {
      console.error("Feil ved henting av forespørsler", reqError);
      setError(reqError.message);
      return;
    }

    // 2) Investor-links
    const { data: links, error: linkError } = await supabase
      .from("investor_links")
      .select("*");

    if (linkError) {
      console.error("Feil ved henting av investor_links", linkError);
      setError(linkError.message);
      return;
    }

    const withLinks: RequestItem[] =
      (reqs ?? []).map((r: any) => ({
        ...r,
        link: links?.find((l: any) => l.request_id === r.id) ?? null,
      })) ?? [];

    setRequests(withLinks);

    // 3) Første company (MVP)
    const { data: companiesData, error: companyError } = await supabase
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
        growth_percent,
        lead_velocity
      `
      )
      .order("name", { ascending: true })
      .limit(1);

    if (companyError) {
      console.error("Feil ved henting av company KPI", companyError);
      return;
    }

    const first = (companiesData?.[0] as CompanyKpi) || null;
    setCompany(first);

    if (first) {
      setKpiForm({
        mrr: first.mrr != null ? String(first.mrr) : "",
        arr: first.arr != null ? String(first.arr) : "",
        burn_rate: first.burn_rate != null ? String(first.burn_rate) : "",
        runway_months:
          first.runway_months != null ? String(first.runway_months) : "",
        churn: first.churn != null ? String(first.churn) : "",
        growth_percent:
          first.growth_percent != null ? String(first.growth_percent) : "",
      });
    }
  }

  const approvedWithLink = requests.filter(
    (r) => r.status === "approved" && r.link
  );
  const latestLink = approvedWithLink[0]?.link ?? null;

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";

  // 🔁 NYTT: bruk /investor/{token} i stedet for ?token=
  const investorUrl = latestLink
    ? `${baseUrl}/investor/${latestLink.access_token}`
    : null;

  // ikke vis "rejected"
  const visibleRequests = requests.filter((r) => r.status !== "rejected");

  async function copyLink() {
    if (!investorUrl) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(investorUrl);
        alert("Lenke kopiert ✅");
      } else {
        window.prompt("Kopier lenken manuelt:", investorUrl);
      }
    } catch {
      window.prompt("Kopier lenken manuelt:", investorUrl);
    }
  }

  function openUpdateKpiModal() {
    if (company) {
      setKpiForm({
        mrr: company.mrr != null ? String(company.mrr) : "",
        arr: company.arr != null ? String(company.arr) : "",
        burn_rate: company.burn_rate != null ? String(company.burn_rate) : "",
        runway_months:
          company.runway_months != null ? String(company.runway_months) : "",
        churn: company.churn != null ? String(company.churn) : "",
        growth_percent:
          company.growth_percent != null ? String(company.growth_percent) : "",
      });
    }
    setKpiDialogOpen(true);
  }

  async function handleSaveKpi() {
    if (!company) return;
    setSavingKpi(true);

    const payload = {
      mrr: kpiForm.mrr ? Number(kpiForm.mrr) : null,
      arr: kpiForm.arr ? Number(kpiForm.arr) : null,
      burn_rate: kpiForm.burn_rate ? Number(kpiForm.burn_rate) : null,
      runway_months: kpiForm.runway_months
        ? Number(kpiForm.runway_months)
        : null,
      churn: kpiForm.churn ? Number(kpiForm.churn) : null,
      growth_percent: kpiForm.growth_percent
        ? Number(kpiForm.growth_percent)
        : null,
    };

    const { error: updateError } = await supabase
      .from("companies")
      .update(payload)
      .eq("id", company.id);

    setSavingKpi(false);

    if (updateError) {
      console.error("Feil ved oppdatering av KPI-er", updateError);
      alert("Kunne ikke oppdatere KPI-er: " + updateError.message);
      return;
    }

    setCompany((prev) =>
      prev
        ? {
            ...prev,
            ...payload,
          }
        : prev
    );

    setKpiDialogOpen(false);
    alert("Tall oppdatert ✅");
  }

  // 🔄 Viser "sjekker tilgang" mens vi ikke vet om bruker er logget inn
  if (!authChecked) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400">Sjekker tilgang…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 p-10">
        <h1 className="text-2xl font-bold mb-4">Feil</h1>
        <pre className="text-red-400">{error}</pre>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-slate-950 text-slate-50">
        <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
          {/* HEADER */}
          <header className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs tracking-[0.2em] text-slate-500 uppercase">
                Selskap
              </p>
              <h1 className="text-3xl font-bold">Selskapets dashboard</h1>
              <p className="text-sm text-slate-400">
                Kontrollpanel for KPI-er, integrasjoner og investortilgang.
              </p>
            </div>

            <Link href="/logout">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-100 bg-transparent hover:bg-slate-800/60"
              >
                Logg ut
              </Button>
            </Link>
          </header>

          {/* KPI */}
          {company && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">{company.name}</h2>
                  <p className="text-sm text-slate-400">
                    {company.industry ?? "Ukjent bransje"}
                  </p>
                </div>
                <p className="text-xs text-slate-500">
                  KPI-er (manuelt satt i MVP)
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <KpiCard
                  label="MRR"
                  value={formatMoney(company.mrr)}
                  sublabel="+12 % siste 3 mnd (placeholder)"
                />
                <KpiCard
                  label="ARR"
                  value={formatMoney(company.arr)}
                  sublabel="Årlig gjentakende inntekt (MVP-demo)"
                />
                <KpiCard
                  label="Burn rate"
                  value={formatMoney(company.burn_rate)}
                  sublabel="per måned (demo)"
                />
                <KpiCard
                  label="Runway"
                  value={
                    company.runway_months != null
                      ? `${company.runway_months} mnd`
                      : "—"
                  }
                  sublabel="Estimert levetid med dagens burn"
                />
                <KpiCard
                  label="Churn"
                  value={formatPercent(company.churn)}
                  sublabel="Basert på MRR-churn (demo)"
                />
                <KpiCard
                  label="Growth"
                  value={formatPercent(company.growth_percent)}
                  sublabel="MRR-vekst siste 12 mnd (demo)"
                />
              </div>
            </section>
          )}

          {/* DELBAR LENKE + OPPDATER KPI */}
          <section className="grid gap-4 md:grid-cols-[2fr,1fr]">
            {/* Delbar investor-lenke */}
            <div className="rounded-2xl border border-slate-800 bg-[#13171E] p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-medium text-slate-200">
                  Delbar investor-lenke
                </h2>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs text-slate-400">
                  Bare for godkjente forespørsler
                </span>
              </div>

              <p className="text-xs text-slate-500">
                Godkjenn en forespørsel under, så genererer systemet en privat
                investor-lenke som du kan dele med investorer.
              </p>

              {investorUrl ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <code className="text-xs sm:text-sm text-slate-300 bg-black/30 px-3 py-2 rounded-md break-all">
                    {investorUrl}
                  </code>
                  <button
                    type="button"
                    onClick={copyLink}
                    className="inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm rounded-md bg-white/10 hover:bg-white/20 text-slate-50"
                  >
                    Kopier lenke
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  Ingen investor-lenke ennå. Når du godkjenner en forespørsel
                  nederst på siden, vises lenken her automatisk.
                </p>
              )}
            </div>

            {/* Oppdater KPI-er */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
              <h2 className="text-sm font-medium text-slate-200">
                Oppdater KPI-er
              </h2>
              <p className="text-xs text-slate-400">
                I MVP-en legger dere inn KPI-er manuelt. Senere kobles dette mot
                Tripletex, Fiken, Pipedrive osv.
              </p>
              <Button
                type="button"
                className="w-full"
                onClick={openUpdateKpiModal}
              >
                Oppdater KPI-er
              </Button>
            </div>
          </section>

          {/* Integrasjoner */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Integrasjoner</h2>
              <Link href="/integration">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-100 bg-transparent hover:bg-slate-800/60"
                >
                  Åpne full integrasjonsside
                </Button>
              </Link>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {INTEGRATIONS.map((int) => (
                <div
                  key={int.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-100">
                      {int.name}
                    </p>
                    <p className="text-xs text-slate-400">{int.category}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Status:{" "}
                      <span className="font-medium text-slate-200">
                        {int.status}
                      </span>
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="border-slate-700 text-slate-200 bg-slate-800/40 hover:bg-slate-700/50"
                  >
                    <Link href="/integration">Administrer</Link>
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {/* Forespørsler */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Selskapets forespørsler</h2>

            {visibleRequests.length === 0 && (
              <p className="text-sm text-slate-500">
                Ingen forespørsler som venter på behandling.
              </p>
            )}

            <div className="space-y-3">
              {visibleRequests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
                >
                  <h3 className="text-sm font-semibold text-slate-100">
                    {req.investor_name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {req.investor_email}{" "}
                    {req.investor_company && `· ${req.investor_company}`}
                  </p>

                  {req.message && (
                    <p className="mt-2 text-sm text-slate-200 italic">
                      “{req.message}”
                    </p>
                  )}

                  <p className="mt-2 text-xs text-slate-500">
                    Forespurt tilgang til{" "}
                    <span className="font-medium">
                      {req.companies?.name ?? "ukjent selskap"}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Status: <span className="font-semibold">{req.status}</span>
                  </p>

                  {req.link && (
                    <p className="mt-2 text-xs text-emerald-400 break-all">
                      Tilgangslenke:{" "}
                      {`${baseUrl}/investor/${req.link.access_token}`}
                      <br />
                      (Utgår:{" "}
                      {new Date(
                        req.link.expires_at
                      ).toLocaleDateString("nb-NO")}
                      )
                    </p>
                  )}

                  <RequestActions req={req} onUpdated={loadData} />
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* KPI-MODAL */}
      <Dialog open={kpiDialogOpen} onOpenChange={setKpiDialogOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-50">
          <DialogHeader>
            <DialogTitle>Oppdater KPI-er</DialogTitle>
            <DialogDescription className="text-slate-400">
              Legg inn oppdaterte tall for selskapet. Disse tallene vises både
              i ditt dashboard og i investorvisningen.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">MRR (kr)</label>
              <Input
                value={kpiForm.mrr}
                onChange={(e) =>
                  setKpiForm((f) => ({ ...f, mrr: e.target.value }))
                }
                placeholder="f.eks. 200000"
                className="bg-slate-900 border-slate-700"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">ARR (kr)</label>
              <Input
                value={kpiForm.arr}
                onChange={(e) =>
                  setKpiForm((f) => ({ ...f, arr: e.target.value }))
                }
                placeholder="f.eks. 2400000"
                className="bg-slate-900 border-slate-700"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">
                Burn rate (kr / mnd)
              </label>
              <Input
                value={kpiForm.burn_rate}
                onChange={(e) =>
                  setKpiForm((f) => ({ ...f, burn_rate: e.target.value }))
                }
                placeholder="f.eks. 150000"
                className="bg-slate-900 border-slate-700"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">
                Runway (måneder)
              </label>
              <Input
                value={kpiForm.runway_months}
                onChange={(e) =>
                  setKpiForm((f) => ({
                    ...f,
                    runway_months: e.target.value,
                  }))
                }
                placeholder="f.eks. 14"
                className="bg-slate-900 border-slate-700"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Churn (%)</label>
              <Input
                value={kpiForm.churn}
                onChange={(e) =>
                  setKpiForm((f) => ({ ...f, churn: e.target.value }))
                }
                placeholder="f.eks. 3.2"
                className="bg-slate-900 border-slate-700"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Growth (%)</label>
              <Input
                value={kpiForm.growth_percent}
                onChange={(e) =>
                  setKpiForm((f) => ({
                    ...f,
                    growth_percent: e.target.value,
                  }))
                }
                placeholder="f.eks. 12"
                className="bg-slate-900 border-slate-700"
              />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              className="border-slate-700 text-slate-200"
              onClick={() => setKpiDialogOpen(false)}
              disabled={savingKpi}
            >
              Avbryt
            </Button>
            <Button
              onClick={handleSaveKpi}
              disabled={savingKpi}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              {savingKpi ? "Lagrer..." : "Lagre KPI-er"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
