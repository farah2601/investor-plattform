// lib/agent/data/fetchCompanyData.ts

import type { RawCompanyData } from "../kpiEngine";

export type FetchCompanyDataResult = {
  companyId: string;
  source: "mock";
  data: RawCompanyData;
  fetchedAt: string;
};

function getBaseUrl() {
  // Best practice for server-side fetch in Next/Vercel
  if (process.env.BASE_URL) return process.env.BASE_URL; // set in env
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // auto on Vercel
  return "http://localhost:3000"; // local fallback
}

/**
 * Standard entrypoint for raw company data.
 * I 3.2 bruker vi mock-integrasjonen. Senere bytter vi source uten å endre agent-pipeline.
 */
export async function fetchCompanyData(
  companyId: string
): Promise<FetchCompanyDataResult> {
  const baseUrl = getBaseUrl();

  const res = await fetch(`${baseUrl}/api/integrations/mock/fetch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyId }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Mock fetch failed: ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`
    );
  }

  return res.json();
}
