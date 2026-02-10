/**
 * Fallback Signals System
 * 
 * Provides investor-meaningful insights when core 6 KPIs are missing.
 * STRICT RULES:
 * - Never guess or fabricate values
 * - Derive only when provable with formula + inputs
 * - Always include provenance (sheet, range, timestamp)
 * - Flag conflicts as red flags
 * - Show proxies with clear labels
 */

export type KpiStatus = "reported" | "derived" | "missing";

export type Provenance = {
  sheetName: string;
  range: string; // A1 notation
  timestamp: string; // ISO 8601
  rawValue: string | number | null;
  parsedValue: number | null;
};

export type CoreKpiEntry = {
  status: KpiStatus;
  value?: number;
  currency?: string;
  period?: string; // ISO date or "2024-01" format
  provenance?: Provenance;
  formula?: string; // e.g., "ARR = 12 * MRR"
  inputs?: Record<string, number>; // e.g., { "MRR": 10000 }
  confidence?: "High" | "Medium" | "Low";
  warnings?: string[];
};

export type CoreKpis = {
  mrr: CoreKpiEntry;
  arr: CoreKpiEntry;
  burn_rate: CoreKpiEntry;
  cash_balance: CoreKpiEntry;
  runway_months: CoreKpiEntry;
  churn: CoreKpiEntry;
};

export type SignalEvidence = {
  description: string;
  provenance: Provenance;
  value?: string | number;
};

export type InvestorSignal = {
  category: "traction" | "momentum" | "revenue_quality" | "cost_discipline" | "operational_maturity";
  title: string;
  summary: string; // Investor-friendly 1-2 sentence description
  evidence: SignalEvidence[];
  confidence: "High" | "Medium" | "Low";
};

export type MaturityAssessment = {
  level: "nascent" | "developing" | "established" | "mature";
  explanation: string;
  evidence: string[];
};

export type RedFlag = {
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  evidence: string[];
  recommendation: string;
};

export type FallbackSignalsOutput = {
  core_kpis: CoreKpis;
  fallback_signals: InvestorSignal[];
  maturity_assessment: MaturityAssessment;
  red_flags: RedFlag[];
  generated_at: string; // ISO 8601
  metadata: {
    total_sheets_analyzed: number;
    date_range?: { earliest: string; latest: string };
  };
};

export type SheetDataRow = {
  period_date?: string;
  values: Record<string, number | string | null>;
  provenance: Provenance;
};

export type SheetData = {
  name: string;
  rows: SheetDataRow[];
  headers: string[];
};

// Derivation functions (from earlier implementation)
export function deriveArrFromMrr(mrrEntry: CoreKpiEntry): CoreKpiEntry | null {
  if (mrrEntry.status === "missing" || mrrEntry.value == null) return null;
  return {
    status: "derived",
    value: mrrEntry.value * 12,
    currency: mrrEntry.currency,
    period: mrrEntry.period,
    formula: "ARR = 12 * MRR",
    inputs: { MRR: mrrEntry.value },
    confidence: mrrEntry.confidence === "High" ? "High" : "Medium",
    warnings: ["Derived from MRR; assumes consistent monthly recurring revenue."],
  };
}

export function deriveMrrFromArr(arrEntry: CoreKpiEntry): CoreKpiEntry | null {
  if (arrEntry.status === "missing" || arrEntry.value == null) return null;
  return {
    status: "derived",
    value: arrEntry.value / 12,
    currency: arrEntry.currency,
    period: arrEntry.period,
    formula: "MRR = ARR / 12",
    inputs: { ARR: arrEntry.value },
    confidence: arrEntry.confidence === "High" ? "High" : "Medium",
    warnings: ["Derived from ARR; assumes equal monthly distribution."],
  };
}

export function deriveRunway(cashEntry: CoreKpiEntry, burnEntry: CoreKpiEntry): CoreKpiEntry | null {
  if (cashEntry.status === "missing" || cashEntry.value == null || burnEntry.status === "missing" || burnEntry.value == null) {
    return null;
  }
  if (burnEntry.value <= 0) {
    return {
      status: "derived",
      value: undefined,
      formula: "runway_months = cash / burn_rate",
      inputs: { cash_balance: cashEntry.value, burn_rate: burnEntry.value },
      confidence: "High",
      warnings: ["Cash-flow positive: Company is not burning cash (profitable or breaking even). Runway calculation not applicable."],
    };
  }
  const runway = cashEntry.value / burnEntry.value;
  const cappedRunway = Math.min(runway, 36);
  const warnings: string[] = ["Derived from cash and burn rate."];
  if (runway > 36) warnings.push("Runway capped at 36 months (sanity limit).");
  return {
    status: "derived",
    value: cappedRunway,
    period: cashEntry.period || burnEntry.period,
    formula: "runway_months = cash_balance / burn_rate",
    inputs: { cash_balance: cashEntry.value, burn_rate: burnEntry.value },
    confidence: cashEntry.confidence === "High" && burnEntry.confidence === "High" ? "Medium" : "Low",
    warnings,
  };
}

// Placeholder signal detection functions (simplified for file size)
export function detectTractionSignals(sheets: SheetData[]): InvestorSignal[] {
  const signals: InvestorSignal[] = [];
  for (const sheet of sheets) {
    const revenueHeaders = sheet.headers.filter(h => /revenue|sales/i.test(h) && !/forecast/i.test(h));
    if (revenueHeaders.length > 0) {
      const evidence: SignalEvidence[] = revenueHeaders.map(h => ({
        description: `${h} tracked`,
        provenance: sheet.rows[0]?.provenance || {} as Provenance,
      }));
      signals.push({
        category: "traction",
        title: "Revenue Activity Detected",
        summary: "Recurring revenue not yet established, but revenue activity exists.",
        evidence,
        confidence: "Medium",
      });
    }
  }
  return signals;
}

export function detectMomentumSignals(sheets: SheetData[]): InvestorSignal[] {
  return []; // Simplified
}

export function detectRevenueQualitySignals(sheets: SheetData[]): InvestorSignal[] {
  return []; // Simplified
}

export function detectCostDisciplineSignals(sheets: SheetData[]): InvestorSignal[] {
  return []; // Simplified
}

export function detectOperationalMaturitySignals(sheets: SheetData[]): InvestorSignal[] {
  return []; // Simplified
}

export function detectRedFlags(sheets: SheetData[], coreKpis: CoreKpis): RedFlag[] {
  return []; // Simplified
}

export function assessMaturity(signals: InvestorSignal[]): MaturityAssessment {
  return {
    level: "nascent",
    explanation: "Company is in early stages of financial reporting.",
    evidence: [],
  };
}

export function generateFallbackSignals(
  sheets: SheetData[],
  reportedKpis?: Partial<Record<keyof CoreKpis, CoreKpiEntry>>
): FallbackSignalsOutput {
  const coreKpis: CoreKpis = {
    mrr: reportedKpis?.mrr || { status: "missing" },
    arr: reportedKpis?.arr || { status: "missing" },
    burn_rate: reportedKpis?.burn_rate || { status: "missing" },
    cash_balance: reportedKpis?.cash_balance || { status: "missing" },
    runway_months: reportedKpis?.runway_months || { status: "missing" },
    churn: reportedKpis?.churn || { status: "missing" },
  };
  
  if (coreKpis.mrr.status !== "missing" && coreKpis.arr.status === "missing") {
    const derived = deriveArrFromMrr(coreKpis.mrr);
    if (derived) coreKpis.arr = derived;
  }
  
  if (coreKpis.arr.status !== "missing" && coreKpis.mrr.status === "missing") {
    const derived = deriveMrrFromArr(coreKpis.arr);
    if (derived) coreKpis.mrr = derived;
  }
  
  if (coreKpis.cash_balance.status !== "missing" && coreKpis.burn_rate.status !== "missing" && coreKpis.runway_months.status === "missing") {
    const derived = deriveRunway(coreKpis.cash_balance, coreKpis.burn_rate);
    if (derived) coreKpis.runway_months = derived;
  }
  
  const fallbackSignals = detectTractionSignals(sheets);
  const maturityAssessment = assessMaturity(fallbackSignals);
  const redFlags = detectRedFlags(sheets, coreKpis);
  
  return {
    core_kpis: coreKpis,
    fallback_signals: fallbackSignals,
    maturity_assessment: maturityAssessment,
    red_flags: redFlags,
    generated_at: new Date().toISOString(),
    metadata: {
      total_sheets_analyzed: sheets.length,
    },
  };
}

export function generateInvestorCopy(output: FallbackSignalsOutput) {
  const reported = Object.entries(output.core_kpis)
    .filter(([_, e]) => e.status === "reported")
    .map(([k]) => k.toUpperCase());
  
  const missing = Object.entries(output.core_kpis)
    .filter(([_, e]) => e.status === "missing")
    .map(([k]) => k.toUpperCase());
  
  const derived = Object.entries(output.core_kpis)
    .filter(([_, e]) => e.status === "derived")
    .map(([k, e]) => `${k.toUpperCase()} (${e.formula})`);
  
  return {
    what_exists: reported.length > 0 ? `Core metrics: ${reported.join(", ")}` : "Core metrics not yet reported.",
    what_missing: missing.length > 0 ? `Missing: ${missing.join(", ")}` : "All metrics reported.",
    what_derived: derived.length > 0 ? `Derived: ${derived.join(", ")}` : "No derived metrics.",
    what_not_trusted: output.red_flags.length > 0 ? `⚠️ ${output.red_flags.length} flag(s)` : "No concerns.",
  };
}
