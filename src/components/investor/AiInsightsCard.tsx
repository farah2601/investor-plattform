"use client";

import { useEffect, useState } from "react";
import { Card } from "../../components/ui/card";
import { cn } from "@/lib/utils";

type AiInsightsResponse = {
  insights: string[];
  generatedAt?: string;
};

export function AiInsightsCard({
  className,
  companyId, // framtidig bruk når vi vil sende company-id til API
}: {
  className?: string;
  companyId?: string;
}) {
  const [data, setData] = useState<AiInsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadInsights() {
      try {
        setLoading(true);
        setError(null);

        // MVP: ingen query-param, bare statisk innsikt
        const res = await fetch("/api/insights");
        if (!res.ok) {
          throw new Error("Kunne ikke hente AI-innsikt");
        }

        const json = (await res.json()) as AiInsightsResponse;
        if (!cancelled) {
          setData(json);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(
            typeof err?.message === "string"
              ? err.message
              : "Ukjent feil ved henting av AI-innsikt"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInsights();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  return (
    <Card
      className={cn(
        "mt-6 space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/10 text-sky-300">
          <span className="text-sm">✦</span>
        </div>
        <h2 className="text-base font-semibold text-white sm:text-lg">
          AI insights
        </h2>
      </div>

      <p className="text-xs text-slate-400">
        Generert av MCP-agenten basert på de siste KPI-ene (MVP placeholder).
      </p>

      {loading && (
        <p className="text-sm text-slate-500">Henter innsikt…</p>
      )}

      {error && !loading && (
        <p className="text-sm text-red-400">
          Klarte ikke å hente AI-innsikt: {error}
        </p>
      )}

      {!loading && !error && data && data.insights.length > 0 && (
        <ul className="space-y-1.5 text-sm text-slate-200">
          {data.insights.map((item, idx) => (
            <li key={idx}>• {item}</li>
          ))}
        </ul>
      )}

      {!loading && !error && (!data || data.insights.length === 0) && (
        <p className="text-sm text-slate-500">
          Ingen AI-innsikt tilgjengelig enda.
        </p>
      )}

      {data?.generatedAt && (
        <p className="mt-2 text-[10px] text-slate-500">
          Oppdatert:{" "}
          {new Date(data.generatedAt).toLocaleString("nb-NO", {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </Card>
  );
}
