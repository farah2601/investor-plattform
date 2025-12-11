"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { supabase } from "../lib/supabaseClient";
import { cn } from "@/lib/utils";

import { Card } from "../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../components/ui/button";

type Company = {
  id: string;
  name: string | null;
  industry: string | null;
  stage: string | null;
  status?: string | null;
  profile_status?: string | null;
  created_at?: string | null;
};

type AccessRequest = {
  id: string;
  investor_name?: string | null;
  status?: string | null;
  company_id: string | null;
  created_at?: string | null;
};

type InvestorLink = {
  id: string;
  access_token: string;
  expires_at: string | null;
  created_at?: string | null;
  company_id: string | null;
};

type DashboardState = "idle" | "loading";

export default function AdminPage() {
  const [state, setState] = useState<DashboardState>("loading");
  const [error, setError] = useState<string | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [links, setLinks] = useState<InvestorLink[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadAdminData = async () => {
      try {
        setState("loading");
        setError(null);

        const nowIso = new Date().toISOString();

        const [
          { data: companiesData, error: companiesError },
          { data: requestsData, error: requestsError },
          { data: linksData, error: linksError },
        ] = await Promise.all([
          supabase
            .from("companies")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("access_requests")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("investor_links")
            .select("*")
            .gte("expires_at", nowIso)
            .order("created_at", { ascending: false }),
        ]);

        if (cancelled) return;

        if (companiesError || requestsError || linksError) {
          console.error("Admin dashboard error:", {
            companiesError,
            requestsError,
            linksError,
          });

          const firstError =
            companiesError?.message ||
            requestsError?.message ||
            linksError?.message ||
            "Kunne ikke laste admin-data fra Supabase.";

          setError(firstError);
          setState("idle");
          return;
        }

        setCompanies((companiesData as Company[]) ?? []);
        setRequests((requestsData as AccessRequest[]) ?? []);
        setLinks((linksData as InvestorLink[]) ?? []);
        setState("idle");
      } catch (err: any) {
        if (cancelled) return;
        console.error("Admin dashboard unexpected error:", err);
        setError(
          typeof err?.message === "string"
            ? err.message
            : "Kunne ikke laste admin-data.",
        );
        setState("idle");
      }
    };

    loadAdminData();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalCompanies = companies.length;
  const pendingRequests = requests.filter((r) => r.status === "pending").length;
  const activeLinks = links.length;

  const monthlyCompanyBuckets = buildCompanyBuckets(companies);

  // Map for å slå opp selskapsnavn lokalt
  const companyNameById = new Map<string, string>(
    companies.map((c) => [c.id, c.name ?? "Unknown company"]),
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-950 text-slate-50">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* TOP HEADER / BREADCRUMB */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200"
                >
                  <span className="text-lg leading-none">⌂</span>
                  <span>Home</span>
                </Link>
                <span className="text-slate-600">/</span>
                <span className="text-slate-300">Admin</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Admin Panel
              </h1>
              <p className="text-sm text-slate-400">
                Manage companies, investor requests, and token-based investor
                links.
              </p>
            </div>
            <Badge className="rounded-full bg-red-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-red-300 border border-red-500/40">
              Admin only
            </Badge>
          </div>

          {/* TOP METRICS BAR */}
          <Card className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-xs text-slate-400">
              All companies connected to MCP Insights.
            </p>
            <div className="flex flex-wrap gap-3 text-xs">
              <MiniStat label="Companies" value={totalCompanies} />
              <MiniStat label="Pending requests" value={pendingRequests} />
              <MiniStat label="Active links" value={activeLinks} />
            </div>
          </Card>

          {error && (
            <Card className="border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs text-red-200">
              {error}
            </Card>
          )}
        </div>

        {/* MAIN GRID: COMPANIES + REQUESTS */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,2fr)]">
          {/* COMPANIES CARD */}
          <Card className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-50">
                  Companies
                </h2>
                <p className="text-xs text-slate-400">
                  All companies that have access to MCP Insights.
                </p>
              </div>
              <span className="text-[11px] text-slate-500">
                {totalCompanies} total
              </span>
            </div>

            {/* Simple “graph” over nye selskaper */}
            <div>
              <p className="text-[11px] text-slate-500">
                New companies (last 6 months)
              </p>
              <SparkBars
                values={monthlyCompanyBuckets.map((b) => b.value)}
                labels={monthlyCompanyBuckets.map((b) => b.label)}
              />
            </div>

            <div className="mt-2 divide-y divide-white/5 rounded-xl border border-white/5 bg-slate-950/40">
              {state === "loading" ? (
                <div className="p-4 text-xs text-slate-400">Loading…</div>
              ) : companies.length === 0 ? (
                <div className="p-4 text-xs text-slate-400">
                  No companies yet.
                </div>
              ) : (
                companies.map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-white/5"
                  >
                    <div className="space-y-0.5">
                      <p className="font-medium text-slate-50">
                        {company.name ?? "Untitled company"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {company.industry || "No industry set"}
                      </p>
                    </div>
                    <StatusPill
                      status={resolveCompanyStatus(
                        company.status,
                        company.profile_status,
                      )}
                    />
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* INVESTOR REQUESTS CARD */}
          <Card className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-50">
                  Latest investor requests
                </h2>
                <p className="text-xs text-slate-400">
                  Last 10 access requests from investors.
                </p>
              </div>
              <span className="text-[11px] text-slate-500">
                {requests.length} shown
              </span>
            </div>

            <div className="mt-1 divide-y divide-white/5 rounded-xl border border-white/5 bg-slate-950/40">
              {state === "loading" ? (
                <div className="p-4 text-xs text-slate-400">Loading…</div>
              ) : requests.length === 0 ? (
                <div className="p-4 text-xs text-slate-400">
                  No recent investor requests.
                </div>
              ) : (
                requests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-white/5"
                  >
                    <div className="space-y-0.5">
                      <p className="font-medium text-slate-50">
                        {req.investor_name ?? "Unknown investor"}
                      </p>
                      <p className="text-xs text-slate-400">
                        →{" "}
                        {companyNameById.get(req.company_id ?? "") ??
                          "Unknown company"}
                      </p>
                    </div>
                    <RequestStatusPill status={req.status ?? null} />
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* ACTIVE INVESTOR LINKS */}
        <Card className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔗</span>
              <div>
                <h2 className="text-sm font-semibold text-slate-50">
                  Active investor links
                </h2>
                <p className="text-xs text-slate-400">
                  Token-based access for investors who want read-only views.
                </p>
              </div>
            </div>
            <span className="text-[11px] text-slate-500">
              {activeLinks} active
            </span>
          </div>

          <div className="mt-1 divide-y divide-white/5 rounded-xl border border-white/5 bg-slate-950/40">
            {state === "loading" ? (
              <div className="p-4 text-xs text-slate-400">Loading…</div>
            ) : links.length === 0 ? (
              <div className="p-4 text-xs text-slate-400">
                No active investor links.
              </div>
            ) : (
              links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-white/5"
                >
                  <div className="space-y-0.5">
                    <div className="inline-flex items-center gap-2">
                      <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-mono text-sky-300">
                        {link.access_token.slice(0, 8)}…
                      </span>
                      <span className="text-xs text-slate-500">
                        {companyNameById.get(link.company_id ?? "") ??
                          "Unknown company"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Expires:{" "}
                      {link.expires_at
                        ? new Date(link.expires_at).toLocaleDateString("no-NO")
                        : "Unknown"}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-500">12 views</span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* DEBUG TOOLS */}
        <Card className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🛠</span>
              <div>
                <h2 className="text-sm font-semibold text-slate-50">
                  Debug tools
                </h2>
                <p className="text-xs text-slate-400">
                  Internal utilities for admins and developers.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {["Clear cache", "Refresh tokens", "Test AI agent", "View logs"].map(
              (label) => (
                <Button
                  key={label}
                  variant="outline"
                  size="sm"
                  onClick={() => alert("Coming soon – admin debug tool.")}
                  className="rounded-full border-white/10 bg-slate-900/60 text-xs text-slate-100 hover:bg-white/10 hover:text-slate-50"
                >
                  {label}
                </Button>
              ),
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}

/* --------------------------- SMALL COMPONENTS --------------------------- */

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[11px] font-semibold text-slate-50 border border-white/10">
        {value}
      </span>
    </div>
  );
}

function StatusPill({ status }: { status: "active" | "pending" | "inactive" }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize";
  if (status === "active") {
    return (
      <span
        className={cn(
          base,
          "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40",
        )}
      >
        active
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span
        className={cn(
          base,
          "bg-amber-500/10 text-amber-300 border border-amber-500/40",
        )}
      >
        pending
      </span>
    );
  }
  return (
    <span
      className={cn(
        base,
        "bg-slate-700/40 text-slate-300 border border-slate-600/60",
      )}
    >
      inactive
    </span>
  );
}

function RequestStatusPill({ status }: { status: string | null }) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize";
  if (status === "approved") {
    return (
      <span
        className={cn(
          base,
          "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40",
        )}
      >
        approved
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span
        className={cn(
          base,
          "bg-red-500/10 text-red-300 border border-red-500/40",
        )}
      >
        rejected
      </span>
    );
  }
  return (
    <span
      className={cn(
        base,
        "bg-amber-500/10 text-amber-300 border border-amber-500/40",
      )}
    >
      pending
    </span>
  );
}

/* ------------------------- CHART / SPARK BARS -------------------------- */

function buildCompanyBuckets(
  companies: Company[],
): { label: string; value: number }[] {
  const now = new Date();
  const buckets: { label: string; value: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = d.toLocaleString("en-US", { month: "short" });

    const count = companies.filter((c) => {
      if (!c.created_at) return false;
      const created = new Date(c.created_at);
      return (
        created.getFullYear() === d.getFullYear() &&
        created.getMonth() === d.getMonth()
      );
    }).length;

    buckets.push({ label: monthLabel, value: count });
  }

  return buckets;
}

function SparkBars({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(1, ...values);

  return (
    <div className="mt-2">
      <div className="flex h-16 items-end gap-1 rounded-lg border border-white/5 bg-slate-950/60 px-2 pb-1">
        {values.map((v, idx) => (
          <div
            key={idx}
            className="flex-1 rounded-full bg-sky-500/70"
            style={{ height: `${(v / max) * 100 || 4}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-500">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------- HELPERS -------------------------------- */

function resolveCompanyStatus(
  status?: string | null,
  profileStatus?: string | null,
): "active" | "pending" | "inactive" {
  if (status === "active") return "active";
  if (status === "inactive") return "inactive";

  if (profileStatus === "Published" || profileStatus === "published") {
    return "active";
  }
  if (profileStatus === "Draft" || profileStatus === "draft") {
    return "pending";
  }

  return "active";
}
