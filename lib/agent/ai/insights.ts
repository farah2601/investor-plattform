// lib/agent/ai/insights.ts

export type InsightResult = {
  insights: string[];
  generatedAt: string;
};

function getBaseUrl() {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/**
 * Tynn adapter mot eksisterende /api/insights
 * Senere kan denne sende KPI + historikk som POST,
 * uten at resten av agenten endres.
 */
export async function generateInsights(): Promise<InsightResult> {
  const baseUrl = getBaseUrl();

  const res = await fetch(`${baseUrl}/api/insights`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Insights generation failed: ${res.status} ${res.statusText}`
    );
  }

  return res.json();
}