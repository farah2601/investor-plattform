"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { Header } from "@/components/landing/Header";
import { CompanyOverviewPreview } from "@/components/company/CompanyOverviewPreview";
import "@/app/landing-styles.css";

function CompanyPerformanceContent() {
  const searchParams = useSearchParams();
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Get companyId from: query param -> user session -> fallback
  useEffect(() => {
    async function resolveCompanyId() {
      // 1. Try query param
      const companyIdFromUrl = searchParams.get("companyId") || searchParams.get("company");
      if (companyIdFromUrl) {
        setCompanyId(companyIdFromUrl);
        return;
      }

      // 2. Try user session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: companyData } = await supabase
            .from("companies")
            .select("id")
            .eq("owner_id", session.user.id)
            .maybeSingle();

          if (companyData?.id) {
            setCompanyId(companyData.id);
            return;
          }
        }
      } catch (err) {
        console.error("Error loading company from session:", err);
      }

      // 3. Fallback to provided ID
      setCompanyId("fd077c20-89be-460d-a319-56a531d318ae");
    }

    resolveCompanyId();
  }, [searchParams]);
  return (
    <div className="relative bg-dark text-white min-h-screen">
      <Header />
      <main className="pt-[68px]">
        {/* Hero Section */}
        <section className="relative mx-auto max-w-5xl px-4 pt-16 pb-8 lg:pt-24 lg:pb-12">
          <div className="text-center">
            <h1 className="text-4xl lg:text-6xl font-semibold text-white mb-6 leading-tight max-w-4xl mx-auto">
              Company Performance
            </h1>
            <p className="text-lg lg:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Connect your financial tools and see your company's performance metrics in one live dashboard, updated automatically.
            </p>
          </div>
        </section>

        {/* Live Dashboard Preview */}
        {companyId && <CompanyOverviewPreview companyId={companyId} />}

        {/* Privacy & AI Agent Explanation Section */}
        <section className="relative mx-auto max-w-5xl px-4 py-12 lg:py-16">
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl lg:text-3xl font-semibold text-white mb-3">
                How it works
              </h2>
              <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed">
                Valyxo uses an AI agent to automatically sync and process your financial data. Here's how it works and what it means for your data security.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Read-only access */}
              <div className="bg-slate-900/40 border border-slate-700/40 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-md bg-slate-800/60 border border-slate-700/50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-white mb-2">Read-only access</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      The AI agent only reads your financial data from connected systems. It never modifies, deletes, or writes anything back to your source tools. Your original data remains untouched in your existing systems.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 2: Isolated instances */}
              <div className="bg-slate-900/40 border border-slate-700/40 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-md bg-slate-800/60 border border-slate-700/50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-white mb-2">Private and isolated</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      Each company has its own dedicated AI agent instance. Your data is processed in complete isolation and is never shared with or reused by other companies. What belongs to you stays with you.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 3: Data never shared */}
              <div className="bg-slate-900/40 border border-slate-700/40 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-md bg-slate-800/60 border border-slate-700/50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-white mb-2">Data never shared or reused</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      Your financial data is processed only for your company's dashboard. It is never used to train models, shared with third parties, or reused in any way. Your data serves only your dashboard.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 4: You control access */}
              <div className="bg-slate-900/40 border border-slate-700/40 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-md bg-slate-800/60 border border-slate-700/50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-white mb-2">You control all access</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      You decide which tools to connect, what data to sync, and who has access to your dashboard. You can revoke connections or disconnect integrations at any time, immediately stopping all data access.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-700/30">
              <p className="text-sm text-slate-400 text-center leading-relaxed max-w-2xl mx-auto">
                The AI agent runs automatically in the background, continuously syncing your data in real time to keep your dashboard current. All processing happens securely, and you maintain full control over your connections and data access.
              </p>
            </div>
          </div>
        </section>

        {/* Visual Preview - Dashboard Mockup */}
        <section className="relative mx-auto max-w-6xl px-4 py-16 lg:py-20">
          <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/40 border border-slate-700/50 rounded-xl p-6 lg:p-10 overflow-hidden">
            <p className="text-sm text-slate-400 mb-6 text-center">Example of a real-time Company Performance dashboard</p>
            
            {/* Dashboard Mockup */}
            <div className="relative w-full rounded-lg overflow-hidden border border-slate-700/30 bg-slate-950/80 p-6 lg:p-8 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-700/30">
                <div>
                  <h3 className="text-lg font-semibold text-white">Key Metrics</h3>
                  <p className="text-xs text-slate-400 mt-1">Last updated: Jan 15, 2026, 04:41 PM · Powered by Valyxo Agent</p>
                </div>
              </div>

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* ARR */}
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5">
                  <div className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">ARR</div>
                  <div className="text-3xl font-bold text-white mb-1">$7.06M</div>
                  <div className="text-xs text-slate-500">Annual recurring revenue</div>
                </div>
                {/* MRR */}
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5">
                  <div className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">MRR</div>
                  <div className="text-3xl font-bold text-white mb-1">$655k</div>
                  <div className="text-xs text-slate-500">Monthly recurring revenue</div>
                </div>
                {/* Growth */}
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5">
                  <div className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Growth</div>
                  <div className="text-3xl font-bold text-white mb-1">6.3%</div>
                  <div className="text-xs text-slate-500">MRR growth (last 12 months)</div>
                </div>
                {/* Burn Rate */}
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5">
                  <div className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Burn Rate</div>
                  <div className="text-3xl font-bold text-white mb-1">$89k</div>
                  <div className="text-xs text-slate-500">Monthly burn</div>
                </div>
                {/* Runway */}
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5">
                  <div className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Runway</div>
                  <div className="text-3xl font-bold text-white mb-1">18.5 mo</div>
                  <div className="text-xs text-slate-500">Estimated runway at current burn</div>
                </div>
                {/* Churn */}
                <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5">
                  <div className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Churn</div>
                  <div className="text-3xl font-bold text-white mb-1">2.5%</div>
                  <div className="text-xs text-slate-500">MRR churn rate</div>
                </div>
              </div>

              {/* Trends Section */}
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-white mb-4">Revenue and burn metrics over time</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Revenue Chart */}
                  <div className="bg-slate-900/40 border border-slate-700/30 rounded-lg p-4 h-48">
                    <div className="h-full flex items-center justify-center">
                      <svg viewBox="0 0 300 150" className="w-full h-full">
                        <defs>
                          <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgba(43, 116, 255, 0.3)" />
                            <stop offset="100%" stopColor="rgba(43, 116, 255, 0)" />
                          </linearGradient>
                        </defs>
                        {/* Y-axis labels */}
                        <text x="5" y="15" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">$8.0M</text>
                        <text x="5" y="45" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">$6.0M</text>
                        <text x="5" y="75" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">$4.0M</text>
                        <text x="5" y="105" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">$2.0M</text>
                        <text x="5" y="135" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">$0k</text>
                        {/* Revenue line */}
                        <polyline
                          points="30,120 50,105 70,100 90,90 110,85 130,75 150,70 170,60 190,55 210,50 230,45 250,40 270,35"
                          fill="none"
                          stroke="#2B74FF"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {/* Area under line */}
                        <polygon
                          points="30,120 50,105 70,100 90,90 110,85 130,75 150,70 170,60 190,55 210,50 230,45 250,40 270,35 270,150 30,150"
                          fill="url(#revenueGradient)"
                        />
                        {/* X-axis labels */}
                        <text x="35" y="145" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">Jan</text>
                        <text x="90" y="145" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">Apr</text>
                        <text x="150" y="145" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">Jul</text>
                        <text x="210" y="145" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">Oct</text>
                        <text x="265" y="145" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">Dec</text>
                      </svg>
                    </div>
                  </div>
                  {/* Burn Chart */}
                  <div className="bg-slate-900/40 border border-slate-700/30 rounded-lg p-4 h-48">
                    <div className="h-full flex items-center justify-center">
                      <svg viewBox="0 0 300 150" className="w-full h-full">
                        <defs>
                          <linearGradient id="burnGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgba(43, 116, 255, 0.3)" />
                            <stop offset="100%" stopColor="rgba(43, 116, 255, 0)" />
                          </linearGradient>
                        </defs>
                        {/* Y-axis labels */}
                        <text x="5" y="15" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">800k</text>
                        <text x="5" y="45" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">600k</text>
                        <text x="5" y="75" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">400k</text>
                        <text x="5" y="105" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">200k</text>
                        <text x="5" y="135" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">0k</text>
                        {/* Burn line */}
                        <polyline
                          points="30,80 50,85 70,90 90,95 110,100 130,105 150,110 170,105 190,100 210,95 230,90 270,85"
                          fill="none"
                          stroke="#2B74FF"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {/* Area under line */}
                        <polygon
                          points="30,80 50,85 70,90 90,95 110,100 130,105 150,110 170,105 190,100 210,95 230,90 270,85 270,150 30,150"
                          fill="url(#burnGradient)"
                        />
                        {/* X-axis labels */}
                        <text x="35" y="145" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">Jan</text>
                        <text x="90" y="145" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">Apr</text>
                        <text x="150" y="145" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">Jul</text>
                        <text x="210" y="145" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">Oct</text>
                        <text x="265" y="145" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">Dec</text>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Burn Rate Bar Chart */}
              <div className="mt-6 bg-slate-900/40 border border-slate-700/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-white">Monthly Burn Rate</h4>
                  <span className="text-xs text-slate-400">Historical data</span>
                </div>
                <div className="h-32 flex items-end gap-2">
                  {/* Jan - Jun (red bars - above average) */}
                  <div className="flex-1 bg-red-500/60 rounded-t" style={{ height: "85%" }} />
                  <div className="flex-1 bg-red-500/60 rounded-t" style={{ height: "90%" }} />
                  <div className="flex-1 bg-red-500/60 rounded-t" style={{ height: "88%" }} />
                  <div className="flex-1 bg-red-500/60 rounded-t" style={{ height: "92%" }} />
                  <div className="flex-1 bg-red-500/60 rounded-t" style={{ height: "87%" }} />
                  <div className="flex-1 bg-red-500/60 rounded-t" style={{ height: "75%" }} />
                  {/* Jul - Dec (blue bars - below average) */}
                  <div className="flex-1 bg-[#2B74FF]/60 rounded-t" style={{ height: "65%" }} />
                  <div className="flex-1 bg-[#2B74FF]/60 rounded-t" style={{ height: "60%" }} />
                  <div className="flex-1 bg-[#2B74FF]/60 rounded-t" style={{ height: "55%" }} />
                  <div className="flex-1 bg-[#2B74FF]/60 rounded-t" style={{ height: "50%" }} />
                  <div className="flex-1 bg-[#2B74FF]/60 rounded-t" style={{ height: "58%" }} />
                  <div className="flex-1 bg-[#2B74FF]/60 rounded-t" style={{ height: "62%" }} />
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
                  <span>Jan</span>
                  <span>Apr</span>
                  <span>Jul</span>
                  <span>Oct</span>
                  <span>Dec</span>
                </div>
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-700/30">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-[#2B74FF]" />
                    <span className="text-xs text-slate-400">Below average</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-500" />
                    <span className="text-xs text-slate-400">Above average</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The Process & What You Get - Two Column Layout */}
        <section id="how-it-works" className="relative mx-auto max-w-6xl px-4 py-16 lg:py-20">
          {/* Unified Glass Container */}
          <div className="relative rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/50 via-slate-900/40 to-slate-800/40 backdrop-blur-sm shadow-xl shadow-black/20 p-8 lg:p-12 overflow-hidden">
            {/* Subtle inner highlight */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none rounded-2xl"></div>
            
            {/* Two Column Grid */}
            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
              {/* Left Column: The Process */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl lg:text-3xl font-semibold text-white mb-3">The process</h2>
                  <div className="w-16 h-px bg-slate-600/60 mb-8"></div>
                </div>
                <div className="space-y-8">
                  {/* Step 1 */}
                  <div>
                    <h3 className="text-base font-medium text-white mb-2">Connect your systems</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      The AI agent is granted secure, read-only access to your data. Nothing can be edited or changed.
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div>
                    <h3 className="text-base font-medium text-white mb-2">Continuous analysis</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      The agent continuously reads and standardizes your data across systems in real time.
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div>
                    <h3 className="text-base font-medium text-white mb-2">View your company performance</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      Your dashboard updates automatically with accurate, standardized metrics and trends.
                    </p>
                  </div>
                </div>
              </div>

              {/* Vertical Divider - Desktop Only */}
              <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-slate-700/40 to-transparent -translate-x-1/2"></div>

              {/* Right Column: What You Get */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl lg:text-3xl font-semibold text-white mb-3">What you get</h2>
                  <div className="w-16 h-px bg-slate-600/60 mb-8"></div>
                </div>
                <div className="space-y-8">
                  {/* Item 1 */}
                  <div>
                    <h3 className="text-base font-medium text-white mb-2">Clear financial visibility</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      Always understand how your company is performing — without spreadsheets.
                    </p>
                  </div>

                  {/* Item 2 */}
                  <div>
                    <h3 className="text-base font-medium text-white mb-2">One reliable overview</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      All your financial data is unified in one consistent view.
                    </p>
                  </div>

                  {/* Item 3 */}
                  <div>
                    <h3 className="text-base font-medium text-white mb-2">Investor-ready access</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      Share a secure, read-only dashboard with stakeholders — no reports, no exports.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
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
                Start with your Company Performance dashboard today.
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

export default function CompanyPerformancePage() {
  return (
    <Suspense fallback={
      <div className="relative bg-dark text-white min-h-screen">
        <Header />
        <main className="pt-[68px]">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <p className="text-slate-400">Loading...</p>
            </div>
          </div>
        </main>
      </div>
    }>
      <CompanyPerformanceContent />
    </Suspense>
  );
}
