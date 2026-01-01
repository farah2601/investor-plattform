"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

import { cn } from "@/lib/utils";

import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
};

type FormState = {
  name: string;
  industry: string;
  stage: string;
  description: string;
  problem: string;
  solution: string;
  why_now: string;
  market: string;
  product_details: string;
  website_url: string;
  linkedin_urls: string[];
  team: TeamMember[];
};

const tabs = [
  "Company basics",
  "Pitch & narrative",
  "Product",
  "Market & traction",
  "Team",
  "Links",
];

export default function CompanyProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [activeTab, setActiveTab] = useState<string>("Company basics");

  // ---------- LOAD COMPANY ----------
  useEffect(() => {
    const loadCompany = async () => {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error("Supabase auth error:", userError);
          setError("You must be logged in to see your company profile.");
          setLoading(false);
          return;
        }

        const { data, error: companyError } = await supabase
          .from("companies")
          .select("*")
          .eq("owner_id", user.id);

        if (companyError) {
          console.error("Supabase company error:", companyError);
          setError(companyError.message || "Could not load company profile.");
          setLoading(false);
          return;
        }

        if (!data || data.length === 0) {
          setError("No company profile found for this account.");
          setLoading(false);
          return;
        }

        const row = data[0] as CompanyProfile;

        setCompany(row);
        setForm({
          name: row.name ?? "",
          industry: row.industry ?? "",
          stage: row.stage ?? "",
          description: row.description ?? "",
          problem: row.problem ?? "",
          solution: row.solution ?? "",
          why_now: row.why_now ?? "",
          market: row.market ?? "",
          product_details: row.product_details ?? "",
          website_url: row.website_url ?? "",
          linkedin_urls: (row.linkedin_urls ?? []) as string[],
          team: (row.team ?? []) as TeamMember[],
        });

        setLoading(false);
      } catch (err: any) {
        console.error("Unexpected error loading company profile:", err);
        setError(
          typeof err?.message === "string"
            ? err.message
            : "Could not load company profile."
        );
        setLoading(false);
      }
    };

    loadCompany();
  }, []);

  // ---------- HANDLERS ----------

  const handleFieldChange = (
    field: keyof FormState,
    value: string | TeamMember[] | string[]
  ) => {
    if (!form) return;
    setForm({ ...form, [field]: value } as FormState);
  };

  const handleSave = async () => {
    if (!company || !form) return;
    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("companies")
        .update({
          name: form.name,
          industry: form.industry || null,
          stage: form.stage || null,
          description: form.description || null,
          problem: form.problem || null,
          solution: form.solution || null,
          why_now: form.why_now || null,
          market: form.market || null,
          product_details: form.product_details || null,
          website_url: form.website_url || null,
          linkedin_urls: form.linkedin_urls ?? [],
          team: form.team ?? [],
        })
        .eq("id", company.id);

      if (updateError) {
        console.error("Supabase update error:", updateError);
        setError(updateError.message || "Could not save profile.");
      } else {
        setCompany({
          ...company,
          ...form,
        });
      }
    } catch (err: any) {
      console.error("Unexpected save error:", err);
      setError(
        typeof err?.message === "string"
          ? err.message
          : "Could not save profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!company) return;
    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from("companies")
        .update({ profile_published: true })
        .eq("id", company.id);

      if (updateError) {
        console.error("Supabase publish error:", updateError);
        setError(updateError.message || "Could not publish profile.");
      } else {
        setCompany({ ...company, profile_published: true });
      }
    } catch (err: any) {
      console.error("Unexpected publish error:", err);
      setError(
        typeof err?.message === "string"
          ? err.message
          : "Could not publish profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateProfile = async () => {
    if (!form) return;
    setAiGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/generate-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          industry: form.industry,
          website_url: form.website_url,
          linkedin_urls: form.linkedin_urls,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to generate profile");
      }

      const data = await res.json();

      setForm((prev) =>
        prev
          ? {
              ...prev,
              problem: data.problem ?? prev.problem,
              solution: data.solution ?? prev.solution,
              why_now: data.why_now ?? prev.why_now,
              market: data.market ?? prev.market,
              product_details: data.product_details ?? prev.product_details,
            }
          : prev
      );
    } catch (err: any) {
      console.error("generate-profile error:", err);
      setError(
        typeof err?.message === "string"
          ? err.message
          : "Could not generate profile with AI."
      );
    } finally {
      setAiGenerating(false);
    }
  };

  // ---------- RENDER ----------

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400">Loading company profile…</p>
      </div>
    );
  }

  if (error || !form || !company) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-50 flex items-center justify-center">
        <p className="text-sm text-red-400 max-w-md text-center">
          {error || "Could not load company profile."}
        </p>
      </div>
    );
  }

  const initial = company.name?.charAt(0)?.toUpperCase() || "C";
  const linkedinsCount = form.linkedin_urls.filter((x) => x.trim() !== "").length;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-950 text-slate-50">
      <main className="mx-auto w-full max-w-5xl px-4 py-8 space-y-8 sm:px-6 lg:px-8">
        {/* Navigation back to dashboard */}
        <div className="flex items-center gap-3">
          <Link
            href="/company-dashboard"
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            ← Dashboard
          </Link>
        </div>
        
        {/* HEADER CARD (UPDATED to match screenshot) */}
        <Card
          className={cn(
            "relative overflow-hidden rounded-3xl border border-white/10",
            "bg-[radial-gradient(1200px_500px_at_20%_-20%,rgba(43,116,255,0.14),transparent_55%),radial-gradient(900px_400px_at_80%_0%,rgba(43,116,255,0.08),transparent_60%)]",
            "bg-slate-900/40"
          )}
        >
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              {/* Left */}
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12 rounded-2xl">
                  <AvatarFallback className="bg-white/10 text-slate-100">
                    {initial}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-lg font-semibold text-white sm:text-xl">
                      {form.name || "Company name"}
                    </h1>

                    {form.industry && (
                      <Badge className="h-5 rounded-full border border-sky-500/40 bg-sky-500/10 px-2 text-[10px] uppercase tracking-wide text-sky-100">
                        {form.industry}
                      </Badge>
                    )}
                  </div>

                  {form.description && (
                    <p className="max-w-xl text-sm text-slate-400">
                      {form.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Right */}
              <div className="flex flex-col items-start gap-3 lg:items-end">
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {/* Save changes (white button) */}
                  <Button
                    size="sm"
                    disabled={saving}
                    onClick={handleSave}
                    className="h-9 rounded-xl bg-white text-slate-950 hover:bg-white/90 active:bg-white/85"
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </Button>

                  {/* Generate with AI (light, can be disabled) */}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={saving || aiGenerating}
                    onClick={handleGenerateProfile}
                    className={cn(
                      "h-9 rounded-xl border border-white/10 bg-white/5 text-slate-100 hover:bg-white/8",
                      "disabled:opacity-50"
                    )}
                  >
                    {aiGenerating ? "Generating…" : "Generate with AI"}
                  </Button>

                  {/* Published pill / Approve & publish */}
                  <Button
                    size="sm"
                    disabled={saving || company.profile_published === true}
                    onClick={handlePublish}
                    className={cn(
                      "h-9 rounded-xl",
                      company.profile_published
                        ? "border border-white/10 bg-white/5 text-slate-200"
                        : "bg-[#2B74FF] text-white hover:bg-[#2B74FF]/90 active:bg-[#2B74FF]/85"
                    )}
                    variant={company.profile_published ? "outline" : "default"}
                  >
                    {company.profile_published ? "Published" : "Approve & publish"}
                  </Button>
                </div>

                <div className="text-xs text-slate-400 lg:text-right space-y-0.5">
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
                        ? "Published to investors"
                        : "Draft (not visible to investors)"}
                    </span>
                  </p>
                  <p>Powered by Valyxo Agent</p>
                </div>
              </div>
            </div>

            {/* Optional tiny meta row (kept minimal) */}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              {form.stage ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-slate-600" />
                  <span>{form.stage}</span>
                </span>
              ) : null}
              {form.website_url ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-slate-600" />
                  <a
                    href={form.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-400 hover:underline"
                  >
                    {form.website_url.replace(/^https?:\/\//, "")}
                  </a>
                </span>
              ) : null}
              {linkedinsCount > 0 ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-slate-600" />
                  <span>{linkedinsCount} LinkedIn</span>
                </span>
              ) : null}
            </div>
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

        {/* ACTIVE SECTION */}
        {activeTab === "Company basics" && (
          <Card className="mt-4 space-y-5 rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8">
            <div>
              <h2 className="text-base font-semibold text-white sm:text-lg">
                Company basics
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Name, industry, stage and short description.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Company name</Label>
                <Input
                  className="border-slate-700 bg-slate-950/60 text-sm text-slate-50 placeholder:text-slate-500"
                  value={form.name}
                  onChange={(e) => handleFieldChange("name", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Industry</Label>
                <Input
                  className="border-slate-700 bg-slate-950/60 text-sm text-slate-50 placeholder:text-slate-500"
                  value={form.industry}
                  onChange={(e) =>
                    handleFieldChange("industry", e.target.value)
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Stage</Label>
                <Input
                  placeholder="Pre-seed, Seed, Series A…"
                  className="border-slate-700 bg-slate-950/60 text-sm text-slate-50 placeholder:text-slate-500"
                  value={form.stage}
                  onChange={(e) => handleFieldChange("stage", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">
                  Short description
                </Label>
                <Textarea
                  className="min-h-[80px] border-slate-700 bg-slate-950/60 text-sm text-slate-50 placeholder:text-slate-500"
                  placeholder="One or two sentences explaining what you do."
                  value={form.description}
                  onChange={(e) =>
                    handleFieldChange("description", e.target.value)
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Website URL</Label>
                <Input
                  className="border-slate-700 bg-slate-950/60 text-sm text-slate-50 placeholder:text-slate-500"
                  placeholder="https://example.com"
                  value={form.website_url}
                  onChange={(e) =>
                    handleFieldChange("website_url", e.target.value)
                  }
                />
              </div>
            </div>
          </Card>
        )}

        {activeTab === "Pitch & narrative" && (
          <Card className="mt-4 space-y-5 rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8">
            <div>
              <h2 className="text-base font-semibold text-white sm:text-lg">
                Company narrative
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Problem, solution and why now — the story investors read first.
              </p>
            </div>

            {/* AI PROFILE GENERATOR CARD */}
            <div className="rounded-2xl border border-sky-500/40 bg-sky-500/10 px-4 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold tracking-[0.18em] text-sky-300 uppercase">
                  AI PROFILE GENERATOR
                </p>
                <p className="text-xs text-slate-200">
                  Valyxo Agent uses your website and LinkedIn links to generate
                  Problem, Solution, Why now, Market, Product, and Team sections.
                </p>
                <p className="text-xs text-slate-300 mt-2">
                  <span className="font-medium text-slate-100">Website:</span>{" "}
                  {form.website_url
                    ? form.website_url.replace(/^https?:\/\//, "")
                    : "not set yet"}
                </p>
                <p className="text-xs text-slate-300">
                  <span className="font-medium text-slate-100">
                    LinkedIn profiles:
                  </span>{" "}
                  {linkedinsCount}
                </p>
                <p className="text-[11px] text-slate-300 mt-1">
                  Update website and LinkedIn under Links first, then click to let AI suggest a complete narrative profile. You can edit everything afterward.
                </p>
              </div>
              <Button
                className="shrink-0 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold"
                disabled={saving || aiGenerating}
                onClick={handleGenerateProfile}
              >
                {aiGenerating ? "Generating…" : "Generate with AI"}
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Problem</Label>
                <Textarea
                  className="min-h-[96px] border-slate-700 bg-slate-950/60 text-sm text-slate-50 placeholder:text-slate-500"
                  value={form.problem}
                  onChange={(e) =>
                    handleFieldChange("problem", e.target.value)
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Solution</Label>
                <Textarea
                  className="min-h-[96px] border-slate-700 bg-slate-950/60 text-sm text-slate-50 placeholder:text-slate-500"
                  value={form.solution}
                  onChange={(e) =>
                    handleFieldChange("solution", e.target.value)
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Why now</Label>
                <Textarea
                  className="min-h-[96px] border-slate-700 bg-slate-950/60 text-sm text-slate-50 placeholder:text-slate-500"
                  value={form.why_now}
                  onChange={(e) =>
                    handleFieldChange("why_now", e.target.value)
                  }
                />
              </div>
            </div>
          </Card>
        )}

        {activeTab === "Product" && (
          <Card className="mt-4 space-y-5 rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8">
            <div>
              <h2 className="text-base font-semibold text-white sm:text-lg">
                Product
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                What you&apos;re building and how it works.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">
                  Product overview
                </Label>
                <Textarea
                  className="min-h-[120px] border-slate-700 bg-slate-950/60 text-sm text-slate-50 placeholder:text-slate-500"
                  value={form.product_details}
                  onChange={(e) =>
                    handleFieldChange("product_details", e.target.value)
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">
                  Screenshot placeholders
                </Label>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-950/40 text-xs text-slate-500"
                    >
                      Screenshot {i}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === "Market & traction" && (
          <Card className="mt-4 space-y-5 rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8">
            <div>
              <h2 className="text-base font-semibold text-white sm:text-lg">
                Market & traction
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                High-level market and traction description investors expect.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">
                  Market overview
                </Label>
                <Textarea
                  className="min-h-[96px] border-slate-700 bg-slate-950/60 text-sm text-slate-50 placeholder:text-slate-500"
                  value={form.market}
                  onChange={(e) =>
                    handleFieldChange("market", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-300">
                  TAM / SAM / SOM (placeholder)
                </Label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input
                    placeholder="TAM"
                    className="border-slate-700 bg-slate-950/60 text-sm text-slate-50 placeholder:text-slate-500"
                  />
                  <Input
                    placeholder="SAM"
                    className="border-slate-700 bg-slate-950/60 text-sm text-slate-50 placeholder:text-slate-500"
                  />
                  <Input
                    placeholder="SOM"
                    className="border-slate-700 bg-slate-950/60 text-sm text-slate-50 placeholder:text-slate-500"
                  />
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === "Team" && (
          <Card className="mt-4 space-y-5 rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-white sm:text-lg">
                  Team
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Key people behind the company.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const next: TeamMember = {
                    name: "",
                    role: "",
                    linkedin_url: "",
                    experience: "",
                  };
                  handleFieldChange("team", [...form.team, next]);
                }}
              >
                Add team member
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {form.team.map((member, idx) => (
                <div
                  key={idx}
                  className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Name</Label>
                    <Input
                      className="border-slate-700 bg-slate-950/60 text-sm text-slate-50 placeholder:text-slate-500"
                      value={member.name}
                      onChange={(e) => {
                        const next = [...form.team];
                        next[idx] = { ...next[idx], name: e.target.value };
                        handleFieldChange("team", next);
                      }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Role</Label>
                    <Input
                      className="border-slate-700 bg-slate-950/60 text-sm text-slate-50 placeholder:text-slate-500"
                      value={member.role}
                      onChange={(e) => {
                        const next = [...form.team];
                        next[idx] = { ...next[idx], role: e.target.value };
                        handleFieldChange("team", next);
                      }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">
                      LinkedIn URL
                    </Label>
                    <Input
                      className="border-slate-700 bg-slate-950/60 text-sm text-slate-50 placeholder:text-slate-500"
                      value={member.linkedin_url ?? ""}
                      onChange={(e) => {
                        const next = [...form.team];
                        next[idx] = {
                          ...next[idx],
                          linkedin_url: e.target.value,
                        };
                        handleFieldChange("team", next);
                      }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">
                      Previous experience
                    </Label>
                    <Textarea
                      className="min-h-[72px] border-slate-700 bg-slate-950/60 text-sm text-slate-50 placeholder:text-slate-500"
                      value={member.experience ?? ""}
                      onChange={(e) => {
                        const next = [...form.team];
                        next[idx] = {
                          ...next[idx],
                          experience: e.target.value,
                        };
                        handleFieldChange("team", next);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {activeTab === "Links" && (
          <Card className="mt-4 space-y-5 rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8">
            <div>
              <h2 className="text-base font-semibold text-white sm:text-lg">
                Links
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                External links investors may want to explore.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Website URL</Label>
                <Input
                  className="border-slate-700 bg-slate-950/60 text-sm text-slate-50 placeholder:text-slate-500"
                  value={form.website_url}
                  onChange={(e) =>
                    handleFieldChange("website_url", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-300">
                  LinkedIn URLs
                </Label>
                <div className="space-y-2">
                  {form.linkedin_urls.map((url, idx) => (
                    <Input
                      key={idx}
                      className="border-slate-700 bg-slate-950/60 text-sm text-slate-50 placeholder:text-slate-500"
                      value={url}
                      onChange={(e) => {
                        const next = [...form.linkedin_urls];
                        next[idx] = e.target.value;
                        handleFieldChange("linkedin_urls", next);
                      }}
                    />
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleFieldChange("linkedin_urls", [
                        ...form.linkedin_urls,
                        "",
                      ])
                    }
                  >
                    Add link
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}