"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { MobileSidebar } from "./MobileSidebar";
import { getPageTitle, isMarketingRoute } from "./nav-config";
import { useAppearance } from "@/lib/use-appearance";

interface AppShellProps {
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

/**
 * AppShell with left sidebar navigation.
 * Ensure UserCompanyProvider wraps the app (e.g. root layout).
 */
export function AppShell({ children, rightSlot }: AppShellProps) {
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useAppearance();

  useEffect(() => {
    const updateCollapsed = () => {
      if (typeof window !== "undefined") {
        setSidebarCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true");
      }
    };

    updateCollapsed();
    
    // Listen for storage changes (when sidebar toggles)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SIDEBAR_COLLAPSED_KEY) {
        updateCollapsed();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Also listen for custom event from Sidebar component
    const handleSidebarToggle = () => updateCollapsed();
    window.addEventListener("sidebar-toggle", handleSidebarToggle);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("sidebar-toggle", handleSidebarToggle);
    };
  }, []);

  const pageTitle = getPageTitle(pathname);
  const marketing = isMarketingRoute(pathname);

  if (marketing) {
    return (
      <div className="min-h-screen">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Desktop Sidebar - visible on lg and above */}
      <Sidebar />

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          "ml-0", // No margin on mobile
          sidebarCollapsed ? "lg:ml-16" : "lg:ml-64" // Margin on desktop
        )}
      >
        {/* Top Bar */}
        <header
          className={cn(
            "sticky top-0 z-30",
            "bg-white/80 dark:bg-slate-950/80",
            "backdrop-blur-sm",
            "border-b border-slate-200 dark:border-slate-800",
            "px-4 sm:px-6 lg:px-8",
            "h-16 flex items-center justify-between gap-4"
          )}
        >
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className={cn(
                "lg:hidden p-2 rounded-lg",
                "hover:bg-slate-100 dark:hover:bg-slate-800",
                "transition-colors"
              )}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </button>

            {/* Page Title */}
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {pageTitle}
            </h1>
          </div>

          {/* Right Slot */}
          {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
