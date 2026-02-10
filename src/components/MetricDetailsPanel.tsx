/**
 * Per-Metric Details Panel
 * 
 * Reusable component that displays comprehensive details for a single metric
 * Sections: Summary → Explanation → Methodology → Evidence → Checks → Definition
 */

"use client";

import { useState } from "react";
import { X, Info, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { type MetricDetails } from "@/types/metricDetails";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type MetricDetailsPanelProps = {
  metric: MetricDetails;
  isOpen: boolean;
  onClose: () => void;
};

export function MetricDetailsPanel({ metric, isOpen, onClose }: MetricDetailsPanelProps) {
  if (!isOpen) return null;

  const metricLabels: Record<typeof metric.metric, string> = {
    mrr: "MRR",
    arr: "ARR",
    growth_mom: "MoM Growth",
    burn: "Burn Rate",
    runway: "Runway",
    churn: "Churn Rate",
  };

  const statusColors: Record<typeof metric.status, string> = {
    reported: "bg-blue-600/20 text-blue-300 border-blue-500/30",
    derived: "bg-purple-600/20 text-purple-300 border-purple-500/30",
    missing: "bg-gray-600/20 text-gray-400 border-gray-500/30",
    not_applicable: "bg-amber-600/20 text-amber-300 border-amber-500/30",
  };

  const confidenceColors: Record<typeof metric.confidence, string> = {
    high: "text-green-400",
    medium: "text-yellow-400",
    low: "text-orange-400",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-slate-900 shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-700/50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-50">
              {metricLabels[metric.metric]} Details
            </h2>
            <Badge className={`${statusColors[metric.status]} border`}>
              {metric.status}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* A) Summary: Value + Status + Confidence */}
          <section>
            <h3 className="text-sm uppercase tracking-wide text-slate-400 mb-3">
              Summary
            </h3>
            <Card className="p-4 bg-slate-800/50 border-slate-700/50">
              <div className="flex items-baseline gap-3">
                <div className="text-3xl font-bold text-slate-50">
                  {metric.formattedValue}
                </div>
                {metric.period && (
                  <div className="text-sm text-slate-400">
                    {metric.period}
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-slate-500">Confidence:</span>
                <span className={`text-xs font-medium ${confidenceColors[metric.confidence]}`}>
                  {metric.confidence.toUpperCase()}
                </span>
              </div>
            </Card>
          </section>

          {/* B) What This Means */}
          <section>
            <h3 className="text-sm uppercase tracking-wide text-slate-400 mb-3">
              What This Means
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {metric.explanation}
            </p>
          </section>

          {/* C) How It Was Calculated */}
          <section>
            <h3 className="text-sm uppercase tracking-wide text-slate-400 mb-3">
              How It Was Calculated
            </h3>
            <Card className="p-4 bg-slate-800/30 border-slate-700/50 space-y-3">
              <div>
                <div className="text-xs text-slate-500 mb-1">Methodology</div>
                <p className="text-sm text-slate-300">{metric.methodology}</p>
              </div>
              
              {metric.formula && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">Formula</div>
                  <code className="text-sm font-mono text-cyan-400 bg-slate-950/50 px-2 py-1 rounded">
                    {metric.formula}
                  </code>
                </div>
              )}
            </Card>
          </section>

          {/* D) Evidence: Provenance + Inputs */}
          {(metric.provenance || (metric.inputs && metric.inputs.length > 0)) && (
            <section>
              <h3 className="text-sm uppercase tracking-wide text-slate-400 mb-3">
                Evidence & Sources
              </h3>
              <Card className="p-4 bg-slate-800/30 border-slate-700/50 space-y-4">
                {/* Provenance (for reported metrics) */}
                {metric.provenance && (
                  <div>
                    <div className="text-xs text-slate-500 mb-2">Source</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Sheet:</span>
                        <span className="text-slate-200 font-medium">
                          {metric.provenance.sheetName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Range:</span>
                        <code className="text-cyan-400 bg-slate-950/50 px-2 py-0.5 rounded text-xs font-mono">
                          {metric.provenance.range}
                        </code>
                      </div>
                      {metric.provenance.source && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Type:</span>
                          <Badge variant="secondary" className="text-xs">
                            {metric.provenance.source}
                          </Badge>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        Updated: {new Date(metric.provenance.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Inputs (for derived metrics) */}
                {metric.inputs && metric.inputs.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-500 mb-2">Calculation Inputs</div>
                    <div className="space-y-2">
                      {metric.inputs.map((input, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-slate-950/30 rounded"
                        >
                          <div className="flex-1">
                            <div className="text-sm text-slate-300">{input.label}</div>
                            <div className="text-xs text-slate-500 font-mono">
                              Range: {input.range}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-slate-200 font-medium">
                              {typeof input.parsedValue === "number"
                                ? input.parsedValue.toLocaleString()
                                : input.parsedValue}
                            </div>
                            <div className="text-xs text-slate-500">
                              Raw: {String(input.rawValue)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </section>
          )}

          {/* E) Checks & Flags */}
          {(metric.sanityChecks.length > 0 || metric.warnings.length > 0) && (
            <section>
              <h3 className="text-sm uppercase tracking-wide text-slate-400 mb-3">
                Quality Checks & Warnings
              </h3>
              <Card className="p-4 bg-slate-800/30 border-slate-700/50 space-y-3">
                {/* Sanity Checks */}
                {metric.sanityChecks.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-500 mb-2">Sanity Checks</div>
                    <div className="space-y-2">
                      {metric.sanityChecks.map((check, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 text-sm"
                        >
                          {check.passed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className={check.passed ? "text-slate-300" : "text-red-300"}>
                              {check.name}
                            </div>
                            {check.note && (
                              <div className="text-xs text-slate-500 mt-0.5">
                                {check.note}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {metric.warnings.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Warnings
                    </div>
                    <div className="space-y-2">
                      {metric.warnings.map((warning, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-2 bg-amber-950/20 border border-amber-700/30 rounded"
                        >
                          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-sm text-amber-200">{warning}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </section>
          )}

          {/* F) Definition */}
          <section>
            <h3 className="text-sm uppercase tracking-wide text-slate-400 mb-3">
              Definition
            </h3>
            <Card className="p-4 bg-slate-800/20 border-slate-700/50">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-300 leading-relaxed">
                  {metric.definition}
                </p>
              </div>
            </Card>
          </section>
        </div>
      </div>
    </>
  );
}

/**
 * Metric Details Button (to add to each card)
 */
type MetricDetailsButtonProps = {
  onClick: () => void;
  variant?: "subtle" | "prominent";
};

export function MetricDetailsButton({ onClick, variant = "subtle" }: MetricDetailsButtonProps) {
  if (variant === "prominent") {
    return (
      <Button
        onClick={onClick}
        size="sm"
        variant="outline"
        className="text-xs border-slate-600 hover:border-slate-500 hover:bg-slate-800"
      >
        <Info className="h-3 w-3 mr-1" />
        Details
      </Button>
    );
  }

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
