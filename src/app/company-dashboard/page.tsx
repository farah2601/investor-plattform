"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "../lib/supabaseClient";
import { cn } from "@/lib/utils";
import { KpiCard } from "../../components/ui/KpiCard";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ArrChart } from "../../components/ui/ArrChart";
import { MrrChart } from "../../components/ui/MrrChart";
import { BurnChart } from "../../components/ui/BurnChart";
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
  companies?: { name: string } | null;
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

  // agent metadata
  last_agent_run_at?: string | null;
  last_agent_run_by?: string | null;
};

type AgentLog = {
  id?: string;
  created_at?: string;
  step?: string;
  status?: string;
  error?: string | null;
  meta?: any;
  tool_name?: string; // if using tool_name instead of step
};

function formatMoney(value: number | null) {
  if (value == null) return "—";
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`;
  }
  return "$" + value.toLocaleString("en-US");
}

function formatPercent(value: number | null) {
  if (value == null) return "—";
  return value.toFixed(1) + "%";
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
      // 1) Oppdater status
      const { error: updateError } = await supabase
        .from("access_requests")
        .update({ status })
        .eq("id", req.id);

      if (updateError) {
        console.error("Error updating status", updateError);
        alert("Error updating status: " + updateError.message);
        return;
      }

      // 2) Approved → create investor_link if it doesn't exist
      if (status === "approved") {
        const { data: existing, error: existingError } = await supabase
          .from("investor_links")
          .select("*")
          .eq("request_id", req.id)
          .maybeSingle();

        if (existingError) {
          console.error("Error fetching existing link", existingError);
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
                company_id: req.company_id,
                expires_at: expiresAt.toISOString(),
              },
            ]);

          if (insertError) {
            console.error("Error creating link", insertError);
            alert("Error creating access link: " + insertError.message);
          }
        }
      }

      // 3) Refresh UI
      await onUpdated();
    });
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        className="border-slate-700 text-slate-200 bg-slate-800/40 hover:bg-slate-700/50 text-xs h-7 px-2.5"
        onClick={() => updateStatus("approved")}
        disabled={isPending}
      >
        Approve
      </Button>

      <Button
        size="sm"
        variant="outline"
        className="border-slate-700 text-slate-300 bg-slate-800/40 hover:bg-slate-700/50 text-xs h-7 px-2.5"
        onClick={() => updateStatus("rejected")}
        disabled={isPending}
      >
        Decline
      </Button>
    </div>
  );
}

function RemoveAccessButton({
  req,
  onUpdated,
}: {
  req: RequestItem;
  onUpdated: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  async function removeAccess() {
    if (!confirm(`Remove access for ${req.investor_name}? This will revoke their investor link.`)) {
      return;
    }

    startTransition(async () => {
      // 1) Delete investor_link if it exists
      if (req.link) {
        const { error: linkError } = await supabase
          .from("investor_links")
          .delete()
          .eq("id", req.link.id);

        if (linkError) {
          console.error("Error deleting investor link", linkError);
          alert("Error removing access: " + linkError.message);
          return;
        }
      }

      // 2) Update status to rejected
      const { error: updateError } = await supabase
        .from("access_requests")
        .update({ status: "rejected" })
        .eq("id", req.id);

      if (updateError) {
        console.error("Error updating status", updateError);
        alert("Error removing access: " + updateError.message);
        return;
      }

      // 3) Refresh UI
      await onUpdated();
    });
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 hover:border-red-500/50 text-xs h-7 px-2.5"
      onClick={removeAccess}
      disabled={isPending}
    >
      {isPending ? "Removing..." : "Remove"}
    </Button>
  );
}

const DATA_SOURCES = [
  { id: "stripe", category: "Billing", name: "Stripe", status: "coming_soon" },
  { id: "hubspot", category: "CRM", name: "HubSpot", status: "coming_soon" },
  { id: "pipedrive", category: "CRM", name: "Pipedrive", status: "coming_soon" },
  { id: "fiken", category: "Accounting", name: "Fiken", status: "coming_soon" },
  { id: "tripletex", category: "Accounting", name: "Tripletex", status: "coming_soon" },
  { id: "sheets", category: "Manual input", name: "Google Sheets", status: "connected" },
];

export default function CompanyDashboard() {
  const router = useRouter();

  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [company, setCompany] = useState<CompanyKpi | null>(null);
  const [error, setError] = useState<string | null>(null);

  // auth-sjekk
  const [authChecked, setAuthChecked] = useState(false);

  // AI Insights
  const [insights, setInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsGeneratedAt, setInsightsGeneratedAt] = useState<string | null>(null);

  // Run agent
  const [runningAgent, setRunningAgent] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);

  // Agent logs
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // KPI-modal
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

  useEffect(() => {
    async function checkAuthAndLoad() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      setAuthChecked(true);
      await loadData();
    }

    checkAuthAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function loadInsights(companyId: string) {
    setLoadingInsights(true);
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyId }),
      });

      const data = await res.json().catch(() => ({}));
      if (data?.insights && Array.isArray(data.insights)) {
        setInsights(data.insights);
        setInsightsGeneratedAt(data?.generatedAt ?? null);
      } else {
        setInsights([]);
        setInsightsGeneratedAt(null);
      }
    } catch (e) {
      console.error("Failed to load insights", e);
      setInsights([]);
    } finally {
      setLoadingInsights(false);
    }
  }

  async function loadAgentLogs(companyId: string) {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/agent/logs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyId }),
      });

      const data = await res.json().catch(() => ({}));
      if (data?.logs && Array.isArray(data.logs)) setAgentLogs(data.logs);
      else setAgentLogs([]);
    } catch (e) {
      console.error("Failed to load agent logs", e);
      setAgentLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }

  async function runAgent(companyId: string) {
    setRunningAgent(true);
    setAgentError(null);

    try {
      const res = await fetch("/api/agent/run-all", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Agent failed");
      }

      // ✅ Refresh ALL (company + insights + logs)
      await loadData();

      alert("Valyxo Agent completed successfully");
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || "Unknown error";
      setAgentError(msg);
      alert("Error: " + msg);
    } finally {
      setRunningAgent(false);
    }
  }

  async function loadData() {
    setError(null);

    // 1) access_requests + company name
    const { data: reqs, error: reqError } = await supabase
      .from("access_requests")
      .select("*, companies(name)")
      .order("created_at", { ascending: false });

    if (reqError) {
      console.error("Error fetching requests", reqError);
      setError(reqError.message);
      return;
    }

    // 2) investor_links
    const { data: links, error: linkError } = await supabase
      .from("investor_links")
      .select("*");

    if (linkError) {
      console.error("Error fetching investor_links", linkError);
      setError(linkError.message);
      return;
    }

    const withLinks: RequestItem[] =
      (reqs ?? []).map((r: any) => ({
        ...r,
        link: links?.find((l: any) => l.request_id === r.id) ?? null,
      })) ?? [];

    setRequests(withLinks);

    // 3) first company
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
        lead_velocity,
        last_agent_run_at,
        last_agent_run_by
        `
      )
      .order("name", { ascending: true })
      .limit(1);

    if (companyError) {
      console.error("Error fetching company KPI", companyError);
      setError(companyError.message);
      return;
    }

    const first = (companiesData?.[0] as CompanyKpi) || null;
    setCompany(first);

    if (first) {
      setKpiForm({
        mrr: first.mrr != null ? String(first.mrr) : "",
        arr: first.arr != null ? String(first.arr) : "",
        burn_rate: first.burn_rate != null ? String(first.burn_rate) : "",
        runway_months: first.runway_months != null ? String(first.runway_months) : "",
        churn: first.churn != null ? String(first.churn) : "",
        growth_percent: first.growth_percent != null ? String(first.growth_percent) : "",
      });

      // ✅ load simultaneously
      await Promise.all([loadInsights(first.id), loadAgentLogs(first.id)]);
    } else {
      setInsights([]);
      setAgentLogs([]);
    }
  }

  const approvedWithLink = requests.filter((r) => r.status === "approved" && r.link);
  const latestLink = approvedWithLink[0]?.link ?? null;

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  const investorUrl = latestLink ? `${baseUrl}/investor/${latestLink.access_token}` : null;
  const visibleRequests = requests.filter((r) => r.status !== "rejected");

  async function copyLink() {
    if (!investorUrl) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(investorUrl);
        alert("Link copied to clipboard");
      } else {
        window.prompt("Copy link manually:", investorUrl);
      }
    } catch {
      window.prompt("Copy link manually:", investorUrl);
    }
  }

  function openUpdateKpiModal() {
    if (company) {
      setKpiForm({
        mrr: company.mrr != null ? String(company.mrr) : "",
        arr: company.arr != null ? String(company.arr) : "",
        burn_rate: company.burn_rate != null ? String(company.burn_rate) : "",
        runway_months: company.runway_months != null ? String(company.runway_months) : "",
        churn: company.churn != null ? String(company.churn) : "",
        growth_percent: company.growth_percent != null ? String(company.growth_percent) : "",
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
      runway_months: kpiForm.runway_months ? Number(kpiForm.runway_months) : null,
      churn: kpiForm.churn ? Number(kpiForm.churn) : null,
      growth_percent: kpiForm.growth_percent ? Number(kpiForm.growth_percent) : null,
    };

    const { error: updateError } = await supabase
      .from("companies")
      .update(payload)
      .eq("id", company.id);

    setSavingKpi(false);

    if (updateError) {
      console.error("Error updating KPIs", updateError);
      alert("Could not update KPIs: " + updateError.message);
      return;
    }

    setCompany((prev) => (prev ? { ...prev, ...payload } : prev));
    setKpiDialogOpen(false);
    alert("KPIs updated successfully");

    // refresh insights + logs after KPI update
    await Promise.all([loadInsights(company.id), loadAgentLogs(company.id)]);
  }

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400">Checking access…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50 p-10">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <pre className="text-red-400">{error}</pre>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-slate-950 text-slate-50">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
          {/* HEADER - mobile: stack, desktop: side-by-side */}
          <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6 pb-2">
            <div className="space-y-3 sm:space-y-4 flex-1 min-w-0">
              <div className="space-y-1">
                <p className="text-xs tracking-[0.2em] text-slate-500 uppercase">Company</p>
                <h1 className="text-2xl sm:text-3xl font-semibold text-slate-50">{company?.name || "Company Dashboard"}</h1>
                {company?.industry && (
                  <p className="text-sm text-slate-400 mt-1">{company.industry}</p>
                )}
              </div>
              
              {company && (
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                    runningAgent 
                      ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                      : company.last_agent_run_at
                      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                      : "bg-slate-800/60 text-slate-400 border border-slate-700/50"
                  )}>
                    {runningAgent ? "Running" : company.last_agent_run_at ? "Up to date" : "Needs attention"}
                  </span>
                  {company.last_agent_run_at && (
                    <p className="text-xs text-slate-500">
                      Last updated · {new Date(company.last_agent_run_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* mobile: stack buttons, desktop: row */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {company?.id && (
                <Button
                  size="sm"
                  onClick={() => runAgent(company.id)}
                  disabled={runningAgent}
                  className="bg-[#2B74FF] hover:bg-[#2B74FF]/90 text-white disabled:opacity-50 h-10 sm:h-9 px-4"
                >
                  {runningAgent ? "Running…" : "Run Agent"}
                </Button>
              )}
              <Link href="/company-profile">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700/50 text-slate-300 bg-slate-800/30 hover:bg-slate-800/50 h-10 sm:h-9 px-4"
                >
                  Profile
                </Button>
              </Link>
              {investorUrl && (
                <a
                  href={investorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-slate-300 hover:text-slate-100 transition-colors flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-md border border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/50 h-10 sm:h-9"
                >
                  <span className="hidden sm:inline">Preview investor view</span>
                  <span className="sm:hidden">Preview</span>
                  <span className="text-slate-500">→</span>
                </a>
              )}
              <Link href="/logout">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 h-10 sm:h-9 px-4"
                >
                  Sign out
                </Button>
              </Link>
            </div>
          </header>

          {/* KPI - mobile: 2 cols, tablet: 3 cols, desktop: 5 cols */}
          {company && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6 shadow-xl space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-sm sm:text-base font-medium text-slate-200">Key Metrics</h2>
                  <p className="text-xs text-slate-500 mt-1">
                  {company.last_agent_run_at ? (
                    <>
                        Last updated · {new Date(company.last_agent_run_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                    </>
                  ) : (
                    <>Not updated yet</>
                  )}
                </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs text-slate-500">
                    Powered by <span className="font-medium text-slate-300">Valyxo Agent</span>
                  </p>
                </div>
              </div>

              {/* mobile: 2 cols, tablet: 3 cols, desktop: 6 cols */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                <KpiCard label="ARR" value={formatMoney(company.arr)} sublabel="Annual recurring revenue" />
                <KpiCard label="MRR" value={formatMoney(company.mrr)} sublabel="Monthly recurring revenue" />
                <KpiCard
                  label="Growth"
                  value={formatPercent(company.growth_percent)}
                  sublabel="MRR growth (last 12 months)"
                />
                <KpiCard label="Burn rate" value={formatMoney(company.burn_rate)} sublabel="Monthly burn" />
                <KpiCard
                  label="Runway"
                  value={company.runway_months != null ? `${company.runway_months} months` : "—"}
                  sublabel="Estimated runway at current burn"
                />
                <KpiCard label="Churn" value={formatPercent(company.churn)} sublabel="MRR churn rate" />
              </div>
            </section>
          )}

          {/* CHARTS SECTION - mobile: stack, desktop: 2 columns */}
          {company && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6 shadow-xl space-y-4 sm:space-y-6">
              <div>
                <h2 className="text-sm sm:text-base font-medium text-slate-200">Trends</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Revenue and burn metrics over time
                </p>
              </div>

              {/* mobile: stack, desktop: 2 columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* ARR Chart */}
                <div>
                  <ArrChart />
                </div>

                {/* MRR Chart */}
                <div>
                  <MrrChart />
                </div>

                {/* Burn/Runway Chart - full width on desktop */}
                <div className="lg:col-span-2">
                  <BurnChart />
                </div>
              </div>
            </section>
          )}

          {/* AI INSIGHTS - Premium "wow" card */}
          <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950/60 p-4 sm:p-6 lg:p-8 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
              <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-100">AI Insights</h2>
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-[#2B74FF]/10 text-[#2B74FF] border border-[#2B74FF]/20">
                    Generated by Valyxo Agent
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Automated analysis of your key metrics and trends
                </p>
              </div>

              {company?.id && !runningAgent && !loadingInsights && insights.length === 0 && (
                <Button
                  size="sm"
                      onClick={() => runAgent(company.id)}
                  className="bg-[#2B74FF] hover:bg-[#2B74FF]/90 text-white"
                >
                  Run Valyxo Agent
                </Button>
              )}
            </div>

            {(loadingInsights || runningAgent) && (
              <div className="flex items-center gap-2 py-4">
                <div className="h-4 w-4 border-2 border-[#2B74FF] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-slate-400">
                  {runningAgent ? "Agent running…" : "Analyzing data…"}
              </p>
              </div>
            )}

            {agentError && !runningAgent && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
                <p className="text-sm text-red-300">Agent error: {agentError}</p>
              </div>
            )}

            {!loadingInsights && !runningAgent && insights.length === 0 && (
              <div className="py-8 text-center space-y-3">
                <p className="text-sm text-slate-400">No insights yet.</p>
                {company?.id && (
                  <Button
                    size="sm"
                    onClick={() => runAgent(company.id)}
                    variant="outline"
                    className="border-slate-700 text-slate-200 bg-slate-800/40 hover:bg-slate-700/50"
                  >
                    Run Valyxo Agent
                  </Button>
                )}
              </div>
            )}

            {insights.length > 0 && (
              <div className="space-y-3">
                <ul className="space-y-2.5">
              {insights.map((insight, i) => (
                    <li key={i} className="text-sm text-slate-200 leading-relaxed pl-4 border-l-2 border-[#2B74FF]/30">
                      {insight}
                </li>
              ))}
            </ul>
                <div className="pt-2 border-t border-slate-800">
                  <p className="text-xs text-slate-500">
                    Last updated · Powered by Valyxo Agent ·{" "}
                    {insightsGeneratedAt ? (
                      new Date(insightsGeneratedAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* AGENT ACTIVITY / LOGS - System level, moved lower */}
          <section className="rounded-xl border border-slate-800/50 bg-slate-900/30 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wide">Agent Activity</h2>
                <p className="text-xs text-slate-500 mt-0.5">System logs and execution history</p>
              </div>

              {company?.id && (
                <button
                  type="button"
                  onClick={() => loadAgentLogs(company.id)}
                  className="text-xs px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-300 disabled:opacity-60"
                  disabled={loadingLogs}
                >
                  {loadingLogs ? "Loading…" : "Refresh"}
                </button>
              )}
            </div>

            {loadingLogs && <p className="text-xs text-slate-500">Loading logs…</p>}

            {!loadingLogs && agentLogs.length === 0 && (
              <p className="text-xs text-slate-500">No logs yet.</p>
            )}

            {agentLogs.length > 0 && (
              <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                {agentLogs.slice(0, 8).map((log) => {
                const step = log.step ?? log.tool_name ?? "unknown_step";
                const status = log.status ?? "UNKNOWN";
                const key = log.id ?? `${log.created_at ?? ""}-${step}-${status}`;
                return (
                  <li
                    key={key}
                      className="text-xs text-slate-400 bg-black/10 rounded px-2.5 py-1.5 font-mono"
                  >
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-300">
                          {step} <span className="text-slate-500">·</span> <span className="text-slate-400">{status}</span>
                      </span>
                        <span className="text-slate-600 text-[10px]">
                          {log.created_at ? new Date(log.created_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          }) : ""}
                      </span>
                    </div>

                    {log.error && (
                        <p className="mt-1 text-red-400/80 break-words text-[10px]">Error: {log.error}</p>
                    )}
                  </li>
                );
              })}
            </ul>
            )}
          </section>

          {/* Investor Access Link + Update KPIs - mobile: stack, desktop: side-by-side */}
          <section className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-4 sm:gap-6">
            {/* Shareable investor link */}
            <div className="rounded-xl border border-slate-800/50 bg-slate-900/30 p-4 sm:p-5 space-y-3">
              <div>
                <h2 className="text-xs sm:text-sm font-medium text-slate-300">Investor Access Link</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Private link to share with approved investors
                </p>
              </div>

              {investorUrl ? (
                <div className="space-y-2">
                  {/* mobile: stack, desktop: row */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <code className="flex-1 text-xs text-slate-300 bg-black/30 px-3 py-2 rounded border border-slate-800 font-mono break-all min-w-0">
                    {investorUrl}
                  </code>
                    <Button
                      size="sm"
                      variant="outline"
                    onClick={copyLink}
                      className="border-slate-700 text-slate-200 bg-slate-800/40 hover:bg-slate-700/50 shrink-0 h-10 sm:h-9 px-4"
                    >
                      Copy
                    </Button>
                  </div>
                  {latestLink?.expires_at && (
                    <p className="text-xs text-slate-500">
                      Link expires {new Date(latestLink.expires_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  Approve a request below to generate an investor link.
                </p>
              )}
            </div>

            {/* Update KPIs */}
            <div className="rounded-xl border border-slate-800/50 bg-slate-900/30 p-4 sm:p-5 space-y-3">
              <div>
                <h2 className="text-xs sm:text-sm font-medium text-slate-300">Update KPIs</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manual entry
                </p>
            </div>
                <Button
                type="button" 
                  variant="outline"
                className="w-full border-slate-700 text-slate-200 bg-slate-800/40 hover:bg-slate-700/50 h-10 sm:h-11 px-4" 
                onClick={openUpdateKpiModal}
                >
                Update KPIs
                </Button>
            </div>
          </section>

          {/* Data Sources */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6 space-y-4">
                  <div>
              <h2 className="text-sm sm:text-base font-medium text-slate-200">Data Sources</h2>
              <p className="text-xs text-slate-500 mt-1">
                Automatically keeps your metrics up to date.
                    </p>
                  </div>

            <div className="space-y-0 divide-y divide-slate-800/50">
              {DATA_SOURCES.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-100">{source.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{source.category}</p>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {source.status === "connected" ? (
                      <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-[#2B74FF]/10 text-[#2B74FF] border border-[#2B74FF]/20">
                        Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-slate-800/60 text-slate-400 border border-slate-700/50">
                        Coming soon
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Link href="/integration">
                  <Button
                    variant="outline"
                    size="sm"
                  className="w-full border-slate-700 text-slate-200 bg-slate-800/40 hover:bg-slate-700/50 h-10 sm:h-11 px-4"
                  >
                  Manage data sources
                  </Button>
              </Link>
            </div>
          </section>

          {/* Investor Access */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6 space-y-4">
            <div>
              <h2 className="text-sm sm:text-base font-medium text-slate-200">Investor Access</h2>
              <p className="text-xs text-slate-500 mt-1">
                Approve access requests to generate private investor links.
              </p>
            </div>

            {visibleRequests.length === 0 && (
              <p className="text-sm text-slate-400">No pending access requests.</p>
            )}

            {visibleRequests.length > 0 && (
              <div className="space-y-0 divide-y divide-slate-800/50">
              {visibleRequests.map((req) => (
                  <div key={req.id} className="py-3 first:pt-0 last:pb-0">
                    {/* mobile: stack, desktop: side-by-side */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-100 break-words">{req.investor_name}</p>
                        <p className="text-xs text-slate-400 mt-0.5 break-all">
                          {req.investor_email}
                          {req.investor_company && ` · ${req.investor_company}`}
                  </p>
                        {req.message && (
                          <p className="text-xs text-slate-300 mt-1.5 italic break-words">"{req.message}"</p>
                        )}
                        {req.status === "approved" && req.link && (
                          <p className="text-xs text-slate-500 mt-2">
                            Link expires {new Date(req.link.expires_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })}
                    </p>
                  )}
                      </div>
                      {/* mobile: full width buttons, desktop: shrink */}
                      <div className="flex-shrink-0 flex items-center gap-2 sm:flex-col sm:items-end">
                        {req.status === "approved" ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                              Approved
                            </span>
                            <RemoveAccessButton req={req} onUpdated={loadData} />
                          </div>
                        ) : (
                  <RequestActions req={req} onUpdated={loadData} />
                        )}
                      </div>
                    </div>
                </div>
              ))}
            </div>
            )}
          </section>
        </div>
      </main>

      {/* KPI-MODAL - mobile: full width, desktop: max-w-lg */}
      <Dialog open={kpiDialogOpen} onOpenChange={setKpiDialogOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-50 w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Update KPIs</DialogTitle>
            <DialogDescription className="text-sm text-slate-400">
              Enter updated numbers for your company. These values appear in both your dashboard and the investor view.
            </DialogDescription>
          </DialogHeader>

          {/* mobile: 1 col, tablet+: 2 cols */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">MRR ($)</label>
              <Input
                value={kpiForm.mrr}
                onChange={(e) => setKpiForm((f) => ({ ...f, mrr: e.target.value }))}
                placeholder="e.g. 200000"
                className="bg-slate-900 border-slate-700"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">ARR ($)</label>
              <Input
                value={kpiForm.arr}
                onChange={(e) => setKpiForm((f) => ({ ...f, arr: e.target.value }))}
                placeholder="e.g. 2400000"
                className="bg-slate-900 border-slate-700"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Burn rate ($ / month)</label>
              <Input
                value={kpiForm.burn_rate}
                onChange={(e) => setKpiForm((f) => ({ ...f, burn_rate: e.target.value }))}
                placeholder="e.g. 150000"
                className="bg-slate-900 border-slate-700"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Runway (months)</label>
              <Input
                value={kpiForm.runway_months}
                onChange={(e) => setKpiForm((f) => ({ ...f, runway_months: e.target.value }))}
                placeholder="e.g. 14"
                className="bg-slate-900 border-slate-700"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Churn (%)</label>
              <Input
                value={kpiForm.churn}
                onChange={(e) => setKpiForm((f) => ({ ...f, churn: e.target.value }))}
                placeholder="e.g. 3.2"
                className="bg-slate-900 border-slate-700"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Growth (%)</label>
              <Input
                value={kpiForm.growth_percent}
                onChange={(e) => setKpiForm((f) => ({ ...f, growth_percent: e.target.value }))}
                placeholder="e.g. 12"
                className="bg-slate-900 border-slate-700"
              />
            </div>
          </div>

          <DialogFooter className="mt-2 flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="border-white/[0.12] text-slate-950 hover:text-slate-950 bg-white hover:bg-white/90 w-full sm:w-auto h-10 sm:h-9 px-4"
              onClick={() => setKpiDialogOpen(false)}
              disabled={savingKpi}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveKpi}
              disabled={savingKpi}
              className="bg-[#2B74FF] hover:bg-[#2B74FF]/90 text-white w-full sm:w-auto h-10 sm:h-9 px-4"
            >
              {savingKpi ? "Saving..." : "Save KPIs"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}