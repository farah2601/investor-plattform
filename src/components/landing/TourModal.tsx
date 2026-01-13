"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

declare global {
  interface Window {
    openValyxoTour?: () => void;
    closeValyxoTour?: () => void;
  }
}

interface TourStep {
  id: string;
  title: string;
  subtitle: string;
  callouts: string[];
  secondaryCta?: string;
  previewHtml?: string;
}

const tourSteps: TourStep[] = [
  {
    id: "connect",
    title: "Connect your systems",
    subtitle: "Valyxo connects to your existing data sources (CRM, finance, billing, spreadsheets, or custom integrations) and automatically generates live dashboards.",
    callouts: ["Read-only access — Valyxo never writes or modifies data", "Setup takes 2–5 minutes per system", "Start with one system, add more later"],
    secondaryCta: 'Prefer guided setup? <a href="/onboarding" target="_blank" rel="noopener" class="vx-tour-cta-link">Book a 15-minute onboarding call</a>',
    previewHtml: `
      <div class="vx-tour-visual">
        <div style="font-size:11px;color:rgba(255,255,255,.85);margin-bottom:14px;text-align:center;text-transform:uppercase;letter-spacing:.05em;font-weight:500">Examples of common data sources — not limited to these</div>
        <div class="vx-tour-logo-grid">
          <div class="vx-tour-logo" style="background:linear-gradient(135deg,#635bff,#a259ff)">Stripe</div>
          <div class="vx-tour-logo" style="background:linear-gradient(135deg,#1a73e8,#34a853)">Tripletex</div>
          <div class="vx-tour-logo" style="background:linear-gradient(135deg,#f26132,#ff8c00)">Pipedrive</div>
          <div class="vx-tour-logo" style="background:linear-gradient(135deg,#0f9d58,#34a853)">Sheets</div>
        </div>
        <div class="vx-tour-flow" style="margin-top:20px">
          <div class="vx-tour-flow-item"><div style="font-size:10px;color:rgba(255,255,255,.55)">Your data sources</div><div style="font-size:9px;color:rgba(255,255,255,.35);margin-top:2px">(CRM, finance, custom)</div></div>
          <div class="vx-tour-flow-arrow">→</div>
          <div class="vx-tour-flow-item" style="border-color:rgba(47,107,255,.40);background:rgba(47,107,255,.08)"><div style="font-size:11px;color:rgba(47,107,255,.90);font-weight:600">Valyxo</div></div>
          <div class="vx-tour-flow-arrow">→</div>
          <div class="vx-tour-flow-item"><div style="font-size:11px;color:rgba(255,255,255,.60)">Live dashboards</div></div>
        </div>
        <div class="vx-tour-explainer" style="margin-top:16px">Valyxo's AI agent automatically pulls your metrics from connected systems.</div>
      </div>
    `,
  },
  {
    id: "metrics",
    title: "Live metrics appear",
    subtitle: "Your KPIs update automatically as data flows in — no manual reporting or spreadsheets.",
    callouts: ["Metrics sync in real-time from connected sources", "Switch between Week, Month, Year, or Max views", "Always see when data was last updated"],
    previewHtml: `
      <div class="vx-tour-visual">
        <div class="vx-tour-mini-dashboard">
          <div class="vx-tour-mini-header">
            <div class="vx-tour-mini-title">Company dashboard</div>
            <div class="vx-tour-mini-meta">Last updated 3 min ago</div>
          </div>
          <div class="vx-tour-kpi-grid">
            <div class="vx-tour-kpi"><div class="vx-tour-kpi-label">ARR</div><div class="vx-tour-kpi-value">$1.2M</div></div>
            <div class="vx-tour-kpi"><div class="vx-tour-kpi-label">MRR</div><div class="vx-tour-kpi-value">$98k</div></div>
            <div class="vx-tour-kpi"><div class="vx-tour-kpi-label">Burn</div><div class="vx-tour-kpi-value">$62k</div></div>
            <div class="vx-tour-kpi"><div class="vx-tour-kpi-label">Runway</div><div class="vx-tour-kpi-value">14 mo</div></div>
          </div>
          <div class="vx-tour-time-toggle">
            <div class="vx-tour-time-btn">Week</div>
            <div class="vx-tour-time-btn active">Month</div>
            <div class="vx-tour-time-btn">Year</div>
            <div class="vx-tour-time-btn">Max</div>
          </div>
        </div>
        <div class="vx-tour-explainer">No more updating spreadsheets or chasing data. Connect once, see live metrics forever.</div>
      </div>
    `,
  },
  {
    id: "ai",
    title: "AI insights",
    subtitle: "Valyxo summarizes what changed in plain language — so you can explain metrics before investors ask.",
    callouts: ["Plain-language summaries, not raw numbers", "Compares current vs previous period automatically", "No investment advice or scoring — just clarity"],
    previewHtml: `
      <div class="vx-tour-visual">
        <div class="vx-tour-split">
          <div class="vx-tour-split-left">
            <div style="font-size:10px;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px">Dashboard snapshot</div>
            <div style="display:flex;flex-direction:column;gap:6px">
              <div style="display:flex;justify-content:space-between;font-size:11px"><span style="color:rgba(255,255,255,.55)">ARR</span><span style="color:rgba(255,255,255,.85)">$1.2M</span></div>
              <div style="display:flex;justify-content:space-between;font-size:11px"><span style="color:rgba(255,255,255,.55)">Runway</span><span style="color:rgba(255,255,255,.85)">14 mo</span></div>
              <div style="display:flex;justify-content:space-between;font-size:11px"><span style="color:rgba(255,255,255,.55)">Burn</span><span style="color:rgba(255,255,255,.85)">$62k/mo</span></div>
            </div>
          </div>
          <div class="vx-tour-split-right">
            <div style="font-size:10px;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px">AI summary</div>
            <div class="vx-tour-ai-item"><div class="vx-tour-ai-dot"></div><div class="vx-tour-ai-text">Runway down 2 months due to increased hiring costs</div></div>
            <div class="vx-tour-ai-item"><div class="vx-tour-ai-dot"></div><div class="vx-tour-ai-text">ARR growth slowed from 15% to 12% this quarter</div></div>
            <div class="vx-tour-ai-item"><div class="vx-tour-ai-dot"></div><div class="vx-tour-ai-text">Churn improved slightly vs last month</div></div>
          </div>
        </div>
        <div class="vx-tour-explainer">AI helps founders explain what changed — without sounding like they're making excuses.</div>
      </div>
    `,
  },
  {
    id: "share",
    title: "Share with investors",
    subtitle: "Share a clean, read-only dashboard that you fully control — investors see exactly what you want them to see.",
    callouts: ["Investors get read-only access by default", "You decide which metrics are visible", "Share via secure link or direct email invite"],
    previewHtml: `
      <div class="vx-tour-visual">
        <div class="vx-tour-permission">
          <div style="font-size:10px;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.04em;margin-bottom:12px">What investors can see</div>
          <div class="vx-tour-permission-row"><div class="vx-tour-permission-label">ARR & MRR metrics</div><div class="vx-tour-permission-toggle"></div></div>
          <div class="vx-tour-permission-row"><div class="vx-tour-permission-label">Burn & Runway</div><div class="vx-tour-permission-toggle"></div></div>
          <div class="vx-tour-permission-row"><div class="vx-tour-permission-label">Growth charts</div><div class="vx-tour-permission-toggle"></div></div>
          <div class="vx-tour-permission-row"><div class="vx-tour-permission-label">AI insights</div><div class="vx-tour-permission-toggle off"></div></div>
          <div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:8px">
            <div style="flex:1;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.08);border-radius:6px;padding:8px 10px;font-size:10px;color:rgba(255,255,255,.50);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">valyxo.com/inv/abc123...</div>
            <div style="padding:6px 12px;background:rgba(47,107,255,.15);border:1px solid rgba(47,107,255,.40);border-radius:6px;font-size:10px;color:rgba(255,255,255,.90)">Copy link</div>
          </div>
        </div>
        <div class="vx-tour-explainer">Investors see a clean, focused view. You stay in control of what's shared and can revoke access anytime.</div>
      </div>
    `,
  },
];

export function TourModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();

  const currentStepData = tourSteps[currentStep];
  const totalSteps = tourSteps.length;

  const goToStep = (index: number) => {
    if (index < 0) index = 0;
    if (index >= totalSteps) index = totalSteps - 1;
    setCurrentStep(index);
  };

  const nextStep = () => {
    if (currentStep >= totalSteps - 1) {
      setIsOpen(false);
      router.push("/login");
      return;
    }
    goToStep(currentStep + 1);
  };

  const prevStep = () => {
    goToStep(currentStep - 1);
  };

  useEffect(() => {
    // Expose functions globally for TourButton
    window.openValyxoTour = () => setIsOpen(true);
    window.closeValyxoTour = () => setIsOpen(false);

    // Handle click events on secondary CTA links
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".vx-tour-cta-link")) {
        e.preventDefault();
        const link = target.closest("a") as HTMLAnchorElement;
        if (link && link.href) {
          window.open(link.href, "_blank");
        }
      }
    };

    document.addEventListener("click", handleClick);

    // Keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") setIsOpen(false);
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        nextStep();
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        prevStep();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, currentStep, totalSteps]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="vx-tour-backdrop"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="vx-tour-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        data-tour-modal
      >
        {/* Header */}
        <div className="vx-tour-header">
          <div>
            <div className="vx-tour-progress" data-tour-progress>
              Step {currentStep + 1} of {totalSteps}
            </div>
            <div className="vx-tour-title" id="tour-title" data-tour-title>
              {currentStepData.title}
            </div>
            <div className="vx-tour-subtitle" data-tour-subtitle>
              {currentStepData.subtitle}
            </div>
          </div>
          <button
            type="button"
            className="vx-tour-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close tour"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="vx-tour-body">
          {/* Steps Sidebar */}
          <div className="vx-tour-steps" data-tour-steps>
            {tourSteps.map((step, index) => (
              <div
                key={step.id}
                className={`vx-tour-step ${index === currentStep ? "active" : ""}`}
                data-tour-step={index}
                onClick={() => goToStep(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    goToStep(index);
                  }
                }}
              >
                <span className="vx-tour-step-num">{index + 1}</span>
                <span className="vx-tour-step-label">{step.title}</span>
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="vx-tour-content">
            {/* Mobile Select */}
            <select
              className="vx-tour-mobile-select"
              data-tour-select
              value={currentStep}
              onChange={(e) => goToStep(Number(e.target.value))}
            >
              {tourSteps.map((step, index) => (
                <option key={step.id} value={index}>
                  {index + 1}. {step.title}
                </option>
              ))}
            </select>

            {/* Preview */}
            <div
              className="vx-tour-preview"
              data-tour-preview
              dangerouslySetInnerHTML={{
                __html: currentStepData.previewHtml || "",
              }}
            />

            {/* Callouts */}
            <div className="vx-tour-callouts" data-tour-callouts>
              {currentStepData.callouts.map((callout, index) => (
                <div key={index} className="vx-tour-callout">
                  <span className="vx-tour-callout-dot"></span>
                  {callout}
                </div>
              ))}
              {currentStepData.secondaryCta && (
                <div
                  className="vx-tour-cta-secondary"
                  dangerouslySetInnerHTML={{
                    __html: currentStepData.secondaryCta,
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="vx-tour-footer">
          <button
            type="button"
            className="vx-tour-skip"
            onClick={() => {
              setIsOpen(false);
              router.push("/login");
            }}
          >
            Skip tour
          </button>
          <div className="vx-tour-nav">
            <button
              type="button"
              className="vx-tour-btn vx-tour-btn-secondary"
              data-tour-back
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              Back
            </button>
            <button
              type="button"
              className="vx-tour-btn vx-tour-btn-primary"
              data-tour-next
              onClick={nextStep}
            >
              {currentStep === totalSteps - 1 ? "Get started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
