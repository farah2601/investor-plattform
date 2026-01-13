import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/landing/Header";
import "../../landing-styles.css";

export const metadata: Metadata = {
  title: "Investor Pricing - Valyxo",
  description:
    "Free early access for investors. Get standardized KPIs across your portfolio, portfolio monitoring, and insights while we build the most trusted portfolio reporting experience.",
};

const investorsConfig = {
  heroTitle: "Investor Pricing",
  heroSubhead:
    "Free for now — we're in early access. We're looking for feedback so we can build the most trusted portfolio reporting experience.",
  valueBullets: [
    "Standardized KPIs across your entire portfolio",
    "See comparable, up-to-date metrics without chasing founders",
    "Review changes and drill into companies when something moves",
    "Portfolio monitoring and insights in one place",
  ],
  features: [
    "Portfolio dashboard with all companies",
    "Standardized KPI reporting",
    "Portfolio insights and analytics",
    "LP reporting tools",
    "Real-time metric updates",
    "Team collaboration features",
  ],
  whyFree:
    "We're releasing Valyxo in early access. It's free while we work closely with a small group of users. Your feedback directly shapes what we build next.",
  faq: [
    {
      q: "How long will it be free?",
      a: "Early access is free while we gather feedback and refine the product. We'll give plenty of notice before any pricing changes.",
    },
    {
      q: "Will I lose access when pricing launches?",
      a: "No. Early access users will be grandfathered in with continued access. We'll share details well in advance of any changes.",
    },
    {
      q: "What feedback do you want?",
      a: "We want to hear about what works, what doesn't, and what features would make Valyxo essential for your portfolio management workflow.",
    },
    {
      q: "Is my data secure?",
      a: "Yes. We use enterprise-grade security and encryption. Your data is private and secure, and we never share it with third parties.",
    },
    {
      q: "Can I invite my team?",
      a: "Yes! Early access includes team collaboration features. You can invite team members to help manage your portfolio reporting.",
    },
  ],
};

export default function InvestorPricingPage() {
  return (
    <div className="relative bg-dark text-white min-h-screen" data-vtbot-replace="body">
      <Header />
      <main className="overflow-x-clip pt-[68px]">
        {/* Hero Section */}
        <section className="relative mx-auto max-w-screen-xl px-4 pt-16 lg:pt-24 pb-12">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl lg:text-5xl font-medium mb-6">{investorsConfig.heroTitle}</h1>
            <p className="text-lg lg:text-xl text-white/80 max-w-2xl mx-auto">
              {investorsConfig.heroSubhead}
            </p>
          </div>
        </section>

        {/* Pricing Card */}
        <section className="relative mx-auto max-w-screen-xl px-4 pb-16">
          <div className="mx-auto max-w-2xl">
            <div className="bg-gradient-to-b from-black/50 to-black/30 border border-white/10 rounded-lg p-8 lg:p-12">
              <div className="text-center mb-8">
                <div className="text-5xl lg:text-6xl font-medium mb-4">Free</div>
                <div className="text-lg text-white/70">Early Access</div>
              </div>

              {/* Value Bullets */}
              <div className="mb-12">
                <h2 className="text-xl font-medium mb-6">What you get</h2>
                <ul className="space-y-4">
                  {investorsConfig.valueBullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 text-brand-green mt-0.5 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-white/90">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Features */}
              <div className="mb-12">
                <h2 className="text-xl font-medium mb-6">What's included</h2>
                <ul className="space-y-3">
                  {investorsConfig.features.map((feature, i) => (
                    <li key={i} className="text-white/80 flex items-start gap-3">
                      <span className="text-brand-green mt-1">•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/login"
                  className="vx-cta-green relative z-10 rounded-md border px-7 py-3.5 text-base text-white before:absolute before:inset-0 before:-z-20 before:rounded-md before:bg-gradient-to-r before:from-black before:from-35% before:opacity-0 before:transition-opacity before:duration-300 before:ease-in hover:before:opacity-100 after:absolute after:inset-0 after:-z-10 after:rounded-md after:bg-gradient-to-b after:from-black after:opacity-0 after:transition-opacity after:duration-500 after:ease-in hover:after:opacity-100 transition-colors ease-in before:to-brand-blue after:to-brand-blue block border-0 bg-brand-blue text-lg shadow-lg shadow-brand-blue/25 text-center"
                >
                  Get Valyxo Free
                </Link>
                <Link
                  href="mailto:support@valyxo.com"
                  className="px-7 py-3.5 text-base text-white border border-white/20 rounded-md hover:bg-white/5 transition-colors text-center"
                >
                  Talk to us
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Why Free Section */}
        <section className="relative mx-auto max-w-screen-xl px-4 pb-16">
          <div className="mx-auto max-w-3xl">
            <div className="bg-gradient-to-b from-black/30 to-black/20 border border-white/10 rounded-lg p-8 lg:p-12">
              <h2 className="text-2xl font-medium mb-4">Why free?</h2>
              <p className="text-white/80 text-lg leading-relaxed">{investorsConfig.whyFree}</p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="relative mx-auto max-w-screen-xl px-4 pb-24">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-medium mb-12 text-center">Frequently asked questions</h2>
            <div className="space-y-6">
              {investorsConfig.faq.map((item, i) => (
                <div key={i} className="border-b border-white/10 pb-6 last:border-0">
                  <h3 className="text-xl font-medium mb-3">{item.q}</h3>
                  <p className="text-white/70 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
