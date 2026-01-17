"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "valyxo-theme";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ["light", "dark", "system"].includes(stored)) {
      return stored as Theme;
    }
  } catch {}
  return "dark";
}

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system" && typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

function applyTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  const resolved = resolveTheme(theme);
  // Set on html for global dark mode (affects marketing pages)
  document.documentElement.setAttribute("data-theme", resolved);
  // Also update class for backwards compatibility
  if (resolved === "dark") {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
  } else {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  }
  // Set on #app-shell for app-specific light mode (scoped to app pages only)
  const appShell = document.getElementById("app-shell");
  if (appShell) {
    appShell.setAttribute("data-theme", resolved);
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    applyTheme(theme);
    
    // Listen for system theme changes if using "system"
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme("system");
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, newTheme);
      } catch {}
    }
    applyTheme(newTheme);
  };

  // Return "dark" as default during SSR to prevent hydration mismatch
  return { theme: mounted ? theme : "dark", setTheme };
}
