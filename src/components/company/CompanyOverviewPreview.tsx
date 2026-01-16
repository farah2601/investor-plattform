"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import Link from "next/link";
import { ArrChart, ArrChartDataPoint } from "@/components/ui/ArrChart";
import { MrrChart, MrrChartDataPoint } from "@/components/ui/MrrChart";

type CompanyData = {
  id: string;
  name: string;
  mrr: number | null;
  arr: number | null;
  burn_rate: number | null;
  runway_months: number | null;
  churn: number | null;
  growth_percent: number | null;
  last_agent_run_at: string | null;
  google_sheets_last_sync_at: string | null;
};

type PreviewStatus = "loading" | "syncing" | "up-to-date" | "error";

// Format money values (similar to overview page)
function formatMoney(value: number | null): string {
  if (value == null) return "—";
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`;
  }
  return "$" + value.toLocaleString("en-US");
}

function formatPercent(value: number | null): string {
  if (value == null) return "—";
  return `${value.toFixed(1)}%`;
}

function formatRunway(value: number | null): string {
  if (value == null) return "—";
  if (value >= 12) {
    return `${(value / 12).toFixed(1)}y`;
  }
  return `${value.toFixed(1)} mo`;
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "Never";
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

interface CompanyOverviewPreviewProps {
  companyId: string | null;
}

export function CompanyOverviewPreview({ companyId }: CompanyOverviewPreviewProps) {
  const router = useRouter();
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [status, setStatus] = useState<PreviewStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [arrSeries, setArrSeries] = useState<ArrChartDataPoint[]>([]);
  const [mrrSeries, setMrrSeries] = useState<MrrChartDataPoint[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [activeChart, setActiveChart] = useState<"arr" | "mrr">("mrr");

  const loadData = useCallback(async (isRefetch = false) => {
    if (!companyId) {
      setStatus("error");
      setError("No company ID provided");
      return;
    }

    try {
      if (isRefetch) {
        setStatus("syncing");
      }

      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("id, name, mrr, arr, burn_rate, runway_months, churn, growth_percent, last_agent_run_at, google_sheets_last_sync_at")
        .eq("id", companyId)
        .maybeSingle();

      if (companyError) {
        console.error("Error loading company:", companyError);
        setStatus("error");
        setError(companyError.message);
        return;
      }

      if (!companyData) {
        setStatus("error");
        setError("Company not found");
        return;
      }

      setCompany(companyData as CompanyData);
      setStatus("up-to-date");
      setError(null);

      // Determine last updated time
      const syncTime = companyData.google_sheets_last_sync_at || companyData.last_agent_run_at;
      setLastUpdated(syncTime);
    } catch (err) {
      console.error("Error in loadData:", err);
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to load data");
    }
  }, [companyId]);

  // Load KPI history for charts
  const loadKpiHistory = useCallback(async (companyIdParam: string) => {
    setLoadingCharts(true);
    try {
      const res = await fetch(`/api/kpi/snapshots?companyId=${companyIdParam}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        setArrSeries([]);
        setMrrSeries([]);
        return;
      }

      const json = await res.json().catch(() => ({}));

      if (json?.ok && Array.isArray(json.arrSeries) && Array.isArray(json.mrrSeries)) {
        // Transform API data format { date, label, value } to chart format { month, arr/mrr }
        const transformedArrSeries: ArrChartDataPoint[] = json.arrSeries.map((item: any) => ({
          month: item.label || item.date || "",
          arr: item.value !== undefined && item.value !== null ? Number(item.value) : null,
        }));
        
        const transformedMrrSeries: MrrChartDataPoint[] = json.mrrSeries.map((item: any) => ({
          month: item.label || item.date || "",
          mrr: item.value !== undefined && item.value !== null ? Number(item.value) : null,
        }));
        
        setArrSeries(transformedArrSeries);
        setMrrSeries(transformedMrrSeries);
      } else {
        setArrSeries([]);
        setMrrSeries([]);
      }
    } catch (e) {
      console.warn("Failed to load KPI history:", e);
      setArrSeries([]);
      setMrrSeries([]);
    } finally {
      setLoadingCharts(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Load charts when company is loaded
  useEffect(() => {
    if (company?.id) {
      loadKpiHistory(company.id);
    }
  }, [company?.id, loadKpiHistory]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (!companyId) return;

    const interval = setInterval(() => {
      loadData(true);
      if (company?.id) {
        loadKpiHistory(company.id);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [companyId, company?.id, loadData, loadKpiHistory]);

  const handleClick = () => {
    if (companyId) {
      router.push(`/company-dashboard?companyId=${companyId}`);
    }
  };

  if (!companyId) {
    return null;
  }

  return (
    <section className="relative mx-auto max-w-6xl px-4 py-16 lg:py-20">
      <div
        onClick={handleClick}
        className="cursor-pointer bg-gradient-to-br from-slate-900/60 to-slate-800/40 border border-slate-700/50 rounded-xl p-6 lg:p-10 overflow-hidden transition-opacity hover:opacity-90"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl lg:text-3xl font-semibold text-white mb-2">Dashboard Preview</h2>
            <p className="text-sm text-slate-300">This is a live preview of your company's performance.</p>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-700/30">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Last updated:</span>
            <span className="text-xs font-medium text-slate-300">
              {lastUpdated ? formatRelativeTime(lastUpdated) : "Never"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                status === "up-to-date"
                  ? "bg-blue-500/20 text-blue-400"
                  : status === "syncing"
                  ? "bg-amber-500/20 text-amber-400"
                  : status === "error"
                  ? "bg-red-500/20 text-red-400"
                  : "bg-slate-700/50 text-slate-400"
              }`}
            >
              {status === "up-to-date"
                ? "Auto-sync enabled"
                : status === "syncing"
                ? "Syncing..."
                : status === "error"
                ? "Error"
                : "Loading..."}
            </span>
          </div>
        </div>

        {/* Error State */}
        {status === "error" && error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {status === "loading" && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-slate-700/50 rounded w-16 mb-3"></div>
                <div className="h-8 bg-slate-700/50 rounded w-24 mb-2"></div>
                <div className="h-3 bg-slate-700/50 rounded w-32"></div>
              </div>
            ))}
          </div>
        )}

        {/* KPI Cards */}
        {status !== "loading" && company && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {/* ARR */}
            <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5">
              <div className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">ARR</div>
              <div className="text-3xl font-bold text-white mb-1">{formatMoney(company.arr)}</div>
              <div className="text-xs text-slate-500">Annual recurring revenue</div>
            </div>

            {/* MRR */}
            <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5">
              <div className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">MRR</div>
              <div className="text-3xl font-bold text-white mb-1">{formatMoney(company.mrr)}</div>
              <div className="text-xs text-slate-500">Monthly recurring revenue</div>
            </div>

            {/* Growth */}
            <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5">
              <div className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Growth</div>
              <div className="text-3xl font-bold text-white mb-1">{formatPercent(company.growth_percent)}</div>
              <div className="text-xs text-slate-500">MRR growth (last 12 months)</div>
            </div>

            {/* Burn Rate */}
            <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5">
              <div className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Burn Rate</div>
              <div className="text-3xl font-bold text-white mb-1">{formatMoney(company.burn_rate)}</div>
              <div className="text-xs text-slate-500">Monthly burn</div>
            </div>

            {/* Runway */}
            <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5">
              <div className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Runway</div>
              <div className="text-3xl font-bold text-white mb-1">{formatRunway(company.runway_months)}</div>
              <div className="text-xs text-slate-500">Estimated runway at current burn</div>
            </div>

            {/* Churn */}
            <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5">
              <div className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Churn</div>
              <div className="text-3xl font-bold text-white mb-1">{formatPercent(company.churn)}</div>
              <div className="text-xs text-slate-500">MRR churn rate</div>
            </div>
          </div>
        )}

        {/* Charts Section */}
        {status !== "loading" && company && (arrSeries.length > 0 || mrrSeries.length > 0) && (
          <div className="mt-6 pt-6 border-t border-slate-700/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">
                {activeChart === "arr" ? "ARR Over Time" : "MRR Over Time"}
              </h3>
              {/* Arrow navigation - only show if both charts available */}
              {arrSeries.length > 0 && mrrSeries.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveChart(activeChart === "arr" ? "mrr" : "arr");
                    }}
                    className="p-2 rounded-md transition-all hover:bg-slate-800/50 text-slate-400 hover:text-white"
                    aria-label="Switch chart"
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
                        d={activeChart === "mrr" ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
                      />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveChart(activeChart === "mrr" ? "arr" : "mrr");
                    }}
                    className="p-2 rounded-md transition-all hover:bg-slate-800/50 text-slate-400 hover:text-white"
                    aria-label="Switch chart"
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
                        d={activeChart === "arr" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"}
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div className="relative">
              {activeChart === "arr" && arrSeries.length > 0 && (
                <div className="transition-opacity">
                  <ArrChart data={arrSeries} />
                </div>
              )}
              {activeChart === "mrr" && mrrSeries.length > 0 && (
                <div className="transition-opacity">
                  <MrrChart data={mrrSeries} />
                </div>
              )}
            </div>
            {/* Pagination dots */}
            {arrSeries.length > 0 && mrrSeries.length > 0 && (
              <div className="flex justify-center gap-2 mt-4">
                <div
                  className={`w-2 h-2 rounded-full transition-colors ${
                    activeChart === "mrr" ? "bg-[#2B74FF]" : "bg-slate-700"
                  }`}
                />
                <div
                  className={`w-2 h-2 rounded-full transition-colors ${
                    activeChart === "arr" ? "bg-[#2B74FF]" : "bg-slate-700"
                  }`}
                />
              </div>
            )}
          </div>
        )}

        {/* CTA Button */}
        {status !== "loading" && (
          <div className="flex justify-center pt-6">
            <Link
              href={`/company-dashboard?companyId=${companyId}`}
              onClick={(e) => e.stopPropagation()}
              className="px-6 py-3 bg-[#2B74FF] hover:bg-[#1e5ae6] text-white font-medium rounded-lg transition-colors"
            >
              View Full Dashboard
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
