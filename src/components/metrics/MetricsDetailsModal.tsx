"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type SnapshotRow = {
  period_date: string;
  kpis: Record<string, unknown> | null;
};

type InferenceRow = {
  metric: string;
  value: string | number;
  confidence: "High" | "Medium" | "Low";
  evidence: string;
  whyThisMapping: string;
};

type MetricsDetailsModalProps = {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName?: string;
};

function extractKpiValue(kpi: unknown): number | null {
  if (kpi === null || kpi === undefined) return null;
  if (typeof kpi === "number") return isNaN(kpi) ? null : kpi;
  if (typeof kpi === "object" && kpi !== null && "value" in kpi) {
    const v = (kpi as { value: unknown }).value;
    if (typeof v === "number") return isNaN(v) ? null : v;
    if (v === null) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  }
  const n = Number(kpi);
  return isNaN(n) ? null : n;
}

function formatMoney(value: number | null): string {
  if (value == null) return "—";
  const whole = Math.round(value);
  return "$" + whole.toLocaleString("en-US", { maximumFractionDigits: 0, minimumFractionDigits: 0 });
}

function formatPercent(value: number | null): string {
  if (value == null) return "—";
  return value.toFixed(1) + "%";
}

function formatRunway(value: number | null): string {
  if (value == null) return "—";
  return `${value.toFixed(1)} months`;
}

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

const KEY_METRICS: Array<{
  key: "mrr" | "arr" | "mrr_growth_mom" | "burn_rate" | "runway_months" | "churn";
  label: string;
  format: "money" | "percent" | "runway";
}> = [
  { key: "mrr", label: "MRR", format: "money" },
  { key: "arr", label: "ARR", format: "money" },
  { key: "mrr_growth_mom", label: "Growth", format: "percent" },
  { key: "burn_rate", label: "Burn rate", format: "money" },
  { key: "runway_months", label: "Runway", format: "runway" },
  { key: "churn", label: "Churn", format: "percent" },
];

const INFERENCE_METRIC_TO_KEY: Record<string, (typeof KEY_METRICS)[number]["key"]> = {
  MRR: "mrr",
  ARR: "arr",
  Growth: "mrr_growth_mom",
  Burn: "burn_rate",
  Runway: "runway_months",
  Churn: "churn",
};

function formatValue(
  value: number | null,
  format: "money" | "percent" | "runway"
): string {
  if (value == null) return "—";
  if (format === "money") return formatMoney(value);
  if (format === "percent") return formatPercent(value);
  return formatRunway(value);
}

export function MetricsDetailsModal({
  companyId,
  open,
  onOpenChange,
  companyName,
}: MetricsDetailsModalProps) {
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [loadingInference, setLoadingInference] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SnapshotRow[]>([]);
  const [sources, setSources] = useState<Record<string, string> | null>(null);
  const [inference, setInference] = useState<{
    kpiTable: InferenceRow[];
    altCandidatesConsidered?: string;
    whatDataWouldIncreaseConfidence?: string;
    assumptions?: string[];
  } | null>(null);

  useEffect(() => {
    if (!open || !companyId) {
      setRows([]);
      setSources(null);
      setInference(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoadingSnapshots(true);
    setLoadingInference(true);
    setError(null);
    setRows([]);
    setSources(null);
    setInference(null);

    fetch(`/api/kpi/snapshots?companyId=${encodeURIComponent(companyId)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        if (cancelled) return;
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(json?.error || `Request failed (${res.status})`);
          return;
        }
        if (!json?.ok) {
          setError(json?.error || "Failed to load snapshot data");
          return;
        }
        setRows(Array.isArray(json.rows) ? json.rows : []);
        setSources(
          json.sources && typeof json.sources === "object" ? json.sources : null
        );
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || "Network error");
      })
      .finally(() => {
        if (!cancelled) setLoadingSnapshots(false);
      });

    fetch("/api/agent/metric-inference", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId }),
      cache: "no-store",
    })
      .then(async (res) => {
        if (cancelled) return;
        const json = await res.json().catch(() => ({}));
        if (json?.ok && json?.kpiTable) {
          setInference({
            kpiTable: json.kpiTable,
            altCandidatesConsidered: json.altCandidatesConsidered,
            whatDataWouldIncreaseConfidence: json.whatDataWouldIncreaseConfidence,
            assumptions: json.assumptions,
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingInference(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, companyId]);

  const hasData = rows.length > 0;
  const latestKpis = hasData ? (rows[rows.length - 1]?.kpis ?? {}) : {};
  const inferenceByMetric = (inference?.kpiTable ?? []).reduce(
    (acc, row) => {
      acc[row.metric] = row;
      return acc;
    },
    {} as Record<string, InferenceRow>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden",
          "bg-slate-900 border-slate-700 text-slate-100"
        )}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-slate-100">
            {companyName ? `Metrics — ${companyName}` : "Metrics"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto -mx-1 px-1">
          {(loadingSnapshots && !hasData) && (
            <div className="py-12 text-center text-sm text-slate-400">
              Loading…
            </div>
          )}

          {!loadingSnapshots && error && (
            <div className="py-8 text-center">
              <p className="text-sm text-rose-400">{error}</p>
            </div>
          )}

          {!loadingSnapshots && !error && !hasData && (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-400">
                No snapshot data yet. Sync data or run Valyxo Agent to populate
                metrics.
              </p>
            </div>
          )}

          {!loadingSnapshots && !error && hasData && (
            <div className="space-y-4 pb-6">
              <p className="text-xs text-slate-500">
                Each metric shows how the Valyxo Agent arrived at the value.
              </p>

              {KEY_METRICS.map(({ key, label, format }) => {
                const value = extractKpiValue(latestKpis[key]);
                const sourceKey = key === "mrr_growth_mom" ? "mrr_growth_mom" : key;
                const source = sources?.[sourceKey];
                const inf = inferenceByMetric[label];
                const explanation = inf?.whyThisMapping?.trim()
                  ? inf.whyThisMapping
                  : source
                    ? `Source: ${sourceLabel(source)}.`
                    : "No source or explanation available.";
                const evidence = inf?.evidence?.trim();

                return (
                  <section
                    key={key}
                    className="rounded-lg border border-slate-700/80 bg-slate-800/40 overflow-hidden"
                  >
                    <div className="px-3 py-2.5 border-b border-slate-700/70 flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-200">{label}</span>
                      <span className="text-slate-100 tabular-nums">
                        {formatValue(value, format)}
                      </span>
                    </div>
                    <div className="px-3 py-2.5 text-sm">
                      <p className="font-medium text-slate-400 text-xs uppercase tracking-wide mb-1">
                        How we got this number
                      </p>
                      <p className="text-slate-300 leading-relaxed">
                        {explanation}
                      </p>
                      {evidence && (
                        <p className="mt-1.5 text-xs text-slate-500">
                          Evidence: {evidence}
                        </p>
                      )}
                      {inf?.confidence && (
                        <span
                          className={cn(
                            "inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded",
                            inf.confidence === "High" && "bg-emerald-500/20 text-emerald-400",
                            inf.confidence === "Medium" && "bg-amber-500/20 text-amber-400",
                            inf.confidence === "Low" && "bg-slate-500/20 text-slate-400"
                          )}
                        >
                          Confidence: {inf.confidence}
                        </span>
                      )}
                    </div>
                  </section>
                );
              })}

              {loadingInference && (
                <p className="text-xs text-slate-500 text-center py-2">
                  Loading AI explanations…
                </p>
              )}

              {inference?.assumptions && inference.assumptions.length > 0 && (
                <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 px-3 py-2.5">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                    Assumptions
                  </p>
                  <ul className="text-xs text-slate-400 space-y-0.5 list-disc list-inside">
                    {inference.assumptions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              {inference?.whatDataWouldIncreaseConfidence?.trim() && (
                <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 px-3 py-2.5">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                    What would increase confidence
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {inference.whatDataWouldIncreaseConfidence}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
