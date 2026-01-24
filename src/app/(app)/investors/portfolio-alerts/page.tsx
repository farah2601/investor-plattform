"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/landing/Header";
import "@/app/landing-styles.css";

export default function PortfolioAlertsPage() {
  const [digestFrequency, setDigestFrequency] = useState<"daily" | "weekly">("weekly");

  return (
    <div className="relative bg-dark text-white min-h-screen">
      <Header />
      <main className="pt-[68px]">
        {/* Hero Section */}
        <section className="relative mx-auto max-w-5xl px-4 pt-16 pb-12 lg:pt-24 lg:pb-20">
          <div className="text-center">
            <h1 className="text-4xl lg:text-6xl font-semibold text-white mb-6 leading-tight max-w-4xl mx-auto">
              Portfolio alerts, without chasing updates.
            </h1>
            <p className="text-lg lg:text-xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Valyxo monitors MRR, burn, runway, churn and cash — and notifies you when something changes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg bg-gradient-to-r from-[#2B74FF] to-[#4D9FFF] hover:from-[#2563EB] hover:to-[#3B82F6] text-white font-medium text-base shadow-lg shadow-[#2B74FF]/20 hover:shadow-[#4D9FFF]/30 transition-all"
              >
                Request a demo
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg border border-slate-700/50 bg-slate-900/30 hover:bg-slate-800/50 text-slate-200 font-medium text-base transition-all"
              >
                See how alerts work
              </Link>
            </div>
            <p className="text-sm text-slate-400">
              Founders control what's shared. Read-only access.
            </p>
          </div>
        </section>

        {/* Social Proof Strip */}
        <section className="relative mx-auto max-w-6xl px-4 py-12 border-y border-slate-800/50">
          <div className="flex flex-col items-center gap-6">
            <p className="text-sm text-slate-400 uppercase tracking-wider">Built for early-stage funds and angels</p>
            <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12 opacity-60">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-24 h-8 bg-slate-700/30 rounded border border-slate-700/20 flex items-center justify-center">
                  <div className="w-16 h-4 bg-slate-600/40 rounded" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="relative mx-auto max-w-6xl px-4 py-16 lg:py-24">
          <h2 className="text-3xl lg:text-4xl font-semibold text-white mb-12 text-center">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {/* Step 1 */}
            <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/40 border border-slate-700/50 rounded-xl p-6 lg:p-8">
              <div className="w-12 h-12 rounded-lg bg-[#2B74FF]/20 border border-[#2B74FF]/30 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#2B74FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Connect</h3>
              <p className="text-slate-300 leading-relaxed">
                Founder connects Stripe, Xero, HubSpot, or Google Sheets. Automatic syncing begins immediately.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/40 border border-slate-700/50 rounded-xl p-6 lg:p-8">
              <div className="w-12 h-12 rounded-lg bg-[#2B74FF]/20 border border-[#2B74FF]/30 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#2B74FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Standardize</h3>
              <p className="text-slate-300 leading-relaxed">
                KPIs mapped to consistent definitions across all portfolio companies. No more interpretation gaps.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/40 border border-slate-700/50 rounded-xl p-6 lg:p-8">
              <div className="w-12 h-12 rounded-lg bg-[#2B74FF]/20 border border-[#2B74FF]/30 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#2B74FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Alert</h3>
              <p className="text-slate-300 leading-relaxed">
                Get notifications when metrics change. View changelog and drill into details instantly.
              </p>
            </div>
          </div>
        </section>

        {/* Alerts Showcase */}
        <section className="relative mx-auto max-w-7xl px-4 py-16 lg:py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-semibold text-white mb-4">Portfolio Alerts</h2>
            <p className="text-slate-400">Example data</p>
          </div>
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/60 border border-slate-700/50 rounded-2xl p-6 lg:p-8 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-6 lg:gap-8">
              {/* Alert List */}
              <div className="space-y-2">
                {[
                  { company: "Aurora Labs", metric: "MRR", delta: "+12.4%", severity: "info", time: "2h ago" },
                  { company: "Northwind", metric: "Burn Rate", delta: "+8.2%", severity: "watch", time: "5h ago" },
                  { company: "Keystone", metric: "Runway", delta: "-3.1 months", severity: "critical", time: "1d ago" },
                  { company: "Atlas Tech", metric: "MRR", delta: "+5.7%", severity: "info", time: "2d ago" },
                  { company: "Vertex", metric: "Churn", delta: "+0.8%", severity: "watch", time: "3d ago" },
                  { company: "Nexus", metric: "Cash Balance", delta: "-$45k", severity: "critical", time: "4d ago" },
                  { company: "Prism", metric: "ARR", delta: "+18.2%", severity: "info", time: "5d ago" },
                  { company: "Solstice", metric: "Burn Rate", delta: "-6.3%", severity: "info", time: "1w ago" },
                ].map((alert, i) => (
                  <div
                    key={i}
                    className="bg-slate-900/40 border border-slate-700/30 rounded-lg p-4 hover:border-slate-600/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-white font-medium">{alert.company}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            alert.severity === "critical"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : alert.severity === "watch"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          }`}>
                            {alert.severity === "critical" ? "Critical" : alert.severity === "watch" ? "Watch" : "Info"}
                          </span>
                        </div>
                        <div className="text-sm text-slate-300">
                          <span className="font-medium">{alert.metric}</span> changed by{" "}
                          <span className={alert.delta.startsWith("-") ? "text-rose-400" : "text-emerald-400"}>
                            {alert.delta}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{alert.time}</div>
                      </div>
                      <button className="text-sm text-[#2B74FF] hover:text-[#4D9FFF] transition-colors font-medium">
                        View →
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Change Details Panel */}
              <div className="bg-slate-950/60 border border-slate-700/40 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Change details</h3>
                <div className="space-y-4 mb-6">
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Company</div>
                    <div className="text-white font-medium">Keystone</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Metric</div>
                    <div className="text-white font-medium">Runway</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700/30">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Before</div>
                      <div className="text-2xl font-semibold text-slate-300">12.3 mo</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">After</div>
                      <div className="text-2xl font-semibold text-rose-400">9.2 mo</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-2">Trend (last 6 months)</div>
                    <svg viewBox="0 0 200 60" className="w-full h-12 text-slate-600">
                      <polyline
                        points="0,50 30,45 60,42 90,38 120,35 150,32 180,28 200,25"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-rose-400"
                      />
                      <circle cx="200" cy="25" r="3" fill="currentColor" className="text-rose-400" />
                    </svg>
                  </div>
                </div>
                <button className="w-full py-2.5 rounded-lg bg-[#2B74FF]/20 hover:bg-[#2B74FF]/30 border border-[#2B74FF]/30 text-[#2B74FF] text-sm font-medium transition-colors">
                  View company dashboard →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* What you track */}
        <section className="relative mx-auto max-w-6xl px-4 py-16 lg:py-24">
          <h2 className="text-3xl lg:text-4xl font-semibold text-white mb-12 text-center">What you track</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: "MRR", desc: "Monthly recurring revenue", why: "Track growth momentum and revenue predictability" },
              { name: "ARR", desc: "Annual recurring revenue", why: "Understand annual revenue run rate and scaling" },
              { name: "Burn Rate", desc: "Monthly cash burn", why: "Monitor cash efficiency and spending patterns" },
              { name: "Runway", desc: "Months until cash runs out", why: "Assess funding urgency and risk" },
              { name: "Churn", desc: "Customer churn rate", why: "Identify retention issues early" },
              { name: "Cash Balance", desc: "Current cash on hand", why: "Track liquidity and cash position" },
            ].map((metric, i) => (
              <div key={i} className="bg-gradient-to-br from-slate-900/60 to-slate-800/40 border border-slate-700/50 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-2">{metric.name}</h3>
                <p className="text-sm text-slate-400 mb-3">{metric.desc}</p>
                <p className="text-sm text-slate-300 leading-relaxed">{metric.why}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Investor-ready workflow */}
        <section className="relative mx-auto max-w-6xl px-4 py-16 lg:py-24">
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/60 border border-slate-700/50 rounded-2xl p-8 lg:p-12">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 mb-8">
              <div className="flex-1">
                <h2 className="text-3xl lg:text-4xl font-semibold text-white mb-4">Investor-ready workflow</h2>
                <p className="text-lg text-slate-300">See what changed since last week</p>
              </div>
              <div className="flex gap-2 bg-slate-950/60 border border-slate-700/40 rounded-lg p-1">
                <button
                  onClick={() => setDigestFrequency("daily")}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    digestFrequency === "daily"
                      ? "bg-[#2B74FF]/20 text-[#2B74FF] border border-[#2B74FF]/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setDigestFrequency("weekly")}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    digestFrequency === "weekly"
                      ? "bg-[#2B74FF]/20 text-[#2B74FF] border border-[#2B74FF]/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Weekly
                </button>
              </div>
            </div>
            <ul className="space-y-4">
              {[
                "Weekly digest of all portfolio changes",
                "Company-level changelog showing exactly what moved",
                "Drill into a company when something moves",
                "Share notes internally with your team",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[#2B74FF] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-lg text-slate-200">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Security + Trust */}
        <section className="relative mx-auto max-w-6xl px-4 py-16 lg:py-24">
          <h2 className="text-3xl lg:text-4xl font-semibold text-white mb-12 text-center">Security & trust</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Read-only by default",
                desc: "Investors have read-only access. Founders maintain full control over what data is shared.",
              },
              {
                title: "Founder-controlled sharing",
                desc: "Each founder decides which metrics to share and when. You only see what they approve.",
              },
              {
                title: "Audit trail",
                desc: "Complete history of what changed, when, and who had access. Transparent and traceable.",
              },
            ].map((item, i) => (
              <div key={i} className="bg-gradient-to-br from-slate-900/60 to-slate-800/40 border border-slate-700/50 rounded-xl p-6 lg:p-8">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-slate-300 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative mx-auto max-w-4xl px-4 py-16 lg:py-24">
          <div className="text-center bg-gradient-to-br from-slate-900/80 to-slate-800/60 border border-slate-700/50 rounded-2xl p-12 lg:p-16">
            <h2 className="text-3xl lg:text-5xl font-semibold text-white mb-6">
              Stop chasing updates. Start seeing signals.
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg bg-gradient-to-r from-[#2B74FF] to-[#4D9FFF] hover:from-[#2563EB] hover:to-[#3B82F6] text-white font-medium text-base shadow-lg shadow-[#2B74FF]/20 hover:shadow-[#4D9FFF]/30 transition-all"
              >
                Request a demo
              </Link>
              <a
                href="mailto:hello@valyxo.com"
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg border border-slate-700/50 bg-slate-900/30 hover:bg-slate-800/50 text-slate-200 font-medium text-base transition-all"
              >
                Talk to us
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-950 border-t border-slate-800/50 px-4 py-12">
          <div className="mx-auto max-w-screen-xl text-center text-sm text-slate-400">
            <p>&copy; {new Date().getFullYear()} Valyxo. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
