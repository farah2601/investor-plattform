"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { supabase } from "../../../lib/supabaseClient";
import { cn } from "@/lib/utils";

import { Card } from "../../../../components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type TeamMember = {
  name?: string;
  role?: string;
  linkedin_url?: string;
  experience?: string;
};

type CompanyRow = {
  id: string;
  name: string | null;

  industry: string | null;
  stage: string | null;
  growth_status: string | null;

  description: string | null;
  problem: string | null;
  solution: string | null;
  why_now: string | null;
  market: string | null;
  product_details: string | null;

  website: string | null;
  website_url: string | null;

  // du har (minst) linkedin_url i DB
  linkedin_url: string | null;

  // if you also have linkedin_urls (array/jsonb) in some environments, we handle it
  linkedin_urls?: any;

  team: any;

  profile_published: boolean | null;

  // du har created_at (og evt profile_generated_at)
  created_at: string | null;
  profile_generated_at?: string | null;
  profile_generated_by?: string | null;

  last_agent_run_at: string | null;

  // typo i DB (du skrev last_agent_rum_by)
  last_agent_rum_by: string | null;

  // dette har du i DB (screenshot)
  latest_insights: any;
  latest_insights_generated_at: string | null;
  latest_insights_generated_by: string | null;
};

type InvestorLinkMeta = {
  expires_at?: string | null;
  company_id?: string | null;
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

function safeStringArray(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  }
  return [];
}

function safeTeam(v: any): TeamMember[] {
  if (!v) return [];
  if (Array.isArray(v)) return v as TeamMember[];
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? (parsed as TeamMember[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default function InvestorCompanyProfilePage() {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [company, setCompany] = useState<CompanyRow | null>(null);
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
          const demoCompany: CompanyRow = {
            id: "demo-company",
            name: "Acme SaaS",
            industry: "SaaS",
            stage: "Series A",
            growth_status: "High Growth",
            description: "AI-powered workflow automation for enterprise teams.",
            problem: "Enterprise teams waste 15+ hours per week on manual, repetitive tasks that could be automated.",
            solution: "Acme SaaS uses AI to identify and automate workflows, reducing manual work by 80% while maintaining quality.",
            why_now: "Recent advances in LLMs make workflow automation reliable enough for enterprise use. Teams are ready to adopt.",
            market: "Global enterprise workflow automation market is $8.2B and growing 23% YoY. Target addressable market: $2.1B.",
            product_details: "Platform connects to 200+ tools (Slack, Jira, Salesforce, etc.) and uses AI to learn team patterns, then suggests and executes automations. Self-service setup in under 10 minutes.",
            website: "acmesaas.com",
            website_url: "https://acmesaas.com",
            linkedin_url: null,
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
            profile_published: true,
            created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year ago
            profile_generated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            profile_generated_by: "Valyxo Agent",
            last_agent_run_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            last_agent_rum_by: "Valyxo Agent",
            latest_insights: [
              "MRR growth accelerated to 12% MoM in Q4, driven by enterprise expansion deals.",
              "Burn efficiency improved 15% as the team scaled revenue faster than headcount.",
              "Runway extended to 18 months following Series A close. Cash position strong.",
            ],
            latest_insights_generated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            latest_insights_generated_by: "Valyxo Agent",
          };

          setCompany(demoCompany);
          setLinkMeta({
            expires_at: null,
            company_id: "demo-company",
          });
          setLoading(false);
          return;
        }

        // 1) investor_links -> company_id
        const { data: linkRow, error: linkError } = await supabase
          .from("investor_links")
          .select("company_id, expires_at")
          .eq("access_token", token)
          .maybeSingle();

        if (cancelled) return;

        if (linkError) {
          console.log("investor_links error:", linkError);
          setError(`Invalid or expired investor link: ${linkError.message}`);
          setLoading(false);
          return;
        }

        if (!linkRow) {
          setError("Investor link not found.");
          setLoading(false);
          return;
        }

        const expiresAt = linkRow.expires_at ?? null;
        const isExpired = !!expiresAt && new Date(expiresAt).getTime() < Date.now();

        setLinkMeta({
          expires_at: expiresAt,
          company_id: linkRow.company_id ?? null,
        });

        if (isExpired) {
          setError("Investor link expired.");
          setLoading(false);
          return;
        }

        const companyId = linkRow.company_id as string | null;
        if (!companyId) {
          setError("No company attached to this investor link.");
          setLoading(false);
          return;
        }

        // 2) companies -> kun felter som finnes (basert på det du har vist)
        const { data: companyRow, error: companyError } = await supabase
          .from("companies")
          .select(
            [
              "id",
              "name",
              "industry",
              "stage",
              "growth_status",
              "description",
              "problem",
              "solution",
              "why_now",
              "market",
              "product_details",
              "website",
              "website_url",
              "linkedin_urls",
              "team",
              "profile_published",
              "created_at",
              "profile_generated_at",
              "profile_generated_by",
              "last_agent_run_at",
              "last_agent_run_by",
              "latest_insights",
              "latest_insights_generated_at",
              "latest_insights_generated_by",
            ].join(",")
          )
          .eq("id", companyId)
          .maybeSingle();

        if (cancelled) return;

        if (companyError) {
          console.log("companies error:", companyError);
          setError(`Could not load company: ${companyError.message}`);
          setLoading(false);
          return;
        }

        if (!companyRow) {
          setError("Company not found for this investor link.");
          setLoading(false);
          return;
        }

        setCompany(companyRow as unknown as CompanyRow);
        setLoading(false);
      } catch (err: any) {
        if (cancelled) return;
        console.log("Unexpected investor profile error:", err);
        setError(typeof err?.message === "string" ? err.message : "Unexpected error loading investor profile.");
        setLoading(false);
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400">Loading profile…</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <p className="max-w-md text-center text-sm text-red-400">
          {error || "Could not load profile for this link."}
        </p>
      </div>
    );
  }

  const initial = (company.name ?? "C").charAt(0).toUpperCase();

  const expiresAt = linkMeta?.expires_at ?? null;
  const isExpired = !!expiresAt && new Date(expiresAt).getTime() < Date.now();

  const agentUpdated =
    company.last_agent_run_at ||
    company.latest_insights_generated_at ||
    company.profile_generated_at ||
    company.created_at ||
    null;

  const insights = safeStringArray(company.latest_insights);
  const team = safeTeam(company.team);

  const websiteUrl = company.website_url || company.website || null;

  // linkedin kan være både singular + array — vi viser første som finnes
  const linkedin =
  safeStringArray(company.linkedin_urls).at(0) ?? null;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-950 text-slate-50">
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* TOP */}
        <div className="rounded-3xl bg-gradient-to-br from-sky-500/15 via-slate-900/80 to-slate-950 p-[1px]">
          <Card className="rounded-3xl bg-slate-950/80 border border-white/10">
            <div className="flex flex-col gap-6 p-6 sm:p-8">
              {/* Header row with back button for demo */}
              {token === "demo" && (
                <div className="flex items-center justify-between">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                      />
                    </svg>
                    Back to home
                  </Link>
                  <span className="text-[11px] text-slate-500">
                    Demo view
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[auto,minmax(0,1fr),minmax(0,1.2fr)] lg:items-start">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 rounded-2xl bg-slate-900">
                    <AvatarFallback className="text-lg font-semibold">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-semibold text-white">
                      {company.name ?? "Untitled company"}
                    </h1>

                    {company.industry && (
                      <Badge
                        variant="outline"
                        className="border-slate-600 bg-slate-900/80 text-[10px] uppercase tracking-wide text-slate-100"
                      >
                        {company.industry}
                      </Badge>
                    )}

                    {company.growth_status && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] uppercase tracking-wide text-slate-950"
                      >
                        {company.growth_status}
                      </Badge>
                    )}
                  </div>

                  {company.description && (
                    <p className="max-w-xl text-sm text-slate-300">
                      {company.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3">
                    {websiteUrl && (
                      <a
                        href={websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-sky-400 hover:underline break-all"
                      >
                        {websiteUrl.replace(/^https?:\/\//, "")}
                      </a>
                    )}

                    {linkedin && (
                      <a
                        href={linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-sky-400 hover:underline break-all"
                      >
                        LinkedIn
                      </a>
                    )}
                  </div>
                </div>

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
                        company.profile_published ? "text-emerald-400" : "text-amber-300"
                      )}
                    >
                      {company.profile_published ? "Published by founders" : "Draft – contents may change"}
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
                </div>
              </div>

              {/* Tabs */}
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar snap-x">
                    <Link
                      href={`/investor/${token}`}
                      className={cn(
                        "whitespace-nowrap rounded-full px-3 py-1.5 text-xs sm:text-sm transition snap-start",
                        "bg-slate-900/70 text-slate-300 hover:bg-slate-800 border border-white/10"
                      )}
                    >
                      KPIs
                    </Link>

                    <span
                      className={cn(
                        "whitespace-nowrap rounded-full px-3 py-1.5 text-xs sm:text-sm transition snap-start",
                        "bg-white text-slate-950 font-medium shadow-sm"
                      )}
                    >
                      Profile
                    </span>
                  </div>

                  <span className="hidden sm:inline-flex items-center rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-[10px] uppercase tracking-wide text-slate-400">
                    Powered by Valyxo Agent
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* PROFILE BODY */}
        <div className="space-y-6 pb-10">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 space-y-2">
              <h2 className="text-sm font-semibold text-white">Problem</h2>
              <p className="text-sm text-slate-300">{company.problem || "Not provided yet."}</p>
            </Card>

            <Card className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 space-y-2">
              <h2 className="text-sm font-semibold text-white">Solution</h2>
              <p className="text-sm text-slate-300">{company.solution || "Not provided yet."}</p>
            </Card>

            <Card className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 space-y-2">
              <h2 className="text-sm font-semibold text-white">Why now</h2>
              <p className="text-sm text-slate-300">{company.why_now || "Not provided yet."}</p>
            </Card>
          </div>

          <Card className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 space-y-3">
            <h2 className="text-base font-semibold text-white">Product</h2>
            <p className="text-sm text-slate-300">{company.product_details || "Not provided yet."}</p>
          </Card>

          <Card className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 space-y-3">
            <h2 className="text-base font-semibold text-white">Market</h2>
            <p className="text-sm text-slate-300">{company.market || "Not provided yet."}</p>
          </Card>

          <Card className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 space-y-4">
            <h2 className="text-base font-semibold text-white">Team</h2>

            {team.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {team.map((m, idx) => (
                  <Card
                    key={idx}
                    className="rounded-xl border border-white/10 bg-slate-950/60 p-4 space-y-2"
                  >
                    <p className="text-sm font-semibold text-white">{m.name || "Unknown"}</p>
                    <p className="text-xs text-slate-400">{m.role || "—"}</p>

                    {m.experience && <p className="text-xs text-slate-300">{m.experience}</p>}

                    {m.linkedin_url && (
                      <a
                        href={m.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-sky-400 hover:underline break-all"
                      >
                        LinkedIn
                      </a>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">Team not provided yet.</p>
            )}
          </Card>

          {/* AI INSIGHTS */}
          <Card className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-white sm:text-lg">AI Insights</h2>
              <p className="text-xs text-slate-500">
                Powered by <span className="font-medium text-slate-300">Valyxo Agent</span>
              </p>
            </div>

            <p className="text-xs text-slate-500">
              {company.latest_insights_generated_at ? (
                <>AI Insights generated automatically · {formatDateLabel(company.latest_insights_generated_at)}</>
              ) : (
                <>Not generated yet · Powered by Valyxo Agent</>
              )}
            </p>

            {insights.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {insights.map((x, i) => (
                  <li key={i} className="text-sm text-slate-200">• {x}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400 italic">
                Insights are automatically updated when the agent writes `latest_insights` to the database.
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