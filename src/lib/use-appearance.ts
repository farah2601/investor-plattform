"use client";

import { useEffect, useState } from "react";

type LayoutDensity = "compact" | "comfortable";
type FontSize = "small" | "default" | "large";

const DENSITY_STORAGE_KEY = "valyxo-layout-density";
const FONT_SIZE_STORAGE_KEY = "valyxo-font-size";

function getStoredDensity(): LayoutDensity {
  if (typeof window === "undefined") return "comfortable";
  try {
    const stored = localStorage.getItem(DENSITY_STORAGE_KEY);
    if (stored && ["compact", "comfortable"].includes(stored)) {
      return stored as LayoutDensity;
    }
  } catch {}
  return "comfortable";
}

function getStoredFontSize(): FontSize {
  if (typeof window === "undefined") return "default";
  try {
    const stored = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    if (stored && ["small", "default", "large"].includes(stored)) {
      return stored as FontSize;
    }
  } catch {}
  return "default";
}

function applyAppearance(density: LayoutDensity, fontSize: FontSize) {
  if (typeof window === "undefined") return;
  
  const appShell = document.getElementById("app-shell");
  if (appShell) {
    appShell.setAttribute("data-layout-density", density);
    appShell.setAttribute("data-font-size", fontSize);
  }
}

export function useAppearance() {
  const [density, setDensityState] = useState<LayoutDensity>(() => getStoredDensity());
  const [fontSize, setFontSizeState] = useState<FontSize>(() => getStoredFontSize());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    applyAppearance(density, fontSize);
  }, [density, fontSize]);

  const setDensity = (newDensity: LayoutDensity) => {
    setDensityState(newDensity);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(DENSITY_STORAGE_KEY, newDensity);
      } catch {}
    }
    applyAppearance(newDensity, fontSize);
  };

  const setFontSize = (newFontSize: FontSize) => {
    setFontSizeState(newFontSize);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(FONT_SIZE_STORAGE_KEY, newFontSize);
      } catch {}
    }
    applyAppearance(density, newFontSize);
  };

  // Return defaults during SSR to prevent hydration mismatch
  return {
    density: mounted ? density : "comfortable",
    fontSize: mounted ? fontSize : "default",
    setDensity,
    setFontSize,
  };
}
