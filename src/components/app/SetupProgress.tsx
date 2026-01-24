"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const SETUP_PROGRESS_KEY = "setup-progress-dismissed";

export function SetupProgress() {
  const [isDismissed, setIsDismissed] = useState(false);
  const [progress, setProgress] = useState(16);

  useEffect(() => {
    const dismissed = localStorage.getItem(SETUP_PROGRESS_KEY);
    if (dismissed === "true") {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(SETUP_PROGRESS_KEY, "true");
  };

  if (isDismissed) return null;

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
            {progress}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#2B74FF] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
