// app/investor/[token]/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { supabase } from "../../lib/supabaseClient";
import { cn } from "@/lib/utils";

import { Card } from "../../../components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";


import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TeamMember = {
  name: string;
  role: string;
  linkedin_url?: string;
  experience?: string;
};

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
};

type InvestorLinkMeta = {
  expires_at?: string | null;
  company_id?: string | null;
};

const kpiCards = [
  {
    id: "mrr",
    label: "MRR",
    value: "€82,400",
    trend: "+8.2% last 30d",
    trendPositive: true,
    helper: "vs previous 30 days",
  },
  {
    id: "arr",
    label: "ARR",
    value: "€988,800",
    trend: "+26.4% YoY",
    trendPositive: true,
    helper: "run-rate based on current MRR",
  },
  {
    id: "burn",
    label: "Monthly burn",
    value: "€-74,000",
    trend: "-6.1% last 90d",
    trendPositive: true,
    helper: "including headcount & infra",
  },
  {
    id: "runway",
    label: "Runway",
    value: "14 months",
    trend: "at current burn",
    trendPositive: true,
    helper: "cash / net burn",
  },
  {
    id: "churn",
    label: "Net revenue churn",
    value: "2.7%",
    trend: "-0.4pp last 30d",
    trendPositive: true,
    helper: "logo + expansion combined",
  },
  {
    id: "growth",
    label: "Customer growth",
    value: "+6.3% MoM",
    trend: "last 3 months",
    trendPositive: true,
    helper: "paying customers",
  },
];

const mrrChartData = [
  { month: "Jan", value: 42000 },
  { month: "Feb", value: 46000 },
  { month: "Mar", value: 51000 },
  { month: "Apr", value: 56000 },
  { month: "May", value: 62000 },
  { month: "Jun", value: 69000 },
  { month: "Jul", value: 75000 },
  { month: "Aug", value: 80400 },
  { month: "Sep", value: 82400 },
];

const burnChartData = [
  { month: "Jan", value: -82000 },
  { month: "Feb", value: -81000 },
  { month: "Mar", value: -79000 },
  { month: "Apr", value: -78000 },
  { month: "May", value: -76000 },
  { month: "Jun", value: -74000 },
  { month: "Jul", value: -73000 },
  { month: "Aug", value: -72000 },
  { month: "Sep", value: -71000 },
];

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
          };

          setCompany(demoCompany);
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

        setCompany(companyRow as unknown as CompanyProfile);
        setLoading(false);
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

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400">Loading investor view…</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-50 flex items-center justify-center px-4">
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

  const initial = company.name?.charAt(0)?.toUpperCase() || "C";

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-950 text-slate-50">
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* TOP AREA WITH GRADIENT BACKGROUND */}
        <div className="rounded-3xl bg-gradient-to-br from-sky-500/15 via-slate-900/80 to-slate-950 p-[1px]">
          <Card className="rounded-3xl bg-slate-950/80 border border-white/10">
            <div className="flex flex-col gap-6 p-6 sm:p-8">
              {/* Header row (Valyxo logo like Lovable layout) */}
              <div className="flex items-center justify-between">
      
                <span className="text-[11px] text-slate-500">
                  Secure token access
                </span>
              </div>

              {/* 3-column layout */}
              <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[auto,minmax(0,1fr),minmax(0,1.2fr)] lg:items-start">
                {/* Company avatar */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 rounded-2xl bg-slate-900">
                    <AvatarFallback className="text-lg font-semibold">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Name + tags */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-semibold text-white">
                      {company.name}
                    </h1>

                    {company.industry && (
                      <Badge
                        variant="outline"
                        className="border-slate-600 bg-slate-900/80 text-[10px] uppercase tracking-wide text-slate-100"
                      >
                        {company.industry}
                      </Badge>
                    )}

                    {company.stage && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] uppercase tracking-wide text-slate-950"
                      >
                        {company.stage}
                      </Badge>
                    )}
                  </div>

                  {company.description && (
                    <p className="max-w-xl text-sm text-slate-300">
                      {company.description}
                    </p>
                  )}

                  {company.website_url && (
                    <a
                      href={company.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-sky-400 hover:underline"
                    >
                      {company.website_url.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </div>

                {/* Metadata */}
                <div className="space-y-2 text-xs text-slate-300 lg:text-right">
                  <div className="flex items-center justify-between lg:justify-end gap-2">
                    <span className="inline-flex items-center rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-sky-300">
                      Investor view — read only
                    </span>

                    {isExpired && (
                      <span className="rounded-full bg-red-500/10 px-3 py-1 text-[10px] font-medium text-red-300 border border-red-500/40">
                        Link expired
                      </span>
                    )}
                  </div>

                  <p>
                    Status:{" "}
                    <span
                      className={cn(
                        "font-medium",
                        isPublished ? "text-emerald-400" : "text-amber-300"
                      )}
                    >
                      {isPublished
                        ? "Published by founders"
                        : "Draft – contents may change"}
                    </span>
                  </p>

                  <p>
                    Last updated · Powered by Valyxo Agent ·{" "}
                    <span className="text-slate-100">
                      {formatDateLabel(agentUpdated)}
                    </span>
                  </p>

                  {expiresAt && (
                    <p>
                      Token expiry:{" "}
                      <span className="text-slate-100">
                        {formatDateLabel(expiresAt)}
                      </span>
                    </p>
                  )}

                  <p className="text-slate-500">
                    Secure token access. Do not forward or share publicly.
                  </p>
                </div>
              </div>

              {/* Tabs (KPI | Profile) */}
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar snap-x">
                    <span
                      className={cn(
                        "whitespace-nowrap rounded-full px-3 py-1.5 text-xs sm:text-sm transition snap-start",
                        "bg-white text-slate-950 font-medium shadow-sm"
                      )}
                    >
                      KPIs
                    </span>

                    <Link
                      href={`/investor/${token}/profile`}
                      className={cn(
                        "whitespace-nowrap rounded-full px-3 py-1.5 text-xs sm:text-sm transition snap-start",
                        "bg-slate-900/70 text-slate-300 hover:bg-slate-800 border border-white/10"
                      )}
                    >
                      Profile
                    </Link>
                  </div>

                  <span className="hidden sm:inline-flex items-center rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-[10px] uppercase tracking-wide text-slate-400">
                    Powered by Valyxo Agent
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* KPI CONTENT */}
        <div className="space-y-8 pb-10">
          {/* Key metrics grid */}
          <Card className="mt-2 rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-white sm:text-lg">
                  Key metrics
                </h2>
                <p className="text-xs text-slate-400">
                  Accounting-grade KPIs maintained by the Valyxo Agent (MVP placeholder).
                </p>
              </div>
              <p className="text-[11px] text-slate-500">
                Numbers are static demo values in the current version.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {kpiCards.map((kpi) => (
                <Card
                  key={kpi.id}
                  className="rounded-xl border border-white/10 bg-slate-950/60 p-4"
                >
                  <p className="text-xs text-slate-400">{kpi.label}</p>
                  <p className="mt-1 text-xl font-semibold text-white">
                    {kpi.value}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <Badge
                      className={cn(
                        "border-none px-2 py-0.5",
                        kpi.trendPositive
                          ? "bg-emerald-900/60 text-emerald-300"
                          : "bg-red-900/60 text-red-300"
                      )}
                    >
                      {kpi.trend}
                    </Badge>
                    <span className="text-slate-500">{kpi.helper}</span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Valyxo Agent will keep this metric continuously updated from accounting/CRM systems.
                  </p>
                </Card>
              ))}
            </div>
          </Card>

          {/* Trends charts */}
          <Card className="space-y-6 rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8">
            <h2 className="text-base font-semibold text-white sm:text-lg">
              Trends
            </h2>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* MRR chart */}
              <div className="space-y-2">
                <p className="text-xs text-slate-400">MRR last 9 months</p>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mrrChartData}>
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                        tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#020617",
                          borderRadius: 8,
                          border: "1px solid rgba(148,163,184,0.4)",
                        }}
                        labelStyle={{ fontSize: 12, color: "#e2e8f0" }}
                        itemStyle={{ fontSize: 12, color: "#e2e8f0" }}
                      />
                      <defs>
                        <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#38bdf8"
                        fill="url(#mrrGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Burn chart */}
              <div className="space-y-2">
                <p className="text-xs text-slate-400">Burn last 9 months</p>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={burnChartData}>
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                        tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#020617",
                          borderRadius: 8,
                          border: "1px solid rgba(148,163,184,0.4)",
                        }}
                        labelStyle={{ fontSize: 12, color: "#e2e8f0" }}
                        itemStyle={{ fontSize: 12, color: "#e2e8f0" }}
                      />
                      <defs>
                        <linearGradient id="burnGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#f97373"
                        fill="url(#burnGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </Card>

          {/* LIVE AI INSIGHTS (from DB) */}
          <Card className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-white sm:text-lg">
                AI Insights
              </h2>
              <p className="text-xs text-slate-500">
                Powered by{" "}
                <span className="font-medium text-slate-300">Valyxo Agent</span>
              </p>
            </div>

            <p className="text-xs text-slate-500">
              {company.latest_insights_generated_at ? (
                <>
                  AI Insights generated automatically ·{" "}
                  {new Date(company.latest_insights_generated_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </>
              ) : (
                <>Not generated yet · Powered by Valyxo Agent</>
              )}
            </p>

            {insights.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {insights.map((x, i) => (
                  <li key={i} className="text-sm text-slate-200">
                    • {x}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400 italic">
                Insights are automatically updated by Valyxo Agent when new KPI snapshots are saved.
              </p>
            )}
          </Card>
        </div>
        
        {/* Footer */}
        <footer className="pt-8 pb-10 border-t border-slate-800">
          <p className="text-xs text-slate-500 text-center">
            Updated automatically by Valyxo Agent
          </p>
        </footer>
      </main>
    </div>
  );
}
