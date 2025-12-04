// src/app/page.tsx

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#020617] text-slate-50 antialiased">
      {/* NAVBAR */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-slate-950/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10 lg:px-24">
          {/* Logo + brand */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/20 ring-1 ring-sky-400/60">
              <span className="text-sm font-semibold text-sky-300">M</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">
                MCP Insights
              </span>
              <span className="text-[11px] text-slate-400">
                AI-native investor readiness
              </span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <a href="#product" className="hover:text-slate-50">
              Product
            </a>
            <a href="#for-founders" className="hover:text-slate-50">
              For founders
            </a>
            <a href="#for-investors" className="hover:text-slate-50">
              For investors
            </a>
            <a href="#pricing" className="hover:text-slate-50">
              Pricing
            </a>
          </nav>

          {/* Auth buttons */}
          <div className="flex items-center gap-3 text-sm">
            <a
              href="/login"
              className="hidden text-slate-300 hover:text-slate-50 sm:inline"
            >
              Log in
            </a>
            <a
              href="/onboarding"
              className="inline-flex items-center rounded-full bg-sky-500 px-4 py-1.5 text-xs font-semibold text-slate-950 shadow-lg shadow-sky-500/40 hover:bg-sky-400 sm:text-sm"
            >
              Start free
            </a>
          </div>
        </div>
      </header>

      {/* PAGE CONTENT */}
      <div className="pt-24 lg:pt-28">
        {/* HERO */}
        <section
          id="product"
          className="border-b border-slate-800/60 bg-gradient-to-b from-sky-500/10 via-transparent to-transparent"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 pb-20 pt-10 sm:px-10 lg:flex-row lg:px-24 lg:pb-24 lg:pt-16">
            {/* Left: copy */}
            <div className="flex-1 space-y-6">
              <p className="text-xs font-semibold tracking-[0.3em] text-sky-400 uppercase">
                AI-NATIVE INVESTOR PLATFORM
              </p>

              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                Be{" "}
                <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-sky-500 bg-clip-text text-transparent">
                  investor-ready
                </span>{" "}
                on autopilot.
              </h1>

              <p className="max-w-xl text-sm text-slate-300 sm:text-base">
                Connect your data once, let the MCP agent keep your KPIs fresh,
                and share a single secure link with investors — no decks, no
                spreadsheets.
              </p>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <a
                  href="/onboarding"
                  className="inline-flex items-center justify-center rounded-full bg-sky-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/40 hover:bg-sky-400"
                >
                  Start free
                </a>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900/50 px-6 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-900"
                >
                  Watch product flow
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Built for founders who need to show real numbers to investors
                automatically.
              </p>
            </div>

            {/* Right: Investor preview card */}
            <div className="flex-1">
              <div className="mx-auto max-w-md rounded-3xl border border-sky-500/30 bg-slate-950/80 p-4 shadow-[0_0_60px_-20px_rgba(56,189,248,0.7)]">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[10px] tracking-[0.3em] text-slate-400 uppercase">
                      Investor View · Live
                    </p>
                    <p className="text-sm font-semibold text-slate-50">
                      MCP SaaS · Series A ready
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                      <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Auto-updated
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Updated 2 min ago
                    </span>
                  </div>
                </div>

                {/* KPI row */}
                <div className="mb-4 grid grid-cols-3 gap-3 text-xs">
                  <div className="rounded-2xl border border-sky-500/40 bg-sky-500/5 px-3 py-3">
                    <p className="text-[10px] tracking-[0.25em] text-slate-400 uppercase">
                      MRR
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-50">
                      €82,400
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-emerald-400">
                      +8.2% last 30 days
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-700 bg-slate-900/60 px-3 py-3">
                    <p className="text-[10px] tracking-[0.25em] text-slate-400 uppercase">
                      Runway
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-50">
                      14 months
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      €145k monthly burn
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-700 bg-slate-900/60 px-3 py-3">
                    <p className="text-[10px] tracking-[0.25em] text-slate-400 uppercase">
                      Net revenue churn
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-50">
                      2.7%
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-emerald-400">
                      Stable last quarter
                    </p>
                  </div>
                </div>

                {/* Trend chart */}
                <div className="mb-4 rounded-2xl border border-sky-500/30 bg-gradient-to-b from-sky-500/15 via-slate-950 to-slate-950 px-4 py-3">
                  <div className="mb-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>MRR trend · 12 months</span>
                    <span className="text-emerald-400 font-medium">
                      +74% YoY
                    </span>
                  </div>

                  <div className="relative h-28 overflow-hidden rounded-xl bg-slate-950/80">
                    {/* Grid lines */}
                    <div className="absolute inset-0">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="absolute inset-x-0 border-t border-slate-800/70"
                          style={{ top: `${(i * 100) / 3}%` }}
                        />
                      ))}
                    </div>

                    {/* Line (simple SVG) */}
                    <svg
                      viewBox="0 0 120 40"
                      className="relative z-10 h-full w-full"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient
                          id="lineGradient"
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="0"
                        >
                          <stop offset="0%" stopColor="#38bdf8" />
                          <stop offset="100%" stopColor="#22d3ee" />
                        </linearGradient>
                        <linearGradient
                          id="fillGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#0ea5e9"
                            stopOpacity="0.35"
                          />
                          <stop
                            offset="100%"
                            stopColor="#020617"
                            stopOpacity="0"
                          />
                        </linearGradient>
                      </defs>

                      {/* Area under curve */}
                      <path
                        d="M0 30 L15 28 L30 26 L45 24 L60 21 L75 19 L90 15 L105 11 L120 8 L120 40 L0 40 Z"
                        fill="url(#fillGradient)"
                      />

                      {/* Line */}
                      <path
                        d="M0 30 L15 28 L30 26 L45 24 L60 21 L75 19 L90 15 L105 11 L120 8"
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeWidth={2}
                        strokeLinecap="round"
                      />

                      {/* Endpoint dot */}
                      <circle
                        cx="120"
                        cy="8"
                        r="2.4"
                        fill="#22d3ee"
                        stroke="#e0f2fe"
                        strokeWidth={0.8}
                      />
                    </svg>

                    {/* X-axis labels */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-between px-3 text-[10px] text-slate-500">
                      <span>Jan</span>
                      <span>Apr</span>
                      <span>Jul</span>
                      <span>Oct</span>
                      <span>Dec</span>
                    </div>
                  </div>
                </div>

                {/* AI insight */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-[11px] text-slate-200">
                  <div className="mb-1 flex items-center gap-2 text-xs font-medium text-sky-300">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/15 text-[10px]">
                      AI
                    </span>
                    AI insight
                  </div>
                  <p className="text-[11px] text-slate-300">
                    MRR grew 8% last month, burn efficiency improved, and
                    runway is stable at 14 months. Investors see this live.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SOCIAL PROOF */}
        <section className="border-b border-slate-800/60 bg-[#020617]">
          <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10 lg:px-24 lg:py-12">
            <p className="mb-4 text-xs font-medium tracking-[0.25em] text-slate-500 uppercase">
              TRUSTED BY EARLY BUILDERS
            </p>
            <div className="flex flex-wrap items-center gap-x-10 gap-y-4 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-sky-500/20 border border-sky-500/40" />
                <span className="font-medium text-slate-200">AlphaTech</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-emerald-500/15 border border-emerald-500/40" />
                <span className="font-medium text-slate-200">
                  Nordic SaaS Fund
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-purple-500/15 border border-purple-500/40" />
                <span className="font-medium text-slate-200">Launch Studio</span>
              </div>
            </div>
          </div>
        </section>

        {/* VALUE PROPS (3 columns) */}
        <section className="border-b border-slate-800/60 bg-[#020617]">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 lg:px-24">
            <div className="mb-10 max-w-2xl space-y-3">
              <p className="text-xs font-semibold tracking-[0.3em] text-sky-400 uppercase">
                WHY MCP
              </p>
              <h2 className="text-2xl font-semibold sm:text-3xl">
                The live KPI engine behind investor-ready companies.
              </h2>
              <p className="text-sm text-slate-300">
                Replace static decks with a single, always-current investor
                view. MCP Insights combines accounting-grade metrics, AI
                commentary, and secure sharing.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/15 text-sky-300">
                  ●
                </div>
                <h3 className="text-sm font-semibold text-slate-50">
                  Live KPI engine
                </h3>
                <p className="text-sm text-slate-300">
                  Accounting-grade metrics: MRR, ARR, burn, churn, runway.
                  Pulled directly from your systems, always synced.
                </p>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/15 text-sky-300">
                  ✦
                </div>
                <h3 className="text-sm font-semibold text-slate-50">
                  AI investor narrative
                </h3>
                <p className="text-sm text-slate-300">
                  The MCP agent explains the story behind your numbers in plain
                  language investors actually understand.
                </p>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/15 text-sky-300">
                  ⛶
                </div>
                <h3 className="text-sm font-semibold text-slate-50">
                  Secure investor link
                </h3>
                <p className="text-sm text-slate-300">
                  Share once, stay current. Replace PDFs with a single
                  token-secured link investors can check anytime.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="border-b border-slate-800/60 bg-[#020617]">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 lg:px-24">
            <div className="mb-10 max-w-2xl space-y-3">
              <p className="text-xs font-semibold tracking-[0.3em] text-sky-400 uppercase">
                HOW IT WORKS
              </p>
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Three steps from “data everywhere” to always investor-ready.
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="text-xs font-semibold text-sky-300">Step 1</p>
                <h3 className="mt-2 text-sm font-semibold text-slate-50">
                  Connect data once
                </h3>
                <p className="mt-2 text-sm text-slate-300">
                  Start with Google Sheets, CRM, or accounting. Typical setup:
                  under 2 minutes.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="text-xs font-semibold text-sky-300">Step 2</p>
                <h3 className="mt-2 text-sm font-semibold text-slate-50">
                  Let the MCP agent run
                </h3>
                <p className="mt-2 text-sm text-slate-300">
                  The agent computes KPIs and generates AI insights on a
                  schedule. Zero manual reporting.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="text-xs font-semibold text-sky-300">Step 3</p>
                <h3 className="mt-2 text-sm font-semibold text-slate-50">
                  Share a live link
                </h3>
                <p className="mt-2 text-sm text-slate-300">
                  Investors get real-time visibility into your KPIs — always the
                  latest version, no attachments.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE GRID */}
        <section className="border-b border-slate-800/60 bg-[#020617]">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 lg:px-24">
            <div className="mb-10 max-w-2xl space-y-3">
              <p className="text-xs font-semibold tracking-[0.3em] text-sky-400 uppercase">
                FEATURES
              </p>
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Everything you need to stay investor-ready.
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  title: "Auto-updating metrics",
                  body: "MRR, ARR, churn, burn, runway — always fresh and consistent across every investor update.",
                },
                {
                  title: "AI commentary",
                  body: "Narratives that translate raw numbers into clear, board-ready insights.",
                },
                {
                  title: "CRM + accounting integrations",
                  body: "Start with Sheets. Grow into Pipedrive, HubSpot, Fiken, Tripletex and more.",
                },
                {
                  title: "Team profile auto-generation",
                  body: "Pull team highlights from LinkedIn and your website. (Coming soon.)",
                },
                {
                  title: "Founder control panel",
                  body: "Approve investor access with one click and see who’s engaging with your view.",
                },
                {
                  title: "Security & access",
                  body: "Token-based sharing. No investor accounts required, no public exposure.",
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-sky-500/60 hover:bg-slate-900"
                >
                  <h3 className="text-sm font-semibold text-slate-50">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FOR FOUNDERS */}
        <section
          id="for-founders"
          className="border-b border-slate-800/60 bg-[#020617]"
        >
          <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 lg:px-24">
            <div className="grid gap-10 md:grid-cols-2 md:items-center">
              <div className="space-y-4">
                <p className="text-xs font-semibold tracking-[0.3em] text-sky-400 uppercase">
                  FOR FOUNDERS
                </p>
                <h2 className="text-2xl font-semibold sm:text-3xl">
                  From “data everywhere” to always investor-ready.
                </h2>
                <p className="text-sm text-slate-300">
                  Instead of rebuilding spreadsheets and decks every month, MCP
                  Insights keeps a single source of truth updated automatically.
                </p>
                <ul className="mt-2 space-y-2 text-sm text-slate-300">
                  <li>• No spreadsheets to maintain.</li>
                  <li>• No manual PDF decks.</li>
                  <li>• No endless copy/paste from different tools.</li>
                </ul>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-300">
                <p className="text-xs font-semibold text-sky-300">
                  Founder workflow
                </p>
                <p>
                  1. Connect the systems you already use for revenue and
                  customers.
                </p>
                <p>
                  2. Let the MCP agent compute KPIs and generate a clean
                  investor dashboard.
                </p>
                <p>
                  3. Approve which investors to invite — and send a single link
                  instead of a giant folder of files.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FOR INVESTORS */}
        <section
          id="for-investors"
          className="border-b border-slate-800/60 bg-[#020617]"
        >
          <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 lg:px-24">
            <div className="grid gap-10 md:grid-cols-2 md:items-center">
              <div className="space-y-4">
                <p className="text-xs font-semibold tracking-[0.3em] text-sky-400 uppercase">
                  FOR INVESTORS
                </p>
                <h2 className="text-2xl font-semibold sm:text-3xl">
                  The cleanest investor dashboard you’ve ever seen.
                </h2>
                <p className="text-sm text-slate-300">
                  No file hunting. No outdated decks. Just real numbers,
                  refreshed automatically, with AI insights built in.
                </p>
                <ul className="mt-2 space-y-2 text-sm text-slate-300">
                  <li>• No login required — access via secure link.</li>
                  <li>• No messy spreadsheets or hidden tabs.</li>
                  <li>• Real KPIs, always up-to-date.</li>
                </ul>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-300">
                <p className="text-xs font-semibold text-sky-300">
                  For partners, funds & angels
                </p>
                <p>
                  Share a consistent MCP view across your portfolio and use the
                  same language for MRR, churn, runway and growth across all
                  companies.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* MID-PAGE CTA */}
<section
  id="pricing"
  className="border-b border-slate-800/60 bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-transparent"
>
  <div className="mx-auto flex max-w-6xl flex-col justify-between gap-10 px-6 py-16 sm:px-10 md:flex-row md:items-center lg:px-24">
    <div className="max-w-xl space-y-3">
      <p className="text-xs font-medium tracking-[0.3em] text-sky-400 uppercase">
        EARLY ACCESS
      </p>
      <h2 className="text-2xl font-semibold sm:text-3xl">
        Start with your first live investor view this week.
      </h2>
      <p className="text-sm text-slate-300">
        We’re working closely with a small group of B2B SaaS and digital
        product companies to refine the MCP agent and investor
        experience.
      </p>
      <ul className="mt-2 space-y-1 text-sm text-slate-300">
        <li>• Founder-friendly terms.</li>
        <li>• Priority input on the roadmap.</li>
        <li>• Flat early access fee.</li>
      </ul>
    </div>

    {/* Buttons column – now vertically centered */}
    <div className="flex w-full flex-col gap-3 md:w-auto md:items-end md:justify-center">
      <a
        href="/onboarding"
        className="inline-flex items-center justify-center rounded-full bg-sky-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/40 hover:bg-sky-400"
      >
        Start free
      </a>
      <button className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900/60 px-6 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-900">
        Book a demo call
      </button>
    </div>
  </div>
</section>

        {/* TESTIMONIALS */}
        <section className="border-b border-slate-800/60 bg-[#020617]">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 lg:px-24">
            <p className="mb-4 text-xs font-medium tracking-[0.25em] text-slate-500 uppercase">
              WHAT FOUNDERS ARE SAYING
            </p>
            <div className="grid gap-6 md:grid-cols-3">
              <figure className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="text-sm text-slate-200">
                  “We stopped sending PDF decks every month. Now our investors
                  just use the live link.”
                </p>
                <figcaption className="mt-4 text-xs text-slate-400">
                  <span className="font-semibold text-slate-100">
                    CEO, B2B SaaS
                  </span>{" "}
                  · Seed stage
                </figcaption>
              </figure>
              <figure className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="text-sm text-slate-200">
                  “The MCP agent surfaces the same insights our board asks
                  about, without us building custom reports.”
                </p>
                <figcaption className="mt-4 text-xs text-slate-400">
                  <span className="font-semibold text-slate-100">
                    Founder, Fintech
                  </span>{" "}
                  · Series A
                </figcaption>
              </figure>
              <figure className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="text-sm text-slate-200">
                  “MCP has become the single source of truth for our KPI
                  communication.”
                </p>
                <figcaption className="mt-4 text-xs text-slate-400">
                  <span className="font-semibold text-slate-100">
                    COO, Analytics SaaS
                  </span>
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="border-b border-slate-800/60 bg-gradient-to-b from-sky-500/10 via-slate-950 to-slate-950">
          <div className="mx-auto max-w-6xl px-6 py-20 text-center sm:px-10 lg:px-24 lg:py-24">
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Ready to make “investor-ready” your default state?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-300 sm:text-base">
              Connect your data once, let the MCP agent do the work, and share
              a single live link instead of a new deck every month.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <a
                href="/onboarding"
                className="inline-flex items-center justify-center rounded-full bg-sky-500 px-8 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/40 hover:bg-sky-400"
              >
                Start free
              </a>
              <button className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900/60 px-8 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-900">
                Book a demo call
              </button>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-slate-800 bg-[#020617]">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-24">
            <div className="space-y-1">
              <p className="font-medium text-slate-300">MCP Insights</p>
              <p>AI-native investor readiness</p>
            </div>
            <div className="flex items-center gap-5">
              <a href="#" className="hover:text-slate-300">
                Docs
              </a>
              <a href="#" className="hover:text-slate-300">
                Privacy
              </a>
              <a href="#" className="hover:text-slate-300">
                Terms
              </a>
            </div>
            <p>
              © {new Date().getFullYear()} MCP Insights. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}