"use client";

import { useState, useEffect } from "react";
import { ValyxoLogo } from "../components/brand/ValyxoLogo";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

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

  // Close menu on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [mobileMenuOpen]);

  return (
    <main className="min-h-screen bg-[#020617] text-slate-50 antialiased">
      {/* NAVBAR - mobile: hamburger, desktop: full nav */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-slate-950/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          {/* Logo + brand */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link href="/" onClick={() => setMobileMenuOpen(false)}>
              <div className="flex items-center justify-center">
                <ValyxoLogo size={44} priority className="opacity-95" />
              </div>
            </Link>

            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight text-slate-50">
                
              </span>
              <span className="text-[11px] text-slate-400">
              
              </span>
            </div>
          </div>

          {/* Mobile: hamburger button only */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-200 hover:text-slate-50 transition-colors"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Desktop nav links + Auth buttons */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            <a
              href="/companies"
              className="text-slate-200 hover:text-slate-50 transition-colors"
            >
              Companies
            </a>
            <a
              href="/login"
              className="text-slate-200 hover:text-slate-50 transition-colors"
            >
              Sign in
            </a>
            <a
              href="/sign-up"
              className="inline-flex items-center rounded-lg bg-[#2B74FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#2B74FF]/90 transition-colors"
            >
              Get Started
            </a>
          </div>
        </div>

        {/* Mobile menu overlay - only show when open */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Slide-in menu - smaller and more elegant */}
            <div
              id="mobile-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              className="fixed top-0 right-0 h-screen w-[85vw] max-w-sm bg-slate-950/95 backdrop-blur-xl border-l border-white/10 z-[70] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col h-full p-4">
                {/* Menu header - reduced height */}
                <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
                  <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                    <ValyxoLogo size={44} priority className="opacity-95" />
                  </Link>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 text-white hover:text-slate-300 transition-colors"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Menu items - compact spacing */}
                <nav className="flex-1 space-y-3 overflow-y-auto">
                  {/* Companies link */}
                  <Link
                    href="/companies"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full px-4 py-3 rounded-lg text-sm font-medium text-white bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                  >
                    Companies
                  </Link>
                  
                  {/* Sign in link */}
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full px-4 py-3 rounded-lg text-sm font-medium text-white bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                  >
                    Sign in
                  </Link>

                  {/* Get Started button - full width, compact */}
                  <div className="pt-2">
                    <Link
                      href="/sign-up"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full h-11 px-4 rounded-lg text-sm font-medium bg-[#2B74FF] text-white hover:bg-[#2B74FF]/90 transition-colors text-center shadow-lg flex items-center justify-center"
                    >
                      Get Started
                    </Link>
                  </div>
                </nav>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* PAGE CONTENT */}
      <div className="pt-20 sm:pt-24">
        {/* HERO */}
        <section className="min-h-[calc(100vh-6rem)] sm:min-h-[calc(100vh-8rem)] flex items-center justify-center">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            {/* Badge */}
            <div className="mb-4 sm:mb-6 inline-flex items-center gap-2 rounded-full border border-[#2B74FF]/30 bg-slate-900/50 px-3 sm:px-4 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2B74FF]" />
              <p className="text-xs font-medium text-slate-200">
                AI-Native Investor Readiness
              </p>
            </div>

            {/* Headline */}
            <h1 className="mb-4 sm:mb-6 text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-semibold leading-tight text-slate-50">
              Always-up<br />
              to-date metrics.
            </h1>

            {/* Description */}
            <p className="mx-auto mb-6 sm:mb-8 max-w-2xl text-base sm:text-lg lg:text-xl leading-relaxed text-slate-300 px-4">
              Replace static pitch decks with live investor dashboards. Let Valyxo
              Agent keep your metrics current and your story compelling.
            </p>

            {/* CTAs - mobile: stack, desktop: row */}
            <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 sm:flex-row">
              <a
                href="/sign-up"
                className="inline-flex items-center justify-center rounded-lg bg-[#2B74FF] px-5 sm:px-6 py-2.5 sm:py-3 text-sm font-medium text-white hover:bg-[#2B74FF]/90 transition-colors h-10 sm:h-11 w-full sm:w-auto max-w-xs"
              >
                Get Started
              </a>
              <a
                href="/investor/demo"
                className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-transparent px-5 sm:px-6 py-2.5 sm:py-3 text-sm font-medium text-slate-200 hover:bg-slate-800/30 transition-colors h-10 sm:h-11 w-full sm:w-auto max-w-xs"
              >
                View Demo
              </a>
            </div>
          </div>
        </section>

        {/* FOOTER - Only on homepage */}
        <footer className="mt-16 sm:mt-20 border-t border-slate-800/50 bg-[#020617]">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
            <div className="flex flex-col items-center gap-3 sm:gap-4 text-center">
              {/* Copyright */}
              <p className="text-xs text-slate-500">
                © Valyxo
              </p>
              
              {/* Links */}
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <Link
                  href="/privacy"
                  className="hover:text-slate-300 transition-colors"
                >
                  Privacy Policy
                </Link>
                <span className="text-slate-600">•</span>
                <Link
                  href="/terms"
                  className="hover:text-slate-300 transition-colors"
                >
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}