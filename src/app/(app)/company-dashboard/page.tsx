"use client";

import { useEffect, useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { supabase } from "@/app/lib/supabaseClient";
import { authedFetch } from "@/lib/authedFetch";
import { useUserCompany } from "@/lib/user-company-context";
import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/ui/KpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MetricChart, type MetricChartDataPoint, type MetricFormat } from "@/components/ui/MetricChart";
import { buildDenseSeries, type SnapshotRow, type ChartPoint } from "@/lib/kpi/kpi_series";
import { extendWithForecast } from "@/lib/kpi/forecast";
import { extractKpiNumber } from "@/lib/kpi/kpi_extract";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { MetricsDetailsModal } from "@/components/metrics/MetricsDetailsModal";
import { FormattedDate } from "@/components/ui/FormattedDate";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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

  // Google Sheets metadata
  google_sheets_url?: string | null;
  google_sheets_tab?: string | null;
  google_sheets_last_sync_at?: string | null;
  google_sheets_last_sync_by?: string | null;

  // agent metadata
  last_agent_run_at?: string | null;
  last_agent_run_by?: string | null;

  investor_view_config?: {
    arrMrr?: boolean;
    burnRunway?: boolean;
    growthCharts?: boolean;
    aiInsights?: boolean;
    showForecast?: boolean;
  } | null;
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

function getCurrencySymbol(currency: string): string {
  switch (currency) {
    case "NOK": return "kr ";
    case "EUR": return "€";
    case "IDR": return "Rp ";
    default: return "$";
  }
}

function formatMoney(value: number | null, currency: string = "USD") {
  if (value == null) return "—";
  const whole = Math.round(value);
  const symbol = getCurrencySymbol(currency);
  return symbol + whole.toLocaleString("en-US", { maximumFractionDigits: 0, minimumFractionDigits: 0 });
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
  const { company: userCompany, loading: userCompanyLoading, isAuthenticated } = useUserCompany();
  const currentCompanyId = userCompany?.id ?? null;

  const [investorLinks, setInvestorLinks] = useState<Array<{ id: string; access_token: string; expires_at: string | null }>>([]);
  const [company, setCompany] = useState<CompanyKpi | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  // Store raw snapshot rows for client-side series building
  const [snapshotRows, setSnapshotRows] = useState<Array<{ period_date: string; kpis: unknown }>>([]);
  const [kpiSources, setKpiSources] = useState<Record<string, string> | null>(null); // Source metadata from latest snapshot

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showForecast, setShowForecast] = useState(true);

  // Metric inference: AI-suggested key metrics (Level 1–4); when set, key metrics section uses these instead of fixed six
  const [metricInference, setMetricInference] = useState<{
    primaryMetricsTable?: Array<{ metric: string; value: string | number; confidence: string; evidence: string; rationale: string }>;
    detectedMaturityLevel?: number;
    whyHigherLevelNotUsed?: string;
  } | null>(null);

  // Drag-and-drop: which metric is shown in each chart slot (default: ARR, MRR, Burn rate)
  const [chartSlots, setChartSlots] = useState<[string, string, string]>(["arr", "mrr", "burn_rate"]);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);

  // Chat with agent (under metrics)
  type ChatMessage = { role: "user" | "assistant"; content: string };
  const [agentChatMessages, setAgentChatMessages] = useState<ChatMessage[]>([]);
  const [agentChatInput, setAgentChatInput] = useState("");
  const [agentChatLoading, setAgentChatLoading] = useState(false);

  // Stripe integration
  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const [stripeKey, setStripeKey] = useState("");
  const [savingStripe, setSavingStripe] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [connectingStripe, setConnectingStripe] = useState(false); // Prevent double-clicks
  const [syncingStripe, setSyncingStripe] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<{
    status: "not_connected" | "pending" | "connected";
    stripeAccountId: string | null;
    connectedAt: string | null;
    lastVerifiedAt: string | null;
    masked: string | null;
    pendingExpiresAt: string | null;
  }>({
    status: "not_connected",
    stripeAccountId: null,
    connectedAt: null,
    lastVerifiedAt: null,
    masked: null,
    pendingExpiresAt: null,
  });

  // User dropdown
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // What investors can see (customize investor view)
  const [investorView, setInvestorView] = useState({
    arrMrr: true,
    burnRunway: true,
    growthCharts: true,
    aiInsights: false,
    showForecast: true,
  });
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (userCompanyLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
  }, [userCompanyLoading, isAuthenticated, router]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserEmail(session?.user?.email ?? null);
    })();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!currentCompanyId) return;
    const companyId = currentCompanyId;

    async function run() {
      const stripeCallback = searchParams.get("stripe");
      if (stripeCallback) {
        if (stripeCallback === "connected") {
          await loadStripeStatus(companyId);
          await loadKpiHistory(companyId);
          alert("Stripe connected successfully!");
        } else if (stripeCallback === "pending") {
          alert("Stripe account setup is incomplete. Please complete the onboarding process.");
        } else if (stripeCallback === "refresh") {
          alert("The Stripe connection link has expired. Please connect again.");
        } else if (stripeCallback === "return") {
          try {
            const verifyRes = await fetch("/api/stripe/verify-account", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ companyId }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData?.ok && verifyData?.connected) {
              await Promise.all([
                loadStripeStatus(companyId),
                loadKpiHistory(companyId),
              ]);
              alert("Stripe connected successfully!");
            } else {
              alert("Stripe account setup is incomplete. Please complete the onboarding process.");
              await loadStripeStatus(companyId);
            }
          } catch (e) {
            console.error("Error verifying Stripe account:", e);
            alert("Stripe connection may be incomplete. Please check your Stripe status.");
          }
        } else if (stripeCallback === "error") {
          const errorMsg = searchParams.get("msg");
          try {
            alert(errorMsg ? `Couldn't connect Stripe: ${decodeURIComponent(errorMsg)}. Try again.` : "Couldn't connect Stripe. Try again.");
          } catch {
            alert("Couldn't connect Stripe. Try again.");
          }
        }
        const next = new URLSearchParams(searchParams);
        next.delete("stripe");
        next.delete("msg");
        router.replace(`${window.location.pathname}${next.toString() ? `?${next.toString()}` : ""}`);
        return;
      }
      await loadData(companyId);
    }
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCompanyId, searchParams]);

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
        setSnapshotRows([]);
        setKpiSources(null);
        return;
      }
      
      const json = await res.json().catch(() => ({}));
      
      if (json?.ok && Array.isArray(json.rows)) {
        // Store raw snapshot rows for client-side series building
        const rows = json.rows as SnapshotRow[];
        setSnapshotRows(rows);
        
        // Store sources metadata from latest snapshot (for UI display)
        if (json.sources && typeof json.sources === "object") {
          setKpiSources(json.sources as Record<string, string>);
        } else {
          setKpiSources(null);
        }
        
        const DEBUG = true;
        if (DEBUG) {
          const validCount = rows.filter((r) => r.period_date && r.kpis).length;
          console.log("[loadKpiHistory] Snapshots:", {
            total: rows.length,
            valid: validCount,
          });
        }
      } else {
        setSnapshotRows([]);
        setKpiSources(null);
        console.log("[loadKpiHistory] No snapshot data available");
      }
    } catch (e) {
      console.error("Failed to load KPI history", e);
      setSnapshotRows([]);
      setKpiSources(null);
    }
  }

  async function loadMetricInference(companyId: string) {
    try {
      const res = await fetch("/api/agent/metric-inference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (data?.ok && data?.primaryMetricsTable) {
        setMetricInference({
          primaryMetricsTable: data.primaryMetricsTable,
          detectedMaturityLevel: data.detectedMaturityLevel,
          whyHigherLevelNotUsed: data.whyHigherLevelNotUsed,
        });
      } else {
        setMetricInference(null);
      }
    } catch (e) {
      console.warn("Failed to load metric inference", e);
      setMetricInference(null);
    }
  }

  async function runAgent(companyIdParam?: string) {
    const targetCompanyId = companyIdParam || currentCompanyId;
    if (!targetCompanyId) {
      alert("No company selected");
      return;
    }

    setRunningAgent(true);
    setAgentError(null);

    try {
      // Refresh session so we send a valid access_token (avoids 401 when token expired)
      const { error: refreshErr } = await supabase.auth.refreshSession();
      if (refreshErr) {
        console.warn("[runAgent] Session refresh failed:", refreshErr.message);
      }

      const res = await authedFetch("/api/agent/run-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: targetCompanyId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Agent failed");
      }

      // Update companies from latest kpi_snapshots so metrics match agent output
      try {
        const refreshRes = await authedFetch(`/api/companies/${targetCompanyId}/refresh-from-snapshots`, {
          method: "POST",
        });
        const refreshData = await refreshRes.json().catch(() => ({}));
        if (!refreshRes.ok || !refreshData?.ok) {
          console.warn("[runAgent] refresh-from-snapshots failed:", refreshRes.status, refreshData?.error || refreshData);
        }
      } catch (e) {
        console.warn("[runAgent] refresh-from-snapshots failed:", e);
      }

      // ✅ Refresh ALL (company + insights + logs)
      await loadData(targetCompanyId);

      alert("Valyxo Agent completed successfully");
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || "Unknown error";
      setAgentError(msg);
      const friendly =
        msg === "Not authenticated" || msg === "Unauthorized"
          ? "Session may have expired. Please refresh the page and try again."
          : msg;
      alert("Error: " + friendly);
    } finally {
      setRunningAgent(false);
    }
  }

  async function loadData(companyIdParam?: string | null) {
    setError(null);

    // 3) Require explicit companyId - no fallback
    const targetCompanyId = companyIdParam || currentCompanyId;
    
    // If no companyId provided, don't fetch KPIs
    if (!targetCompanyId) {
      setInvestorLinks([]);
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

    // investor_links - filter by company_id (each company has a link by default; we create one if missing)
    const { data: links, error: linkError } = await supabase
      .from("investor_links")
      .select("*")
      .eq("company_id", targetCompanyId);

    if (linkError) {
      console.error("Error fetching investor_links", linkError);
      setError(linkError.message);
      return;
    }

    const linkList = links ?? [];
    setInvestorLinks(linkList.map((l: any) => ({ id: l.id, access_token: l.access_token, expires_at: l.expires_at ?? null })));

    // If company has no investor link yet, create one so there is always a link
    if (linkList.length === 0 && targetCompanyId) {
      const token =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      const { error: insertErr } = await supabase.from("investor_links").insert([
        { access_token: token, company_id: targetCompanyId, expires_at: expiresAt.toISOString(), request_id: null },
      ]);
      if (!insertErr) {
        await loadData(targetCompanyId);
      }
    }

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
      setInvestorView({ arrMrr: true, burnRunway: true, growthCharts: true, aiInsights: false, showForecast: true });
      setInsights([]);
      setAgentLogs([]);
      return;
    }

    const selectedCompany = companiesData?.[0] || null;

    // Key Metrics come from agent output: refresh company from latest snapshot (written by agent run)
    let companyToUse = selectedCompany;
    if (selectedCompany?.id) {
      try {
        const refreshRes = await authedFetch(`/api/companies/${selectedCompany.id}/refresh-from-snapshots`, { method: "POST" });
        const refreshData = await refreshRes.json().catch(() => ({}));
        if (refreshRes.ok && refreshData?.company) {
          companyToUse = refreshData.company as CompanyKpi;
        }
      } catch (_) {
        // keep selectedCompany
      }
    }
    setCompany(companyToUse);

    if (selectedCompany) {
      const cfg = (companyToUse as CompanyKpi).investor_view_config;
      const c = cfg && typeof cfg === "object"
        ? {
            arrMrr: cfg.arrMrr !== false,
            burnRunway: cfg.burnRunway !== false,
            growthCharts: cfg.growthCharts !== false,
            aiInsights: !!cfg.aiInsights,
            showForecast: (cfg as { showForecast?: boolean }).showForecast !== false,
          }
        : { arrMrr: true, burnRunway: true, growthCharts: true, aiInsights: false, showForecast: true };
      setInvestorView(c);
      setKpiForm({
        mrr: companyToUse.mrr != null ? String(companyToUse.mrr) : "",
        arr: companyToUse.arr != null ? String(companyToUse.arr) : "",
        burn_rate: companyToUse.burn_rate != null ? String(companyToUse.burn_rate) : "",
        runway_months: companyToUse.runway_months != null ? String(companyToUse.runway_months) : "",
        churn: companyToUse.churn != null ? String(companyToUse.churn) : "",
        growth_percent: companyToUse.growth_percent != null ? String(companyToUse.growth_percent) : "",
        kpi_currency: (companyToUse as any).kpi_currency || "USD",
        kpi_scale: ((companyToUse as any).kpi_scale as "unit" | "k" | "m") || "unit",
      });

      // ✅ load simultaneously (including metric inference for dynamic key metrics)
      await Promise.all([
        loadInsights(selectedCompany.id),
        loadAgentLogs(selectedCompany.id),
        loadKpiHistory(selectedCompany.id),
        loadStripeStatus(selectedCompany.id),
        loadMetricInference(selectedCompany.id),
      ]);
    } else {
      setInsights([]);
      setAgentLogs([]);
      setSnapshotRows([]);
      setKpiSources(null);
      setMetricInference(null);
      setError("Company not found");
    }
  }

  const now = Date.now();
  const latestLink =
    investorLinks.find((l) => !l.expires_at || new Date(l.expires_at).getTime() > now) ??
    investorLinks[0] ??
    null;

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  const investorUrl = latestLink ? `${baseUrl}/investor/${latestLink.access_token}` : null;

  // Metrics available for drag-and-drop charts
  const DASHBOARD_METRICS: Array<{ key: string; label: string; format: MetricFormat }> = [
    { key: "arr", label: "ARR", format: "currency" },
    { key: "mrr", label: "MRR", format: "currency" },
    { key: "burn_rate", label: "Burn rate", format: "currency" },
    { key: "net_revenue", label: "Net revenue", format: "currency" },
    { key: "runway_months", label: "Runway", format: "number" },
    { key: "churn", label: "Churn", format: "percent" },
    { key: "mrr_growth_mom", label: "Growth", format: "percent" },
  ];

  // Build chart series for all metrics
  const arrSeries = buildDenseSeries(snapshotRows, "arr");
  const mrrSeries = buildDenseSeries(snapshotRows, "mrr");
  const burnSeries = buildDenseSeries(snapshotRows, "burn_rate");
  const netRevenueSeries = buildDenseSeries(snapshotRows, "net_revenue");
  const runwaySeries = buildDenseSeries(snapshotRows, "runway_months");
  const churnSeries = buildDenseSeries(snapshotRows, "churn", { percent: true, allowNegative: false });
  const growthSeries = buildDenseSeries(snapshotRows, "mrr_growth_mom", { percent: true, allowNegative: true });

  const seriesByKey: Record<string, ChartPoint[]> = {
    arr: arrSeries,
    mrr: mrrSeries,
    burn_rate: burnSeries,
    net_revenue: netRevenueSeries,
    runway_months: runwaySeries,
    churn: churnSeries,
    mrr_growth_mom: growthSeries,
  };

  // Extend with forecast for currency/number metrics (optional)
  const arrExtended = extendWithForecast(arrSeries, { monthsAhead: 6 });
  const mrrExtended = extendWithForecast(mrrSeries, { monthsAhead: 6 });
  const burnExtended = extendWithForecast(burnSeries, { monthsAhead: 6 });
  const netRevenueExtended = extendWithForecast(netRevenueSeries, { monthsAhead: 6 });
  const runwayExtended = extendWithForecast(runwaySeries, { monthsAhead: 6 });

  const extendedByKey: Record<string, ChartPoint[]> = {
    arr: arrExtended,
    mrr: mrrExtended,
    burn_rate: burnExtended,
    net_revenue: netRevenueExtended,
    runway_months: runwayExtended,
    churn: churnSeries,
    mrr_growth_mom: growthSeries,
  };

  function toMetricChartData(
    series: ChartPoint[],
    useExtended: boolean,
    extended: ChartPoint[]
  ): MetricChartDataPoint[] {
    const src = useExtended ? extended : series;
    const lastHist = src.reduce<number>((acc, p, i) => (p.value != null ? i : acc), -1);
    return src.map((p, i) => {
      const value = p.value;
      let valueForecast: number | null | undefined;
      if (p.forecast != null) valueForecast = p.forecast;
      else if (i === lastHist && lastHist >= 0) valueForecast = (src[lastHist]!.value as number);
      else valueForecast = undefined;
      return { month: p.label, value, ...(valueForecast != null && { valueForecast }) };
    });
  }

  function getChartDataForMetric(metricKey: string): MetricChartDataPoint[] {
    const series = seriesByKey[metricKey] ?? [];
    const extended = extendedByKey[metricKey];
    const useForecast = showForecast && extended != null;
    return toMetricChartData(series, useForecast, extended ?? series);
  }

  function hasDataForMetric(metricKey: string): boolean {
    const series = seriesByKey[metricKey] ?? [];
    return series.some((p) => p.value !== null);
  }

  // Key Metrics: samme kilde som Details — bruk siste rad som har mrr/arr/burn (unngår tomme fremtidige rader)
  const latestSnapshotRow = (() => {
    if (snapshotRows.length === 0) return null;
    for (let i = snapshotRows.length - 1; i >= 0; i--) {
      const row = snapshotRows[i];
      const k = row?.kpis;
      if (k != null && (extractKpiNumber(k, "mrr") != null || extractKpiNumber(k, "arr") != null || extractKpiNumber(k, "burn_rate") != null)) {
        return row;
      }
    }
    return snapshotRows[snapshotRows.length - 1] ?? null;
  })();
  const kpis = latestSnapshotRow?.kpis ?? null;
  const displayArr = kpis != null ? extractKpiNumber(kpis, "arr") : null;
  const displayMrr = kpis != null ? extractKpiNumber(kpis, "mrr") : null;
  const displayGrowth = kpis != null ? (extractKpiNumber(kpis, "mrr_growth_mom") ?? extractKpiNumber(kpis, "growth_percent")) : null;
  const displayBurnRate = kpis != null ? extractKpiNumber(kpis, "burn_rate") : null;
  const displayRunwayMonths = kpis != null ? extractKpiNumber(kpis, "runway_months") : null;
  const displayChurn = kpis != null ? extractKpiNumber(kpis, "churn") : null;

  // Map inference metric name → snapshot key (for value) and format type
  const inferenceMetricToSnapshot: Record<string, { key: string; format: "currency" | "percent" | "runway" | "number" }> = {
    MRR: { key: "mrr", format: "currency" },
    ARR: { key: "arr", format: "currency" },
    Growth: { key: "mrr_growth_mom", format: "percent" },
    "Growth (MoM)": { key: "mrr_growth_mom", format: "percent" },
    "Burn rate": { key: "burn_rate", format: "currency" },
    Burn: { key: "burn_rate", format: "currency" },
    Runway: { key: "runway_months", format: "runway" },
    Churn: { key: "churn", format: "percent" },
    "Monthly revenue": { key: "mrr", format: "currency" },
    "Annual revenue": { key: "arr", format: "currency" },
    "Number of customers": { key: "customers", format: "number" },
    Customers: { key: "customers", format: "number" },
    "Cash balance": { key: "cash_balance", format: "currency" },
    Cash: { key: "cash_balance", format: "currency" },
    "Revenue trend": { key: "mrr_growth_mom", format: "percent" },
    "Net profit/loss": { key: "mrr", format: "currency" },
  };

  type KeyMetricItem = { label: string; value: string; sublabel: string; metricKey: string };
  const keyMetricsDisplayList: KeyMetricItem[] = (() => {
    const currency = (company as any)?.kpi_currency;
    if (metricInference?.primaryMetricsTable && metricInference.primaryMetricsTable.length > 0) {
      return metricInference.primaryMetricsTable.map((row) => {
        const mapping = inferenceMetricToSnapshot[row.metric] ?? inferenceMetricToSnapshot[row.metric.trim()];
        let value: string;
        let sublabel = row.confidence ? `Confidence: ${row.confidence}` : "";
        if (mapping && kpis != null) {
          const snapshotVal = extractKpiNumber(kpis, mapping.key as any);
          if (snapshotVal != null) {
            if (mapping.format === "currency") value = formatMoney(snapshotVal, currency);
            else if (mapping.format === "percent") value = formatPercent(snapshotVal);
            else if (mapping.format === "runway") value = formatRunway(snapshotVal);
            else value = snapshotVal.toLocaleString("en-US", { maximumFractionDigits: 0 });
          } else {
            value = row.value === "N/A" || row.value === null ? "—" : typeof row.value === "number" ? (mapping.format === "percent" ? formatPercent(row.value) : mapping.format === "runway" ? formatRunway(row.value) : mapping.format === "currency" ? formatMoney(row.value, currency) : String(row.value)) : String(row.value);
          }
        } else {
          value = row.value === "N/A" || row.value === null ? "—" : typeof row.value === "number" ? formatMoney(row.value, currency) : String(row.value);
        }
        const label = row.metric === "Burn Rate" || row.metric === "Burn rate" ? "Burn" : row.metric;
        const metricKey = mapping?.key ?? "mrr";
        return { label, value, sublabel, metricKey };
      });
    }
    return [
      { label: "ARR", value: formatMoney(displayArr, currency), sublabel: "Annual recurring revenue", metricKey: "arr" },
      { label: "MRR", value: formatMoney(displayMrr, currency), sublabel: "Monthly recurring revenue", metricKey: "mrr" },
      { label: "Growth", value: formatPercent(displayGrowth), sublabel: "MRR growth (last 12 months)", metricKey: "mrr_growth_mom" },
      { label: "Burn", value: formatMoney(displayBurnRate, currency), sublabel: "Monthly burn", metricKey: "burn_rate" },
      { label: "Runway", value: formatRunway(displayRunwayMonths), sublabel: "Estimated runway at current burn", metricKey: "runway_months" },
      { label: "Churn", value: formatPercent(displayChurn), sublabel: "MRR churn rate", metricKey: "churn" },
    ];
  })();

  const DEBUG = true;
  if (DEBUG) {
    console.log("[Dashboard] Chart series:", {
      snapshotsTotal: snapshotRows.length,
      validSnapshots: snapshotRows.filter((r) => r.period_date && r.kpis).length,
      chartSlots,
      seriesByKey: Object.keys(seriesByKey).reduce((acc, k) => ({ ...acc, [k]: (seriesByKey[k]?.length ?? 0) }), {}),
    });
  }
  async function loadStripeStatus(companyId: string) {
    try {
      const res = await authedFetch(`/api/stripe/status?companyId=${companyId}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data?.ok) {
        setStripeStatus({
          status: data.status || "not_connected",
          stripeAccountId: data.stripeAccountId || null,
          connectedAt: data.connectedAt || null,
          lastVerifiedAt: data.lastVerifiedAt || null,
          masked: data.masked || null,
          pendingExpiresAt: data.pendingExpiresAt || null,
        });
      } else {
        // Handle error gracefully - set to not_connected
        setStripeStatus({
          status: "not_connected",
          stripeAccountId: null,
          connectedAt: null,
          lastVerifiedAt: null,
          masked: null,
          pendingExpiresAt: null,
        });
      }
    } catch (e: any) {
      // Never show "Unauthorized" or raw errors to user
      console.error("Failed to load Stripe status", e);
      if (e?.message === "Not authenticated") {
        // Silently fail - user will need to refresh/auth
        return;
      }
      setStripeStatus({
        status: "not_connected",
        stripeAccountId: null,
        connectedAt: null,
        lastVerifiedAt: null,
        masked: null,
        pendingExpiresAt: null,
      });
    }
  }

  async function handleSaveStripeKey() {
    if (!currentCompanyId) {
      alert("No company selected");
      return;
    }

    if (!stripeKey.trim()) {
      setStripeError("Please enter a Stripe secret key");
      return;
    }

    setSavingStripe(true);
    setStripeError(null);

    try {
      const res = await authedFetch("/api/stripe/save-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: currentCompanyId,
          secretKey: stripeKey.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to save Stripe key");
      }

      // Close modal and clear input immediately (never show secret key)
      setStripeModalOpen(false);
      setStripeKey("");
      setStripeError(null);

      // Re-fetch status to get latest state (including masked key)
      await loadStripeStatus(currentCompanyId);
    } catch (e: any) {
      // Keep modal open on error, show friendly error message
      // Never show "Unauthorized" or raw errors
      if (e?.message === "Not authenticated") {
        // Silently fail - user will need to refresh/auth
        setStripeModalOpen(false);
        return;
      }
      setStripeError("Failed to save Stripe key. Please try again.");
    } finally {
      setSavingStripe(false);
    }
  }

  async function handleSyncStripe() {
    if (!currentCompanyId) {
      alert("No company selected");
      return;
    }

    setSyncingStripe(true);
    try {
      // Use /api/agent/run-all which triggers MCP's KPI refresh (includes Stripe sync)
      const res = await authedFetch("/api/agent/run-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: currentCompanyId }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to sync data via MCP");
      }

      // Update companies from latest snapshots so metric cards reflect new data
      try {
        const refreshRes = await authedFetch(`/api/companies/${currentCompanyId}/refresh-from-snapshots`, {
          method: "POST",
        });
        const refreshData = await refreshRes.json().catch(() => ({}));
        if (!refreshRes.ok || !refreshData?.ok) {
          console.warn("[handleSyncStripe] refresh-from-snapshots failed:", refreshRes.status, refreshData?.error || refreshData);
        }
      } catch (e) {
        console.warn("[handleSyncStripe] refresh-from-snapshots failed:", e);
      }

      // Refetch Stripe status, KPI history, and company (metrics) to refresh charts/cards
      await Promise.all([
        loadStripeStatus(currentCompanyId),
        loadKpiHistory(currentCompanyId),
      ]);
      await loadData(currentCompanyId);

      // Show success message
      const message = data.message || `Data synced successfully! ${data.stripeProcessed || 0} Stripe period(s) processed.`;
      alert(message);
    } catch (e: any) {
      console.error("Error syncing via MCP:", e);
      // Show friendly error message
      const errorMsg = e?.message || "Failed to sync Stripe data";
      alert("Error: " + errorMsg.replace("Unauthorized", "Please refresh and try again"));
    } finally {
      setSyncingStripe(false);
    }
  }

  async function handleDisconnectStripe() {
    if (!currentCompanyId) {
      alert("No company selected");
      return;
    }

    if (!confirm("Are you sure you want to disconnect Stripe? This will remove your Stripe key.")) {
      return;
    }

    try {
      const res = await authedFetch("/api/stripe/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: currentCompanyId }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to disconnect Stripe");
      }

      // Re-fetch status to get latest state
      await loadStripeStatus(currentCompanyId);
    } catch (e: any) {
      console.error("Error disconnecting Stripe:", e);
      alert("Error: " + (e?.message || "Failed to disconnect Stripe"));
    }
  }

  async function handleConnectStripe() {
    if (!currentCompanyId) {
      alert("No company selected");
      return;
    }

    // Prevent double-click/connect spam
    if (connectingStripe) {
      return; // Already connecting, ignore additional clicks
    }

    setConnectingStripe(true);

    try {
      // Fetch authorizeUrl with Authorization header
      const res = await authedFetch(`/api/stripe/connect?companyId=${currentCompanyId}`, {
        cache: "no-store",
      });

      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.authorizeUrl) {
        throw new Error(data?.error || "Failed to get Stripe authorization URL");
      }

      // Redirect browser to Stripe OAuth page
      // Note: This navigation will leave the page, so connectingStripe state will reset
      window.location.assign(data.authorizeUrl);
    } catch (e: any) {
      console.error("Error connecting Stripe:", e);
      // Never show "Unauthorized" or raw errors to user
      if (e?.message === "Not authenticated") {
        // Silently fail - user will need to refresh/auth
        setConnectingStripe(false);
        return;
      }
      alert("Failed to connect Stripe. Please try again.");
      setConnectingStripe(false);
    }
    // Note: If redirect succeeds, we won't reach here, but if it fails, reset state
  }

  async function copyLink() {
    if (!investorUrl) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(investorUrl);
        setTimeout(() => alert("Link copied to clipboard"), 0);
      } else {
        setTimeout(() => window.prompt("Copy link manually:", investorUrl), 0);
      }
    } catch {
      setTimeout(() => window.prompt("Copy link manually:", investorUrl), 0);
    }
  }

  async function handleInvestorViewToggle(key: "arrMrr" | "burnRunway" | "growthCharts" | "aiInsights" | "showForecast") {
    if (!company?.id) return;
    const prev = { ...investorView };
    const next = { ...investorView, [key]: !investorView[key] };
    startTransition(() => setInvestorView(next));
    await new Promise((r) => setTimeout(r, 0));
    try {
      const res = await authedFetch(`/api/companies/${company.id}`, {
        method: "PATCH",
        body: JSON.stringify(next),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        const errMsg = data?.error || "Failed to save";
        const details = data?.details ? ` (${data.details})` : "";
        throw new Error(errMsg + details);
      }
    } catch (e: any) {
      setInvestorView(prev);
      if (e?.message !== "Not authenticated") {
        alert(e?.message || "Could not save investor view settings. Please try again.");
      }
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

    const payload: Record<string, unknown> = {
      toCurrency: kpiForm.kpi_currency,
      mrr: kpiForm.mrr ? Number(kpiForm.mrr) : null,
      arr: kpiForm.arr ? Number(kpiForm.arr) : null,
      burn_rate: kpiForm.burn_rate ? Number(kpiForm.burn_rate) : null,
      runway_months: kpiForm.runway_months ? Number(kpiForm.runway_months) : null,
      churn: kpiForm.churn ? Number(kpiForm.churn) : null,
      growth_percent: kpiForm.growth_percent ? Number(kpiForm.growth_percent) : null,
      kpi_scale: kpiForm.kpi_scale,
    };

    const res = await authedFetch(`/api/companies/${company.id}/convert-currency`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSavingKpi(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.error || err?.details || res.statusText;
      alert("Could not update KPIs: " + msg);
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (data.converted) {
      setCompany((prev) =>
        prev
          ? {
              ...prev,
              kpi_currency: kpiForm.kpi_currency,
              mrr: data.mrr ?? prev.mrr,
              arr: data.arr ?? prev.arr,
              burn_rate: data.burn_rate ?? prev.burn_rate,
              runway_months: (payload.runway_months as number) ?? prev.runway_months,
              churn: (payload.churn as number) ?? prev.churn,
              growth_percent: (payload.growth_percent as number) ?? prev.growth_percent,
            }
          : prev
      );
      await loadKpiHistory(company.id);
    } else {
      setCompany((prev) =>
        prev
          ? {
              ...prev,
              kpi_currency: kpiForm.kpi_currency,
              mrr: (payload.mrr as number) ?? prev.mrr,
              arr: (payload.arr as number) ?? prev.arr,
              burn_rate: (payload.burn_rate as number) ?? prev.burn_rate,
              runway_months: (payload.runway_months as number) ?? prev.runway_months,
              churn: (payload.churn as number) ?? prev.churn,
              growth_percent: (payload.growth_percent as number) ?? prev.growth_percent,
            }
          : prev
      );
    }
    setKpiDialogOpen(false);
    alert(data.converted ? "Valuta byttet og KPIs konvertert etter kurs." : "KPIs oppdatert.");

    await Promise.all([loadInsights(company.id), loadAgentLogs(company.id)]);
  }

  if (userCompanyLoading) {
    return (
      <main className="min-h-screen text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400">Checking access…</p>
      </main>
    );
  }

  if (!currentCompanyId) {
    return (
      <main className="min-h-screen text-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-4 px-4">
          <h1 className="text-2xl font-semibold text-slate-50">No company</h1>
          <p className="text-sm text-slate-400">
            Create a company to view your dashboard.
          </p>
          <Link href="/onboarding">
            <Button className="bg-[#2B74FF] hover:bg-[#2B74FF]/90 text-white mt-4">
              Create company
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
              <Link href="/overview">
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
                          href="/company-profile"
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
                <div className="text-left sm:text-right flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs border-slate-600 text-slate-300 hover:bg-slate-800/50 hover:text-white light:border-slate-300 light:text-slate-700 light:hover:bg-slate-100"
                    onClick={() => setDetailsOpen(true)}
                  >
                    Details
                  </Button>
                  <p className="text-xs text-slate-500 light:text-slate-600">
                    Powered by <span className="font-medium text-slate-300 light:text-slate-900">Valyxo Agent</span>
                  </p>
                </div>
              </div>

              {/* Key metrics: drag from here to chart slots below */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {keyMetricsDisplayList.map((item) => (
                  <div
                    key={item.label}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("metric", item.metricKey);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className="cursor-grab active:cursor-grabbing h-full min-h-0 [&>div]:h-full"
                  >
                    <KpiCard label={item.label} value={item.value} sublabel={item.sublabel} />
                  </div>
                ))}
              </div>
              {metricInference?.whyHigherLevelNotUsed && (
                <p className="text-xs text-slate-500 light:text-slate-600 mt-1">
                  {metricInference.whyHigherLevelNotUsed}
                </p>
              )}
              {company && (
                <MetricsDetailsModal
                  companyId={company.id}
                  open={detailsOpen}
                  onOpenChange={setDetailsOpen}
                  companyName={company.name}
                />
              )}

              {/* Trends — above Chat */}
              <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6 shadow-xl space-y-4 sm:space-y-6 light:border-slate-200 light:bg-white light:shadow-sm mt-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-sm sm:text-base font-medium text-slate-200 light:text-slate-950">Trends</h2>
                    <p className="text-xs text-slate-500 mt-1 light:text-slate-600">
                      Revenue and burn metrics over time
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm text-slate-400 light:text-slate-600">Show forecast</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showForecast}
                      onClick={() => setShowForecast((v) => !v)}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2B74FF]/50 focus:ring-offset-2 focus:ring-offset-slate-900 light:focus:ring-offset-white",
                        showForecast ? "bg-[#2B74FF]" : "bg-slate-700 light:bg-slate-300"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none block h-5 w-5 rounded-full bg-white shadow transition-transform",
                          showForecast ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {([0, 1, 2] as const).map((slotIndex) => {
                    const metricKey = chartSlots[slotIndex];
                    const metric = DASHBOARD_METRICS.find((m) => m.key === metricKey) ?? DASHBOARD_METRICS[0];
                    const chartData = getChartDataForMetric(metricKey);
                    const hasData = hasDataForMetric(metricKey);
                    return (
                      <div
                        key={slotIndex}
                        className={cn(
                          "rounded-xl border-2 border-dashed transition-colors",
                          slotIndex === 2 && "lg:col-span-2",
                          dragOverSlot === slotIndex
                            ? "border-[#2B74FF] bg-slate-800/50"
                            : "border-slate-700 light:border-slate-300"
                        )}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          setDragOverSlot(slotIndex);
                        }}
                        onDragLeave={() => setDragOverSlot(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOverSlot(null);
                          const key = e.dataTransfer.getData("metric");
                          if (!key) return;
                          setChartSlots((prev) => {
                            const next = [...prev] as [string, string, string];
                            next[slotIndex] = key;
                            return next;
                          });
                        }}
                      >
                        <div className="p-2">
                          <h3 className="text-sm font-medium text-slate-200 mb-2 light:text-slate-800">
                            {metric.label}
                          </h3>
                          {!hasData ? (
                            <div className="w-full h-64 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 flex items-center justify-center">
                              <p className="text-sm text-slate-400">Drag a metric from Key Metrics to show here.</p>
                            </div>
                          ) : (
                            <MetricChart
                              data={chartData}
                              metricLabel={metric.label}
                              format={metric.format}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Chat with Valyxo Agent — below Trends */}
              <div className="mt-8 pt-6 border-t border-slate-700/50 light:border-slate-200">
                <div className="flex items-baseline gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-slate-200 light:text-slate-900 tracking-tight">
                    Chat with Valyxo Agent
                  </h3>
                  <span className="text-[10px] font-medium text-slate-500 light:text-slate-500 uppercase tracking-widest">
                    AI Assistant
                  </span>
                </div>
                <p className="text-xs text-slate-500 light:text-slate-600 mb-4">
                  Ask about metrics, sync or sheets if something looks wrong.
                </p>
                <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-b from-slate-900/80 to-slate-950/60 light:from-slate-50 light:to-white light:border-slate-200 shadow-inner min-h-[220px] max-h-[340px] flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {agentChatMessages.length === 0 && (
                      <p className="text-xs text-slate-500 light:text-slate-600 italic">
                        Type a message below to chat with the agent.
                      </p>
                    )}
                    {agentChatMessages.map((m, i) => (
                      <div
                        key={i}
                        className={cn(
                          "text-sm rounded-xl px-4 py-2.5 max-w-[88%] shadow-sm",
                          m.role === "user"
                            ? "ml-auto bg-[#2B74FF]/25 text-slate-100 light:text-slate-900 border border-[#2B74FF]/20"
                            : "mr-auto bg-slate-800/70 text-slate-200 light:bg-slate-100 light:text-slate-800 border border-slate-700/30 light:border-slate-200"
                        )}
                      >
                        <span className="whitespace-pre-wrap">{m.content}</span>
                      </div>
                    ))}
                    {agentChatLoading && (
                      <div className="mr-auto text-sm rounded-xl px-4 py-2.5 bg-slate-800/70 text-slate-400 light:bg-slate-100 light:text-slate-600 border border-slate-700/30 light:border-slate-200">
                        Replying…
                      </div>
                    )}
                  </div>
                  <form
                    className="p-3 border-t border-slate-700/50 light:border-slate-200 bg-slate-950/30 light:bg-slate-50/50 flex gap-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const msg = agentChatInput.trim();
                      if (!msg || !company?.id || agentChatLoading) return;
                      setAgentChatInput("");
                      setAgentChatMessages((prev) => [...prev, { role: "user", content: msg }]);
                      setAgentChatLoading(true);
                      try {
                        const res = await authedFetch("/api/agent/chat", {
                          method: "POST",
                          body: JSON.stringify({ companyId: company.id, message: msg }),
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok || !data?.ok) {
                          setAgentChatMessages((prev) => [
                            ...prev,
                            { role: "assistant", content: data?.error || "Could not send message." },
                          ]);
                          return;
                        }
                        setAgentChatMessages((prev) => [
                          ...prev,
                          { role: "assistant", content: data.reply ?? "" },
                        ]);
                      } catch (err) {
                        setAgentChatMessages((prev) => [
                          ...prev,
                          { role: "assistant", content: "Something went wrong. Please try again." },
                        ]);
                      } finally {
                        setAgentChatLoading(false);
                      }
                    }}
                  >
                    <Input
                      value={agentChatInput}
                      onChange={(e) => setAgentChatInput(e.target.value)}
                      placeholder="Type a message…"
                      className="flex-1 bg-slate-900/60 border-slate-600/80 text-slate-100 placeholder:text-slate-500 rounded-lg light:bg-white light:border-slate-300 light:text-slate-900 focus:ring-2 focus:ring-[#2B74FF]/40"
                      disabled={agentChatLoading}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      className="shrink-0 rounded-lg bg-[#2B74FF] hover:bg-[#2B74FF]/90 text-white font-medium px-4"
                      disabled={!agentChatInput.trim() || agentChatLoading}
                    >
                      Send
                    </Button>
                  </form>
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

          {/* What investors can see + Investor Access Link + Update KPIs */}
          <section className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-4 sm:gap-6">
            {/* Customize investor view + shareable link */}
            <div className="rounded-xl border border-slate-800/50 bg-slate-900/30 p-4 sm:p-5 space-y-4 light:border-slate-200 light:bg-white">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 light:text-slate-600">
                What investors can see
              </h2>

              <div className="space-y-3">
                {[
                  { key: "arrMrr" as const, label: "ARR & MRR metrics" },
                  { key: "burnRunway" as const, label: "Burn & Runway" },
                  { key: "growthCharts" as const, label: "Growth charts" },
                  { key: "aiInsights" as const, label: "AI insights" },
                  { key: "showForecast" as const, label: "Show forecast" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-200 light:text-slate-800">{label}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={investorView[key]}
                      onClick={() => handleInvestorViewToggle(key)}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2B74FF]/50 focus:ring-offset-2 focus:ring-offset-slate-900",
                        investorView[key]
                          ? "bg-[#2B74FF]"
                          : "bg-slate-700 light:bg-slate-300"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none block h-5 w-5 rounded-full bg-white shadow transition-transform",
                          investorView[key] ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-700/50 light:border-slate-200 space-y-3">
                {investorUrl ? (
                  <>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <code className="flex-1 text-xs text-slate-300 bg-black/30 px-3 py-2 rounded border border-slate-800 font-mono break-all min-w-0 light:bg-slate-100 light:border-slate-200 light:text-slate-800">
                        {investorUrl}
                      </code>
                      <Button
                        size="sm"
                        onClick={copyLink}
                        className="bg-[#2B74FF] hover:bg-[#2B74FF]/90 text-white shrink-0 h-10 sm:h-9 px-4"
                      >
                        Copy link
                      </Button>
                    </div>
                    {latestLink?.expires_at && (
                      <p className="text-xs text-slate-500 light:text-slate-600">
                        Link expires {new Date(latestLink.expires_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-400 light:text-slate-600">
                    Loading link…
                  </p>
                )}
              </div>

              <p className="text-xs text-slate-500 light:text-slate-600">
                Investors see a clean, focused view. You stay in control of what&apos;s shared and can revoke access anytime.
              </p>
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
                  <option value="IDR">IDR (Rp)</option>
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

      {/* Stripe Connect Modal */}
      <Dialog open={stripeModalOpen} onOpenChange={setStripeModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-50 w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Connect Stripe</DialogTitle>
            <DialogDescription className="text-sm text-slate-400">
              Advanced: only use this if you can't use Connect.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="stripe-key" className="text-sm text-slate-300">
                Stripe Secret Key
              </label>
              <Input
                id="stripe-key"
                type="password"
                value={stripeKey}
                onChange={(e) => {
                  setStripeKey(e.target.value);
                  setStripeError(null);
                }}
                placeholder="sk_live_..."
                className="bg-slate-900 border-slate-700 text-slate-50 font-mono text-sm"
              />
              <p className="text-xs text-slate-500">
                We use this key only to read billing metrics. It is encrypted and never shown again.
              </p>
            </div>

            {stripeError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
                <p className="text-sm text-red-300">{stripeError}</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              onClick={handleSaveStripeKey}
              disabled={savingStripe || !stripeKey.trim() || !currentCompanyId}
              className="bg-[#2B74FF] hover:bg-[#2B74FF]/90 text-white w-full sm:w-auto"
            >
              {savingStripe ? "Verifying..." : "Save & Verify"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setStripeModalOpen(false);
                setStripeKey("");
                setStripeError(null);
              }}
              disabled={savingStripe}
              className="border-slate-700 text-slate-300 bg-slate-800/40 hover:bg-slate-700/50 w-full sm:w-auto"
            >
              Cancel
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
