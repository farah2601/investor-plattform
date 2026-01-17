"use client";

import Link from "next/link";
import { Header } from "@/components/landing/Header";
import "../../landing-styles.css";

export default function NewInvestorUpdatePage() {
  return (
    <div className="relative bg-dark text-white min-h-screen">
      <Header />
      <main className="pt-[68px]">
        <section className="relative mx-auto max-w-5xl px-4 pt-16 pb-8 lg:pt-24 lg:pb-12">
          <div className="text-center">
            <h1 className="text-4xl lg:text-6xl font-semibold text-white mb-6 leading-tight max-w-4xl mx-auto">
              New Investor Update
            </h1>
            <div className="mt-12 p-12 bg-slate-900/40 border border-slate-700/40 rounded-lg">
              <p className="text-lg text-slate-300 mb-4">Coming soon</p>
              <p className="text-sm text-slate-400 mb-8">
                We're building this feature. Check back soon to create your first investor update.
              </p>
              <Link
                href="/investor-updates"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg border border-slate-600/40 bg-slate-800/40 hover:bg-slate-800/60 text-slate-200 font-medium text-sm transition-colors"
              >
                Back to Investor Updates
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
