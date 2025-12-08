"use client";

import { useEffect, useState } from "react";
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
import { AiInsightsCard } from "../../../components/investor/AiInsightsCard";

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
  profile_published: boolean | null;
  updated_at?: string | null;
};

type InvestorLinkMeta = {
  expires_at?: string | null;
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
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InvestorCompanyPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [linkMeta, setLinkMeta] = useState<InvestorLinkMeta | null>(null);

  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("🔑 Investor token from URL:", token);

        // 1) investor_links → finn raden for dette tokenet
        const { data: linkRow, error: linkError } = await supabase
          .from("investor_links")
          .select("id, access_token, request_id, expires_at")
          .eq("access_token", token)
          .maybeSingle();

        console.log("📄 investor_links result:", { linkRow, linkError });

        if (linkError) {
          console.error("Supabase investor_links error:", linkError);
          setError("Invalid or expired investor link.");
          setLoading(false);
          return;
        }

        if (!linkRow) {
          setError("Investor link not found.");
          setLoading(false);
          return;
        }

        setLinkMeta({
          expires_at: linkRow.expires_at ?? null,
        });

        // 2) access_requests → finn company_id
        const { data: requestRow, error: requestError } = await supabase
          .from("access_requests")
          .select("company_id")
          .eq("id", linkRow.request_id)
          .maybeSingle();

        console.log("📄 access_requests result:", {
          requestRow,
          requestError,
        });

        if (requestError) {
          console.error("Supabase access_requests error:", requestError);
          setError("Could not resolve company for this investor link.");
          setLoading(false);
          return;
        }

        if (!requestRow || !requestRow.company_id) {
          setError("No company attached to this investor link.");
          setLoading(false);
          return;
        }

        const companyId = requestRow.company_id as string;

        // 3) companies → hent selskap
        const { data: companyRow, error: companyError } = await supabase
          .from("companies")
          .select("*")
          .eq("id", companyId)
          .maybeSingle();

        console.log("🏢 companies result:", { companyRow, companyError });

        if (companyError) {
          console.error("Supabase companies error:", companyError);
          setError("Could not load company for this investor link.");
          setLoading(false);
          return;
        }

        if (!companyRow) {
          setError("Company not found for this investor link.");
          setLoading(false);
          return;
        }

        setCompany(companyRow as CompanyProfile);
        setLoading(false);
      } catch (err: any) {
        console.error("Unexpected investor view error:", err);
        setError(
          typeof err?.message === "string"
            ? err.message
            : "Unexpected error loading investor view."
        );
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

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
        <p className="max-w-md text-center text-sm text-red-400">
          {error || "Could not load investor view for this link."}
        </p>
      </div>
    );
  }

  const initial = company.name?.charAt(0)?.toUpperCase() || "C";
  const lastUpdated = company.updated_at || null;
  const aiUpdated = company.updated_at || null;
  const expiresAt = linkMeta?.expires_at ?? null;
  const isExpired =
    expiresAt && new Date(expiresAt).getTime() < Date.now();

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-950 text-slate-50">
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* TOP AREA WITH GRADIENT BACKGROUND */}
        <div className="rounded-3xl bg-gradient-to-br from-sky-500/15 via-slate-900/80 to-slate-950 p-[1px]">
          <Card className="rounded-3xl bg-slate-950/80 border border-white/10">
            <div className="flex flex-col gap-6 p-6 sm:p-8">
              {/* 3-column layout */}
              <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[auto,minmax(0,1fr),minmax(0,1.2fr)] lg:items-start">
                {/* Logo */}
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
                        company.profile_published
                          ? "text-emerald-400"
                          : "text-amber-300"
                      )}
                    >
                      {company.profile_published
                        ? "Published by founders"
                        : "Draft – contents may change"}
                    </span>
                  </p>

                  <p>
                    Last KPI update:{" "}
                    <span className="text-slate-100">
                      {formatDateLabel(lastUpdated)}
                    </span>
                  </p>

                  <p>
                    AI refreshed:{" "}
                    <span className="text-slate-100">
                      {formatDateLabel(aiUpdated)}
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

              {/* Tabs (KPI | Profile) – route-basert */}
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar snap-x">
                    {/* KPIs – aktiv */}
                    <span
                      className={cn(
                        "whitespace-nowrap rounded-full px-3 py-1.5 text-xs sm:text-sm transition snap-start",
                        "bg-white text-slate-950 font-medium shadow-sm"
                      )}
                    >
                      KPIs
                    </span>

                    {/* Profile – lenke til /profile */}
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
                    MCP Agent package
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
                  Accounting-grade KPIs maintained by the MCP Agent (MVP placeholder).
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
                    MCP Agent will keep this metric continuously updated from accounting/CRM systems.
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
                        <linearGradient
                          id="mrrGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#38bdf8"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor="#38bdf8"
                            stopOpacity={0}
                          />
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
                <p className="text-[11px] text-slate-500">
                  MRR is shown as a simple demo trend. In production, MCP Agent will pull
                  exact monthly figures from integrated systems.
                </p>
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
                        <linearGradient
                          id="burnGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#ef4444"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor="#ef4444"
                            stopOpacity={0}
                          />
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
                <p className="text-[11px] text-slate-500">
                  Burn shows an illustrative trend only. Runway is derived from
                  cash / net burn in the full MCP integration.
                </p>
              </div>
            </div>
          </Card>

          {/* AI Insights (ny komponent) */}
          <AiInsightsCard companyId={company.id} />
        </div>
      </main>
    </div>
  );
}
