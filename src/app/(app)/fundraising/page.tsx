"use client";

import Link from "next/link";
import { Header } from "@/components/landing/Header";
import "@/app/landing-styles.css";

export default function FundraisingPage() {
  return (
    <div className="relative bg-dark text-white min-h-screen">
      <Header />
      <main className="pt-[68px]">
        {/* Hero Section */}
        <section className="relative mx-auto max-w-5xl px-4 pt-16 pb-8 lg:pt-24 lg:pb-12">
          <div className="text-center">
            <h1 className="text-4xl lg:text-6xl font-semibold text-white mb-6 leading-tight max-w-4xl mx-auto">
              Fundraising
            </h1>
            <p className="text-lg lg:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Prepare your company for investors with a live, shareable financial overview — no manual reports or spreadsheets.
            </p>
          </div>
        </section>

        {/* Key Points Section */}
        <section className="relative mx-auto max-w-6xl px-4 py-12 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* Point 1 */}
            <div className="bg-slate-900/40 border border-slate-700/40 rounded-lg p-6">
              <h3 className="text-base font-medium text-white mb-2">Real-time, standardized metrics</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Investors see your financial metrics updated automatically. All data is standardized across systems, so there's no confusion about what the numbers mean.
              </p>
            </div>

            {/* Point 2 */}
            <div className="bg-slate-900/40 border border-slate-700/40 rounded-lg p-6">
              <h3 className="text-base font-medium text-white mb-2">No manual updates or reports</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Your dashboard updates automatically from your connected systems. No need to create reports, export spreadsheets, or manually update numbers before investor meetings.
              </p>
            </div>

            {/* Point 3 */}
            <div className="bg-slate-900/40 border border-slate-700/40 rounded-lg p-6">
              <h3 className="text-base font-medium text-white mb-2">Read-only, secure access</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Share a secure link with investors that gives them read-only access to your live dashboard. They can see your metrics without being able to edit or download data.
              </p>
            </div>

            {/* Point 4 */}
            <div className="bg-slate-900/40 border border-slate-700/40 rounded-lg p-6">
              <h3 className="text-base font-medium text-white mb-2">One consistent financial view</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                All your financial data from different systems is unified into one consistent view. Investors see the same numbers you do, with no discrepancies between tools.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative mx-auto max-w-5xl px-4 py-16 lg:py-24">
          <div className="relative text-center rounded-3xl border border-slate-700/60 bg-gradient-to-br from-slate-900/70 via-slate-900/50 to-slate-800/50 backdrop-blur-sm shadow-2xl shadow-black/40 p-12 lg:p-16 overflow-hidden">
            {/* Subtle inner highlight for premium glass effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none rounded-3xl"></div>
            {/* Subtle border glow */}
            <div className="absolute inset-0 rounded-3xl border border-white/5 pointer-events-none"></div>
            
            <div className="relative z-10">
              <h2 className="text-3xl lg:text-4xl font-semibold text-white mb-4">
                Always know your numbers.
              </h2>
              <p className="text-lg lg:text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                Start preparing for investors with your live financial dashboard today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-gradient-to-b from-[#2B74FF] to-[#2563EB] hover:from-[#4D9FFF] hover:to-[#2B74FF] text-white font-medium text-base shadow-lg shadow-[#2B74FF]/30 hover:shadow-[#4D9FFF]/40 hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  Get Valyxo Free
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl border border-slate-600/40 bg-slate-900/40 hover:bg-slate-800/60 hover:border-slate-500/50 text-slate-200 font-medium text-base transition-all duration-300 hover:scale-105"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer spacing */}
        <div className="h-16"></div>
      </main>
    </div>
  );
}
