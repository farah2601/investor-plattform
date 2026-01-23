"use client";

import { useEffect, useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { supabase } from "../../app/lib/supabaseClient";
import { cn } from "../../../lib/utils";
import { KpiCard } from "../../components/ui/KpiCard";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ArrChart, type ArrChartDataPoint } from "../../components/ui/ArrChart";
import { BurnChart, type BurnChartDataPoint } from "../../components/ui/BurnChart";
import { MrrChart, type MrrChartDataPoint } from "../../components/ui/MrrChart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../components/ui/dialog";
import { FormattedDate } from "../../components/ui/FormattedDate";
import { Avatar, AvatarFallback } from "../../../components/ui/avatar";

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
  
  // Google Sheets metadata
  google_sheets_last_sync_at?: string | null;
  google_sheets_last_sync_by?: string | null;
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
  // Value is already in percentage format (e.g., 2.5 for 2.5%)
  return value.toFixed(1) + "%";
}

function formatRunway(value: number | null) {
  if (value == null) return "—";
  return `${value.toFixed(1)} months`;
}

function CompanyDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Read companyId from query params (support both 'companyId' and 'company')
  const companyIdFromUrl = searchParams.get("companyId") || searchParams.get("company");

  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [company, setCompany] = useState<CompanyKpi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(companyIdFromUrl);

  // auth-sjekk
  const [authChecked, setAuthChecked] = useState(false);

  // Computed Insights
  const [insights, setInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsGeneratedAt, setInsightsGeneratedAt] = useState<string | null>(null);
  const [basedOnSnapshotDate, setBasedOnSnapshotDate] = useState<string | null>(null);

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
    kpi_currency: "USD",
    kpi_scale: "unit" as "unit" | "k" | "m",
  });

  // KPI History for charts - using new API format with series
  const [arrSeries, setArrSeries] = useState<Array<{ date: string; label: string; value: number | null }>>([]);
  const [mrrSeries, setMrrSeries] = useState<Array<{ date: string; label: string; value: number | null }>>([]);
  const [burnSeries, setBurnSeries] = useState<Array<{ date: string; label: string; value: number | null }>>([]);

  // User dropdown
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuthAndLoad() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      setUserEmail(session.user.email || null);
      setAuthChecked(true);
      
      // Update currentCompanyId when URL changes
      const urlCompanyId = searchParams.get("companyId") || searchParams.get("company");
      setCurrentCompanyId(urlCompanyId);
      
      await loadData(urlCompanyId);
    }

    checkAuthAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, searchParams]);

  async function loadInsights(companyId: string) {
    setLoadingInsights(true);
    try {
      const res = await fetch(`/api/insights?companyId=${encodeURIComponent(companyId)}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));
      if (data?.ok && Array.isArray(data.insights)) {
        setInsights(data.insights);
        setInsightsGeneratedAt(data?.generatedAt ?? null);
        setBasedOnSnapshotDate(data?.basedOnSnapshotDate ?? null);
      } else {
        setInsights([]);
        setInsightsGeneratedAt(null);
        setBasedOnSnapshotDate(null);
      }
    } catch (e) {
      console.error("Failed to load insights", e);
      setInsights([]);
      setInsightsGeneratedAt(null);
      setBasedOnSnapshotDate(null);
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

  async function loadKpiHistory(companyId: string) {
    try {
      console.log("[loadKpiHistory] Fetching KPI snapshots for companyId:", companyId);
      
      // Fetch from kpi_snapshots table - real historical data only
      const res = await fetch(`/api/kpi/snapshots?companyId=${companyId}`, {
        cache: "no-store",
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("[loadKpiHistory] API error:", res.status, errorData);
        setArrSeries([]);
        setMrrSeries([]);
        setBurnSeries([]);
        return;
      }
      
      const json = await res.json().catch(() => ({}));
      console.log("[Dashboard] series lengths", {
        arr: json.arrSeries?.length,
        mrr: json.mrrSeries?.length,
        burn: json.burnSeries?.length,
        rows: json.rowsCount || (Array.isArray(json.rows) ? json.rows.length : json.rows),
      });
      console.log("[Dashboard] first 2 arr points", json.arrSeries?.slice(0, 2));
      
      if (json?.ok && Array.isArray(json.arrSeries) && Array.isArray(json.mrrSeries) && Array.isArray(json.burnSeries)) {
        // IMPORTANT: Use ALL data points, do NOT reduce to one element
        setArrSeries(json.arrSeries);
        setMrrSeries(json.mrrSeries);
        setBurnSeries(json.burnSeries);
        console.log("[loadKpiHistory] Set chart series:", {
          arr: json.arrSeries.length,
          mrr: json.mrrSeries.length,
          burn: json.burnSeries.length,
        });
      } else {
        setArrSeries([]);
        setMrrSeries([]);
        setBurnSeries([]);
        console.log("[loadKpiHistory] No snapshot data available, set empty arrays");
      }
    } catch (e) {
      console.error("Failed to load KPI history", e);
      setArrSeries([]);
      setMrrSeries([]);
      setBurnSeries([]);
    }
  }

  async function runAgent(companyIdParam?: string) {
    const targetCompanyId = companyIdParam || currentCompanyId;
    if (!targetCompanyId) {
      alert("No company selected");
      return;
    }

    console.log("[Dashboard] runAgent called with companyId:", targetCompanyId);
    console.log("[Dashboard] currentCompanyId state:", currentCompanyId);

    setRunningAgent(true);
    setAgentError(null);

    try {
      const requestBody = { companyId: targetCompanyId };
      console.log("[Dashboard] Sending request to /api/agent/run-all with body:", requestBody);
      
      const res = await fetch("/api/agent/run-all", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Agent failed");
      }

      // ✅ Refresh ALL (company + insights + logs)
      await loadData(targetCompanyId);

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

  async function loadData(companyIdParam?: string | null) {
    setError(null);

    // 3) Require explicit companyId - no fallback
    const targetCompanyId = companyIdParam || currentCompanyId;
    
    // If no companyId provided, don't fetch requests or KPIs
    if (!targetCompanyId) {
      setRequests([]);
      setCompany(null);
      setInsights([]);
      setAgentLogs([]);
      setKpiForm({
        mrr: "",
        arr: "",
        burn_rate: "",
        runway_months: "",
        churn: "",
        growth_percent: "",
        kpi_currency: "USD",
        kpi_scale: "unit",
      });
      return;
    }

    // 1) access_requests + company name - filter by company_id
    const { data: reqs, error: reqError } = await supabase
      .from("access_requests")
      .select("*, companies(name)")
      .eq("company_id", targetCompanyId)
      .order("created_at", { ascending: false });

    if (reqError) {
      console.error("Error fetching requests", reqError);
      setError(reqError.message);
      return;
    }

    // 2) investor_links - filter by company_id
    const { data: links, error: linkError } = await supabase
      .from("investor_links")
      .select("*")
      .eq("company_id", targetCompanyId);

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
    
    // If no companyId provided, don't fetch KPIs
    if (!targetCompanyId) {
      setCompany(null);
      setInsights([]);
      setAgentLogs([]);
      setKpiForm({
        mrr: "",
        arr: "",
        burn_rate: "",
        runway_months: "",
        churn: "",
        growth_percent: "",
        kpi_currency: "USD",
        kpi_scale: "unit",
      });
      return;
    }

    // Fetch specific company by ID via API for fresh data
    let companiesData: CompanyKpi[] | null = null;
    let companyError: { message: string } | null = null;

    try {
      const res = await fetch(`/api/companies/${targetCompanyId}`, {
        cache: "no-store",
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch company: ${res.status}`);
      }
      
      const apiData = await res.json();
      if (apiData?.ok && apiData?.company) {
        companiesData = [apiData.company as CompanyKpi];
        companyError = null;
      } else {
        companiesData = [];
        companyError = { message: apiData?.error || "Company not found" };
      }
    } catch (fetchError: any) {
      console.error("Error fetching company via API:", fetchError);
      companiesData = [];
      companyError = { message: fetchError?.message || "Failed to fetch company" };
    }

    if (companyError) {
      console.error("Error fetching company KPI", companyError);
      setError(companyError.message);
      setCompany(null);
      setInsights([]);
      setAgentLogs([]);
      return;
    }

    const selectedCompany = companiesData?.[0] || null;
    setCompany(selectedCompany);
    setCurrentCompanyId(targetCompanyId);

    if (selectedCompany) {
      setKpiForm({
        mrr: selectedCompany.mrr != null ? String(selectedCompany.mrr) : "",
        arr: selectedCompany.arr != null ? String(selectedCompany.arr) : "",
        burn_rate: selectedCompany.burn_rate != null ? String(selectedCompany.burn_rate) : "",
        runway_months: selectedCompany.runway_months != null ? String(selectedCompany.runway_months) : "",
        churn: selectedCompany.churn != null ? String(selectedCompany.churn) : "",
        growth_percent: selectedCompany.growth_percent != null ? String(selectedCompany.growth_percent) : "",
        kpi_currency: (selectedCompany as any).kpi_currency || "USD",
        kpi_scale: ((selectedCompany as any).kpi_scale as "unit" | "k" | "m") || "unit",
      });

      // ✅ load simultaneously
      await Promise.all([
        loadInsights(selectedCompany.id), 
        loadAgentLogs(selectedCompany.id),
        loadKpiHistory(selectedCompany.id),
      ]);
    } else {
      setInsights([]);
      setAgentLogs([]);
      setArrSeries([]);
      setMrrSeries([]);
      setBurnSeries([]);
      setError("Company not found");
    }
  }

  const approvedWithLink = requests.filter((r) => r.status === "approved" && r.link);
  const latestLink = approvedWithLink[0]?.link ?? null;

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  const investorUrl = latestLink ? `${baseUrl}/investor/${latestLink.access_token}` : null;

  // Transform API series to chart data formats
  // API returns arrSeries/mrrSeries/burnSeries with { date, label, value } format
  // Charts expect { month, arr/mrr/burn } format
  // IMPORTANT: Use ALL data points, do NOT reduce to one element
  const arrChartData: ArrChartDataPoint[] = arrSeries.map((point) => ({
    month: point.label || point.date, // Use label (e.g., "Jan") for display
    arr: point.value != null && !isNaN(Number(point.value)) ? Number(point.value) : null,
  }));

  const mrrChartData: MrrChartDataPoint[] = mrrSeries.map((point) => ({
    month: point.label || point.date, // Use label (e.g., "Jan") for display
    mrr: point.value != null && !isNaN(Number(point.value)) ? Number(point.value) : null,
  }));

  const burnChartData: BurnChartDataPoint[] = burnSeries.map((point) => ({
    month: point.label || point.date, // Use label (e.g., "Jan") for display
    burn: point.value != null && !isNaN(Number(point.value)) ? Number(point.value) : null,
  }));

  console.log("[Dashboard] Chart data lengths (from kpi_snapshots):", {
    arrSeries: arrSeries.length,
    mrrSeries: mrrSeries.length,
    burnSeries: burnSeries.length,
    arrChartData: arrChartData.length,
    mrrChartData: mrrChartData.length,
    burnChartData: burnChartData.length,
  });

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
        kpi_currency: (company as any).kpi_currency || "USD",
        kpi_scale: ((company as any).kpi_scale as "unit" | "k" | "m") || "unit",
      });
    }
    setKpiDialogOpen(true);
  }

  async function handleSaveKpi() {
    if (!company) return;
    setSavingKpi(true);

    const payload: any = {
      mrr: kpiForm.mrr ? Number(kpiForm.mrr) : null,
      arr: kpiForm.arr ? Number(kpiForm.arr) : null,
      burn_rate: kpiForm.burn_rate ? Number(kpiForm.burn_rate) : null,
      runway_months: kpiForm.runway_months ? Number(kpiForm.runway_months) : null,
      churn: kpiForm.churn ? Number(kpiForm.churn) : null,
      growth_percent: kpiForm.growth_percent ? Number(kpiForm.growth_percent) : null,
      kpi_currency: kpiForm.kpi_currency,
      kpi_scale: kpiForm.kpi_scale,
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
      <main className="min-h-screen text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400">Checking access…</p>
      </main>
    );
  }

  // Empty state: require explicit companyId
  if (!currentCompanyId) {
    return (
      <main className="min-h-screen text-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-4 px-4">
          <h1 className="text-2xl font-semibold text-slate-50">No Company Selected</h1>
          <p className="text-sm text-slate-400">
            Please select a company to view its dashboard.
          </p>
          <Link href="/companies">
            <Button
              className="bg-[#2B74FF] hover:bg-[#2B74FF]/90 text-white mt-4"
            >
              View Companies
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen text-slate-50 p-10">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <pre className="text-red-400">{error}</pre>
      </main>
    );
  }
  return (
    <>
      <main className="min-h-screen text-slate-50">
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
                {/* Debug: Show companyId and sync info */}
                {currentCompanyId && (
                  <div className="text-xs text-slate-600 mt-1 font-mono space-y-0.5">
                    <p>companyId: {currentCompanyId}</p>
                    {company?.google_sheets_last_sync_at && (
                      <p>Last sync: <FormattedDate date={company.google_sheets_last_sync_at} /></p>
                    )}
                  </div>
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
                    <p className="text-xs text-slate-500 light:text-slate-600">
                      Last updated · <FormattedDate 
                        date={company.last_agent_run_at}
                        options={{
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        }}
                      />
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Navigation and User Menu */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Overview Link */}
              <Link href={company?.id ? `/overview?companyId=${company.id}` : "/overview"}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-300 hover:text-white hover:bg-slate-800/50 h-10 sm:h-9 px-4"
                >
                  Overview
                </Button>
              </Link>

              {/* Run Agent Button */}
              {company?.id && (
                <Button
                  size="sm"
                  onClick={() => runAgent()}
                  disabled={runningAgent}
                  className="bg-[#2B74FF] hover:bg-[#2B74FF]/90 text-white disabled:opacity-50 h-10 sm:h-9 px-4"
                >
                  {runningAgent ? "Running…" : "Run Agent"}
                </Button>
              )}

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center justify-center w-10 h-10 rounded-full border border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2B74FF]/50"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-[#2B74FF] text-white text-xs font-medium">
                      {userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <>
                    {/* Overlay to close dropdown on click outside */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-700/50 bg-slate-900/95 backdrop-blur-sm shadow-xl z-20 light:bg-white light:border-slate-200">
                      <div className="py-1">
                        {/* Profile */}
                        <Link
                          href={company?.id ? `/company-profile?companyId=${company.id}` : "/company-profile"}
                          onClick={() => setUserDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-800/50 hover:text-white transition-colors light:text-slate-700 light:hover:bg-slate-100"
                        >
                          Profile
                        </Link>

                        {/* Preview investor view */}
                        {investorUrl && (
                          <a
                            href={investorUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setUserDropdownOpen(false)}
                            className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-800/50 hover:text-white transition-colors light:text-slate-700 light:hover:bg-slate-100"
                          >
                            Preview investor view
                          </a>
                        )}

                        {/* Divider */}
                        <div className="my-1 border-t border-slate-700/50 light:border-slate-200" />

                        {/* Sign out */}
                        <Link
                          href="/logout"
                          onClick={() => setUserDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-800/50 hover:text-white transition-colors light:text-slate-700 light:hover:bg-slate-100"
                        >
                          Sign out
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* KPI - mobile: 2 cols, tablet: 3 cols, desktop: 5 cols */}
          {company && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6 shadow-xl space-y-4 sm:space-y-6 light:border-slate-200 light:bg-white light:shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-sm sm:text-base font-medium text-slate-200 light:text-slate-950">Key Metrics</h2>
                  <p className="text-xs text-slate-500 mt-1 light:text-slate-600">
                  {company.last_agent_run_at ? (
                    <>
                        Last updated · <FormattedDate 
                          date={company.last_agent_run_at}
                          options={{
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          }}
                        />
                    </>
                  ) : (
                    <>Not updated yet</>
                  )}
                </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs text-slate-500 light:text-slate-600">
                    Powered by <span className="font-medium text-slate-300 light:text-slate-900">Valyxo Agent</span>
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
                  value={formatRunway(company.runway_months)}
                  sublabel="Estimated runway at current burn"
                />
                <KpiCard label="Churn" value={formatPercent(company.churn)} sublabel="MRR churn rate" />
              </div>
            </section>
          )}

          {/* CHARTS SECTION - mobile: stack, desktop: 2 columns */}
          {company && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6 shadow-xl space-y-4 sm:space-y-6 light:border-slate-200 light:bg-white light:shadow-sm">
              <div>
                <h2 className="text-sm sm:text-base font-medium text-slate-200 light:text-slate-950">Trends</h2>
                <p className="text-xs text-slate-500 mt-1 light:text-slate-600">
                  Revenue and burn metrics over time
                </p>
              </div>

              {/* mobile: stack, desktop: 2 columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* ARR Chart */}
                <div>
                  <ArrChart data={arrChartData} />
                </div>

                {/* MRR Chart */}
                <div>
                  <MrrChart data={mrrChartData} />
                </div>

                {/* Burn/Runway Chart - full width on desktop */}
                <div className="lg:col-span-2">
                  <BurnChart data={burnChartData} />
                </div>
              </div>
            </section>
          )}

          {/* COMPUTED INSIGHTS */}
          <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950/60 p-4 sm:p-6 lg:p-8 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-slate-100">Computed insights</h2>
                <p className="text-xs text-slate-500">
                  {insightsGeneratedAt ? (
                    <>
                      Last generated: {new Date(insightsGeneratedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}
                      {basedOnSnapshotDate ? (
                        <> · Based on snapshot: {new Date(basedOnSnapshotDate + "T00:00:00").toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric"
                        })}</>
                      ) : (
                        <> · Based on snapshot: n/a</>
                      )}
                      <> · Computed</>
                    </>
                  ) : (
                    <>Last generated: n/a · Based on snapshot: n/a · Computed</>
                  )}
                </p>
              </div>

              {company?.id && !runningAgent && !loadingInsights && insights.length === 0 && (
                <Button
                  size="sm"
                      onClick={() => runAgent()}
                  className="bg-[#2B74FF] hover:bg-[#2B74FF]/90 text-white"
                >
                  Run Valyxo Agent
                </Button>
              )}
            </div>

            {(loadingInsights || runningAgent) && (
              <div className="flex items-center gap-2 py-4">
                <div className="h-4 w-4 border-2 border-[#2B74FF] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-slate-400 light:text-slate-600">
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
                    onClick={() => runAgent()}
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
                    <li key={i} className="text-sm text-slate-200 leading-relaxed pl-4 border-l-2 border-[#2B74FF]/30 light:text-slate-900">
                      {insight}
                </li>
              ))}
            </ul>
              </div>
            )}
          </section>

          {/* AGENT ACTIVITY / LOGS - System level, moved lower */}
          <section className="rounded-xl border border-slate-800/50 bg-slate-900/30 p-5 space-y-3 light:border-slate-200 light:bg-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wide light:text-slate-700">Agent Activity</h2>
                <p className="text-xs text-slate-500 mt-0.5 light:text-slate-600">System logs and execution history</p>
              </div>

              {company?.id && (
                <button
                  type="button"
                  onClick={() => loadAgentLogs(company.id)}
                  className="text-xs px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-300 disabled:opacity-60 light:bg-slate-100 light:hover:bg-slate-200 light:text-slate-700 light:hover:text-slate-900"
                  disabled={loadingLogs}
                >
                  {loadingLogs ? "Loading…" : "Refresh"}
                </button>
              )}
            </div>

            {loadingLogs && <p className="text-xs text-slate-500 light:text-slate-600">Loading logs…</p>}

            {!loadingLogs && agentLogs.length === 0 && (
              <p className="text-xs text-slate-500 light:text-slate-600">No logs yet.</p>
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
                           <FormattedDate 
                             date={log.created_at}
                             options={{
                               month: "short",
                               day: "numeric",
                               hour: "2-digit",
                               minute: "2-digit"
                             }}
                             fallback=""
                           />
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
            <div className="rounded-xl border border-slate-800/50 bg-slate-900/30 p-4 sm:p-5 space-y-3 light:border-slate-200 light:bg-white">
              <div>
                <h2 className="text-xs sm:text-sm font-medium text-slate-300 light:text-slate-950">Investor Access Link</h2>
                <p className="text-xs text-slate-500 mt-0.5 light:text-slate-600">
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
                  Approve a request in Overview to generate an investor link.
                </p>
              )}
            </div>

            {/* Update KPIs */}
            <div className="rounded-xl border border-slate-800/50 bg-slate-900/30 p-4 sm:p-5 space-y-3 light:border-slate-200 light:bg-white">
              <div>
                <h2 className="text-xs sm:text-sm font-medium text-slate-300 light:text-slate-950">Update KPIs</h2>
                <p className="text-xs text-slate-500 mt-0.5 light:text-slate-600">
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

          {/* Data Sources section removed - now managed in Company Overview → Connected Systems */}
          {/* All backend logic and functions remain intact for potential future use */}
          {/* Investor Access section removed - now managed in Company Overview → Investor Requests */}
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

          {/* KPI Format Settings */}
          <div className="border-t border-slate-800 pt-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-slate-200 mb-3">KPI Format Settings</h3>
              <p className="text-xs text-slate-400 mb-4">
                These settings control how KPIs are formatted in computed insights and profiles.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Currency</label>
                <select
                  value={kpiForm.kpi_currency}
                  onChange={(e) => setKpiForm((f) => ({ ...f, kpi_currency: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-md text-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2B74FF]"
                >
                  <option value="USD">USD ($)</option>
                  <option value="NOK">NOK (kr)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Scale</label>
                <select
                  value={kpiForm.kpi_scale}
                  onChange={(e) => setKpiForm((f) => ({ ...f, kpi_scale: e.target.value as "unit" | "k" | "m" }))}
                  className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-md text-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2B74FF]"
                >
                  <option value="unit">Unit (e.g. $45,000)</option>
                  <option value="k">Thousands (e.g. $45k)</option>
                  <option value="m">Millions (e.g. $45m)</option>
                </select>
              </div>
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

export default function CompanyDashboard() {
  return (
    <Suspense fallback={
      <main className="min-h-screen text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400">Loading dashboard...</p>
      </main>
    }>
      <CompanyDashboardContent />
    </Suspense>
  );
}
