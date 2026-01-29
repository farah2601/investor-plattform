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
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return "$" + value.toLocaleString("en-US");
}

function formatPercent(value: number | null): string {
  if (value == null) return "—";
  return value.toFixed(1) + "%";
}

function formatRunway(value: number | null): string {
  if (value == null) return "—";
  return `${value.toFixed(1)} months`;
}

function formatPeriod(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return dateStr.slice(0, 7);
  }
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

const TABLE_COLS = [
  "Period",
  "MRR",
  "ARR",
  "Burn",
  "Net revenue",
  "Booked",
  "Runway",
  "Churn",
  "Growth",
] as const;

export function MetricsDetailsModal({
  companyId,
  open,
  onOpenChange,
  companyName,
}: MetricsDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SnapshotRow[]>([]);
  const [sources, setSources] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    if (!open || !companyId) {
      setRows([]);
      setSources(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRows([]);
    setSources(null);

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
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, companyId]);

  const hasData = rows.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-[calc(100%-2rem)] sm:max-w-3xl max-h-[90vh] flex flex-col overflow-hidden",
          "bg-slate-900 border-slate-700 text-slate-100"
        )}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-slate-100">
            {companyName ? `Metrics basis — ${companyName}` : "Metrics basis"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto -mx-1 px-1">
          {loading && (
            <div className="py-12 text-center text-sm text-slate-400">
              Loading…
            </div>
          )}

          {!loading && error && (
            <div className="py-8 text-center">
              <p className="text-sm text-rose-400">{error}</p>
            </div>
          )}

          {!loading && !error && !hasData && (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-400">
                No snapshot data yet. Sync data or run Valyxo Agent to populate
                metrics.
              </p>
            </div>
          )}

          {!loading && !error && hasData && (
            <div className="space-y-4 pb-2">
              <div className="text-xs text-slate-400">
                <span className="font-medium text-slate-500">Sources:</span>{" "}
                {(
                  [
                    { k: "mrr" as const, label: "MRR" },
                    { k: "arr" as const, label: "ARR" },
                    { k: "burn_rate" as const, label: "Burn" },
                    { k: "net_revenue" as const, label: "Net revenue" },
                    { k: "net_revenue_booked" as const, label: "Booked" },
                    { k: "runway_months" as const, label: "Runway" },
                    { k: "churn" as const, label: "Churn" },
                    { k: "growth" as const, label: "Growth" },
                  ] as const
                )
                  .map(({ k, label }) => {
                    const src =
                      k === "growth"
                        ? sources?.mrr_growth_mom || sources?.growth_percent
                        : sources?.[k];
                    return `${label} · ${src ? sourceLabel(src) : "—"}`;
                  })
                  .join(" · ")}
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/60">
                      {TABLE_COLS.map((col) => (
                        <th
                          key={col}
                          className="px-3 py-2.5 font-medium text-slate-300"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const k = r.kpis || {};
                      const mrr = extractKpiValue(k.mrr);
                      const arr = extractKpiValue(k.arr);
                      const burn = extractKpiValue(k.burn_rate);
                      const netRevenue = extractKpiValue(k.net_revenue);
                      const netRevenueBooked = extractKpiValue(k.net_revenue_booked);
                      const runway = extractKpiValue(k.runway_months);
                      const churn = extractKpiValue(k.churn);
                      const growth =
                        extractKpiValue(k.mrr_growth_mom) ??
                        extractKpiValue(k.growth_percent);
                      return (
                        <tr
                          key={r.period_date}
                          className="border-b border-slate-700/70 last:border-0"
                        >
                          <td className="px-3 py-2.5 font-medium text-slate-200">
                            {formatPeriod(r.period_date)}
                          </td>
                          <td className="px-3 py-2.5 text-slate-300">
                            {formatMoney(mrr)}
                          </td>
                          <td className="px-3 py-2.5 text-slate-300">
                            {formatMoney(arr)}
                          </td>
                          <td className="px-3 py-2.5 text-slate-300">
                            {formatMoney(burn)}
                          </td>
                          <td className="px-3 py-2.5 text-slate-300">
                            {formatMoney(netRevenue)}
                          </td>
                          <td className="px-3 py-2.5 text-slate-300">
                            {formatMoney(netRevenueBooked)}
                          </td>
                          <td className="px-3 py-2.5 text-slate-300">
                            {formatRunway(runway)}
                          </td>
                          <td className="px-3 py-2.5 text-slate-300">
                            {formatPercent(churn)}
                          </td>
                          <td className="px-3 py-2.5 text-slate-300">
                            {formatPercent(growth)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
