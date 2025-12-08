"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
  profile_published: boolean | null;
  updated_at?: string | null;
};

const tabs = ["KPIs", "Profile"] as const;
type TabKey = (typeof tabs)[number];

// Placeholder KPI-data – kan kobles til ekte Supabase-metrics senere
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
  });
}

export default function InvestorCompanyPage() {
  // Henter token fra URL: /investor/[token]
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("KPIs");

  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("🔑 Investor token from URL:", token);

        // 1) Slå opp investor_links-rad på access_token
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

        setExpiresAt(linkRow.expires_at ?? null);

        // 2) Slå opp access_requests for å få company_id
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

        // 3) Hent selskapet
        const { data: companyRow, error: companyError } = await supabase
  .from("companies")
  .select("*") // samme stil som resten av appen din
  .eq("id", companyId)
  .maybeSingle();

console.log("🏢 companies result:", {
  companyId,
  companyRow,
  companyError: companyError ? JSON.stringify(companyError, null, 2) : null,
});


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
      <div className="min-h-screen w-full bg-slate-950 text-slate-50 flex items-center justify-center">
        <p className="max-w-md text-center text-sm text-red-400">
          {error || "Could not load investor view for this link."}
        </p>
      </div>
    );
  }

  const initial = company.name?.charAt(0)?.toUpperCase() || "C";

  const lastUpdated = company.updated_at || null;
  const aiUpdated = company.updated_at || null;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-950 text-slate-50">
      <main className="mx-auto w-full max-w-5xl px-4 py-8 space-y-6 sm:px-6 lg:px-8">
        {/* HEADER */}
        <Card className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: company summary */}
          <div className="flex items-start gap-4">
            <Avatar className="h-10 w-10 rounded-xl">
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold text-white sm:text-xl">
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
                <p className="max-w-xl text-sm text-slate-400">
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
          </div>

          {/* Right: meta */}
          <div className="space-y-1 text-right text-xs text-slate-400">
            <p className="text-sky-300 font-medium">Investor view (read-only)</p>
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
              Last updated:{" "}
              <span className="text-slate-100">
                {formatDateLabel(lastUpdated)}
              </span>
            </p>
            <p>
              AI commentary refreshed:{" "}
              <span className="text-slate-100">
                {formatDateLabel(aiUpdated)}
              </span>
            </p>
            {expiresAt && (
              <p>
                Link expires:{" "}
                <span className="text-slate-100">
                  {formatDateLabel(expiresAt)}
                </span>
              </p>
            )}
            <p className="text-slate-500">
              Secure token access – do not share publicly.
            </p>
          </div>
        </Card>

        {/* TABS */}
        <div className="border-b border-white/10">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-xs sm:text-sm transition",
                  activeTab === tab
                    ? "bg-white text-slate-950"
                    : "bg-slate-900/60 text-slate-300 hover:bg-slate-800"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* KPI TAB */}
        {activeTab === "KPIs" && (
          <>
            {/* Key metrics grid */}
            <Card className="mt-4 rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-semibold text-white sm:text-lg">
                  Key metrics
                </h2>
                <p className="text-xs text-slate-400">
                  Accounting-grade KPIs maintained by the MCP Agent.
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
                  </Card>
                ))}
              </div>
            </Card>

            {/* Trends charts */}
            <Card className="mt-6 space-y-6 rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8">
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
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#38bdf8"
                          fill="url(#mrrGradient)"
                          strokeWidth={2}
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
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#f97373"
                          fill="url(#burnGradient)"
                          strokeWidth={2}
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
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </Card>

            {/* AI commentary */}
            <Card className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/10 text-sky-300">
                  <span className="text-sm">✦</span>
                </div>
                <h2 className="text-base font-semibold text-white sm:text-lg">
                  AI commentary
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                Generated by the MCP agent based on the latest KPIs.
              </p>
              <ul className="space-y-1.5 text-sm text-slate-200">
                <li>
                  • MRR grew 8% last month, driven mainly by expansion from
                  existing customers.
                </li>
                <li>
                  • Runway is stable at ~14 months after reduced burn and
                  improved gross margin.
                </li>
                <li>
                  • Net revenue churn is 2.7%, slightly above target but
                  trending down over the last quarter.
                </li>
              </ul>
            </Card>
          </>
        )}

        {/* PROFILE TAB */}
        {activeTab === "Profile" && (
          <>
            {/* Overview & narrative */}
            <Card className="mt-4 space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8">
              <div>
                <h2 className="text-base font-semibold text-white sm:text-lg">
                  Overview
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  High-level summary of the company, market and timing.
                </p>
              </div>

              <div className="grid gap-4 text-sm text-slate-200 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs uppercase text-slate-500">Industry</p>
                  <p>{company.industry || "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Stage</p>
                  <p>{company.stage || "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Website</p>
                  {company.website_url ? (
                    <a
                      href={company.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-400 hover:underline"
                    >
                      {company.website_url.replace(/^https?:\/\//, "")}
                    </a>
                  ) : (
                    <p>—</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="mb-1 text-xs uppercase text-slate-500">
                    Problem
                  </p>
                  <p className="whitespace-pre-line text-sm text-slate-200">
                    {company.problem || "Not provided."}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs uppercase text-slate-500">
                    Solution
                  </p>
                  <p className="whitespace-pre-line text-sm text-slate-200">
                    {company.solution || "Not provided."}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs uppercase text-slate-500">
                    Why now
                  </p>
                  <p className="whitespace-pre-line text-sm text-slate-200">
                    {company.why_now || "Not provided."}
                  </p>
                </div>
              </div>
            </Card>

            {/* Product */}
            <Card className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8">
              <div>
                <h2 className="text-base font-semibold text-white sm:text-lg">
                  Product
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  What they&apos;re building and how it works.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase text-slate-500">
                  Product overview
                </p>
                <p className="whitespace-pre-line text-sm text-slate-200">
                  {company.product_details || "Not provided."}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase text-slate-500">
                  Screenshots
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-950/40 text-xs text-slate-500"
                    >
                      Screenshot placeholder {i}
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Market & traction */}
            <Card className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8">
              <div>
                <h2 className="text-base font-semibold text-white sm:text-lg">
                  Market & traction
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  High-level market view and traction highlights.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase text-slate-500">
                  Market overview
                </p>
                <p className="whitespace-pre-line text-sm text-slate-200">
                  {company.market || "Not provided."}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase text-slate-500">
                  TAM / SAM / SOM (placeholder)
                </p>
                <div className="grid gap-3 text-sm text-slate-200 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-3">
                    <p className="text-xs text-slate-500">TAM</p>
                    <p>—</p>
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-3">
                    <p className="text-xs text-slate-500">SAM</p>
                    <p>—</p>
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-3">
                    <p className="text-xs text-slate-500">SOM</p>
                    <p>—</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Team */}
            <Card className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8">
              <div>
                <h2 className="text-base font-semibold text-white sm:text-lg">
                  Team
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Key people behind the company.
                </p>
              </div>

              {company.team && company.team.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {company.team.map((member, idx) => {
                    const initialMember =
                      member.name?.charAt(0)?.toUpperCase() || "T";
                    return (
                      <div
                        key={`${member.name}-${idx}`}
                        className="flex gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                      >
                        <Avatar className="h-10 w-10 rounded-xl">
                          <AvatarFallback>{initialMember}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-100">
                              {member.name || "Unnamed"}
                            </p>
                            {member.linkedin_url && (
                              <a
                                href={member.linkedin_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-sky-400 hover:underline"
                              >
                                LinkedIn
                              </a>
                            )}
                          </div>
                          {member.role && (
                            <p className="text-xs text-slate-400">
                              {member.role}
                            </p>
                          )}
                          {member.experience && (
                            <p className="text-xs text-slate-400 whitespace-pre-line">
                              {member.experience}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  Team information has not been added yet.
                </p>
              )}
            </Card>

            {/* Links & documents */}
            <Card className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 mb-4">
              <div>
                <h2 className="text-base font-semibold text-white sm:text-lg">
                  Links & documents
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  External resources investors may want to explore.
                </p>
              </div>

              <div className="space-y-3 text-sm text-slate-200">
                <div>
                  <p className="text-xs uppercase text-slate-500">Website</p>
                  {company.website_url ? (
                    <a
                      href={company.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-400 hover:underline"
                    >
                      {company.website_url.replace(/^https?:\/\//, "")}
                    </a>
                  ) : (
                    <p>—</p>
                  )}
                </div>

                <div>
                  <p className="text-xs uppercase text-slate-500">LinkedIn</p>
                  {company.linkedin_urls && company.linkedin_urls.length > 0 ? (
                    <ul className="mt-1 space-y-1">
                      {company.linkedin_urls.map((url, idx) => (
                        <li key={idx}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-400 hover:underline break-all"
                          >
                            {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>—</p>
                  )}
                </div>

                <div>
                  <p className="text-xs uppercase text-slate-500">
                    Pitchdeck
                  </p>
                  <p className="text-xs text-slate-500">
                    Coming soon – founders can attach a deck and data room
                    directly in MCP.
                  </p>
                </div>
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
