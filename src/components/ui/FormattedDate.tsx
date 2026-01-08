"use client";

import { useEffect, useState } from "react";

type FormattedDateProps = {
  date: string | null | undefined;
  options?: Intl.DateTimeFormatOptions;
  fallback?: string;
};

/**
 * Client component for formatting dates to avoid hydration errors.
 * Only renders the formatted date after mount (client-side).
 */
export function FormattedDate({ 
  date, 
  options = {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
  fallback = "—",
}: FormattedDateProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!date) {
    return <>{fallback}</>;
  }

  if (!mounted) {
    // Return a placeholder during SSR to avoid hydration mismatch
    return <span className="opacity-0">{fallback}</span>;
  }

  try {
    const formatted = new Date(date).toLocaleString("en-US", options);
    return <>{formatted}</>;
  } catch (e) {
    console.error("Error formatting date:", e);
    return <>{fallback}</>;
  }
}

