"use client";

import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { SetupProgress } from "./SetupProgress";
import { SidebarNav } from "./SidebarNav";
import { UserMenu } from "./UserMenu";
import Image from "next/image";

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    }
    return false;
  });

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    if (typeof window !== "undefined") {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newState));
      // Dispatch custom event to notify AppShell
      window.dispatchEvent(new Event("sidebar-toggle"));
    }
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 h-screen",
        "bg-white dark:bg-slate-950",
        "border-r border-slate-200 dark:border-slate-800",
        "transition-all duration-300 ease-in-out",
        "shadow-lg",
        "flex flex-col",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-4",
          "border-b border-slate-200 dark:border-slate-800",
          isCollapsed && "justify-center"
        )}
      >
        {!isCollapsed ? (
          <Image
            src="/favicon.svg"
            alt="Valyxo"
            height={32}
            width={128}
            priority
            className="h-8 w-auto select-none object-contain"
          />
        ) : (
          <div className="h-8 w-8 rounded bg-[#2B74FF] flex items-center justify-center">
            <span className="text-white text-xs font-bold">V</span>
          </div>
        )}
      </div>

      {/* Setup Progress */}
      {!isCollapsed && (
        <div className="px-3 pt-4">
          <SetupProgress />
        </div>
      )}

      {/* Navigation */}
      <SidebarNav isCollapsed={isCollapsed} />

      {/* Footer */}
      <div
        className={cn(
          "mt-auto border-t border-slate-200 dark:border-slate-800",
          "p-3 space-y-2"
        )}
      >
        {!isCollapsed && <UserMenu />}
        <button
          onClick={toggleCollapse}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg",
            "text-sm text-slate-600 dark:text-slate-400",
            "hover:bg-slate-50 dark:hover:bg-slate-800",
            "transition-colors",
            isCollapsed && "justify-center"
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <>
              <PanelLeftClose className="h-5 w-5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
