"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import { cn } from "@/lib/utils";

import { Card } from "../../../../components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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

type InvestorLinkRow = {
  id: string;
  access_token: string;
  request_id: string;
  expires_at: string | null;
};

type AccessRequestRow = {
  company_id: string;
};

function formatDateLabel(dateString?: string | null): string {
  if (!dateString) return "Unknown";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleString("no-NO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InvestorProfilePage() {
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

        console.log("🔑 Investor token from URL (profile):", token);

        // 1) investor_links → finn raden for dette tokenet
        const { data: linkRow, error: linkError } = await supabase
          .from("investor_links")
          .select("id, access_token, request_id, expires_at")
          .eq("access_token", token)
          .maybeSingle<InvestorLinkRow>();

        console.log("📄 investor_links result (profile):", {
          linkRow,
          linkError,
        });

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
          .maybeSingle<AccessRequestRow>();

        console.log("📄 access_requests result (profile):", {
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

        const companyId = requestRow.company_id;

        // 3) companies → hent selskap
        const { data: companyRow, error: companyError } = await supabase
          .from("companies")
          .select("*")
          .eq("id", companyId)
          .maybeSingle<CompanyProfile>();

        console.log("🏢 companies result (profile):", {
          companyRow,
          companyError,
        });

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

        setCompany(companyRow);
        setLoading(false);
      } catch (err: any) {
        console.error("Unexpected investor profile error:", err);
        setError(
          typeof err?.message === "string"
            ? err.message
            : "Unexpected error loading investor profile."
        );
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400">Loading investor profile…</p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-50 flex items-center justify-center px-4">
        <p className="max-w-md text-center text-sm text-red-400">
          {error || "Could not load investor profile for this link."}
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

  const websiteLabel = company.website_url || "Not provided.";
  const linkedins = company.linkedin_urls ?? [];

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
                      href={
                        company.website_url.startsWith("http")
                          ? company.website_url
                          : `https://${company.website_url}`
                      }
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

              {/* Tabs – Profile aktiv, KPIs er link */}
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar snap-x">
                    {/* KPIs – link tilbake */}
                    <Link
                      href={`/investor/${token}`}
                      className={cn(
                        "whitespace-nowrap rounded-full px-3 py-1.5 text-xs sm:text-sm transition snap-start border",
                        "bg-slate-900/70 text-slate-300 hover:bg-slate-800 border-white/10"
                      )}
                    >
                      KPIs
                    </Link>

                    {/* Profile – aktiv */}
                    <span
                      className={cn(
                        "whitespace-nowrap rounded-full px-3 py-1.5 text-xs sm:text-sm transition snap-start",
                        "bg-white text-slate-950 font-medium shadow-sm border border-white"
                      )}
                    >
                      Profile
                    </span>
                  </div>

                  <span className="hidden sm:inline-flex items-center rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-[10px] uppercase tracking-wide text-slate-400">
                    MCP Agent package
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* PROFILE CONTENT */}
        <ProfileView
          company={company}
          websiteLabel={websiteLabel}
          linkedins={linkedins}
        />
      </main>
    </div>
  );
}

/* ----------------------- PROFILE VIEW ------------------------ */

function ProfileView({
  company,
  websiteLabel,
  linkedins,
}: {
  company: CompanyProfile;
  websiteLabel: string;
  linkedins: string[];
}) {
  const problem = company.problem || "Not provided.";
  const solution = company.solution || "Not provided.";
  const whyNow = company.why_now || "Not provided.";
  const product = company.product_details || "Not provided.";
  const market = company.market || "Not provided.";

  return (
    <div className="space-y-6 pb-10">
      {/* OVERVIEW */}
      <Card className="bg-slate-900/60 border border-white/5 rounded-xl p-6 lg:p-8 space-y-6 shadow-[0_0_40px_rgba(15,23,42,0.6)]">
        <div className="flex items-center gap-2">
          <span className="text-lg">🪐</span>
          <div>
            <div className="text-sm font-semibold">Overview</div>
            <div className="text-xs text-slate-400">
              High-level summary of company, product and timing.
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          <ProfileField label="Industry" value={company.industry} />
          <ProfileField label="Stage" value={company.stage} />
          <ProfileField label="Website" value={websiteLabel} isLink />
          <ProfileField
            label="Profile visibility"
            value={
              company.profile_published ? "Published to investors" : "Draft only"
            }
          />
        </div>
      </Card>

      {/* PROBLEM / SOLUTION / WHY NOW */}
      <Card className="bg-slate-900/60 border border-white/5 rounded-xl p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <div>
            <div className="text-sm font-semibold">
              Problem, solution &amp; timing
            </div>
            <div className="text-xs text-slate-400">
              Narrative investors read first: why this matters now.
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <ProfileBlock icon="❓" label="Problem" text={problem} />
          <ProfileBlock icon="💡" label="Solution" text={solution} />
          <ProfileBlock icon="⏱" label="Why now" text={whyNow} />
        </div>
      </Card>

      {/* PRODUCT */}
      <Card className="bg-slate-900/60 border border-white/5 rounded-xl p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧩</span>
          <div>
            <div className="text-sm font-semibold">Product</div>
            <div className="text-xs text-slate-400">
              What they&apos;re building and how it works in practice.
            </div>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-line">
          {product}
        </p>
      </Card>

      {/* MARKET & TRACTION */}
      <Card className="bg-slate-900/60 border border-white/5 rounded-xl p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌍</span>
          <div>
            <div className="text-sm font-semibold">Market &amp; traction</div>
            <div className="text-xs text-slate-400">
              Early signal on market fit and momentum.
            </div>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-line">
          {market}
        </p>

        <div className="grid gap-4 md:grid-cols-3 text-sm text-slate-300">
          <MiniMetric label="TAM" value="Not provided." />
          <MiniMetric label="SAM" value="Not provided." />
          <MiniMetric label="SOM" value="Not provided." />
        </div>
      </Card>

      {/* TEAM */}
      <Card className="bg-slate-900/60 border border-white/5 rounded-xl p-6 lg:p-8 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">👥</span>
          <div>
            <div className="text-sm font-semibold">Team</div>
            <div className="text-xs text-slate-400">
              Key people behind the company.
            </div>
          </div>
        </div>

        {company.team && company.team.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {company.team.map((member, idx) => {
              const initialsMember =
                member.name
                  ?.split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() ?? "T";

              return (
                <div
                  key={`${member.name}-${idx}`}
                  className="flex gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <Avatar className="h-10 w-10 rounded-xl bg-slate-800">
                    <AvatarFallback className="text-xs font-semibold">
                      {initialsMember}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-slate-100">
                      {member.name || "Unnamed"}
                    </p>
                    {member.role && (
                      <p className="text-xs text-slate-400">{member.role}</p>
                    )}
                    {member.linkedin_url && (
                      <a
                        href={
                          member.linkedin_url.startsWith("http")
                            ? member.linkedin_url
                            : `https://${member.linkedin_url}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-sky-400 hover:underline"
                      >
                        LinkedIn
                      </a>
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

      {/* LINKS & DOCUMENTS */}
      <Card className="bg-slate-900/60 border border-white/5 rounded-xl p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔗</span>
          <div>
            <div className="text-sm font-semibold">Links &amp; documents</div>
            <div className="text-xs text-slate-400">
              External resources investors may want to explore.
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <ProfileField label="Website" value={websiteLabel} isLink />
          <div className="flex flex-col gap-1 rounded-lg border border-dashed border-white/10 bg-slate-900/40 px-4 py-3">
            <span className="text-[10px] tracking-[0.2em] uppercase text-slate-500">
              LinkedIn profiles
            </span>
            {linkedins.length === 0 ? (
              <span className="text-sm text-slate-400">
                No LinkedIn profiles added.
              </span>
            ) : (
              <ul className="text-sm text-slate-200 list-disc list-inside">
                {linkedins.map((url) => (
                  <li key={url} className="truncate">
                    {url}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-col gap-1 rounded-lg border border-dashed border-white/10 bg-slate-900/40 px-4 py-3">
            <span className="text-[10px] tracking-[0.2em] uppercase text-slate-500">
              Pitch deck
            </span>
            <span className="text-sm text-slate-400">
              Upload coming soon. Deck sharing will appear here.
            </span>
          </div>
        </div>
      </Card>

      {/* AI COMMENTARY */}
      <Card className="bg-slate-900/80 border border-cyan-500/30 rounded-xl p-6 lg:p-8 shadow-[0_0_45px_rgba(56,189,248,0.20)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg text-cyan-400">✦</span>
            <div>
              <div className="text-sm font-semibold">AI commentary</div>
              <div className="text-xs text-slate-400">
                Generated by MCP Agent based on latest KPIs &amp; profile
                (MVP placeholder).
              </div>
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-[0.16em] text-cyan-300">
            MCP Agent
          </span>
        </div>

        <ul className="space-y-1.5 text-sm text-slate-200">
          <li>
            • Profile gives investors a clear narrative around problem, solution
            and timing.
          </li>
          <li>
            • Market positioning and TAM/SAM/SOM will be auto-filled by MCP
            Agent in a later phase.
          </li>
          <li>
            • Team section becomes a key signal once founder adds core
            profiles.
          </li>
          <li>
            • Links & documents will evolve into a full investor package over
            time.
          </li>
        </ul>
      </Card>
    </div>
  );
}

/* ---------------------------- HELPERS ---------------------------- */

function ProfileField({
  label,
  value,
  isLink,
}: {
  label: string;
  value: string | null | string;
  isLink?: boolean;
}) {
  const display =
    typeof value === "string" && value.trim().length > 0
      ? value
      : "Not provided.";

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] tracking-[0.2em] uppercase text-slate-500">
        {label}
      </span>
      {isLink && typeof value === "string" && value ? (
        <a
          href={value.startsWith("http") ? value : `https://${value}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-sky-300 hover:underline truncate"
        >
          {display}
        </a>
      ) : (
        <span className="text-sm text-slate-200 truncate">{display}</span>
      )}
    </div>
  );
}

function ProfileBlock({
  icon,
  label,
  text,
}: {
  icon: string;
  label: string;
  text: string;
}) {
  return (
    <div className="rounded-lg bg-slate-900/60 border border-white/5 p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <span className="text-[11px] tracking-[0.18em] uppercase text-slate-400">
          {label}
        </span>
      </div>
      <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
        {text}
      </p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-900/60 border border-white/5 px-4 py-3 space-y-1">
      <div className="text-[10px] tracking-[0.2em] uppercase text-slate-500">
        {label}
      </div>
      <div className="text-sm text-slate-200">{value}</div>
    </div>
  );
}