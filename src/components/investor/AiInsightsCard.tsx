"use client";

import { Card } from "../../components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  insights?: string[] | null;
  lastAgentRunAt?: string | null;
  lastAgentRunBy?: string | null;
  onRunAgent?: () => Promise<void> | void; // brukes i steg 2 (knapp)
  running?: boolean; // brukes i steg 2 (loading state)
};

export function AiInsightsCard({
  className,
  insights,
  lastAgentRunAt,
  lastAgentRunBy,
  onRunAgent,
  running,
}: Props) {
  const hasInsights = Array.isArray(insights) && insights.length > 0;

  return (
    <Card
      className={cn(
        "mt-6 space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/10 text-sky-300">
            <span className="text-sm">✦</span>
          </div>
          <h2 className="text-base font-semibold text-white sm:text-lg">
            AI insights
          </h2>
        </div>

        {/* Steg 2: knapp (valgfri) */}
        {onRunAgent && (
          <button
            onClick={() => onRunAgent()}
            disabled={!!running}
            className={cn(
              "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white hover:bg-white/10",
              running && "opacity-60 cursor-not-allowed"
            )}
          >
            {running ? "Kjører…" : "Run Valyxo Agent"}
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Powered by Valyxo Agent (lagret i database).
      </p>

      {hasInsights ? (
        <ul className="space-y-1.5 text-sm text-slate-200">
          {insights!.map((item, idx) => (
            <li key={idx}>• {item}</li>
          ))}
        </ul>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-slate-500">
            Ingen AI-innsikt tilgjengelig enda.
          </p>

          {/* CTA hvis du vil */}
          {onRunAgent && (
            <p className="text-xs text-slate-400">
              Trykk “Run Valyxo Agent” for å generere første innsikt.
            </p>
          )}
        </div>
      )}

      <p className="mt-2 text-[10px] text-slate-500">
        {lastAgentRunAt ? (
          <>
            Last updated · {lastAgentRunBy || "valyxo-agent"} ·{" "}
            {new Date(lastAgentRunAt).toLocaleString("nb-NO", {
              year: "numeric",
              month: "short",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </>
        ) : (
          <>Last updated · aldri</>
        )}
      </p>
    </Card>
  );
}