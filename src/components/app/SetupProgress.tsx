"use client";

import { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserCompany } from "@/lib/user-company-context";
import { supabase } from "@/app/lib/supabaseClient";

const SETUP_PROGRESS_KEY = "setup-progress-dismissed";

type SetupData = {
  name: string | null;
  description: string | null;
  mrr: number | null;
  arr: number | null;
  burn_rate: number | null;
  runway_months: number | null;
  churn: number | null;
  growth_percent: number | null;
};

function computeProgress(data: SetupData | null): number {
  if (!data) return 0;
  const profileFilled = !!(data.name?.trim() && data.description?.trim());
  const metrics = [
    data.mrr,
    data.arr,
    data.burn_rate,
    data.runway_months,
    data.churn,
    data.growth_percent,
  ];
  const metricsFilled = metrics.some((v) => v != null && !Number.isNaN(v));
  const step = 50;
  return (profileFilled ? step : 0) + (metricsFilled ? step : 0);
}

export function SetupProgress() {
  const { company, loading: userCompanyLoading } = useUserCompany();
  const [isDismissed, setIsDismissed] = useState(false);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(SETUP_PROGRESS_KEY);
    if (dismissed === "true") {
      setIsDismissed(true);
    }
  }, []);

  useEffect(() => {
    if (!company?.id || userCompanyLoading) {
      setSetupData(null);
      return;
    }
    let cancelled = false;
    setLoadingData(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from("companies")
          .select("name, description, mrr, arr, burn_rate, runway_months, churn, growth_percent")
          .eq("id", company.id)
          .maybeSingle();

        if (cancelled) return;
        if (error) {
          setSetupData(null);
          return;
        }
        setSetupData({
          name: (data as any)?.name ?? null,
          description: (data as any)?.description ?? null,
          mrr: (data as any)?.mrr ?? null,
          arr: (data as any)?.arr ?? null,
          burn_rate: (data as any)?.burn_rate ?? null,
          runway_months: (data as any)?.runway_months ?? null,
          churn: (data as any)?.churn ?? null,
          growth_percent: (data as any)?.growth_percent ?? null,
        });
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [company?.id, userCompanyLoading]);

  const progress = useMemo(() => computeProgress(setupData), [setupData]);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(SETUP_PROGRESS_KEY, "true");
  };

  if (isDismissed) return null;

  const showProgress = !userCompanyLoading && (company?.id != null);
  const displayProgress = showProgress && !loadingData ? progress : 0;

  return (
    <div
      className={cn(
        "px-3 py-2.5 rounded-lg",
        "bg-slate-50 dark:bg-slate-800/50",
        "border border-slate-200 dark:border-slate-700",
        "relative"
      )}
    >
      <button
        onClick={handleDismiss}
        className={cn(
          "absolute top-2 right-2 p-1 rounded",
          "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
          "hover:bg-slate-100 dark:hover:bg-slate-700",
          "transition-colors"
        )}
        aria-label="Don't show this again"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="pr-6">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Setup completion
          </span>
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-50">
            {displayProgress}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#2B74FF] transition-all duration-300"
            style={{ width: `${displayProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
