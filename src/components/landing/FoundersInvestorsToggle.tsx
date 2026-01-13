"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export function FoundersInvestorsToggle() {
  const [focus, setFocus] = useState<"founder" | "investor" | null>(null);
  const [locked, setLocked] = useState(false);

  const handlePanelClick = (kind: "founder" | "investor", href: string) => (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a")) return;
    e.preventDefault();
    if (locked) return;

    setLocked(true);
    setFocus(kind);
    
    setTimeout(() => {
      window.location.href = href;
    }, 360);
  };

  return (
    <section className="relative mx-auto mt-16 max-w-screen-xl px-4 lg:mt-32">
      <div className={`vx-ffis ${focus === "founder" ? "is-focus-founder" : ""} ${focus === "investor" ? "is-focus-investor" : ""} ${locked ? "is-locked" : ""}`} data-vx-ffis>
        <div className="vx-ffis-grid" role="group" aria-label="Choose your flow">
          {/* For Founders Panel */}
          <div
            className="vx-ffis-panel vx-ffis-founder"
            data-vx-ffis-panel
            data-vx-href="/login"
            onClick={handlePanelClick("founder", "/login")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handlePanelClick("founder", "/login")(e as any);
              }
            }}
            tabIndex={0}
            role="button"
            aria-label="For Founders"
          >
            <div className="vx-ffis-inner">
              <div className="vx-ffis-kicker">For Founders</div>
              <div className="vx-ffis-title">Runway, burn, and MRR—always current.</div>
              <div className="vx-ffis-copy">
                Auto-sync core metrics and share a live dashboard with investors. Keep one source of truth and cut down follow-up questions.
              </div>
              <div className="vx-ffis-ctaRow">
                <Link className="vx-ffis-cta" href="/login" onClick={(e) => e.stopPropagation()}>
                  Get Valyxo Free
                </Link>
                <div className="vx-ffis-ctaHint">Click anywhere</div>
              </div>
            </div>
            <div className="vx-ffis-visual" aria-hidden="true">
              <svg viewBox="0 0 720 420" xmlns="http://www.w3.org/2000/svg" fill="none">
                <defs>
                  <linearGradient id="vxFbg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="rgba(255,255,255,.08)" />
                    <stop offset="1" stopColor="rgba(255,255,255,.02)" />
                  </linearGradient>
                  <linearGradient id="vxFline" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="rgba(47,107,255,.15)" />
                    <stop offset="1" stopColor="rgba(47,107,255,.85)" />
                  </linearGradient>
                  <filter id="vxFglow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2.2" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <rect x="14" y="16" width="692" height="388" rx="14" fill="url(#vxFbg)" stroke="rgba(255,255,255,.16)" />
                <rect x="34" y="40" width="200" height="88" rx="12" fill="rgba(0,0,0,.35)" stroke="rgba(255,255,255,.10)" />
                <text x="50" y="72" fontFamily="ui-sans-serif, system-ui" fontSize="12" fill="rgba(255,255,255,.62)" letterSpacing=".12em">RUNWAY</text>
                <text x="50" y="106" fontFamily="ui-sans-serif, system-ui" fontSize="26" fill="rgba(255,255,255,.92)">14.2 mo</text>
                <rect x="252" y="40" width="200" height="88" rx="12" fill="rgba(0,0,0,.35)" stroke="rgba(255,255,255,.10)" />
                <text x="268" y="72" fontFamily="ui-sans-serif, system-ui" fontSize="12" fill="rgba(255,255,255,.62)" letterSpacing=".12em">BURN</text>
                <text x="268" y="106" fontFamily="ui-sans-serif, system-ui" fontSize="26" fill="rgba(255,255,255,.92)">$82k</text>
                <rect x="470" y="40" width="216" height="88" rx="12" fill="rgba(0,0,0,.35)" stroke="rgba(255,255,255,.10)" />
                <text x="486" y="72" fontFamily="ui-sans-serif, system-ui" fontSize="12" fill="rgba(255,255,255,.62)" letterSpacing=".12em">MRR</text>
                <text x="486" y="106" fontFamily="ui-sans-serif, system-ui" fontSize="26" fill="rgba(255,255,255,.92)">$168k</text>
                <rect x="34" y="146" width="652" height="232" rx="14" fill="rgba(0,0,0,.28)" stroke="rgba(255,255,255,.08)" />
                <path
                  d="M58 340 C 120 298, 170 286, 220 268 S 330 250, 382 224 S 492 200, 560 190 S 640 176, 664 158"
                  stroke="url(#vxFline)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#vxFglow)"
                />
                <path
                  d="M58 340 C 120 298, 170 286, 220 268 S 330 250, 382 224 S 492 200, 560 190 S 640 176, 664 158 L 664 362 L 58 362 Z"
                  fill="rgba(47,107,255,.10)"
                />
                <g stroke="rgba(255,255,255,.08)">
                  <line x1="58" y1="188" x2="664" y2="188" />
                  <line x1="58" y1="238" x2="664" y2="238" />
                  <line x1="58" y1="288" x2="664" y2="288" />
                  <line x1="58" y1="338" x2="664" y2="338" />
                </g>
              </svg>
            </div>
          </div>

          {/* For Investors Panel */}
          <div
            className="vx-ffis-panel vx-ffis-investor"
            data-vx-ffis-panel
            data-vx-href="/login"
            onClick={handlePanelClick("investor", "/login")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handlePanelClick("investor", "/login")(e as any);
              }
            }}
            tabIndex={0}
            role="button"
            aria-label="For Investors"
          >
            <div className="vx-ffis-inner">
              <div className="vx-ffis-kicker">For Investors</div>
              <div className="vx-ffis-title">Standardized KPIs across your portfolio.</div>
              <div className="vx-ffis-copy">
                See comparable, up-to-date metrics without chasing founders. Review changes and drill into a company when something moves.
              </div>
              <div className="vx-ffis-ctaRow">
                <Link className="vx-ffis-cta" href="/login" onClick={(e) => e.stopPropagation()}>
                  Request a Demo
                </Link>
                <div className="vx-ffis-ctaHint">Click anywhere</div>
              </div>
            </div>
            <div className="vx-ffis-visual" aria-hidden="true">
              <svg viewBox="0 0 720 420" xmlns="http://www.w3.org/2000/svg" fill="none">
                <defs>
                  <linearGradient id="vxIbg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="rgba(255,255,255,.08)" />
                    <stop offset="1" stopColor="rgba(255,255,255,.02)" />
                  </linearGradient>
                  <linearGradient id="vxIline" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="rgba(164,98,255,.12)" />
                    <stop offset="1" stopColor="rgba(164,98,255,.80)" />
                  </linearGradient>
                  <filter id="vxIglow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2.0" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <rect x="14" y="16" width="692" height="388" rx="14" fill="url(#vxIbg)" stroke="rgba(255,255,255,.16)" />
                <rect x="34" y="40" width="652" height="60" rx="12" fill="rgba(0,0,0,.34)" stroke="rgba(255,255,255,.10)" />
                <text x="52" y="76" fontFamily="ui-sans-serif, system-ui" fontSize="12" fill="rgba(255,255,255,.62)" letterSpacing=".12em">PORTFOLIO OVERVIEW</text>
                <rect x="34" y="116" width="652" height="258" rx="14" fill="rgba(0,0,0,.26)" stroke="rgba(255,255,255,.08)" />
                <g fontFamily="ui-sans-serif, system-ui" fontSize="12" fill="rgba(255,255,255,.70)">
                  <text x="52" y="148">Company</text>
                  <text x="310" y="148">MRR</text>
                  <text x="420" y="148">Churn</text>
                  <text x="530" y="148">Runway</text>
                </g>
                <g stroke="rgba(255,255,255,.08)">
                  <line x1="46" y1="160" x2="674" y2="160" />
                  <line x1="46" y1="204" x2="674" y2="204" />
                  <line x1="46" y1="248" x2="674" y2="248" />
                  <line x1="46" y1="292" x2="674" y2="292" />
                  <line x1="46" y1="336" x2="674" y2="336" />
                </g>
                <g fontFamily="ui-sans-serif, system-ui" fontSize="12" fill="rgba(255,255,255,.78)">
                  <text x="52" y="190">Aurora</text>
                  <text x="52" y="234">Northwind</text>
                  <text x="52" y="278">Keystone</text>
                  <text x="52" y="322">Atlas</text>
                </g>
                <g fontFamily="ui-sans-serif, system-ui" fontSize="12" fill="rgba(255,255,255,.70)">
                  <text x="310" y="190">$92k</text>
                  <text x="310" y="234">$48k</text>
                  <text x="310" y="278">$156k</text>
                  <text x="310" y="322">$71k</text>
                  <text x="420" y="190">2.1%</text>
                  <text x="420" y="234">1.4%</text>
                  <text x="420" y="278">3.0%</text>
                  <text x="420" y="322">2.3%</text>
                  <text x="530" y="190">18 mo</text>
                  <text x="530" y="234">12 mo</text>
                  <text x="530" y="278">9 mo</text>
                  <text x="530" y="322">15 mo</text>
                </g>
                <path
                  d="M410 356 C 455 344, 494 338, 544 320 S 620 300, 668 272"
                  stroke="url(#vxIline)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#vxIglow)"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
