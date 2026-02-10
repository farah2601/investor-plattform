/**
 * Example: Metric Card with Per-Card Details
 * 
 * Shows how to add per-metric drill-down to existing metric cards
 * This is a reference implementation - adapt to your existing card design
 */

"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricDetailsPanel, MetricDetailsButton } from "./MetricDetailsPanel";
import { type MetricDetails } from "@/types/metricDetails";

type MetricCardWithDetailsProps = {
  title: string;
  metric: MetricDetails;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
};

/**
 * Metric Card with built-in Details button
 * 
 * Usage:
 * <MetricCardWithDetails 
 *   title="MRR"
 *   metric={mrrDetails}
 *   trend="up"
 *   trendValue="+12.5%"
 * />
 */
export function MetricCardWithDetails({
  title,
  metric,
  trend,
  trendValue,
}: MetricCardWithDetailsProps) {
  const [showDetails, setShowDetails] = useState(false);

  const statusColors: Record<typeof metric.status, string> = {
    reported: "text-blue-400",
    derived: "text-purple-400",
    missing: "text-gray-500",
    not_applicable: "text-amber-400",
  };

  return (
    <>
      <Card className="relative p-6 bg-slate-900/50 border-slate-700/50 hover:border-slate-600/50 transition-colors">
        {/* Status badge (top-right) */}
        <div className="absolute top-3 right-3">
          {metric.status !== "reported" && (
            <Badge
              variant="secondary"
              className="text-xs bg-slate-800/50 border-slate-600/30"
            >
              {metric.status}
            </Badge>
          )}
        </div>

        {/* Title */}
        <div className="text-sm uppercase tracking-wide text-slate-400 mb-2">
          {title}
        </div>

        {/* Value */}
        <div className="flex items-baseline gap-2 mb-3">
          <div className={`text-3xl font-bold ${statusColors[metric.status]}`}>
            {metric.formattedValue}
          </div>
          {trend && trendValue && (
            <div className="flex items-center gap-1 text-sm">
              {trend === "up" ? (
                <TrendingUp className="h-4 w-4 text-green-400" />
              ) : trend === "down" ? (
                <TrendingDown className="h-4 w-4 text-red-400" />
              ) : null}
              <span
                className={
                  trend === "up"
                    ? "text-green-400"
                    : trend === "down"
                    ? "text-red-400"
                    : "text-slate-400"
                }
              >
                {trendValue}
              </span>
            </div>
          )}
        </div>

        {/* Confidence indicator */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Confidence:{" "}
            <span
              className={
                metric.confidence === "high"
                  ? "text-green-400"
                  : metric.confidence === "medium"
                  ? "text-yellow-400"
                  : "text-orange-400"
              }
            >
              {metric.confidence}
            </span>
          </div>

          {/* Per-card Details button */}
          <MetricDetailsButton onClick={() => setShowDetails(true)} />
        </div>

        {/* Warnings (if any) */}
        {metric.warnings.length > 0 && (
          <div className="mt-3 text-xs text-amber-400/80 italic">
            {metric.warnings[0]}
          </div>
        )}
      </Card>

      {/* Per-metric Details Panel */}
      <MetricDetailsPanel
        metric={metric}
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
      />
    </>
  );
}

/**
 * Example: Key Metrics Grid with Per-Card Details
 * 
 * This shows how to integrate into your existing dashboard
 */
export function KeyMetricsGridExample({ metrics }: { metrics: Record<string, MetricDetails> }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <MetricCardWithDetails
        title="MRR"
        metric={metrics.mrr}
        trend="up"
        trendValue="+8.5%"
      />
      
      <MetricCardWithDetails
        title="ARR"
        metric={metrics.arr}
        trend="up"
        trendValue="+8.5%"
      />
      
      <MetricCardWithDetails
        title="MoM Growth"
        metric={metrics.growth_mom}
        trend="up"
      />
      
      <MetricCardWithDetails
        title="Burn Rate"
        metric={metrics.burn}
      />
      
      <MetricCardWithDetails
        title="Runway"
        metric={metrics.runway}
      />
      
      <MetricCardWithDetails
        title="Churn"
        metric={metrics.churn}
      />
    </div>
  );
}
