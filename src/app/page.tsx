// src/app/page.tsx

export default function LandingPage() {
  const year = new Date().getFullYear();

  return (
    <main className="min-h-screen bg-[#050712] text-slate-50">
      {/* FIXED NAVBAR – STRIPE STYLE */}
      <div className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#050712]/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6 lg:px-8">
          {/* Logo + brand */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-400/50 bg-cyan-500/20">
              <span className="text-xs font-semibold text-cyan-200">
                MCP
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">
                MCP Insights
              </span>
              <span className="text-[11px] text-slate-400">
                AI-native investor readiness
              </span>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <a href="#product" className="text-slate-300 hover:text-slate-50 transition">
              Product
            </a>
            <a href="#founders" className="text-slate-300 hover:text-slate-50 transition">
              For founders
            </a>
            <a href="#investors" className="text-slate-300 hover:text-slate-50 transition">
              For investors
            </a>
            <a href="#pricing" className="text-slate-300 hover:text-slate-50 transition">
              Pricing
            </a>

            <a
              href="/login"
              className="text-slate-300 hover:text-slate-50 transition"
            >
              Log in
            </a>
            <a
              href="/onboarding"
              className="inline-flex items-center rounded-full bg-cyan-500 px-4 py-1.5 text-xs font-medium text-slate-950 shadow-lg shadow-cyan-500/25 hover:bg-cyan-400 transition"
            >
              Start free
            </a>
          </nav>

          {/* Mobile nav (simple) */}
          <div className="flex items-center gap-2 md:hidden">
            <a href="/login" className="text-[11px] text-slate-300 underline underline-offset-4">
              Log in
            </a>
            <a
              href="/onboarding"
              className="inline-flex items-center rounded-full bg-cyan-500 px-3 py-1.5 text-[11px] font-medium text-slate-950 shadow-lg shadow-cyan-500/25 hover:bg-cyan-400 transition"
            >
              Start free
            </a>
          </div>
        </div>
      </div>

      {/* PAGE CONTENT */}
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-24 md:px-6 lg:px-8 md:pt-28 space-y-20 md:space-y-24">
        {/* HERO */}
        <section className="grid items-center gap-12 md:grid-cols-2">
          {/* Left – text */}
          <div className="space-y-7">
            <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
              AI-NATIVE INVESTOR PLATFORM
            </p>

            <h1 className="text-4xl font-semibold leading-tight md:text-5xl lg:text-6xl">
              Be{" "}
              <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-300 bg-clip-text text-transparent">
                investor-ready
              </span>{" "}
              on autopilot.
            </h1>

            <p className="max-w-xl text-sm text-slate-300 md:text-base">
              Connect your data once, let the MCP agent keep your KPIs fresh,
              and share a single secure link with investors — no decks, no
              spreadsheets.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="/onboarding"
                className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-6 py-2.5 text-sm font-medium text-slate-950 shadow-lg shadow-cyan-500/25 hover:bg-cyan-400 transition"
              >
                Start free
              </a>
              <a
                href="#demo"
                className="inline-flex items-center justify-center rounded-full border border-slate-600/70 px-6 py-2.5 text-sm font-medium text-slate-100 hover:bg-slate-900/70 transition"
              >
                Watch product flow
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
              <span>Built for B2B SaaS and digital products</span>
              <span className="h-1 w-1 rounded-full bg-slate-500" />
              <span>No PDF decks · No reporting spreadsheets</span>
            </div>
          </div>

          {/* Right – visual “live investor view” */}
          <div className="relative">
            <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-cyan-500/15 blur-3xl" />
            <div className="relative space-y-4 rounded-3xl border border-slate-700 bg-gradient-to-br from-[#0B0F19] to-[#020617] p-5 shadow-2xl shadow-cyan-500/15 md:p-6">
              {/* header row */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                    Investor view · Live
                  </p>
                  <p className="text-sm font-medium text-slate-100">
                    MCP SaaS · Series A ready
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/50 bg-emerald-500/15 px-3 py-1 text-[11px] text-emerald-200">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                    Auto-updated
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Updated 2 min ago
                  </span>
                </div>
              </div>

              {/* KPI row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-3">
                  <p className="text-[10px] uppercase text-slate-400">MRR</p>
                  <p className="text-sm font-semibold">€82,400</p>
                  <p className="text-[11px] text-emerald-400">
                    +8.2% last 30 days
                  </p>
                </div>
                <div className="space-y-1 rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-3">
                  <p className="text-[10px] uppercase text-slate-400">
                    Runway
                  </p>
                  <p className="text-sm font-semibold">14 months</p>
                  <p className="text-[11px] text-slate-400">
                    €145k monthly burn
                  </p>
                </div>
                <div className="space-y-1 rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-3">
                  <p className="text-[10px] uppercase text-slate-400">
                    Net revenue churn
                  </p>
                  <p className="text-sm font-semibold">2.7%</p>
                  <p className="text-[11px] text-emerald-400">
                    Stable last quarter
                  </p>
                </div>
              </div>

            {/* mini "chart" – refined MRR trend */}
<div className="space-y-2 rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3">
  <div className="flex items-center justify-between">
    <p className="text-[11px] uppercase text-slate-400 tracking-[0.18em]">
      MRR TREND · 12 MONTHS
    </p>
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      +74% YoY
    </span>
  </div>

  <div className="mt-1 rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-500/15 via-slate-900 to-slate-950 px-3 py-2 shadow-[0_0_40px_rgba(34,211,238,0.25)]">
    <svg
      viewBox="0 0 100 60"
      className="h-24 w-full"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="mrrArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* subtle grid */}
      <g stroke="#0f172a" strokeWidth="0.6">
        <line x1="0" y1="50" x2="100" y2="50" />
        <line x1="0" y1="37" x2="100" y2="37" />
        <line x1="0" y1="24" x2="100" y2="24" />
      </g>

      {/* area under line */}
      <path
        d="M0 50 L8 49 L16 47 L24 44 L32 41 L40 38 L48 35 L56 32 L64 29 L72 26 L80 23 L88 20 L96 18 L100 17 L100 60 L0 60 Z"
        fill="url(#mrrArea)"
      />

      {/* glow line */}
      <path
        d="M0 50 L8 49 L16 47 L24 44 L32 41 L40 38 L48 35 L56 32 L64 29 L72 26 L80 23 L88 20 L96 18 L100 17"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.75"
      />

      {/* highlight last point */}
      <circle cx="100" cy="17" r="3" fill="#22d3ee" />
      <circle
        cx="100"
        cy="17"
        r="6"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="1"
        opacity="0.5"
      />
    </svg>

    {/* x-axis labels */}
    <div className="mt-1 flex justify-between text-[10px] text-slate-500">
      <span>Jan</span>
      <span>Apr</span>
      <span>Jul</span>
      <span>Oct</span>
      <span>Dec</span>
    </div>
  </div>
</div>

              {/* AI insight bubble */}
              <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/20 text-xs">
                  🤖
                </div>
                <p className="text-[11px] text-slate-200">
                  “MRR grew 8% last month, burn efficiency improved, and runway
                  is stable at 14 months. Investors see this live.”
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* MICRO VALUE BAR */}
        <section className="space-y-2">
          <p className="text-[11px] text-slate-500">
            From “data everywhere” to one investor-ready source of truth.
          </p>
          <div className="flex flex-wrap gap-4 text-[11px] text-slate-500">
            <span>• Replace monthly investor updates</span>
            <span>• One link instead of six attachments</span>
            <span>• AI commentary on top of your KPIs</span>
          </div>
        </section>

        {/* 3-COL VALUE PROPOSITION */}
        <section id="product" className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold md:text-2xl">
              One system for numbers, narrative, and access.
            </h2>
            <p className="max-w-xl text-sm text-slate-400">
              MCP Insights behaves like an AI operating system for your investor
              story — always up to date, always shareable.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 rounded-2xl border border-slate-800 bg-[#0B0F19] p-4">
              <p className="text-xs font-medium text-cyan-300">
                Live KPI engine
              </p>
              <p className="text-sm font-semibold">Accounting-grade metrics</p>
              <p className="text-xs text-slate-400">
                Pull MRR, ARR, burn, runway and churn directly from your
                accounting and CRM. No manual spreadsheets.
              </p>
            </div>
            <div className="space-y-2 rounded-2xl border border-slate-800 bg-[#0B0F19] p-4">
              <p className="text-xs font-medium text-cyan-300">
                AI investor narrative
              </p>
              <p className="text-sm font-semibold">The story behind numbers</p>
              <p className="text-xs text-slate-400">
                The MCP agent writes short, investor-style commentary on growth,
                efficiency, runway and risk.
              </p>
            </div>
            <div className="space-y-2 rounded-2xl border border-slate-800 bg-[#0B0F19] p-4">
              <p className="text-xs font-medium text-cyan-300">
                Secure investor link
              </p>
              <p className="text-sm font-semibold">Share once, stay current</p>
              <p className="text-xs text-slate-400">
                Approve an investor, send a token-based link, and let them see
                live KPIs and your profile — no new decks every month.
              </p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS – 1–2–3 */}
        <section id="founders" className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold md:text-2xl">
              For founders: always investor-ready, without reporting days.
            </h2>
            <p className="max-w-xl text-sm text-slate-400">
              Instead of assembling updates every month, MCP Insights keeps one
              live investor view synced in the background.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Connect data once",
                text: "Start with Google Sheets or your accounting tool. Add CRM when you're ready. Setup in minutes.",
              },
              {
                step: "02",
                title: "Let the agent run",
                text: "The MCP agent computes KPIs and AI insights on a schedule. Zero manual reporting work.",
              },
              {
                step: "03",
                title: "Share a live link",
                text: "Investors always see the newest version through a secure token link — no PDFs or outdated decks.",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="space-y-3 rounded-2xl border border-slate-800 bg-[#0B0F19] p-4"
              >
                <p className="text-xs text-slate-500">{s.step}</p>
                <p className="text-sm font-semibold">{s.title}</p>
                <p className="text-xs text-slate-400">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FOR FOUNDERS / FOR INVESTORS SPLIT */}
        <section id="investors" className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-slate-800 bg-[#070b17] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              For founders
            </p>
            <h3 className="text-sm font-semibold">
              From “data everywhere” to one control panel
            </h3>
            <p className="text-xs text-slate-400">
              Update KPIs, manage investor access and integrations from a single
              dashboard. Your team and investors see the same live numbers.
            </p>
            <ul className="mt-2 space-y-1 text-xs text-slate-400">
              <li>• No spreadsheets</li>
              <li>• No manual decks</li>
              <li>• No copy/paste reporting days</li>
            </ul>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-800 bg-[#070b17] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              For investors
            </p>
            <h3 className="text-sm font-semibold">
              The cleanest investor dashboard you’ve seen
            </h3>
            <p className="text-xs text-slate-400">
              No logins, no messy files. Just a dark, premium dashboard with
              KPIs, runway and AI commentary – accessed through a secure token.
            </p>
            <ul className="mt-2 space-y-1 text-xs text-slate-400">
              <li>• No login required</li>
              <li>• Real numbers, always fresh</li>
              <li>• AI insights included by default</li>
            </ul>
          </div>
        </section>

        {/* EARLY ACCESS / PRICING */}
        <section
          id="pricing"
          className="space-y-4 rounded-3xl border border-slate-800 bg-[#070a14] p-6 md:p-8"
        >
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
            Early access
          </p>
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="space-y-2 max-w-md">
              <h2 className="text-lg font-semibold md:text-xl">
                Start with your first investor view in days, not months.
              </h2>
              <p className="text-sm text-slate-400">
                We’re working closely with a small group of SaaS companies to
                shape the MCP agent and investor experience.
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-slate-200">Founder-friendly terms</p>
              <p className="text-xs text-slate-400">
                Flat early access fee · Priority input on roadmap · No surprise
                usage tiers.
              </p>
            </div>
          </div>
        </section>

        {/* FINAL CTA + FOOTER */}
        <section
          id="demo"
          className="space-y-8 border-t border-slate-900 pt-10"
        >
          <div className="space-y-4 text-center">
            <h2 className="text-xl font-semibold md:text-2xl">
              Ready to make “investor-ready” your default state?
            </h2>
            <p className="mx-auto max-w-md text-sm text-slate-400">
              Connect your data once, let the MCP agent do the work, and share a
              single link instead of building a deck every time someone asks for
              “a quick update”.
            </p>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="/onboarding"
                className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-6 py-2.5 text-sm font-medium text-slate-950 shadow-lg shadow-cyan-500/25 hover:bg-cyan-400 transition"
              >
                Start free
              </a>
              <a
                href="mailto:founder@yourdomain.com"
                className="inline-flex items-center justify-center rounded-full border border-slate-600 px-6 py-2.5 text-sm font-medium text-slate-100 hover:bg-slate-900/70 transition"
              >
                Book a demo call
              </a>
            </div>
          </div>

          <footer className="flex flex-col items-center justify-between gap-3 border-t border-slate-900 pt-6 text-[11px] text-slate-500 md:flex-row">
            <div className="flex flex-col">
              <span>MCP Insights</span>
              <span className="text-slate-500">
                AI-native investor readiness
              </span>
            </div>
            <div className="flex gap-4">
              <a href="#docs" className="hover:text-slate-300">
                Docs
              </a>
              <a href="#privacy" className="hover:text-slate-300">
                Privacy
              </a>
              <a href="#terms" className="hover:text-slate-300">
                Terms
              </a>
            </div>
            <p>© {year} MCP Insights. All rights reserved.</p>
          </footer>
        </section>
      </div>
    </main>
  );
}