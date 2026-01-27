// app/investor/[token]/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { supabase } from "../../lib/supabaseClient";
import { cn } from "@/lib/utils";

import { Card } from "../../../components/ui/card";
import { Badge } from "../../../../components/ui/badge";
import { Avatar, AvatarFallback } from "../../../../components/ui/avatar";


import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

type TeamMember = {
  name: string;
  role: string;
  linkedin_url?: string;
  experience?: string;
};

/** Dashboard "What investors can see" – stored in companies.investor_view_config (Supabase) */
type InvestorViewConfig = {
  arrMrr: boolean;
  burnRunway: boolean;
  growthCharts: boolean;
  aiInsights: boolean;
};

const DEFAULT_INVESTOR_VIEW: InvestorViewConfig = {
  arrMrr: true,
  burnRunway: true,
  growthCharts: true,
  aiInsights: false,
};

function normalizeInvestorViewConfig(raw: unknown): InvestorViewConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_INVESTOR_VIEW };
  const o = raw as Record<string, unknown>;
  return {
    arrMrr: o.arrMrr !== false,
    burnRunway: o.burnRunway !== false,
    growthCharts: o.growthCharts !== false,
    aiInsights: !!o.aiInsights,
  };
}

type CompanyProfile = {
  id: string;
  name: string;
  industry: string | null;
  stage: string | null;
  description: string | null;
  problem: string | null;
  solution: string | null;
  why_now: string | null;
  market: string | null;
  product_details: string | null;
  website_url: string | null;
  linkedin_urls: string[] | null;
  team: TeamMember[] | null;

  profile_status?: string | null;

  updated_at?: string | null;

  last_agent_run_at?: string | null;
  last_agent_run_by?: string | null;

  latest_insights?: string[] | null;
  latest_insights_generated_at?: string | null;
  latest_insights_generated_by?: string | null;
  based_on_snapshot_date?: string | null;

  /** From companies.investor_view_config – what to show on investor view */
  investor_view_config?: InvestorViewConfig | null;

  /** KPI values from companies table – same source as dashboard (Update KPIs) */
  mrr?: number | null;
  arr?: number | null;
  burn_rate?: number | null;
  runway_months?: number | null;
  churn?: number | null;
  growth_percent?: number | null;
};

type InvestorLinkMeta = {
  expires_at?: string | null;
  company_id?: string | null;
};

type ChartDataPoint = {
  date: string;
  label: string;
  value: number | null;
};

type ChartData = {
  month: string;
  value: number | null;
};

function formatDateLabel(dateString?: string | null): string {
  if (!dateString) return "Unknown";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

function formatRunway(value: number | null) {
  if (value == null) return "—";
  return `${value.toFixed(1)} months`;
}

function formatMonthLabel(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
  } catch {
    return dateStr.slice(0, 7);
  }
}

/**
 * Normalize burn_rate: if value < 1000, treat as "thousands" and multiply by 1000.
 * This handles the case where burn_rate is stored as 92 (meaning 92k) instead of 92000.
 */
function normalizeBurnRate(value: number | null): number | null {
  if (value == null) return null;
  const num = Number(value);
  if (isNaN(num)) return null;
  // If value is less than 1000, assume it's in thousands and multiply by 1000
  if (num < 1000 && num > 0) {
    return num * 1000;
  }
  return num;
}

/**
 * Format currency for axis ticks (short format)
 * - < 1,000 => "$920"
 * - < 1,000,000 => "$92k" (round, no decimals)
 * - >= 1,000,000 => "$7.1M" (1 decimal max)
 * - 0 => "0" (never "Ok")
 */
function formatCurrencyShort(value: number | null): string {
  if (value == null || isNaN(value)) return "—";
  const num = Math.abs(value);
  
  if (num === 0) return "0";
  if (num < 1000) return `$${Math.round(num).toLocaleString("en-US")}`;
  if (num < 1000000) return `$${Math.round(num / 1000)}k`;
  return `$${(num / 1000000).toFixed(1)}M`;
}

/**
 * Format currency for tooltips (long format with commas)
 * e.g., "$92,000" or "$7,060,000"
 */
function formatCurrencyLong(value: number | null): string {
  if (value == null || isNaN(value)) return "—";
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

/**
 * Format month label for tooltip (e.g., "Dec 2026")
 */
function formatMonthYearLabel(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", { 
      month: "short", 
      year: "numeric" 
    }).format(date);
  } catch {
    return dateStr.slice(0, 7);
  }
}

/**
 * Custom Stripe-like tooltip component
 */
function CustomTooltip({ 
  active, 
  payload, 
  label, 
  seriesName,
  dateKey = "date"
}: { 
  active?: boolean; 
  payload?: any[]; 
  label?: string;
  seriesName: string;
  dateKey?: string;
}) {
  if (!active || !payload || !payload[0]) return null;
  
  const data = payload[0].payload;
  const value = payload[0].value;
  const date = data?.[dateKey] || label || "";
  const formattedDate = date ? formatMonthYearLabel(date) : (label || "");
  const formattedValue = value != null ? formatCurrencyLong(value) : "—";

  return (
    <div className="bg-slate-900/95 border border-slate-700/50 rounded-lg px-3 py-2 shadow-lg backdrop-blur-sm">
      <div className="text-xs text-slate-300 font-medium mb-1">
        {formattedDate}
      </div>
      <div className="text-sm text-white font-semibold">
        {seriesName} • {formattedValue}
      </div>
    </div>
  );
}

export default function InvestorCompanyPage() {
  const params = useParams();

  const token =
    typeof (params as any)?.token === "string"
      ? (params as any).token
      : Array.isArray((params as any)?.token)
        ? (params as any).token[0]
        : null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [linkMeta, setLinkMeta] = useState<InvestorLinkMeta | null>(null);
  
  // KPI history from snapshots
  const [arrSeries, setArrSeries] = useState<ChartDataPoint[]>([]);
  const [mrrSeries, setMrrSeries] = useState<ChartDataPoint[]>([]);
  const [burnSeries, setBurnSeries] = useState<ChartDataPoint[]>([]);
  const [loadingKpiHistory, setLoadingKpiHistory] = useState(false);
  const [latestSnapshotDate, setLatestSnapshotDate] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        setCompany(null);
        setLinkMeta(null);

        // Demo mode - show demo data
        if (token === "demo") {
          const demoCompany: CompanyProfile = {
            id: "demo-company",
            name: "Acme SaaS",
            industry: "SaaS",
            stage: "Series A",
            description: "AI-powered workflow automation for enterprise teams.",
            problem: "Enterprise teams waste 15+ hours per week on manual, repetitive tasks that could be automated.",
            solution: "Acme SaaS uses AI to identify and automate workflows, reducing manual work by 80% while maintaining quality.",
            why_now: "Recent advances in LLMs make workflow automation reliable enough for enterprise use. Teams are ready to adopt.",
            market: "Global enterprise workflow automation market is $8.2B and growing 23% YoY. Target addressable market: $2.1B.",
            product_details: "Platform connects to 200+ tools (Slack, Jira, Salesforce, etc.) and uses AI to learn team patterns, then suggests and executes automations. Self-service setup in under 10 minutes.",
            website_url: "https://acmesaas.com",
            linkedin_urls: [],
            team: [
              {
                name: "Sarah Chen",
                role: "CEO & Co-founder",
                experience: "Former VP Product at Stripe. Built payment infrastructure for 100K+ merchants.",
              },
              {
                name: "Marcus Johnson",
                role: "CTO & Co-founder",
                experience: "Ex-Google AI researcher. Led ML teams building production AI systems.",
              },
            ],
            profile_status: "Published",
            updated_at: new Date().toISOString(),
            last_agent_run_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            latest_insights: [
              "MRR growth accelerated to 12% MoM in Q4, driven by enterprise expansion deals.",
              "Burn efficiency improved 15% as the team scaled revenue faster than headcount.",
              "Runway extended to 18 months following Series A close. Cash position strong.",
              "Net revenue churn remains below 2%, indicating strong product-market fit.",
              "Customer acquisition cost decreased 22% as brand awareness increased.",
            ],
            latest_insights_generated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            mrr: 124_000,
            arr: 1_488_000,
            burn_rate: 92_000,
            runway_months: 18,
            churn: 1.8,
            growth_percent: 12,
          };

          setCompany({
            ...demoCompany,
            investor_view_config: { ...DEFAULT_INVESTOR_VIEW },
          });
          setLinkMeta({
            expires_at: null,
            company_id: "demo-company",
          });
          setLoading(false);
          return;
        }

        const { data: linkRow, error: linkError } = await supabase
          .from("investor_links")
          .select("company_id, expires_at")
          .eq("access_token", token)
          .maybeSingle();

        if (cancelled) return;

        if (linkError) {
          setError(`Invalid investor link: ${linkError.message}`);
          setLoading(false);
          return;
        }

        if (!linkRow) {
          setError("Investor link not found.");
          setLoading(false);
          return;
        }

        const expiresAt = linkRow.expires_at ?? null;
        const isExpired =
          !!expiresAt && new Date(expiresAt).getTime() < Date.now();

        setLinkMeta({
          expires_at: expiresAt,
          company_id: linkRow.company_id ?? null,
        });

        if (isExpired) {
          setError("Investor link expired.");
          setLoading(false);
          return;
        }

        const companyId = (linkRow.company_id as string | null) ?? null;

        if (!companyId) {
          setError("No company attached to this investor link.");
          setLoading(false);
          return;
        }

        const { data: companyRow, error: companyError } = await supabase
          .from("companies")
          .select("*")
          .eq("id", companyId)
          .maybeSingle();

        if (cancelled) return;

        if (companyError) {
          setError(`Could not load company: ${companyError.message}`);
          setLoading(false);
          return;
        }

        if (!companyRow) {
          setError("Company not found for this investor link.");
          setLoading(false);
          return;
        }

        // Check if profile is published (investor gating)
        if (!companyRow.profile_published) {
          setError("This profile is not published yet. Please contact the company for access.");
          setLoading(false);
          return;
        }

        const cfg = normalizeInvestorViewConfig((companyRow as any).investor_view_config);
        setCompany({
          ...(companyRow as unknown as CompanyProfile),
          investor_view_config: cfg,
        });
        setLoading(false);
        
        // Load KPI history after company is loaded
        if (!cancelled && companyId) {
          loadKpiHistory(companyId);
        }
      } catch (err: any) {
        if (cancelled) return;
        setError(
          typeof err?.message === "string"
            ? err.message
            : "Unexpected error loading investor view."
        );
        setLoading(false);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function loadKpiHistory(companyId: string) {
    setLoadingKpiHistory(true);
    try {
      const res = await fetch(`/api/kpi/snapshots?companyId=${companyId}`, {
        cache: "no-store",
      });
      const json = await res.json();
      
      if (json?.ok && Array.isArray(json.arrSeries) && Array.isArray(json.mrrSeries) && Array.isArray(json.burnSeries)) {
        setArrSeries(json.arrSeries);
        setMrrSeries(json.mrrSeries);
        // Normalize burn_rate values in series: if < 1000, treat as thousands and multiply by 1000
        const normalizedBurnSeries = json.burnSeries.map((point: ChartDataPoint) => ({
          ...point,
          value: normalizeBurnRate(point.value),
        }));
        setBurnSeries(normalizedBurnSeries);
        setLatestSnapshotDate(json.latest?.period_date ?? null);
      } else {
        setArrSeries([]);
        setMrrSeries([]);
        setBurnSeries([]);
        setLatestSnapshotDate(null);
      }
    } catch (e) {
      console.error("Failed to load KPI history", e);
      setArrSeries([]);
      setMrrSeries([]);
      setBurnSeries([]);
      setLatestSnapshotDate(null);
    } finally {
      setLoadingKpiHistory(false);
    }
  }

  const expiresAt = linkMeta?.expires_at ?? null;
  const isExpired =
    !!expiresAt && new Date(expiresAt).getTime() < Date.now();

  const isPublished = company?.profile_status === "Published";

  const agentUpdated =
    company?.last_agent_run_at ||
    company?.latest_insights_generated_at ||
    company?.updated_at ||
    null;

  const insights = useMemo(
    () => (Array.isArray(company?.latest_insights) ? company!.latest_insights! : []),
    [company]
  );

  /** Dashboard "What investors can see" – from companies.investor_view_config (Supabase) */
  const config = company?.investor_view_config ?? DEFAULT_INVESTOR_VIEW;
  const hasAnyKpiContent = config.arrMrr || config.burnRunway || config.growthCharts || config.aiInsights;

  // KPI card values: use company (companies table), same source as dashboard (Update KPIs)
  const latestMrr = company?.mrr ?? null;
  const latestArr = company?.arr ?? null;
  const latestBurn = company?.burn_rate ?? null;
  const latestChurn = company?.churn ?? null;
  const latestGrowth = company?.growth_percent ?? null;
  const latestRunway = company?.runway_months ?? null;

  // Transform series data to chart format (include date for tooltip)
  const mrrChartData = mrrSeries.map((point) => ({
    month: point.label || formatMonthLabel(point.date),
    date: point.date, // Include date for tooltip formatting
    value: point.value != null && !isNaN(Number(point.value)) ? Number(point.value) : null,
  }));

  // burnSeries values are already normalized when set, so just map to chart format
  const burnChartData = burnSeries.map((point) => ({
    month: point.label || formatMonthLabel(point.date),
    date: point.date, // Include date for tooltip formatting
    value: point.value != null && !isNaN(Number(point.value)) ? Number(point.value) : null,
  }));

  // Calculate trends (simple: compare last two values)
  const getTrend = (series: ChartDataPoint[]) => {
    if (series.length < 2) return { text: "", positive: true };
    const last = series[series.length - 1]?.value ?? 0;
    const prev = series[series.length - 2]?.value ?? 0;
    if (prev === 0) return { text: "", positive: true };
    const change = ((last - prev) / prev) * 100;
    const positive = change >= 0;
    return {
      text: `${positive ? "+" : ""}${change.toFixed(1)}%`,
      positive,
    };
  };

  const mrrTrend = getTrend(mrrSeries);
  const burnTrend = getTrend(burnSeries);

  if (loading) {
    return (
      <div className="min-h-screen w-full text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400">Loading investor view…</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen w-full text-slate-50 flex items-center justify-center px-4">
        <div className="max-w-xl text-center space-y-3">
          <p className="text-sm text-red-400">
            {error || "Could not load investor view for this link."}
          </p>
          <p className="text-xs text-slate-500">
            Tip: If this says "permission denied", it's an RLS issue and needs to be resolved with a server route.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden text-slate-50">
      <main className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8 space-y-0">
        {/* Slim context bar – not a hero section */}
        <header
          className={cn(
            "rounded-xl border border-slate-800/80 bg-slate-950/50 backdrop-blur-sm",
            "mb-0"
          )}
        >
          <div className="flex flex-col gap-3 px-3 py-3 sm:px-4 sm:py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
              {token === "demo" && (
                <Link
                  href="/"
                  className="shrink-0 inline-flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors mr-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back
                </Link>
              )}
              <h1 className="text-sm sm:text-base font-semibold text-slate-200 truncate">
                {company.name}
              </h1>
              <span
                className={cn(
                  "shrink-0 inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium",
                  isPublished
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                )}
              >
                {isPublished ? "Published" : "Draft"}
              </span>
              <span className="shrink-0 inline-flex items-center rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-300/90">
                Investor view
              </span>
              {isExpired && (
                <span className="shrink-0 rounded-md bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400 border border-red-500/30">
                  Link expired
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 shrink-0">
              <span>Last updated {formatDateLabel(agentUpdated)}</span>
              {expiresAt && (
                <span className="text-slate-600">Expires {formatDateLabel(expiresAt)}</span>
              )}
            </div>
          </div>
          {/* Tabs + read-only indicator */}
          <div className="border-t border-slate-800/80 px-3 py-2 sm:px-4">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                <span
                  className={cn(
                    "whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] sm:text-xs font-medium",
                    "bg-slate-800/80 text-slate-100 border border-slate-700/60"
                  )}
                >
                  KPIs
                </span>
                <Link
                  href={`/investor/${token}/profile`}
                  className={cn(
                    "whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] sm:text-xs transition",
                    "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent"
                  )}
                >
                  Profile
                </Link>
              </div>
              <p className="flex items-center gap-1.5 shrink-0 text-[10px] text-slate-500">
                <svg className="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Read-only investor snapshot – auto-updated
              </p>
            </div>
          </div>
        </header>

        {/* Soft gradient fade + subtle divider into content */}
        <div
          className="h-px w-full bg-gradient-to-r from-transparent via-slate-700/50 to-transparent"
          aria-hidden
        />

        {/* KPI CONTENT – primary focus; visibility from investor_view_config */}
        <div className="space-y-8 pb-12 pt-8">
          {!hasAnyKpiContent && (
            <Card className="rounded-xl border border-slate-700/60 bg-slate-900/70 shadow-sm p-6 text-center">
              <p className="text-sm text-slate-400">No metrics shared for this link.</p>
            </Card>
          )}

          {(config.arrMrr || config.burnRunway) && (
            <Card className="rounded-xl border border-slate-700/60 bg-slate-900/70 shadow-sm overflow-hidden">
              <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-700/50">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-sm font-semibold text-slate-200">
                    Key metrics
                  </h2>
                  {latestSnapshotDate && (
                    <p className="text-[11px] text-slate-500">
                      Snapshot: {new Date(latestSnapshotDate).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric"
                      })}
                    </p>
                  )}
                </div>
              </div>
              <div className="p-4 sm:p-5">
                {/* Row 1: MRR, ARR, Runway (revenue → sustainability) | Row 2: Burn, Churn, Growth (efficiency) */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {config.arrMrr && (
                    <>
                      {/* Primary: MRR */}
                      <Card className="rounded-lg border border-slate-600/60 bg-gradient-to-br from-slate-950/95 via-slate-950/80 to-slate-900/60 p-3 sm:p-4 ring-1 ring-sky-500/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_0_24px_-6px_rgba(56,189,248,0.16)]">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">MRR</p>
                        <p className="mt-0.5 text-xl sm:text-2xl font-bold text-white tabular-nums">
                          {formatMoney(latestMrr)}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                          {mrrTrend.text && (
                            <Badge
                              className={cn(
                                "border-none px-1.5 py-0 text-[10px] font-medium",
                                mrrTrend.positive
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-red-500/20 text-red-300"
                              )}
                            >
                              {mrrTrend.text}
                            </Badge>
                          )}
                          <span className="text-slate-500">vs previous period</span>
                        </div>
                      </Card>
                      {/* Primary: ARR */}
                      <Card className="rounded-lg border border-slate-600/60 bg-gradient-to-br from-slate-950/95 via-slate-950/80 to-slate-900/60 p-3 sm:p-4 ring-1 ring-sky-500/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_0_24px_-6px_rgba(56,189,248,0.16)]">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">ARR</p>
                        <p className="mt-0.5 text-xl sm:text-2xl font-bold text-white tabular-nums">
                          {formatMoney(latestArr)}
                        </p>
                        <p className="mt-1.5 text-[11px] text-slate-500">Run-rate from MRR</p>
                      </Card>
                    </>
                  )}
                  {config.burnRunway && (
                    /* Secondary: Runway (row 1) */
                    <Card className="rounded-lg border border-slate-700/40 bg-gradient-to-br from-slate-950/75 to-slate-900/55 p-3 sm:p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Runway</p>
                      <p className="mt-0.5 text-lg sm:text-xl font-bold text-slate-50 tabular-nums">
                        {formatRunway(latestRunway)}
                      </p>
                      <p className="mt-1.5 text-[11px] text-slate-500">Cash / net burn</p>
                    </Card>
                  )}
                  {config.burnRunway && (
                    <>
                      {/* Secondary: Monthly Burn (row 2) */}
                      <Card className="rounded-lg border border-slate-700/40 bg-gradient-to-br from-slate-950/75 to-slate-900/55 p-3 sm:p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Monthly burn</p>
                        <p className="mt-0.5 text-lg sm:text-xl font-bold text-slate-50 tabular-nums">
                          {formatMoney(latestBurn)}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                          {burnTrend.text && (
                            <Badge
                              className={cn(
                                "border-none px-1.5 py-0 text-[10px] font-medium",
                                burnTrend.positive
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-red-500/20 text-red-300"
                              )}
                            >
                              {burnTrend.text}
                            </Badge>
                          )}
                          <span className="text-slate-500">Headcount & infra</span>
                        </div>
                      </Card>
                    </>
                  )}
                  {config.arrMrr && (
                    <>
                      {/* Secondary: Net Revenue Churn (row 2) */}
                      <Card className="rounded-lg border border-slate-700/40 bg-gradient-to-br from-slate-950/75 to-slate-900/55 p-3 sm:p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Net revenue churn</p>
                        <p className="mt-0.5 text-lg sm:text-xl font-bold text-slate-50 tabular-nums">
                          {formatPercent(latestChurn)}
                        </p>
                        <p className="mt-1.5 text-[11px] text-slate-500">Logo + expansion</p>
                      </Card>
                      {/* Secondary: Customer Growth (row 2) */}
                      <Card className="rounded-lg border border-slate-700/40 bg-gradient-to-br from-slate-950/75 to-slate-900/55 p-3 sm:p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Customer growth</p>
                        <p className="mt-0.5 text-lg sm:text-xl font-bold text-slate-50 tabular-nums">
                          {formatPercent(latestGrowth)}
                        </p>
                        <p className="mt-1.5 text-[11px] text-slate-500">Paying customers</p>
                      </Card>
                    </>
                  )}
                </div>
              </div>
            </Card>
          )}

          {config.growthCharts && (
          <Card className="rounded-xl border border-slate-700/60 border-t-slate-800/40 bg-slate-900/70 shadow-sm overflow-hidden">
            <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-700/50">
              <h2 className="text-sm font-semibold text-slate-200">
                Trends
              </h2>
            </div>
            <div className="p-4 sm:p-5">
              <div className="grid gap-4 lg:grid-cols-2">
              {/* MRR chart */}
              <div className="space-y-2">
                <p className="text-xs text-slate-400">
                  MRR {mrrChartData.length > 0 ? `(${mrrChartData.length} periods)` : ""}
                </p>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart 
                      data={mrrChartData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke="#334155" 
                        opacity={0.2}
                        horizontal={true}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        padding={{ left: 8, right: 8 }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        tickFormatter={(v) => formatCurrencyShort(v)}
                        width={60}
                      />
                      <Tooltip
                        content={<CustomTooltip seriesName="MRR" />}
                        cursor={{ stroke: "#64748b", strokeWidth: 1, strokeDasharray: "3 3" }}
                      />
                      <defs>
                        <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#38bdf8"
                        fill="url(#mrrGradient)"
                        strokeWidth={2}
                        dot={{ fill: "#38bdf8", r: 3, strokeWidth: 2, stroke: "#0f172a" }}
                        activeDot={{ r: 5, strokeWidth: 2, stroke: "#0f172a" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Burn chart */}
              <div className="space-y-2">
                <p className="text-xs text-slate-400">
                  Burn {burnChartData.length > 0 ? `(${burnChartData.length} periods)` : ""}
                </p>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart 
                      data={burnChartData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke="#334155" 
                        opacity={0.2}
                        horizontal={true}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        padding={{ left: 8, right: 8 }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        tickFormatter={(v) => formatCurrencyShort(v)}
                        width={60}
                      />
                      <Tooltip
                        content={<CustomTooltip seriesName="Burn" />}
                        cursor={{ stroke: "#64748b", strokeWidth: 1, strokeDasharray: "3 3" }}
                      />
                      <defs>
                        <linearGradient id="burnGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#f97373"
                        fill="url(#burnGradient)"
                        strokeWidth={2}
                        dot={{ fill: "#f97373", r: 3, strokeWidth: 2, stroke: "#0f172a" }}
                        activeDot={{ r: 5, strokeWidth: 2, stroke: "#0f172a" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              </div>
            </div>
          </Card>
          )}

          {config.aiInsights && (
          <Card className="rounded-xl border border-slate-700/60 border-t-slate-800/40 bg-slate-900/70 shadow-sm overflow-hidden">
            <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-700/50">
              <h2 className="text-sm font-semibold text-slate-200">Computed insights</h2>
              {company.latest_insights_generated_at && (
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Last generated: {new Date(company.latest_insights_generated_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  })}
                  {company.based_on_snapshot_date ? (
                    <> · Snapshot: {new Date(company.based_on_snapshot_date + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric"
                    })}</>
                  ) : null}
                </p>
              )}
            </div>
            <div className="p-4 sm:p-5">
              {insights.length > 0 ? (
                <ul className="space-y-3.5 max-w-3xl">
                  {insights.map((x, i) => (
                    <li key={i} className="text-sm text-slate-300 leading-relaxed pl-5 border-l border-slate-600/40">
                      {x}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-500">No insights yet.</p>
                </div>
              )}
            </div>
          </Card>
          )}
        </div>
        
        {/* Footer – muted */}
        <footer className="pt-6 pb-8 border-t border-slate-800/60">
          <p className="text-[11px] text-slate-600 text-center">
            Updated automatically by Valyxo
          </p>
        </footer>
      </main>
    </div>
  );
}
