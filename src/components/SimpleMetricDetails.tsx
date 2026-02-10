/**
 * Simple Metric Details - Minimal Implementation
 * 
 * NO overengineering. Just displays MetricResult data.
 * Works for all statuses: reported/derived/missing/not_applicable
 */

"use client";

import { X, Info } from "lucide-react";
import { type MetricResult } from "@/types/metricResult";

type SimpleMetricDetailsProps = {
  metric: MetricResult;
  onClose: () => void;
};

const METRIC_LABELS: Record<MetricResult["key"], string> = {
  mrr: "MRR",
  arr: "ARR",
  growth_mom: "MoM Growth",
  burn: "Burn Rate",
  burn_rate: "Burn Rate",
  runway: "Runway",
  runway_months: "Runway",
  churn: "Churn",
  cash: "Cash",
  cash_balance: "Cash Balance",
};

const METRIC_DEFINITIONS: Record<MetricResult["key"], string> = {
  mrr: "Monthly Recurring Revenue: Predictable revenue from subscriptions/contracts",
  arr: "Annual Recurring Revenue: Yearly run-rate (MRR × 12)",
  growth_mom: "Month-over-Month Growth: % change in MRR vs previous month",
  burn: "Cash Outflow (Burn): Net cash spent per month. Zero when profitable.",
  burn_rate: "Cash Outflow (Burn): Net cash spent per month. Zero when profitable.",
  runway: "Runway: Months of operation at current burn. N/A when cash-flow positive.",
  runway_months: "Runway: Months of operation at current burn. N/A when cash-flow positive.",
  churn: "Churn Rate: % of customers lost (lost / starting customers)",
  cash: "Cash on hand.",
  cash_balance: "Cash Balance: Cash on hand.",
};

export function SimpleMetricDetails({ metric, onClose }: SimpleMetricDetailsProps) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-slate-900 shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-700/50 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-50">
            {METRIC_LABELS[metric.key]} Details
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Value */}
          <div>
            <div className="text-sm text-slate-400 mb-1">Current Value</div>
            <div className="text-4xl font-bold text-slate-50 mb-2">
              {metric.formatted}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-slate-800 text-slate-300">
                {metric.status}
              </span>
              <span className={`px-2 py-1 rounded ${
                metric.confidence === "high" ? "bg-green-900/30 text-green-400" :
                metric.confidence === "medium" ? "bg-yellow-900/30 text-yellow-400" :
                "bg-orange-900/30 text-orange-400"
              }`}>
                {metric.confidence} confidence
              </span>
            </div>
          </div>

          {/* Explanation */}
          {metric.explanation && (
            <div>
              <div className="text-sm text-slate-400 mb-2">What This Means</div>
              <p className="text-sm text-slate-300 leading-relaxed">
                {metric.explanation}
              </p>
            </div>
          )}

          {/* Evidence */}
          {metric.evidence && (
            <div>
              <div className="text-sm text-slate-400 mb-2">Source Data</div>
              <div className="bg-slate-800/50 rounded-lg p-3 space-y-2 text-sm">
                {metric.evidence.sheetName && (
                  <div>
                    <span className="text-slate-500">Sheet:</span>{" "}
                    <span className="text-slate-300">{metric.evidence.sheetName}</span>
                  </div>
                )}
                {metric.evidence.range && (
                  <div>
                    <span className="text-slate-500">Range:</span>{" "}
                    <code className="text-cyan-400 font-mono text-xs">{metric.evidence.range}</code>
                  </div>
                )}
                {metric.evidence.inputs && metric.evidence.inputs.length > 0 && (
                  <div>
                    <div className="text-slate-500 mb-1">Inputs:</div>
                    <div className="space-y-1">
                      {metric.evidence.inputs.map((input, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">
                            {input.label} <span className="font-mono text-slate-600">({input.range})</span>
                          </span>
                          <span className="text-slate-300 font-medium">{String(input.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warnings */}
          {metric.warnings && metric.warnings.length > 0 && (
            <div>
              <div className="text-sm text-slate-400 mb-2">Notes</div>
              <div className="space-y-2">
                {metric.warnings.map((warning, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-3 bg-amber-950/20 border border-amber-700/30 rounded">
                    <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-200">{warning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Definition */}
          <div>
            <div className="text-sm text-slate-400 mb-2">Definition</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {METRIC_DEFINITIONS[metric.key]}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Simple Details Button (add to metric cards)
 */
export function SimpleDetailsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
    >
      <Info className="h-3 w-3" />
      Details
    </button>
  );
}
