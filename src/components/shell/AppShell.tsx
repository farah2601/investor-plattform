"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* background glow */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(1200px_600px_at_20%_0%,rgba(43,116,255,0.10),transparent_55%),radial-gradient(900px_500px_at_80%_20%,rgba(43,116,255,0.06),transparent_60%)]" />

      {/* header */}
      <header className="sticky top-0 z-50 border-b border-slate-900/70 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-4 sm:gap-10 shrink-0">
              <Link href="/" className="shrink-0" onClick={() => setMobileMenuOpen(false)}>
                <Logo size={logoSize} />
              </Link>

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
                            ? "text-slate-100"
                            : "text-slate-400 hover:text-slate-200"
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
                <div className="hidden sm:block text-sm text-slate-400">{title}</div>
              ) : null}
              
              {/* Mobile menu button */}
              {showNav && (
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 text-slate-400 hover:text-slate-200 transition-colors relative z-50"
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
            className="fixed inset-0 bg-slate-950/95 backdrop-blur-sm z-[60] md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-in menu */}
          <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-slate-950 border-l border-slate-900/70 z-[70] md:hidden shadow-2xl overflow-y-auto">
            <div className="flex flex-col h-full">
              {/* Menu header */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-900/70 bg-slate-950">
                <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                  <Logo size={logoSize} />
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Menu items - separate list for mobile (not reusing desktop nav) */}
              <nav className="flex-1 px-4 sm:px-6 py-6 space-y-1 bg-slate-950">
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
                <div className="border-t border-slate-900/70 my-2" />
                
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
                <div className="px-4 sm:px-6 py-4 border-t border-slate-900/70 bg-slate-950">
                  <p className="text-sm text-slate-400">{title}</p>
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