"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { type MetricResult } from "@/types/metricResult";
import { authedFetch } from "@/lib/authedFetch";

const METRIC_LABELS: Record<string, string> = {
  mrr: "MRR",
  arr: "ARR",
  burn: "Burn Rate",
  burn_rate: "Burn Rate",
  runway: "Runway",
  runway_months: "Runway",
  churn: "Churn",
  growth_mom: "Growth",
  mrr_growth_mom: "Growth",
  cash: "Cash Balance",
  cash_balance: "Cash Balance",
  net_revenue: "Net Revenue",
  customers: "Customers",
};

function sourceLabel(source: string): string {
  switch (source) {
    case "sheet":
      return "Google Sheets";
    case "stripe":
      return "Stripe";
    case "manual":
      return "Manual";
    case "computed":
      return "Computed";
    default:
      return source;
  }
}

type SimpleMetricDetailsProps = {
  metric: MetricResult;
  onClose: () => void;
  /** When set, fetches LLM explanation for how we got this metric (or why it's missing). */
  companyId?: string | null;
};

export function SimpleMetricDetails({ metric, onClose, companyId }: SimpleMetricDetailsProps) {
  const label = METRIC_LABELS[metric.key] ?? metric.key;
  const status = metric.status ?? "reported";
  const [llmExplanation, setLlmExplanation] = useState<string | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !metric.key) {
      setLlmExplanation(null);
      setLlmError(null);
      return;
    }
    let cancelled = false;
    setLlmLoading(true);
    setLlmError(null);
    setLlmExplanation(null);
    authedFetch("/api/agent/metric-explanation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, metricKey: metric.key }),
      cache: "no-store",
    })
      .then(async (res) => {
        if (cancelled) return;
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.ok && typeof data.explanation === "string") {
          setLlmExplanation(data.explanation);
        } else {
          setLlmError(data?.error || "Could not load explanation");
        }
      })
      .catch((e) => {
        if (!cancelled) setLlmError(e?.message || "Could not load explanation");
      })
      .finally(() => {
        if (!cancelled) setLlmLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, metric.key]);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-slate-900 shadow-2xl z-50 overflow-y-auto">
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-700/50 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-50">
            {label} Details
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          <section>
            <h3 className="text-sm uppercase tracking-wide text-slate-400 mb-3">
              Summary
            </h3>
            <Card className="p-4 bg-slate-800/50 border-slate-700/50">
              <div className="text-3xl font-bold text-slate-50">
                {metric.formatted ?? (metric.value != null ? String(metric.value) : "—")}
              </div>
              {status && (
                <div className="mt-2">
                  <span className="text-xs px-2 py-1 rounded bg-slate-700/50 text-slate-400">
                    {status}
                  </span>
                </div>
              )}
            </Card>
          </section>

          {(metric.key === "arr" && (metric.arr_type || metric.arr_months_used != null || metric.arr_method)) && (
            <section>
              <h3 className="text-sm uppercase tracking-wide text-slate-400 mb-3">
                ARR type
              </h3>
              <div className="text-sm text-slate-300 space-y-1">
                {metric.arr_type === "observed_arr" && (
                  <p>ARR (observed): based on multiple months of data.</p>
                )}
                {metric.arr_type === "run_rate_arr" && (
                  <p>ARR (run-rate): annualized from current MRR. Not contract-backed.</p>
                )}
                {metric.arr_months_used != null && (
                  <p>Months used: {metric.arr_months_used}.</p>
                )}
                {metric.arr_method && (
                  <p>Method: {metric.arr_method === "averaged" ? "Averaged MRR over the period, then × 12." : "Latest MRR × 12."}</p>
                )}
              </div>
            </section>
          )}

          {(metric.source || metric.explanation) && (
            <section>
              <h3 className="text-sm uppercase tracking-wide text-slate-400 mb-3">
                What This Means
              </h3>
              {metric.source && (
                <p className="text-sm text-slate-300 mb-2">
                  Source: {sourceLabel(metric.source)}
                </p>
              )}
              {metric.explanation && (
                <p className="text-sm text-slate-300 leading-relaxed">
                  {metric.explanation}
                </p>
              )}
            </section>
          )}

          {(companyId && metric.key) && (
            <section>
              <h3 className="text-sm uppercase tracking-wide text-slate-400 mb-3">
                How we calculated this
              </h3>
              {llmLoading && (
                <p className="text-sm text-slate-500 italic">Loading explanation…</p>
              )}
              {llmError && !llmLoading && (
                <p className="text-sm text-amber-400">{llmError}</p>
              )}
              {llmExplanation && !llmLoading && (
                <p className="text-sm text-slate-300 leading-relaxed">
                  {llmExplanation}
                </p>
              )}
            </section>
          )}

          {metric.warnings && metric.warnings.length > 0 && (
            <section>
              <h3 className="text-sm uppercase tracking-wide text-slate-400 mb-3">
                Notes
              </h3>
              <div className="space-y-2">
                {metric.warnings.map((w, i) => (
                  <div
                    key={i}
                    className="text-sm p-3 rounded-lg bg-amber-950/20 border border-amber-700/30 text-amber-200"
                  >
                    {w}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
