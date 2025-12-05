"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

import { Input } from "../../components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

type ExperienceItem = {
  company: string;
  role: string;
};

type TeamMember = {
  name: string;
  role: string;
  image_url?: string;
  linkedin_url?: string;
  experience?: ExperienceItem[];
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
  linkedin_urls: string[]; // parsed from jsonb
  team: TeamMember[]; // parsed from jsonb
  profile_published: boolean;
};

type GenerateProfileResponse = {
  problem: string;
  solution: string;
  why_now: string;
  market: string;
  product_details: string;
  team?: TeamMember[];
};

export default function CompanyProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<CompanyProfile | null>(null);

  // ---------- LOAD PROFILE FOR LOGGED-IN USER ----------
  useEffect(() => {
    async function load() {
      setError(null);
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setLoading(false);
        router.push("/login");
        return;
      }

      const { data, error: companyError } = await supabase
  .from("companies")
  .select("*")
  .eq("owner_id", user.id)
  .maybeSingle();

      if (companyError) {
        console.error(companyError);
        setError("Could not load company profile.");
        setLoading(false);
        return;
      }

      if (!data) {
        setError("No company profile found for this account.");
        setLoading(false);
        return;
      }

      const parsedTeam: TeamMember[] = Array.isArray(data.team)
        ? data.team
        : [];

      const parsedLinkedin: string[] = Array.isArray(data.linkedin_urls)
        ? data.linkedin_urls
        : [];

      const profileData: CompanyProfile = {
        id: data.id,
        name: data.name ?? "",
        industry: data.industry ?? "",
        stage: data.stage ?? "",
        description: data.description ?? "",
        problem: data.problem ?? "",
        solution: data.solution ?? "",
        why_now: data.why_now ?? "",
        market: data.market ?? "",
        product_details: data.product_details ?? "",
        website_url: data.website_url ?? "",
        linkedin_urls: parsedLinkedin,
        team: parsedTeam,
        profile_published: data.profile_published ?? false,
      };

      setProfile(profileData);
      setLoading(false);
    }

    load();
  }, [router]);

  // ---------- HELPERS ----------

  function updateField<K extends keyof CompanyProfile>(
    key: K,
    value: CompanyProfile[K]
  ) {
    if (!profile) return;
    setProfile({ ...profile, [key]: value });
  }

  function updateTeamMember(
    index: number,
    partial: Partial<TeamMember>
  ) {
    if (!profile) return;
    const team = [...profile.team];
    team[index] = { ...team[index], ...partial };
    setProfile({ ...profile, team });
  }

  function addTeamMember() {
    if (!profile) return;
    setProfile({
      ...profile,
      team: [
        ...profile.team,
        { name: "", role: "", image_url: "", linkedin_url: "", experience: [] },
      ],
    });
  }

  function removeTeamMember(index: number) {
    if (!profile) return;
    const team = profile.team.filter((_, i) => i !== index);
    setProfile({ ...profile, team });
  }

  function updateLinkedinUrl(index: number, value: string) {
    if (!profile) return;
    const urls = [...profile.linkedin_urls];
    urls[index] = value;
    setProfile({ ...profile, linkedin_urls: urls });
  }

  function addLinkedinUrl() {
    if (!profile) return;
    setProfile({
      ...profile,
      linkedin_urls: [...profile.linkedin_urls, ""],
    });
  }

  function removeLinkedinUrl(index: number) {
    if (!profile) return;
    const urls = profile.linkedin_urls.filter((_, i) => i !== index);
    setProfile({ ...profile, linkedin_urls: urls });
  }

  // ---------- SAVE TO SUPABASE ----------

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setError(null);

    const { id, ...rest } = profile;

    const { error: updateError } = await supabase
      .from("companies")
      .update({
        ...rest,
        team: rest.team,
        linkedin_urls: rest.linkedin_urls,
      })
      .eq("id", id);

    setSaving(false);

    if (updateError) {
      console.error(updateError);
      setError("Could not save profile changes.");
      return;
    }
  }

  // ---------- AI GENERATE PLACEHOLDER ----------

  async function handleGenerateWithAI() {
    if (!profile) return;
    setAiLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website_url: profile.website_url,
          linkedin_urls: profile.linkedin_urls,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to call AI profile generator.");
      }

      const data: GenerateProfileResponse = await res.json();

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              problem: data.problem ?? prev.problem,
              solution: data.solution ?? prev.solution,
              why_now: data.why_now ?? prev.why_now,
              market: data.market ?? prev.market,
              product_details:
                data.product_details ?? prev.product_details,
              team: data.team ?? prev.team,
            }
          : prev
      );
    } catch (e) {
      console.error(e);
      setError("AI profile generation failed. Try again later.");
    } finally {
      setAiLoading(false);
    }
  }

  // ---------- PUBLISH PROFILE ----------

  async function handlePublish() {
    if (!profile) return;
    setPublishLoading(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("companies")
      .update({ profile_published: true })
      .eq("id", profile.id);

    setPublishLoading(false);

    if (updateError) {
      console.error(updateError);
      setError("Could not publish profile.");
      return;
    }

    setProfile({ ...profile, profile_published: true });
  }

  // ---------- RENDER ----------

  if (loading) {
    return (
      <main className="min-h-screen bg-[#020617] text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400">
          Loading company profile…
        </p>
      </main>
    );
  }

  if (error && !profile) {
    return (
      <main className="min-h-screen bg-[#020617] text-slate-50 flex items-center justify-center">
        <p className="text-sm text-red-400">{error}</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-[#020617] text-slate-50 flex items-center justify-center">
        <p className="text-sm text-red-400">
          No company profile found for this account.
        </p>
      </main>
    );
  }

  const firstLetter = profile.name?.[0]?.toUpperCase() ?? "C";

  return (
    <main className="min-h-screen bg-[#020617] text-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12 space-y-8">
        {/* HEADER / TOP BANNER */}
        <Card className="border-slate-800 bg-gradient-to-r from-slate-950 via-slate-950 to-slate-900/80">
          <CardContent className="flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14 rounded-xl border border-slate-700 bg-slate-900">
                {profile.website_url && (
                  <AvatarImage
                    src={profile.website_url + "/favicon.ico"}
                    alt={profile.name}
                  />
                )}
                <AvatarFallback className="text-lg font-semibold">
                  {firstLetter}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold sm:text-3xl">
                    {profile.name}
                  </h1>
                  {profile.stage && (
                    <Badge variant="outline" className="text-xs">
                      {profile.stage}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  {profile.industry && (
                    <Badge
                      variant="secondary"
                      className="bg-slate-800 text-slate-200"
                    >
                      {profile.industry}
                    </Badge>
                  )}
                  {profile.website_url && (
                    <a
                      href={profile.website_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-400 hover:text-sky-300 underline-offset-2 hover:underline"
                    >
                      Visit website
                    </a>
                  )}
                </div>
                {profile.description && (
                  <p className="text-sm text-slate-300 max-w-xl">
                    {profile.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 text-xs text-slate-400 md:items-end">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save changes"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleGenerateWithAI}
                  disabled={aiLoading}
                >
                  {aiLoading ? "Generating…" : "Generate profile with AI"}
                </Button>
              </div>
              <Separator className="hidden md:block bg-slate-800" />
              <div className="space-y-1 text-right">
                <p>
                  Status:{" "}
                  {profile.profile_published ? (
                    <span className="text-emerald-400">
                      Published to investors
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      Draft (not visible to investors)
                    </span>
                  )}
                </p>
                <Button
                  size="sm"
                  className="mt-1"
                  onClick={handlePublish}
                  disabled={publishLoading || profile.profile_published}
                >
                  {profile.profile_published
                    ? "Profile is published"
                    : publishLoading
                    ? "Publishing…"
                    : "Approve & publish"}
                </Button>
                <p className="text-[11px] text-slate-500">
                  Regenerated by MCP agent (placeholder timestamp)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <p className="text-xs text-red-400">
            {error}
          </p>
        )}

        {/* MAIN TABS: Basics / Pitch / Product / Market / Team */}
        <Tabs defaultValue="basics" className="space-y-8">
          <TabsList className="bg-slate-900/60 border border-slate-800">
            <TabsTrigger value="basics">Company basics</TabsTrigger>
            <TabsTrigger value="pitch">Pitch & narrative</TabsTrigger>
            <TabsTrigger value="product">Product</TabsTrigger>
            <TabsTrigger value="market">Market & traction</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
          </TabsList>

          {/* BASICS */}
          <TabsContent value="basics" className="space-y-6">
            <Card className="border-slate-800 bg-slate-950/70">
              <CardHeader>
                <CardTitle className="text-lg">
                  Company basics
                </CardTitle>
                <CardDescription>
                  Name, industry, stage and short description.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Company name
                  </label>
                  <Input
                    value={profile.name}
                    onChange={(e) =>
                      updateField("name", e.target.value)
                    }
                    className="bg-slate-900 border-slate-700"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">
                      Industry
                    </label>
                    <Input
                      value={profile.industry ?? ""}
                      onChange={(e) =>
                        updateField("industry", e.target.value)
                      }
                      className="bg-slate-900 border-slate-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">
                      Stage
                    </label>
                    <Input
                      placeholder="Pre-seed, Seed, Series A…"
                      value={profile.stage ?? ""}
                      onChange={(e) =>
                        updateField("stage", e.target.value)
                      }
                      className="bg-slate-900 border-slate-700"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Short description
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="One or two sentences explaining what you do."
                    value={profile.description ?? ""}
                    onChange={(e) =>
                      updateField("description", e.target.value)
                    }
                    className="bg-slate-900 border-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Website URL
                  </label>
                  <Input
                    placeholder="https://example.com"
                    value={profile.website_url ?? ""}
                    onChange={(e) =>
                      updateField("website_url", e.target.value)
                    }
                    className="bg-slate-900 border-slate-700"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PITCH & NARRATIVE */}
          <TabsContent value="pitch" className="space-y-6">
            <Card className="border-slate-800 bg-slate-950/70">
              <CardHeader>
                <CardTitle className="text-lg">
                  Company narrative
                </CardTitle>
                <CardDescription>
                  Problem, solution and timing. AI drafts this based on
                  your input and website.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-100">
                    Problem
                  </h3>
                  <Textarea
                    rows={4}
                    placeholder="Describe the core problem you are solving. Max 3–4 sentences."
                    value={profile.problem ?? ""}
                    onChange={(e) =>
                      updateField("problem", e.target.value)
                    }
                    className="bg-slate-900 border-slate-700"
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-100">
                    Solution
                  </h3>
                  <Textarea
                    rows={4}
                    placeholder="How your product solves the problem. Focus on value, not features."
                    value={profile.solution ?? ""}
                    onChange={(e) =>
                      updateField("solution", e.target.value)
                    }
                    className="bg-slate-900 border-slate-700"
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-100">
                    Why now
                  </h3>
                  <Textarea
                    rows={4}
                    placeholder="Explain why this is the right time: market shifts, regulation, technology, behaviour."
                    value={profile.why_now ?? ""}
                    onChange={(e) =>
                      updateField("why_now", e.target.value)
                    }
                    className="bg-slate-900 border-slate-700"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PRODUCT */}
          <TabsContent value="product" className="space-y-6">
            <Card className="border-slate-800 bg-slate-950/70">
              <CardHeader>
                <CardTitle className="text-lg">Product</CardTitle>
                <CardDescription>
                  What you&apos;re building and how it works.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Product overview
                  </label>
                  <Textarea
                    rows={5}
                    placeholder="High-level explanation, target users and core value proposition."
                    value={profile.product_details ?? ""}
                    onChange={(e) =>
                      updateField("product_details", e.target.value)
                    }
                    className="bg-slate-900 border-slate-700"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-400">
                    Screenshots (coming soon)
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/60 text-[11px] text-slate-500"
                      >
                        Screenshot placeholder
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MARKET & TRACTION */}
          <TabsContent value="market" className="space-y-6">
            <Card className="border-slate-800 bg-slate-950/70">
              <CardHeader>
                <CardTitle className="text-lg">
                  Market & traction
                </CardTitle>
                <CardDescription>
                  High-level numbers investors expect. TAM/SAM/SOM can be
                  rough placeholders to start.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Market overview
                  </label>
                  <Textarea
                    rows={5}
                    placeholder="Describe target market, segments and size. TAM / SAM / SOM, key verticals, geography."
                    value={profile.market ?? ""}
                    onChange={(e) =>
                      updateField("market", e.target.value)
                    }
                    className="bg-slate-900 border-slate-700"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3 text-xs text-slate-400">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <p className="font-semibold text-slate-100 text-sm">
                      TAM
                    </p>
                    <p className="mt-1">
                      Placeholder now – can be AI-generated later.
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <p className="font-semibold text-slate-100 text-sm">
                      SAM
                    </p>
                    <p className="mt-1">
                      Serviceable market you actively target.
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <p className="font-semibold text-slate-100 text-sm">
                      SOM
                    </p>
                    <p className="mt-1">
                      Realistic share you can capture in the next years.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TEAM */}
          <TabsContent value="team" className="space-y-6">
            <Card className="border-slate-800 bg-slate-950/70">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Team</CardTitle>
                  <CardDescription>
                    Key people behind the company. AI can prefill this
                    from LinkedIn signals.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addTeamMember}
                >
                  Add team member
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.team.length === 0 && (
                  <p className="text-xs text-slate-500">
                    No team members added yet.
                  </p>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  {profile.team.map((member, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 rounded-xl border border-slate-700 bg-slate-950">
                            {member.image_url && (
                              <AvatarImage
                                src={member.image_url}
                                alt={member.name}
                              />
                            )}
                            <AvatarFallback className="text-sm font-semibold">
                              {(member.name ?? "T")[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <Input
                              placeholder="Name"
                              value={member.name}
                              onChange={(e) =>
                                updateTeamMember(index, {
                                  name: e.target.value,
                                })
                              }
                              className="h-8 bg-slate-950 border-slate-700 text-sm"
                            />
                            <Input
                              placeholder="Role"
                              value={member.role}
                              onChange={(e) =>
                                updateTeamMember(index, {
                                  role: e.target.value,
                                })
                              }
                              className="mt-1 h-8 bg-slate-950 border-slate-700 text-xs"
                            />
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-slate-500 hover:text-red-400"
                          onClick={() => removeTeamMember(index)}
                        >
                          ✕
                        </Button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400">
                          LinkedIn URL
                        </label>
                        <Input
                          placeholder="https://linkedin.com/in/…"
                          value={member.linkedin_url ?? ""}
                          onChange={(e) =>
                            updateTeamMember(index, {
                              linkedin_url: e.target.value,
                            })
                          }
                          className="bg-slate-950 border-slate-700 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400">
                          Previous experience (optional)
                        </label>
                        <Textarea
                          rows={2}
                          placeholder="Short background, e.g. 'Ex-Spotify, McKinsey, NTNU'. For now this is a single text field; AI can structure it later."
                          value={
                            member.experience
                              ?.map((e) => `${e.role} @ ${e.company}`)
                              .join("; ") ?? ""
                          }
                          onChange={(e) =>
                            updateTeamMember(index, {
                              experience: e.target.value
                                .split(";")
                                .map((s) => s.trim())
                                .filter(Boolean)
                                .map((entry) => {
                                  const [role, company] =
                                    entry.split("@").map((p) =>
                                      p.trim()
                                    );
                                  return {
                                    company: company ?? "",
                                    role: role ?? "",
                                  };
                                }),
                            })
                          }
                          className="bg-slate-950 border-slate-700 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LINKS / LINKEDIN LIST */}
          <TabsContent value="links" className="space-y-6">
            <Card className="border-slate-800 bg-slate-950/70">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">
                    LinkedIn & external links
                  </CardTitle>
                  <CardDescription>
                    These profiles are used by the MCP agent to generate
                    team and narrative.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addLinkedinUrl}
                >
                  Add LinkedIn URL
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile.linkedin_urls.length === 0 && (
                  <p className="text-xs text-slate-500">
                    No LinkedIn URLs added yet.
                  </p>
                )}

                {profile.linkedin_urls.map((url, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2"
                  >
                    <Input
                      placeholder="https://linkedin.com/in/…"
                      value={url}
                      onChange={(e) =>
                        updateLinkedinUrl(index, e.target.value)
                      }
                      className="bg-slate-900 border-slate-700 text-xs"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-slate-500 hover:text-red-400"
                      onClick={() => removeLinkedinUrl(index)}
                    >
                      ✕
                    </Button>
                  </div>
                ))}

                <p className="mt-2 text-[11px] text-slate-500">
                  The AI generator will use your website and these LinkedIn
                  URLs as input to draft the profile.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}