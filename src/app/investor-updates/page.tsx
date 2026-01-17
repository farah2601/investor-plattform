"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/landing/Header";
import "../landing-styles.css";

export default function InvestorUpdatesPage() {
  const [exampleModalOpen, setExampleModalOpen] = useState(false);

  return (
    <div className="relative bg-dark text-white min-h-screen">
      <Header />
      <main className="pt-[68px]">
        {/* Hero Section */}
        <section className="relative mx-auto max-w-5xl px-4 pt-16 pb-8 lg:pt-24 lg:pb-12">
          <div className="text-center">
            <h1 className="text-4xl lg:text-6xl font-semibold text-white mb-6 leading-tight max-w-4xl mx-auto">
              Investor Updates
            </h1>
            <p className="text-lg lg:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8">
              Share data-driven investor updates in minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Link
                href="/investor-updates/new"
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-gradient-to-b from-[#2B74FF] to-[#2563EB] hover:from-[#4D9FFF] hover:to-[#2B74FF] text-white font-medium text-base shadow-lg shadow-[#2B74FF]/30 hover:shadow-[#4D9FFF]/40 hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Create update
              </Link>
              <button
                onClick={() => setExampleModalOpen(true)}
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl border border-slate-600/40 bg-slate-900/40 hover:bg-slate-800/60 hover:border-slate-500/50 text-slate-200 font-medium text-base transition-all duration-300 hover:scale-105"
              >
                View example
              </button>
            </div>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              Clear, consistent updates build trust and reduce follow-up questions.
            </p>
          </div>
        </section>

        {/* Value Cards */}
        <section className="relative mx-auto max-w-6xl px-4 py-12 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {/* Card 1 */}
            <div className="bg-slate-900/40 border border-slate-700/40 rounded-lg p-6">
              <h3 className="text-base font-medium text-white mb-2">Auto-generated KPIs</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Pull key metrics into every update—revenue, runway, burn, growth—without manual reporting.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-slate-900/40 border border-slate-700/40 rounded-lg p-6">
              <h3 className="text-base font-medium text-white mb-2">Investor-ready format</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                A clean structure that investors expect: highlights, metrics, notes, and next steps.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-slate-900/40 border border-slate-700/40 rounded-lg p-6">
              <h3 className="text-base font-medium text-white mb-2">Always up to date</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Use live numbers or lock a snapshot for each period, so your story stays consistent.
              </p>
            </div>
          </div>
        </section>

        {/* What's Included Section */}
        <section className="relative mx-auto max-w-6xl px-4 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            <div>
              <p className="text-lg text-slate-300 leading-relaxed">
                Send updates that are easy to read, easy to trust, and easy to forward.
              </p>
            </div>
            <div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className="w-5 h-5 text-brand-blue shrink-0 mt-0.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-300">Highlights & wins</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className="w-5 h-5 text-brand-blue shrink-0 mt-0.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-300">KPIs & financial overview</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className="w-5 h-5 text-brand-blue shrink-0 mt-0.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-300">Runway & burn</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className="w-5 h-5 text-brand-blue shrink-0 mt-0.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-300">Risks & mitigations</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className="w-5 h-5 text-brand-blue shrink-0 mt-0.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-300">Hiring & roadmap</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className="w-5 h-5 text-brand-blue shrink-0 mt-0.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-300">Asks & next steps</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section className="relative mx-auto max-w-6xl px-4 py-12 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {/* Step 1 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-blue/20 mb-4">
                <span className="text-brand-blue font-semibold text-lg">1</span>
              </div>
              <h3 className="text-base font-medium text-white mb-2">Choose period</h3>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-blue/20 mb-4">
                <span className="text-brand-blue font-semibold text-lg">2</span>
              </div>
              <h3 className="text-base font-medium text-white mb-2">Review metrics</h3>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-blue/20 mb-4">
                <span className="text-brand-blue font-semibold text-lg">3</span>
              </div>
              <h3 className="text-base font-medium text-white mb-2">Send update</h3>
            </div>
          </div>
          <p className="text-center text-sm text-slate-400 mt-6">
            Export to PDF or share a link.
          </p>
        </section>

        {/* Final CTA Section */}
        <section className="relative mx-auto max-w-5xl px-4 py-16 lg:py-24">
          <div className="relative text-center rounded-3xl border border-slate-700/60 bg-gradient-to-br from-slate-900/70 via-slate-900/50 to-slate-800/50 backdrop-blur-sm shadow-2xl shadow-black/40 p-12 lg:p-16 overflow-hidden">
            {/* Subtle inner highlight for premium glass effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none rounded-3xl"></div>
            {/* Subtle border glow */}
            <div className="absolute inset-0 rounded-3xl border border-white/5 pointer-events-none"></div>
            
            <div className="relative z-10">
              <h2 className="text-3xl lg:text-4xl font-semibold text-white mb-4">
                Send your next update with confidence.
              </h2>
              <p className="text-lg lg:text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                Turn live data into clear investor communication.
              </p>
              <Link
                href="/investor-updates/new"
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-gradient-to-b from-[#2B74FF] to-[#2563EB] hover:from-[#4D9FFF] hover:to-[#2B74FF] text-white font-medium text-base shadow-lg shadow-[#2B74FF]/30 hover:shadow-[#4D9FFF]/40 hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Create update
              </Link>
            </div>
          </div>
        </section>

        {/* Footer spacing */}
        <div className="h-16"></div>
      </main>

      {/* Example Modal */}
      {exampleModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setExampleModalOpen(false)}
        >
          <div
            className="relative bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setExampleModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h3 className="text-2xl font-semibold text-white mb-6">Example Investor Update</h3>
            
            <div className="space-y-6">
              {/* Headline */}
              <div>
                <h4 className="text-lg font-medium text-white mb-3">Q1 2025 Update</h4>
                <p className="text-slate-300">Strong growth in key metrics with new customer acquisitions and expanded team.</p>
              </div>

              {/* Bullets */}
              <div>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-brand-blue mt-1">•</span>
                    <span className="text-slate-300">Achieved $750k MRR, up 25% from previous quarter</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-blue mt-1">•</span>
                    <span className="text-slate-300">Hired 3 new team members across engineering and sales</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-blue mt-1">•</span>
                    <span className="text-slate-300">Launched new product feature with 40% adoption in first month</span>
                  </li>
                </ul>
              </div>

              {/* KPI Tiles */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                  <div className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">MRR</div>
                  <div className="text-2xl font-semibold text-white">$750k</div>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                  <div className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Growth</div>
                  <div className="text-2xl font-semibold text-white">+25%</div>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                  <div className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Runway</div>
                  <div className="text-2xl font-semibold text-white">18 mo</div>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                  <div className="text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Burn</div>
                  <div className="text-2xl font-semibold text-white">$89k</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
