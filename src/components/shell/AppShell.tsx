"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, X, ChevronDown } from "lucide-react";
import { useCompany } from "@/lib/company-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAppearance } from "@/lib/use-appearance";

type LogoSize = "sm" | "md" | "lg" | "xl";

type NavItem = {
  label: string;
  href: string;
};

function Logo({ size = "lg" }: { size?: LogoSize }) {
  const cfg =
    size === "sm"
      ? { h: 28, className: "h-7" }
      : size === "md"
      ? { h: 34, className: "h-8" }
      : size === "xl"
      ? { h: 46, className: "h-11" }
      : { h: 40, className: "h-10" }; // lg default

  return (
    <div className="flex items-center gap-3">
      <Image
        src="/favicon.svg"
        alt="Valyxo"
        height={cfg.h}
        width={cfg.h * 4.0}
        priority
        className={cn(cfg.className, "w-auto select-none object-contain opacity-100")}
      />
    </div>
  );
}

export function AppShell({
  title,
  children,
  logoSize = "lg",
  nav = [
    { label: "Dashboard", href: "/company-dashboard" },
    { label: "Profile", href: "/company-profile" },
    { label: "Investor View", href: "/investor" },
  ],
  showNav = true,
  rightSlot,
}: {
  title?: string;
  children: React.ReactNode;
  logoSize?: LogoSize;
  nav?: NavItem[];
  showNav?: boolean;
  rightSlot?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [companySwitcherOpen, setCompanySwitcherOpen] = useState(false);
  const companySwitcherRef = useRef<HTMLDivElement>(null);
  
  // Initialize appearance settings (applies data attributes to #app-shell)
  useAppearance();
  
  // Get company context (optional - will be null if not in CompanyProvider)
  let activeCompany: { id: string; name: string; logoUrl: string | null; headerStyle?: "minimal" | "branded" } | null = null;
  let companies: Array<{ id: string; name: string; logoUrl: string | null }> = [];
  let refreshActiveCompany: (() => Promise<void>) | null = null;
  let setActiveCompanyFromContext: ((company: { id: string; name: string; logoUrl: string | null; headerStyle?: "minimal" | "branded"; brandColor?: string | null } | null) => void) | null = null;
  
  try {
    const companyContext = useCompany();
    activeCompany = companyContext.activeCompany;
    companies = companyContext.companies;
    refreshActiveCompany = companyContext.refreshActiveCompany;
    // Type assertion needed because we're using a simplified type in AppShell
    setActiveCompanyFromContext = companyContext.setActiveCompany as (company: { id: string; name: string; logoUrl: string | null; headerStyle?: "minimal" | "branded" } | null) => void;
  } catch {
    // Not in CompanyProvider context - that's ok for some pages
  }
  
  // Determine header style (default to minimal if not set)
  const headerStyle = activeCompany?.headerStyle || "minimal";
  const isBranded = headerStyle === "branded";
  
  // Expose refresh function globally for settings page to call after logo upload
  useEffect(() => {
    if (typeof window !== "undefined" && refreshActiveCompany) {
      (window as any).refreshActiveCompany = refreshActiveCompany;
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).refreshActiveCompany;
      }
    };
  }, [refreshActiveCompany]);
  
  // Update active company when URL changes
  useEffect(() => {
    if (!refreshActiveCompany || !setActiveCompanyFromContext) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const companyIdFromUrl = urlParams.get("companyId") || urlParams.get("company");
    
    if (companyIdFromUrl && activeCompany && activeCompany.id !== companyIdFromUrl) {
      // Company ID in URL changed - refresh or switch
      const company = companies.find(c => c.id === companyIdFromUrl);
      if (company) {
        setActiveCompanyFromContext(company);
      } else {
        // Company not in list, refresh from server
        refreshActiveCompany();
      }
    }
  }, [pathname, companies, activeCompany, refreshActiveCompany, setActiveCompanyFromContext]);
  
  // Close company switcher when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (companySwitcherRef.current && !companySwitcherRef.current.contains(event.target as Node)) {
        setCompanySwitcherOpen(false);
      }
    }
    
    if (companySwitcherOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [companySwitcherOpen]);

  // Close menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Initialize theme on #app-shell on mount (FOUC prevention)
  useEffect(() => {
    const appShell = document.getElementById("app-shell");
    if (!appShell) return;

    const KEY = "valyxo-theme";
    function get() {
      try {
        const s = localStorage.getItem(KEY);
        if (s && ["light","dark","system"].includes(s)) return s;
      } catch(e) {}
      return "dark";
    }
    function resolve(t: string) {
      if (t === "system") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      return t;
    }
    const pref = get();
    const res = resolve(pref);
    appShell.setAttribute("data-theme", res);
  }, []);

  return (
    <div id="app-shell" className="min-h-screen bg-slate-950 text-slate-50 light:bg-white light:text-slate-950">
      {/* background glow - only show in dark mode */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(1200px_600px_at_20%_0%,rgba(43,116,255,0.10),transparent_55%),radial-gradient(900px_500px_at_80%_20%,rgba(43,116,255,0.06),transparent_60%)] light:hidden" />

      {/* header */}
      <header className="sticky top-0 z-50 border-b border-slate-900/30 bg-slate-950/30 backdrop-blur light:border-slate-200/50 light:bg-white/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-4 sm:gap-10 shrink-0">
              {/* Company Logo/Name or Valyxo Logo */}
              <div ref={companySwitcherRef} className="relative shrink-0">
                {activeCompany ? (
                  <button
                    onClick={() => setCompanySwitcherOpen(!companySwitcherOpen)}
                    className={cn(
                      "flex items-center hover:opacity-80 transition-opacity group",
                      isBranded ? "gap-3 sm:gap-4" : "gap-2 sm:gap-3"
                    )}
                  >
                    <div className="relative flex items-center gap-2">
                      {activeCompany.logoUrl ? (
                        <img
                          src={activeCompany.logoUrl}
                          alt={activeCompany.name}
                          className={cn(
                            "w-auto object-contain",
                            isBranded 
                              ? "h-10 sm:h-12 max-w-[160px]" 
                              : "h-8 max-w-[120px]"
                          )}
                          onError={(e) => {
                            // Hide image on error, show fallback
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              const fallback = parent.querySelector('.logo-fallback') as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div 
                        className={cn(
                          "logo-fallback flex items-center justify-center rounded-full bg-[#2B74FF] text-white font-medium",
                          activeCompany.logoUrl 
                            ? isBranded ? "h-10 w-10 sm:h-12 sm:w-12 hidden" : "h-8 w-8 hidden"
                            : isBranded ? "h-10 sm:h-12 px-4 text-base" : "h-8 px-3 text-sm"
                        )}
                      >
                        {activeCompany.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    {/* Show company name - always in branded mode, conditionally in minimal mode */}
                    <span className={cn(
                      "font-medium text-slate-50 light:text-slate-950 truncate",
                      isBranded 
                        ? "text-base sm:text-lg max-w-[240px]" 
                        : "hidden sm:inline-block text-sm max-w-[200px]"
                    )}>
                      {activeCompany.name}
                    </span>
                    <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-300 transition-colors" />
                  </button>
                ) : (
                  <Link href="/" className="shrink-0" onClick={() => setMobileMenuOpen(false)}>
                    <Logo size={logoSize} />
                  </Link>
                )}
                
                {/* Company Switcher Dropdown */}
                {companySwitcherOpen && activeCompany && (
                  <div className="absolute top-full left-0 mt-2 w-64 rounded-lg border border-slate-700/50 bg-slate-900/95 backdrop-blur-sm shadow-xl z-50 light:bg-white light:border-slate-200">
                    <div className="py-1">
                      {/* Current Company */}
                      <div className="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider light:text-slate-600">
                        Current Company
                      </div>
                      <div className="px-4 py-2 text-sm text-slate-200 light:text-slate-900 bg-slate-800/30 light:bg-slate-100">
                        <div className="flex items-center gap-2">
                          {activeCompany.logoUrl ? (
                            <img
                              src={activeCompany.logoUrl}
                              alt={activeCompany.name}
                              className="h-6 w-6 rounded object-contain"
                            />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-[#2B74FF] flex items-center justify-center text-xs text-white font-medium">
                              {activeCompany.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium">{activeCompany.name}</span>
                        </div>
                      </div>
                      
                      {/* Divider */}
                      <div className="my-1 border-t border-slate-700/50 light:border-slate-200" />
                      
                      {/* Other Companies */}
                      {companies.length > 1 && (
                        <>
                          <div className="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider light:text-slate-600">
                            Switch Company
                          </div>
                          {companies
                            .filter(c => c.id !== activeCompany!.id)
                            .map((company) => (
                              <button
                                key={company.id}
                                onClick={() => {
                                  // If on overview page, stay on overview; otherwise go to dashboard
                                  const targetPath = pathname === "/overview" 
                                    ? `/overview?companyId=${company.id}`
                                    : `/company-dashboard?companyId=${company.id}`;
                                  router.push(targetPath);
                                  setCompanySwitcherOpen(false);
                                }}
                                className="w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-800/50 hover:text-white transition-colors text-left light:text-slate-700 light:hover:bg-slate-100"
                              >
                                <div className="flex items-center gap-2">
                                  {company.logoUrl ? (
                                    <img
                                      src={company.logoUrl}
                                      alt={company.name}
                                      className="h-6 w-6 rounded object-contain"
                                    />
                                  ) : (
                                    <div className="h-6 w-6 rounded-full bg-[#2B74FF] flex items-center justify-center text-xs text-white font-medium">
                                      {company.name.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <span>{company.name}</span>
                                </div>
                              </button>
                            ))}
                          <div className="my-1 border-t border-slate-700/50 light:border-slate-200" />
                        </>
                      )}
                      
                      {/* Company Settings Link */}
                      <Link
                        href={activeCompany ? `/company-settings?companyId=${activeCompany.id}&section=branding` : "/company-settings"}
                        onClick={() => setCompanySwitcherOpen(false)}
                        className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-800/50 hover:text-white transition-colors light:text-slate-700 light:hover:bg-slate-100"
                      >
                        Company settings
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop nav */}
              {showNav && (
                <nav className="hidden md:flex items-center gap-6">
                  {nav.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href !== "/" && pathname?.startsWith(item.href + "/"));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "text-sm font-medium transition-colors",
                          active
                            ? "text-slate-100 light:text-slate-950"
                            : "text-slate-400 hover:text-slate-200 light:text-slate-700 light:hover:text-slate-950"
                        )}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              )}
            </div>

            <div className="flex items-center gap-3">
              {rightSlot ? rightSlot : title ? (
                <div className="hidden sm:block text-sm text-slate-400 light:text-slate-600">{title}</div>
              ) : null}
              
              {/* Mobile menu button */}
              {showNav && (
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 text-slate-400 hover:text-slate-200 light:text-slate-700 light:hover:text-slate-950 transition-colors relative z-50"
                  aria-label="Toggle menu"
                  aria-expanded={mobileMenuOpen}
                >
                  {mobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay - only show when open */}
      {showNav && mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/95 backdrop-blur-sm z-[60] md:hidden light:bg-slate-900/95"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-in menu */}
          <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-slate-950 border-l border-slate-900/70 z-[70] md:hidden shadow-2xl overflow-y-auto light:bg-white light:border-slate-200/70">
            <div className="flex flex-col h-full">
              {/* Menu header */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-900/70 bg-slate-950 light:border-slate-200/70 light:bg-white">
                <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                  <Logo size={logoSize} />
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-200 light:text-slate-600 light:hover:text-slate-800 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Menu items - separate list for mobile (not reusing desktop nav) */}
              <nav className="flex-1 px-4 sm:px-6 py-6 space-y-1 bg-slate-950 light:bg-white">
                {nav.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/" && pathname?.startsWith(item.href + "/"));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "block px-4 py-3 rounded-lg text-base font-medium transition-colors",
                        active
                          ? "bg-slate-800/50 text-slate-100"
                          : "text-slate-400 hover:bg-slate-800/30 hover:text-slate-200"
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}

                {/* Additional links */}
                <div className="border-t border-slate-900/70 my-2 light:border-slate-200/70" />
                
                <Link
                  href="/companies"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 rounded-lg text-base font-medium text-slate-400 hover:bg-slate-800/30 hover:text-slate-200 transition-colors"
                >
                  Companies
                </Link>

                <Link
                  href="/logout"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 rounded-lg text-base font-medium text-slate-400 hover:bg-slate-800/30 hover:text-slate-200 transition-colors"
                >
                  Sign out
                </Link>
              </nav>

              {/* Menu footer (optional) */}
              {title && (
                <div className="px-4 sm:px-6 py-4 border-t border-slate-900/70 bg-slate-950 light:border-slate-200/70 light:bg-white">
                  <p className="text-sm text-slate-400 light:text-slate-600">{title}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* content */}
      <main className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">{children}</main>
    </div>
  );
}