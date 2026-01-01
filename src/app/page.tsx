// src/app/page.tsx
import { ValyxoLogo } from "../components/brand/ValyxoLogo";


export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#020617] text-slate-50 antialiased">
      {/* NAVBAR */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-slate-950/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10 lg:px-24">
          {/* Logo + brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center">
              <ValyxoLogo size={44} priority className="opacity-95" />
            </div>

            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight text-slate-50">
                
              </span>
              <span className="text-[11px] text-slate-400">
              
              </span>
            </div>
          </div>

          {/* Auth buttons */}
          <div className="flex items-center gap-4 text-sm">
            <a
              href="/login"
              className="text-slate-200 hover:text-slate-50"
            >
              Sign in
            </a>
            <a
              href="/onboarding"
              className="inline-flex items-center rounded-lg bg-[#2B74FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#2B74FF]/90"
            >
              Get Started
            </a>
          </div>
        </div>
      </header>

      {/* PAGE CONTENT */}
      <div className="pt-24">
        {/* HERO */}
        <section className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
          <div className="mx-auto max-w-4xl px-6 text-center sm:px-10 lg:px-24">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#2B74FF]/30 bg-slate-900/50 px-4 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2B74FF]" />
              <p className="text-xs font-medium text-slate-200">
                AI-Native Investor Readiness
              </p>
            </div>

            {/* Headline */}
            <h1 className="mb-6 text-5xl font-semibold leading-tight text-slate-50 sm:text-6xl lg:text-7xl">
              Always-up<br />
              to-date metrics.
            </h1>

            {/* Description */}
            <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-slate-300 sm:text-xl">
              Replace static pitch decks with live investor dashboards. Let Valyxo
              Agent keep your metrics current and your story compelling.
            </p>

            {/* CTAs */}
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-4">
              <a
                href="/onboarding"
                className="inline-flex items-center justify-center rounded-lg bg-[#2B74FF] px-6 py-3 text-sm font-medium text-white hover:bg-[#2B74FF]/90 transition-colors"
              >
                Get Started
              </a>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-transparent px-6 py-3 text-sm font-medium text-slate-200 hover:bg-slate-800/30 transition-colors"
              >
                View Demo
              </button>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-slate-800/50 bg-[#020617]">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-24">
            <p>
              © 2024 Valyxo. All rights reserved.
            </p>
            <p className="text-slate-400">
              Trusted by leading startups.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}