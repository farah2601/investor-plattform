// lib/agent/profile/profileAgent.ts

import { supabaseAdmin } from "../../../src/lib/supabaseAdmin";

export type GeneratedProfile = {
  problem?: string;
  solution?: string;
  whyNow?: string;
  market?: string;
  product?: string;

  // Tillat ekstra felter uten å brekke
  [key: string]: unknown;
};

function getBaseUrl() {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/**
 * Henter "targets" for profilgenerering fra companies-tabellen.
 * Vi støtter både linkedin_url og linkedin_urls (array) for robustness.
 */
export async function getCompanyProfileTargets(companyId: string): Promise<{
  websiteUrl?: string | null;
  linkedinUrl?: string | null;
  linkedinUrls?: string[] | null;
}> {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("website_url, linkedin_url, linkedin_urls")
    .eq("id", companyId)
    .single();

  if (error) throw new Error(`Failed to fetch company targets: ${error.message}`);

  return {
    websiteUrl: (data as any).website_url ?? null,
    linkedinUrl: (data as any).linkedin_url ?? null,
    linkedinUrls: (data as any).linkedin_urls ?? null,
  };
}

/**
 * Kaller eksisterende /api/generate-profile.
 * Light MVP: sender companyId + urls.
 *
 * NB: Tilpass payload til hva din generate-profile faktisk forventer.
 */
export async function callGenerateProfile(input: {
  companyId: string;
  websiteUrl?: string | null;
  linkedinUrl?: string | null;
  linkedinUrls?: string[] | null;
}): Promise<GeneratedProfile> {
  const baseUrl = getBaseUrl();

  const res = await fetch(`${baseUrl}/api/generate-profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Vi sender både linkedinUrl og linkedinUrls – din route kan bruke det den vil
    body: JSON.stringify({
      companyId: input.companyId,
      websiteUrl: input.websiteUrl ?? null,
      linkedinUrl: input.linkedinUrl ?? null,
      linkedinUrls: input.linkedinUrls ?? null,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `generate-profile failed: ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`
    );
  }

  return res.json();
}

/**
 * Lagrer profilfeltene tilbake i DB.
 *
 * ✅ Light MVP: vi forsøker å oppdatere columns direkte i companies:
 * - problem, solution, why_now, market, product
 *
 * Hvis dine kolonnenavn er annerledes, bytt mappingen under.
 */
export async function saveGeneratedProfile(
  companyId: string,
  profile: GeneratedProfile
) {
  const payload = {
    problem: profile.problem ?? null,
    solution: profile.solution ?? null,
    why_now: profile.whyNow ?? null,
    market: profile.market ?? null,
    product: profile.product ?? null,

    // Valgfritt: metadata for UI / sporbarhet
    profile_generated_at: new Date().toISOString(),
    profile_generated_by: "mcp_agent",
  };

  const { error } = await supabaseAdmin
    .from("companies")
    .update(payload as any)
    .eq("id", companyId);

  if (error) {
    throw new Error(`Failed to save generated profile: ${error.message}`);
  }
}

/**
 * Orkestrering: hent targets → generer → lagre
 */
export async function refreshCompanyProfile(companyId: string) {
  const targets = await getCompanyProfileTargets(companyId);

  // Light validation
  if (!targets.websiteUrl && !targets.linkedinUrl && (!targets.linkedinUrls || targets.linkedinUrls.length === 0)) {
    throw new Error("No website/linkedin url found for company. Add website_url or linkedin_url(s) first.");
  }

  const generated = await callGenerateProfile({
    companyId,
    websiteUrl: targets.websiteUrl,
    linkedinUrl: targets.linkedinUrl,
    linkedinUrls: targets.linkedinUrls,
  });

  await saveGeneratedProfile(companyId, generated);

  return {
    companyId,
    generated,
    savedAt: new Date().toISOString(),
  };
}
