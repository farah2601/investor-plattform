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
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SnapshotRow[]>([]);

  useEffect(() => {
    if (!open || !companyId) {
      setRows([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoadingSnapshots(true);
    setError(null);
    setRows([]);

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
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || "Network error");
      })
      .finally(() => {
        if (!cancelled) setLoadingSnapshots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, companyId]);

  const hasData = rows.length > 0;
  const latestKpis = hasData ? (rows[rows.length - 1]?.kpis ?? {}) : {};

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
              {KEY_METRICS.map(({ key, label, format }) => {
                const value = extractKpiValue(latestKpis[key]);
                return (
                  <section
                    key={key}
                    className="rounded-lg border border-slate-700/80 bg-slate-800/40 overflow-hidden"
                  >
                    <div className="px-3 py-2.5 flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-200">{label}</span>
                      <span className="text-slate-100 tabular-nums">
                        {formatValue(value, format)}
                      </span>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
