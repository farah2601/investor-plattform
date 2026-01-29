"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { supabase } from "@/app/lib/supabaseClient";
import { authedFetch } from "@/lib/authedFetch";
import { FormattedDate } from "@/components/ui/FormattedDate";
import { KpiCard } from "@/components/ui/KpiCard";
import { BurnChart } from "@/components/ui/BurnChart";
import { MrrChart } from "@/components/ui/MrrChart";
import { buildDenseSeries, type SnapshotRow, type ChartPoint } from "@/lib/kpi/kpi_series";
import { extendWithForecast } from "@/lib/kpi/forecast";
import { extractKpiNumber } from "@/lib/kpi/kpi_extract";
import { useCompanyData } from "@/hooks/useCompanyData";
import { useUserCompany } from "@/lib/user-company-context";
import { MetricsDetailsModal } from "@/components/metrics/MetricsDetailsModal";

// Helper functions for formatting metrics
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

function formatRunway(value: number | null) {
  if (value == null) return "—";
  return `${value.toFixed(1)} months`;
}

function formatPercent(value: number | null) {
  if (value == null) return "—";
  // Value is already in percentage format (e.g., 2.5 for 2.5%)
  return value.toFixed(1) + "%";
}

type InvestorRequest = {
  id: string;
  status: string;
  investor_name: string;
  investor_email: string;
  created_at: string;
};

type InvestorLink = {
  id: string;
  access_token: string;
  expires_at: string | null;
  request_id: string | null;
};

// Helper function to format relative time
function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "Never";
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function OverviewPageContentInner() {
  const router = useRouter();
  const { company: userCompany, loading: userCompanyLoading, isAuthenticated } = useUserCompany();
  const companyId = userCompany?.id ?? null;
  const { company, investorRequests, investorLinks, loading, error } = useCompanyData(companyId);
  const [runningAgent, setRunningAgent] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [snapshotRows, setSnapshotRows] = useState<SnapshotRow[]>([]);
  const [loadingKpiHistory, setLoadingKpiHistory] = useState(false);
  const [activeChart, setActiveChart] = useState<"mrr" | "burn">("mrr");

  const mrrSeries = useMemo(() => buildDenseSeries(snapshotRows, "mrr"), [snapshotRows]);
  const burnSeries = useMemo(() => buildDenseSeries(snapshotRows, "burn_rate"), [snapshotRows]);
  const mrrExtended = useMemo(() => extendWithForecast(mrrSeries, { monthsAhead: 6 }), [mrrSeries]);
  const burnExtended = useMemo(() => extendWithForecast(burnSeries, { monthsAhead: 6 }), [burnSeries]);

  function toMrrChartData(series: ChartPoint[]) {
    const lastHist = series.reduce<number>((acc, p, i) => (p.value != null ? i : acc), -1);
    return series.map((p, i) => {
      const mrr = p.value;
      let mrrForecast: number | null | undefined;
      if (p.forecast != null) mrrForecast = p.forecast;
      else if (i === lastHist && lastHist >= 0) mrrForecast = (series[lastHist]!.value as number);
      else mrrForecast = undefined;
      return { month: p.label, mrr, ...(mrrForecast != null && { mrrForecast }) };
    });
  }

  function toBurnChartData(series: ChartPoint[]) {
    const lastHist = series.reduce<number>((acc, p, i) => (p.value != null ? i : acc), -1);
    return series.map((p, i) => {
      const burn = p.value;
      let burnForecast: number | null | undefined;
      if (p.forecast != null) burnForecast = p.forecast;
      else if (i === lastHist && lastHist >= 0) burnForecast = (series[lastHist]!.value as number);
      else burnForecast = undefined;
      return { month: p.label, burn, ...(burnForecast != null && { burnForecast }) };
    });
  }

  const mrrChartData = useMemo(() => toMrrChartData(mrrExtended), [mrrExtended]);
  const burnChartData = useMemo(() => toBurnChartData(burnExtended), [burnExtended]);

  const [stripeStatus, setStripeStatus] = useState<{
    status: "not_connected" | "pending" | "connected";
  }>({ status: "not_connected" });
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    if (userCompanyLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
  }, [userCompanyLoading, isAuthenticated, router]);

  useEffect(() => {
    if (company?.id) {
      loadKpiHistory(company.id);
      loadStripeStatus(company.id);
    }
  }, [company?.id]);

  async function loadKpiHistory(companyId: string) {
    setLoadingKpiHistory(true);
    try {
      const res = await fetch(`/api/kpi/snapshots?companyId=${companyId}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.warn("[loadKpiHistory] API error:", res.status, errorData?.error || "Unknown error");
        setSnapshotRows([]);
        return;
      }

      const json = await res.json().catch(() => ({}));

      if (json?.ok && Array.isArray(json.rows)) {
        setSnapshotRows(json.rows);
      } else {
        setSnapshotRows([]);
      }
    } catch (e) {
      console.warn("Failed to load KPI history (charts will not be shown):", e);
      setSnapshotRows([]);
    } finally {
      setLoadingKpiHistory(false);
    }
  }

  async function handleRunAgent() {
    if (!company?.id) return;

    setRunningAgent(true);
    setAgentError(null);

    try {
      const res = await fetch("/api/agent/run-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error || "Failed to run agent");
      }

      // Wait a bit for the agent to process, then reload
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error("Error running agent:", err);
      setAgentError(err instanceof Error ? err.message : "Failed to run agent");
      setRunningAgent(false);
    }
  }

  async function handleDeleteCompany() {
    if (!company?.id) return;

    const confirmed = confirm(
      `Are you sure you want to delete "${company.name}"? This action cannot be undone and will delete all associated data.`
    );

    if (!confirmed) return;

    setDeleting(true);
    setAgentError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error("Not authenticated");
      }

      const res = await fetch(`/api/companies/${company.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error || "Failed to delete company");
      }

      // Company deleted successfully - reload page to show updated state
      // This will either show "no company" or switch to another company if available
      window.location.href = "/overview";
    } catch (err) {
      console.error("Error deleting company:", err);
      setAgentError(err instanceof Error ? err.message : "Failed to delete company");
      setDeleting(false);
    }
  }

  // Stripe status - only for displaying count and hint in overview
  async function loadStripeStatus(companyId: string) {
    try {
      const res = await authedFetch(`/api/stripe/status?companyId=${companyId}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data?.ok) {
        setStripeStatus({
          status: data.status || "not_connected",
        });
      } else {
        setStripeStatus({
          status: "not_connected",
        });
      }
    } catch (e: any) {
      console.error("Failed to load Stripe status", e);
      if (e?.message !== "Not authenticated") {
        setStripeStatus({
          status: "not_connected",
        });
      }
    }
  }

  if (userCompanyLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-slate-400">No company found</p>
      </div>
    );
  }

  // Calculate connected systems from real data (same logic as dashboard)
  // Dashboard checks: google_sheets_url && google_sheets_tab to determine if Google Sheets is connected
  const hasGoogleSheets = !!(company.google_sheets_url && company.google_sheets_tab);
  const connectedCount = (hasGoogleSheets ? 1 : 0) + (stripeStatus.status === "connected" ? 1 : 0);

  // Calculate status from real sync data (same logic as dashboard uses)
  const lastSync = company.google_sheets_last_sync_at;
  const lastAgentRun = company.last_agent_run_at;

  // Determine data status and get latest update time
  const getDataStatus = () => {
    if (!lastSync && !lastAgentRun) {
      return { 
        status: "No data", 
        color: "text-slate-400", 
        bg: "bg-slate-800/30",
        border: "border-slate-700/30"
      };
    }
    if (lastSync || lastAgentRun) {
      const syncDate = lastSync ? new Date(lastSync) : null;
      const agentDate = lastAgentRun ? new Date(lastAgentRun) : null;
      const latestDate = syncDate && agentDate 
        ? (syncDate > agentDate ? syncDate : agentDate)
        : (syncDate || agentDate);
      
      if (latestDate) {
        const hoursAgo = (Date.now() - latestDate.getTime()) / (1000 * 60 * 60);
        if (hoursAgo < 24) {
          return { 
            status: "Up to date", 
            color: "text-[#2B74FF]", 
            bg: "bg-slate-800/50",
            border: "border-[#2B74FF]/30"
          };
        } else if (hoursAgo < 168) {
          return { 
            status: "Recent", 
            color: "text-amber-400", 
            bg: "bg-slate-800/50",
            border: "border-amber-500/20"
          };
        } else {
          return { 
            status: "Needs sync", 
            color: "text-rose-400", 
            bg: "bg-slate-800/50",
            border: "border-rose-500/20"
          };
        }
      }
    }
    return { 
      status: "Unknown", 
      color: "text-slate-400", 
      bg: "bg-slate-800/30",
      border: "border-slate-700/30"
    };
  };

  const dataStatus = getDataStatus();
  
  // Calculate investor access counts
  // - Approved with access: investor_links that are connected to approved requests AND not expired
  // - Pending requests: requests with status "pending"
  const approvedWithAccess = investorLinks.filter(link => {
    // Find the request associated with this link
    const request = investorRequests.find(r => r.id === link.request_id);
    // Check if request exists and is approved
    if (!request || request.status !== "approved") return false;
    
    // Check if link is expired
    if (link.expires_at) {
      const expiresAt = new Date(link.expires_at);
      const now = new Date();
      if (expiresAt.getTime() < now.getTime()) {
        return false; // Link is expired
      }
    }
    
    return true; // Link is valid and not expired
  }).length;
  
  const pendingRequestsCount = investorRequests.filter(r => r.status === "pending").length;
  
  // Get latest update time for at-a-glance
  const getLatestUpdateTime = (): string | null => {
    if (!lastSync && !lastAgentRun) return null;
    const syncDate = lastSync ? new Date(lastSync) : null;
    const agentDate = lastAgentRun ? new Date(lastAgentRun) : null;
    const latestDate = syncDate && agentDate 
      ? (syncDate > agentDate ? syncDate : agentDate)
      : (syncDate || agentDate);
    return latestDate ? formatRelativeTime(latestDate.toISOString()) : null;
  };

  const latestUpdateTime = getLatestUpdateTime();

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

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border border-slate-700/50 rounded-xl p-6 sm:p-7 shadow-lg light:bg-white light:border-slate-200">
          <h1 className="text-2xl sm:text-3xl font-semibold text-white mb-2 light:text-slate-950">
            Welcome back, {company.name}
          </h1>
          <p className="text-slate-400 text-sm light:text-slate-700">
            Manage your company data, investor access, and settings
          </p>
      </div>

      {/* At-a-glance Stats - Top Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Connected Systems Count - Clickable to navigate to connected systems page */}
          <Link href="/overview/connected-systems">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border border-slate-700/40 rounded-lg px-4 py-4 transition-all hover:border-slate-600/60 hover:bg-slate-800/60 cursor-pointer group text-left light:bg-white light:border-slate-200 light:hover:border-slate-300">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-400 transition-colors light:text-slate-600 light:group-hover:text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <div className="text-xs text-slate-500 uppercase tracking-wider group-hover:text-slate-400 transition-colors light:text-slate-600 light:group-hover:text-slate-800">Connected Systems</div>
              </div>
              <div className="text-xl font-bold text-white group-hover:text-slate-100 transition-colors light:text-slate-950">
                {(() => {
                  const count = (hasGoogleSheets ? 1 : 0) + (stripeStatus.status === "connected" ? 1 : 0);
                  return `${count} ${count === 1 ? "system" : "systems"}`;
                })()}
              </div>
            </div>
          </Link>

          {/* Status - Real data from company.google_sheets_last_sync_at and company.last_agent_run_at */}
          <div className={`border rounded-lg px-4 py-4 ${
            dataStatus.status === "Up to date" 
              ? "bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-[#2B74FF]/30 light:bg-white light:border-[#2B74FF]/30" 
              : "bg-gradient-to-br from-slate-800/50 to-slate-700/30 border-slate-700/40 light:bg-white light:border-slate-200"
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${
                dataStatus.status === "Up to date" ? "bg-[#2B74FF] shadow-[0_0_8px_rgba(43,116,255,0.5)]" :
                dataStatus.status === "Recent" ? "bg-amber-400" :
                "bg-rose-400"
              }`}></div>
              <div className="text-xs text-slate-500 uppercase tracking-wider light:text-slate-600">Status</div>
            </div>
            <div className={`text-xl font-bold ${
              dataStatus.status === "Up to date" ? "text-[#2B74FF]" : dataStatus.color
            }`}>
              {dataStatus.status}
            </div>
          </div>

          {/* Investor Requests - Link to Investor Requests page */}
          <Link href="/overview/investor-requests">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border border-slate-700/40 rounded-lg px-4 py-4 transition-all hover:border-slate-600/60 hover:bg-slate-800/60 cursor-pointer group light:bg-white light:border-slate-200 light:hover:border-slate-300">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-400 transition-colors light:text-slate-600 light:group-hover:text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <div className="text-xs text-slate-500 uppercase tracking-wider group-hover:text-slate-400 transition-colors light:text-slate-600 light:group-hover:text-slate-800">Investor Requests</div>
              </div>
              <div className="text-xl font-bold text-white light:text-slate-950">
                <span>{pendingRequestsCount} pending</span>
                {approvedWithAccess > 0 && (
                  <span className="text-slate-400 text-base font-normal light:text-slate-600"> · {approvedWithAccess} have access</span>
                )}
              </div>
            </div>
          </Link>
      </div>

      {/* Dashboard Preview - Full Width */}
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-700/40 border border-slate-700/50 rounded-2xl p-6 sm:p-8 lg:p-10 shadow-xl shadow-[#2B74FF]/5 ring-1 ring-slate-700/30 light:bg-white light:border-slate-200 light:shadow-sm light:ring-slate-200/30">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-3 light:text-slate-950">Dashboard Preview</h2>
          <p className="text-sm text-slate-400 light:text-slate-700">
            This is a live preview of your company's performance.
          </p>
        </div>

        {/* Status and timestamp */}
        <div className="flex flex-wrap items-center gap-4 mb-8 text-xs text-slate-400">
          {latestUpdateTime && (
            <span className="text-slate-400">Last updated: <span className="text-white font-medium">{latestUpdateTime}</span></span>
          )}
          {hasGoogleSheets && (
            <span className="text-[#2B74FF] font-medium">Auto-sync enabled</span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs border-slate-600 text-slate-300 hover:bg-slate-800/50 hover:text-white light:border-slate-300 light:text-slate-700 light:hover:bg-slate-100"
            onClick={() => setDetailsOpen(true)}
          >
            Details
          </Button>
        </div>

        {/* All 6 Key Metrics - same source as Details (latest snapshot when available) */}
        <div className="mb-8">
          {/* First row: ARR, MRR, Growth */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <KpiCard label="ARR" value={formatMoney(displayArr)} sublabel="Annual recurring revenue" />
            <KpiCard label="MRR" value={formatMoney(displayMrr)} sublabel="Monthly recurring revenue" />
            <KpiCard
              label="Growth"
              value={formatPercent(displayGrowth)}
              sublabel="MRR growth (last 12 months)"
            />
          </div>
          {/* Second row: Burn Rate, Runway, Churn */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard label="Burn rate" value={formatMoney(displayBurnRate)} sublabel="Monthly burn" />
            <KpiCard
              label="Runway"
              value={formatRunway(displayRunwayMonths)}
              sublabel="Estimated runway at current burn"
            />
            <KpiCard label="Churn" value={formatPercent(displayChurn)} sublabel="MRR churn rate" />
          </div>
          <MetricsDetailsModal
            companyId={company.id}
            open={detailsOpen}
            onOpenChange={setDetailsOpen}
            companyName={company.name}
          />
        </div>

        {/* Chart carousel — MRR · Burn (with prognose) */}
        {!loadingKpiHistory && (mrrChartData.length > 0 || burnChartData.length > 0) && (
          <div className="mb-8">
            <div className="relative bg-slate-900/40 rounded-xl p-5 border border-slate-700/30 light:bg-white light:border-slate-200">
              {/* Arrow navigation - only show if both charts available */}
              {mrrChartData.length > 0 && burnChartData.length > 0 && (
                <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                  <button
                    onClick={() => setActiveChart("mrr")}
                    disabled={activeChart === "mrr"}
                    className={`p-2 rounded-md transition-all ${
                      activeChart === "mrr"
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-slate-800/50 text-slate-400 hover:text-white"
                    }`}
                    aria-label="Previous chart"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => setActiveChart("burn")}
                    disabled={activeChart === "burn"}
                    className={`p-2 rounded-md transition-all ${
                      activeChart === "mrr"
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-slate-800/50 text-slate-400 hover:text-white"
                    }`}
                    aria-label="Next chart"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              )}

              {/* Chart content */}
              <div className="relative min-h-[280px]">
                {mrrChartData.length > 0 && (
                  <div
                    className={`transition-opacity duration-300 ${
                      activeChart === "mrr" || (mrrChartData.length > 0 && burnChartData.length === 0)
                        ? "opacity-100 relative"
                        : "opacity-0 absolute inset-0 pointer-events-none"
                    }`}
                  >
                    <MrrChart data={mrrChartData} />
                  </div>
                )}

                {burnChartData.length > 0 && (
                  <div
                    className={`transition-opacity duration-300 ${
                      activeChart === "burn" || (burnChartData.length > 0 && mrrChartData.length === 0)
                        ? "opacity-100 relative"
                        : "opacity-0 absolute inset-0 pointer-events-none"
                    }`}
                  >
                    <BurnChart data={burnChartData} />
                  </div>
                )}
              </div>

              {mrrChartData.length > 0 && burnChartData.length > 0 && (
                <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-slate-700/30">
                  <button
                    onClick={() => setActiveChart("mrr")}
                    className={`h-2 rounded-full transition-all ${
                      activeChart === "mrr" ? "w-8 bg-[#2B74FF]" : "w-2 bg-slate-600 hover:bg-slate-500"
                    }`}
                    aria-label="Show MRR chart"
                  />
                  <button
                    onClick={() => setActiveChart("burn")}
                    className={`h-2 rounded-full transition-all ${
                      activeChart === "burn" ? "w-8 bg-[#2B74FF]" : "w-2 bg-slate-600 hover:bg-slate-500"
                    }`}
                    aria-label="Show Burn chart"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading state for charts */}
        {loadingKpiHistory && (
          <div className="mb-8 text-center py-8">
            <p className="text-sm text-slate-400">Loading chart data...</p>
          </div>
        )}

        {/* CTA Button */}
        <div className="pt-6 border-t border-slate-700/30">
          <Link href="/company-dashboard">
            <Button
              className="w-full bg-gradient-to-r from-[#2B74FF] to-[#4D9FFF] hover:from-[#2563EB] hover:to-[#3B82F6] text-white font-semibold shadow-lg shadow-[#2B74FF]/20 hover:shadow-[#4D9FFF]/30 transition-all h-auto py-3.5 text-base"
            >
              Open full dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* What's next hint */}
      {stripeStatus.status !== "connected" ? (
        <div className="bg-gradient-to-br from-[#2B74FF]/15 to-[#4D9FFF]/8 border border-[#2B74FF]/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-[#4D9FFF] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-white mb-1">Next step:</p>
              <p className="text-sm text-slate-200">
                Connect Stripe to unlock revenue and churn tracking.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Quick Actions - Lighter section for contrast */}
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border border-slate-700/40 rounded-xl p-6 sm:p-7 shadow-lg light:bg-white light:border-slate-200">
        <h2 className="text-base font-semibold text-white mb-6 light:text-slate-950">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* View Dashboard - Primary (BLUE, dominant) */}
            <div className="flex flex-col">
              <Link href="/company-dashboard" className="flex-1">
                <Button
                  className="w-full bg-gradient-to-r from-[#2B74FF] to-[#4D9FFF] hover:from-[#2563EB] hover:to-[#3B82F6] text-white font-semibold shadow-xl shadow-[#2B74FF]/30 hover:shadow-[#4D9FFF]/40 transition-all h-auto py-5 flex flex-col items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="text-sm font-semibold">View dashboard</span>
                </Button>
              </Link>
              <p className="text-xs text-slate-300 mt-2 text-center light:text-slate-700">See metrics and trends</p>
            </div>

            {/* Company Settings - Control/Management (Neutral) */}
            <div className="flex flex-col">
              <Link href="/company-settings" className="flex-1">
                <Button
                  className="w-full bg-slate-800/40 hover:bg-slate-700/50 border border-slate-600/40 text-slate-200 font-medium h-auto py-4 flex flex-col items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm">Company settings</span>
                </Button>
              </Link>
              <p className="text-xs text-slate-400 mt-2 text-center light:text-slate-600">Info, access, security, billing</p>
            </div>

            {/* Company Profile - Control/Management (Neutral) */}
            <div className="flex flex-col">
              <Link href="/company-profile" className="flex-1">
                <Button
                  className="w-full bg-slate-800/40 hover:bg-slate-700/50 border border-slate-600/40 text-slate-200 font-medium h-auto py-4 flex flex-col items-center gap-2 relative"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="text-sm">Company profile</span>
                </Button>
              </Link>
              <p className="text-xs text-slate-400 mt-2 text-center light:text-slate-600">View and edit company profile</p>
            </div>

            {/* Refresh Company Data - Secondary (Neutral) */}
            <div className="flex flex-col">
              <Button
                onClick={handleRunAgent}
                disabled={runningAgent || !company.id}
                className="w-full bg-slate-800/40 hover:bg-slate-700/50 border border-slate-600/40 text-slate-200 font-medium h-auto py-4 flex flex-col items-center gap-2 disabled:opacity-50"
              >
                {runningAgent ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-sm">Refreshing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="text-sm">Refresh company data</span>
                  </>
                )}
              </Button>
              <p className="text-xs text-slate-400 mt-2 text-center">Manual refresh</p>
            </div>
          </div>

          {/* Secondary Actions Row */}
          <div className="mt-5 pt-5 border-t border-slate-700/30">
            <div className="flex justify-center gap-3">
              {company?.id && (
                <Button
                  variant="outline"
                  onClick={handleDeleteCompany}
                  disabled={deleting}
                  className="border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 hover:border-red-500/50 text-sm light:border-red-300 light:text-red-600 light:bg-red-50 light:hover:bg-red-100"
                >
                  {deleting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete company
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

        {agentError && (
          <div className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3">
            <p className="text-sm text-rose-400">Error: {agentError}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Export as default for use in page.tsx wrapper
export default OverviewPageContentInner;
