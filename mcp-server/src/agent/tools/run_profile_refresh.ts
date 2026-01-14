// mcp-server/src/agent/tools/run_profile_refresh.ts
import { supabase } from "../../db/supabase";
import { openai } from "../../llm/openai";
import { env } from "../../env";
import { formatKpisForPrompt } from "../utils/kpi_format";

const DEPLOY_SIGNATURE = "PROFILE_LLM_V1_2026-01-05";

/** Payload som skal skrives til companies-tabellen */
type ProfilePayload = {
  problem: string;
  solution: string;
  why_now: string;
  market: string;
  product_details: string;
};

/** Row-typen vi forventer fra companies */
type CompanyRow = {
  id: string;

  name: string | null;
  industry: string | null;
  stage: string | null;
  description: string | null;

  website: string | null;
  website_url: string | null;

  // kan være jsonb/array/string avhengig av hvordan du lagrer
  linkedin_urls: any;
  latest_insights: any;

  mrr: number | null;
  arr: number | null;
  burn_rate: number | null;
  runway_months: number | null;
  churn: number | null;
  growth_percent: number | null;
};

// Fallback hvis LLM ikke brukes / feiler
const DEMO_PROFILE: ProfilePayload = {
  problem: "Placeholder problem (replace with real generation later).",
  solution: "Placeholder solution (replace with real generation later).",
  why_now: "Placeholder why now (replace with real generation later).",
  market: "Placeholder market summary (replace with real generation later).",
  product_details: "Placeholder product details (replace with real generation later).",
};

function stripCodeFences(s: string) {
  const t = (s ?? "").trim();
  // fjerner ```json ... ``` eller ``` ... ```
  if (t.startsWith("```")) {
    return t.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
  }
  return t;
}

function safeJsonParse(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function coerceString(v: any): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

/**
 * Tåler:
 * - array av strings
 * - json string av array
 * - enkelt string
 * - null/undefined
 */
function safeStringArray(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed) return [];
    // prøv parse som JSON-array
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === "string");
    } catch {
      // ignore
    }
    // fallback: behandle som én url/streng
    return [trimmed];
  }
  return [];
}

export async function runProfileRefresh(input: any) {
  const companyId = input?.companyId as string | undefined;
  if (!companyId) return { ok: false, error: "Missing companyId" };

  // 1) Hent data vi bygger profilen fra (inkludert currency/scale for formatering)
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select(
      [
        "id",
        "name",
        "industry",
        "stage",
        "description",
        "website",
        "website_url",
        "linkedin_urls",
        "latest_insights",
        "mrr",
        "arr",
        "burn_rate",
        "runway_months",
        "churn",
        "growth_percent",
        "kpi_currency",
        "kpi_scale",
      ].join(",")
    )
    .eq("id", companyId)
    .single<CompanyRow>();

  if (companyError) throw companyError;
  if (!company) throw new Error("Company not found");

  console.log(`[runProfileRefresh] DEPLOY_SIGNATURE=${DEPLOY_SIGNATURE}`);
  console.log(`[runProfileRefresh] LLM_PROVIDER env = ${env.LLM_PROVIDER}`);
  console.log(`[runProfileRefresh] process.env.LLM_PROVIDER = ${process.env.LLM_PROVIDER}`);
  console.log(`[runProfileRefresh] hasOpenAIKey = ${!!process.env.OPENAI_API_KEY}`);

  // 2) Velg: LLM eller demo
  let profile: ProfilePayload = { ...DEMO_PROFILE };
  let generatedBy = "demo";

  const websiteUrl = company.website_url || company.website || null;
  const linkedinUrls = safeStringArray(company.linkedin_urls);
  const latestInsights = safeStringArray(company.latest_insights);

  // Format KPIs for prompt
  const kpiStrings = formatKpisForPrompt(company);

  // 3) OpenAI (hvis aktivert)
  if (env.LLM_PROVIDER === "openai") {
    const prompt = `
You are an expert startup analyst writing an investor-ready company narrative.

Company:
- Name: ${company.name ?? "n/a"}
- Industry: ${company.industry ?? "n/a"}
- Stage: ${company.stage ?? "n/a"}
- Description: ${company.description ?? "n/a"}
- Website: ${websiteUrl ?? "n/a"}
- LinkedIn URLs: ${linkedinUrls.length ? linkedinUrls.join(", ") : "n/a"}

KPIs (if present):
- ${kpiStrings.mrr_str}
- ${kpiStrings.arr_str}
- ${kpiStrings.burn_rate_str}
- ${kpiStrings.runway_str}
- ${kpiStrings.churn_str}
- ${kpiStrings.growth_str}

Latest insights (if present):
${latestInsights.length ? latestInsights.join("\n") : "n/a"}

Task:
Generate investor-ready text for these fields:
1) problem
2) solution
3) why_now
4) market
5) product_details

Rules:
- Each field must be 2–5 sentences max (concise, crisp).
- Avoid buzzwords and hype. Be specific.
- Use only information you can infer from the provided data; if something is unknown, write a reasonable neutral version without inventing numbers.
- Output MUST be valid JSON exactly matching this schema:

{
  "problem": "string",
  "solution": "string",
  "why_now": "string",
  "market": "string",
  "product_details": "string"
}

Return ONLY JSON. No markdown. No bullets. No extra keys.
`.trim();

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
      });

      const raw = stripCodeFences(completion.choices?.[0]?.message?.content ?? "");
      const parsed = safeJsonParse(raw);

      // 4) Valider output strengt
      const problem = coerceString(parsed?.problem);
      const solution = coerceString(parsed?.solution);
      const why_now = coerceString(parsed?.why_now);
      const market = coerceString(parsed?.market);
      const product_details = coerceString(parsed?.product_details);

      const ok = !!problem && !!solution && !!why_now && !!market && !!product_details;

      if (!ok) {
        console.warn(`[runProfileRefresh] Invalid LLM JSON. Raw:\n${raw}`);
      } else {
        profile = { problem, solution, why_now, market, product_details };
        generatedBy = "openai";
      }
    } catch (err) {
      console.error("[runProfileRefresh] OpenAI error:", err);
      // fallback beholdes
    }
  } else {
    console.log("[runProfileRefresh] LLM disabled, using demo profile");
  }

  // 5) Skriv til DB (samme felter du allerede har)
  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("companies")
    .update({
      problem: profile.problem,
      solution: profile.solution,
      why_now: profile.why_now,
      market: profile.market,
      product_details: profile.product_details,

      profile_generated_at: now,
      profile_generated_by: generatedBy,
    })
    .eq("id", companyId);

  if (updateError) throw updateError;

  return {
    ok: true,
    companyId,
    updatedFields: profile,
    profile_generated_at: now,
    profile_generated_by: generatedBy,
    deploySignature: DEPLOY_SIGNATURE,
  };
}