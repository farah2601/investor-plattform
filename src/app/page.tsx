"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Header } from "../components/landing/Header";
import { TrackingScripts } from "../components/landing/TrackingScripts";
import { TourButton } from "../components/landing/TourButton";
import { TourModal } from "../components/landing/TourModal";
import { OneSourceOfTruth } from "../components/landing/OneSourceOfTruth";
import { FoundersInvestorsToggle } from "../components/landing/FoundersInvestorsToggle";
import { PurposeSection } from "../components/landing/PurposeSection";
import { SecuritySection } from "../components/landing/SecuritySection";
import "../app/landing-styles.css";

export default function LandingPage() {
  const router = useRouter();

  // Handle OAuth redirect that lands on homepage instead of /auth/callback
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const error = hashParams.get("error");

      // If we have OAuth tokens in the hash, redirect to callback page
      if (accessToken || refreshToken || error) {
        console.log("[LandingPage] Detected OAuth redirect in hash, redirecting to /auth/callback");
        // Preserve the hash fragment in the redirect
        router.replace(`/auth/callback${window.location.hash}`);
        return;
      }
    }
  }, [router]);

  return (
    <>
      <TrackingScripts />
      <TourModal />
      <div className="relative bg-dark text-white" data-vtbot-replace="body">
        {/* Header */}
        <Header />

        {/* Main Content */}
        <main className="overflow-x-clip pt-[68px]">
          {/* Hero Section */}
          <section className="vx-hero relative mx-auto max-w-screen-xl px-4 pt-4 lg:pt-24 lg:min-h-[70vh] flex flex-col">
            <div className="mx-auto flex flex-col items-center">
              <h1
                className="text-center font-medium"
                style={{ fontSize: "clamp(44px, 5.5vw, 68px)", lineHeight: "1.1" }}
              >
                Investor ready metrics. Automatically.
              </h1>
              <div className="mt-6 max-w-2xl text-balance text-center text-lg lg:text-xl text-white/80">
                Auto sync KPIs, MRR, churn, and runway and share live dashboards with investors.
              </div>
              <div className="mt-5 lg:mt-8">
                <div data-ab-test-single-button>
                  <Link
                    href="/login"
                    className="vx-cta-green relative z-10 rounded-md border px-7 py-3.5 text-base text-white before:absolute before:inset-0 before:-z-20 before:rounded-md before:bg-gradient-to-r before:from-black before:from-35% before:opacity-0 before:transition-opacity before:duration-300 before:ease-in hover:before:opacity-100 after:absolute after:inset-0 after:-z-10 after:rounded-md after:bg-gradient-to-b after:from-black after:opacity-0 after:transition-opacity after:duration-500 after:ease-in hover:after:opacity-100 transition-colors ease-in before:to-brand-blue after:to-brand-blue block border-0 bg-brand-blue text-lg shadow-lg shadow-brand-blue/25"
                  >
                    Get Valyxo Free
                  </Link>
                </div>
                <div className="mt-4 flex flex-col items-center" data-watch-flow-hero>
                  <TourButton />
                </div>
              </div>
              <div className="mt-3 text-xs text-white/50">
                No credit card required · Free Starter plan
              </div>

              {/* Product hero screenshot */}
              <div
                className="relative mx-auto mt-10 lg:mt-16 max-w-[960px]"
                style={{
                  borderRadius: "16px",
                  border: "1px solid rgba(255,255,255,.10)",
                  background: "rgba(255,255,255,.03)",
                  boxShadow: "0 18px 45px rgba(0,0,0,.55)",
                  overflow: "hidden",
                }}
              >
                <Image
                  src="/_astro/ops-dashboard.pa7VO1p1_ZVSNwM.webp"
                  alt="Valyxo dashboard preview"
                  width={960}
                  height={600}
                  priority
                  style={{
                    display: "block",
                    width: "100%",
                    aspectRatio: "16/10",
                    objectFit: "cover",
                    objectPosition: "50% 72%",
                  }}
                />
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(to bottom, transparent 70%, rgba(10,10,18,.95) 95%)",
                    pointerEvents: "none",
                  }}
                />
              </div>
            </div>
          </section>

          {/* One source of truth section */}
          <OneSourceOfTruth />

          {/* For Founders / For Investors Toggle */}
          <FoundersInvestorsToggle />

          {/* Purpose Section */}
          <PurposeSection />

          {/* Security Section */}
          <SecuritySection />

          {/* Footer */}
          <footer className="bg-dark border-t border-white/10 px-4 py-16 text-white mt-32">
            <div className="mx-auto max-w-screen-xl">
              <div className="flex flex-col lg:flex-row lg:justify-between gap-10 lg:gap-16">
                <div className="lg:max-w-[200px]">
                  <p className="text-sm text-white/60">Investor-ready metrics. Automatically.</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
                  <div>
                    <div className="font-medium text-white mb-4">For Founders</div>
                    <ul className="space-y-3 text-sm text-white/70">
                      <li>
                        <Link href="/company-dashboard?role=company" className="hover:text-white">
                          Dashboards
                        </Link>
                      </li>
                      <li>
                        <Link href="/login" className="hover:text-white">
                          Metrics
                        </Link>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium text-white mb-4">For Investors</div>
                    <ul className="space-y-3 text-sm text-white/70">
                      <li>
                        <Link href="/company-dashboard?role=investor" className="hover:text-white">
                          Portfolio Monitoring
                        </Link>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium text-white mb-4">Resources</div>
                    <ul className="space-y-3 text-sm text-white/70">
                      <li>
                        <Link href="#" className="hover:text-white">
                          Blog
                        </Link>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium text-white mb-4">Company</div>
                    <ul className="space-y-3 text-sm text-white/70">
                      <li>
                        <Link href="mailto:support@valyxo.com" className="hover:text-white">
                          Contact
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex flex-wrap gap-6 text-sm text-white/60">
                  <Link href="/privacy" className="hover:text-white">
                    Privacy Policy
                  </Link>
                  <Link href="/terms" className="hover:text-white">
                    Terms of Service
                  </Link>
                  <Link href="mailto:support@valyxo.com" className="hover:text-white">
                    support@valyxo.com
                  </Link>
                </div>
                <div className="text-sm text-white/50">© 2025 Valyxo. All rights reserved.</div>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </>
  );
}
