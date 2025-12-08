"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { cn } from "@/lib/utils";

import { Card } from "../../../../components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";

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

export default function InvestorProfilePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params?.token;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  // screenshot-modal state
  const [screenshotDialogOpen, setScreenshotDialogOpen] = useState(false);
  const [activeScreenshot, setActiveScreenshot] = useState<number | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Missing investor token in URL.");
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) investor_links → finn raden for dette tokenet
        const { data: linkRow, error: linkError } = await supabase
          .from("investor_links")
          .select("id, access_token, request_id, expires_at")
          .eq("access_token", token)
          .maybeSingle();

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

        // 2) access_requests → finn company_id
        const { data: requestRow, error: requestError } = await supabase
          .from("access_requests")
          .select("company_id")
          .eq("id", linkRow.request_id)
          .maybeSingle();

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
        <div className="max-w-md text-center space-y-3">
          <p className="text-sm text-red-400">
            {error || "Could not load investor profile for this link."}
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-xs text-sky-400 hover:underline"
          >
            Go back to homepage
          </button>
        </div>
      </div>
    );
  }

  const initial = company.name?.charAt(0)?.toUpperCase() || "C";
  const lastUpdated = company.updated_at || null;
  const aiUpdated = company.updated_at || null;

  const isExpired =
    expiresAt && new Date(expiresAt).getTime() < Date.now();

  const handleScreenshotClick = (index: number) => {
    setActiveScreenshot(index);
    setScreenshotDialogOpen(true);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-50">
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

              {/* Tabs (KPI | Profile) */}
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
                    MCP Agent package
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* PAGE CONTENT */}
        <div className="space-y-10 pb-10">
          {/* SECTION 1 — OVERVIEW */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-white">
                  Overview
                </h2>
                <p className="text-xs text-slate-400">
                  High-level summary of company, product and timing.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {/* Industry */}
              <Card className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  Industry
                </p>
                <p className="mt-1 text-sm text-slate-100">
                  {company.industry || "—"}
                </p>
              </Card>

              {/* Stage */}
              <Card className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  Stage
                </p>
                <p className="mt-1 text-sm text-slate-100">
                  {company.stage || "—"}
                </p>
              </Card>

              {/* Website */}
              <Card className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  Website
                </p>
                {company.website_url ? (
                  <a
                    href={company.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 text-sm text-sky-400 hover:underline break-all"
                  >
                    {company.website_url.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-slate-100">—</p>
                )}
              </Card>
            </div>

            {/* Problem / Solution / Why now */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col gap-2">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/15 text-sky-300 text-sm">
                  ❓
                </div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  Problem
                </p>
                <p className="text-sm text-slate-100 whitespace-pre-line">
                  {company.problem || "Not provided."}
                </p>
              </Card>

              <Card className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col gap-2">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 text-sm">
                  💡
                </div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  Solution
                </p>
                <p className="text-sm text-slate-100 whitespace-pre-line">
                  {company.solution || "Not provided."}
                </p>
              </Card>

              <Card className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col gap-2">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15 text-amber-300 text-sm">
                  ⏱
                </div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  Why now
                </p>
                <p className="text-sm text-slate-100 whitespace-pre-line">
                  {company.why_now || "Not provided."}
                </p>
              </Card>
            </div>
          </section>

          {/* SECTION 2 — PRODUCT */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-white">
                  Product
                </h2>
                <p className="text-xs text-slate-400">
                  What they&apos;re building and how it works in practice.
                </p>
              </div>
            </div>

            <Card className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Product overview
              </p>
              <p className="text-sm text-slate-100 whitespace-pre-line">
                {company.product_details || "Not provided."}
              </p>
            </Card>

            {/* Screenshots */}
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Screenshots
              </p>

              {/* Desktop grid */}
              <div className="hidden sm:grid gap-4 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleScreenshotClick(i)}
                    className="group flex h-32 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 text-xs text-slate-500 hover:border-sky-500/60 hover:bg-slate-900/80 transition"
                  >
                    <span className="text-center">
                      Screenshot placeholder {i}
                      <br />
                      <span className="text-[10px] text-slate-500 group-hover:text-sky-300">
                        Click to enlarge
                      </span>
                    </span>
                  </button>
                ))}
              </div>

              {/* Mobile horizontal scroll */}
              <div className="flex sm:hidden gap-3 overflow-x-auto no-scrollbar snap-x">
                {[1, 2, 3].map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleScreenshotClick(i)}
                    className="snap-start min-w-[70%] flex h-32 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 text-xs text-slate-500"
                  >
                    <span className="text-center">
                      Screenshot {i}
                      <br />
                      <span className="text-[10px] text-slate-500">
                        Tap to enlarge
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 3 — MARKET & TRACTION */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-white">
                  Market & traction
                </h2>
                <p className="text-xs text-slate-400">
                  How big the opportunity is and what has been proven so far.
                </p>
              </div>
            </div>

            <Card className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Market summary
              </p>
              <p className="text-sm text-slate-100 whitespace-pre-line">
                {company.market || "Not provided."}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Market opportunity estimate and competitive landscape will be refined by the MCP Agent.
              </p>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: "TAM", caption: "Total addressable market" },
                { label: "SAM", caption: "Serviceable available market" },
                { label: "SOM", caption: "Serviceable obtainable market" },
              ].map((item) => (
                <Card
                  key={item.label}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col gap-2"
                >
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-200 text-xs">
                    {item.label}
                  </div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">
                    {item.caption}
                  </p>
                  <p className="text-sm text-slate-100">—</p>
                  <p className="text-xs text-slate-500">
                    Market opportunity estimated at $1.2B according to AI-agent summary (placeholder).
                  </p>
                </Card>
              ))}
            </div>
          </section>

          {/* SECTION 4 — TEAM */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-white">
                  Team
                </h2>
                <p className="text-xs text-slate-400">
                  Key people responsible for execution.
                </p>
              </div>
            </div>

            {company.team && company.team.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {company.team.map((member, idx) => {
                  const initialMember =
                    member.name?.charAt(0)?.toUpperCase() || "T";
                  return (
                    <Card
                      key={`${member.name}-${idx}`}
                      className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-4 hover:border-sky-500/60 hover:bg-slate-900/90 transition"
                    >
                      <div className="flex gap-3">
                        <Avatar className="h-10 w-10 rounded-xl bg-slate-900">
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
                                className="text-[11px] text-sky-400 hover:underline"
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
                        </div>
                      </div>
                      {member.experience && (
                        <p className="mt-3 text-xs text-slate-300 whitespace-pre-line">
                          {member.experience}
                        </p>
                      )}
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-400">
                  Team information has not been added yet.
                </p>
              </Card>
            )}
          </section>

          {/* SECTION 5 — LINKS & DOCUMENTS */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-white">
                  Links & documents
                </h2>
                <p className="text-xs text-slate-400">
                  External resources and upcoming investor materials.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {/* Website */}
              <Card className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col gap-2">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/15 text-sky-300 text-sm">
                  🌐
                </div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  Website
                </p>
                {company.website_url ? (
                  <a
                    href={company.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-sky-400 hover:underline break-all"
                  >
                    {company.website_url.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  <p className="text-sm text-slate-100">—</p>
                )}
              </Card>

              {/* LinkedIn */}
              <Card className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col gap-2">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/15 text-sky-300 text-sm">
                  in
                </div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">
                  LinkedIn
                </p>
                {company.linkedin_urls && company.linkedin_urls.length > 0 ? (
                  <ul className="mt-1 space-y-1 text-sm text-slate-100">
                    {company.linkedin_urls.map((url, idx) => (
                      <li key={idx}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-400 hover:underline break-all text-xs"
                        >
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-100">—</p>
                )}
              </Card>

              {/* Pitchdeck placeholder */}
              <Card className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-4 flex flex-col justify-between gap-2">
                <div className="space-y-2">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 text-sm">
                    📑
                  </div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">
                    Pitch deck
                  </p>
                  <p className="text-sm text-slate-300">
                    Deck upload & data room will be attached here by founders.
                  </p>
                </div>
                <button
                  type="button"
                  disabled
                  className="mt-2 inline-flex cursor-not-allowed items-center justify-center rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-[11px] text-slate-500"
                >
                  Upload coming soon
                </button>
              </Card>
            </div>
          </section>

          {/* SECTION 6 — AI INSIGHTS / AI COMMENTARY */}
          <section className="space-y-3">
            <Card className="rounded-2xl border border-sky-500/40 bg-slate-950/80 p-6 sm:p-7 shadow-[0_0_40px_rgba(56,189,248,0.15)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/20 text-sky-300">
                    ✦
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-white">
                      AI commentary
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Generated by MCP Agent based on latest KPIs & profile (placeholder).
                    </p>
                  </div>
                </div>
                <span className="hidden sm:inline-flex rounded-full bg-slate-900/80 px-3 py-1 text-[10px] text-slate-400 border border-slate-700">
                  Refreshed at {formatDateLabel(aiUpdated)}
                </span>
              </div>

              <div className="mt-4 space-y-1.5 text-sm text-slate-100">
                <p>• MRR grew ~8% last month — above typical industry benchmark for this stage.</p>
                <p>• Burn is decreasing steadily; projected runway ~14 months at current spend.</p>
                <p>• Customer retention improving, with churn trending downward over the last quarter.</p>
                <p>• Profile and KPIs are kept in sync by the MCP Agent in the full product.</p>
              </div>
            </Card>
          </section>
        </div>
      </main>

      {/* Screenshot modal */}
      <Dialog open={screenshotDialogOpen} onOpenChange={setScreenshotDialogOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-50 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">
              Product screenshot placeholder {activeScreenshot ?? ""}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-3 flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/80 text-xs text-slate-400">
            UI screenshots and live product views will be rendered here in a later version.
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
