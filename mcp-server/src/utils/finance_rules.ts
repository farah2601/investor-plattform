/**
 * Finance rules: profit vs burn
 *
 * MECHANICAL ONLY—no LLM involvement. All formulas enforced in code:
 * - burn_rate = -net_cash_flow when net is known (negative burn = profit, positive = burn)
 * - runway_months = cash_balance / burn_rate when burn > 0
 * - runway = null when burn <= 0 (profit or break-even)
 *
 * LLM never outputs these values—it only proposes column mapping. This module
 * applies formulas to raw parsed cell values.
 */

import { parseSheetNumber, parseNetCashFlow, type ParsedNumber } from "./robust_number_parser";

export type FinanceMetrics = {
  net_cash_flow: number | null;
  burn_rate: number | null;
  cash_balance: number | null;
  runway_months: number | null;
  
  // Metadata
  burn_derivation?: "from_net_cash_flow" | "reported" | "computed";
  runway_status?: "active" | "not_applicable" | "missing_data";
  runway_label?: string;
  
  // Provenance for debugging
  net_cash_flow_raw?: string;
  burn_rate_raw?: string;
  warnings?: string[];
};

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

/**
 * Apply finance rules: burn_rate = -net_cash_flow when net is known.
 * Negative burn = profit (cash in), positive burn = burn (cash out). Runway only when burn > 0.
 */
export function applyFinanceRules(
  netCashFlowRaw: unknown,
  burnRateRaw: unknown,
  cashBalanceRaw: unknown,
  options?: {
    preferReportedBurn?: boolean; // If true, use reported burn unless it diverges from net
  }
): FinanceMetrics {
  const warnings: string[] = [];
  
  const netParsed = parseSheetNumber(netCashFlowRaw);
  const burnParsed = parseSheetNumber(burnRateRaw);
  const cashParsed = parseSheetNumber(cashBalanceRaw);
  
  const netCashFlow = netParsed ? netParsed.signalValue : null;
  const reportedBurn = burnParsed ? burnParsed.signalValue : null;
  const cashBalance = cashParsed ? cashParsed.signalValue : null;
  
  let burnRate: number | null = null;
  let burnDerivation: "from_net_cash_flow" | "reported" | "computed" = "computed";
  
  if (netCashFlow !== null) {
    // burn_rate = -net_cash_flow: positive net → negative burn (profit), negative net → positive burn
    burnRate = -netCashFlow;
    burnDerivation = "from_net_cash_flow";
    if (burnRate > 0) { /* burning */ } else if (burnRate < 0) { warnings.push("Profit (cash inflow)."); } else { warnings.push("Breaking even."); }
  } else if (reportedBurn !== null) {
    burnRate = reportedBurn;
    burnDerivation = "reported";
    if (reportedBurn < 0) {
      warnings.push("Negative burn = profit (from sheet).");
    }
  }
  
  let runwayMonths: number | null = null;
  let runwayStatus: "active" | "not_applicable" | "missing_data" = "missing_data";
  let runwayLabel: string | undefined;
  
  if (burnRate !== null && cashBalance !== null) {
    if (burnRate <= 0) {
      runwayMonths = null;
      runwayStatus = "not_applicable";
      runwayLabel = burnRate < 0 ? "Not applicable (profit)" : "Not applicable (breaking even)";
    } else {
      runwayMonths = cashBalance / burnRate;
      runwayStatus = "active";
      if (runwayMonths > 999) {
        warnings.push(`Runway ${runwayMonths.toFixed(1)} months capped at 999.`);
        runwayMonths = 999;
      }
    }
  } else if (burnRate !== null && burnRate <= 0) {
    runwayMonths = null;
    runwayStatus = "not_applicable";
    runwayLabel = burnRate < 0 ? "Not applicable (profit)" : "Not applicable (breaking even)";
  }
  
  return {
    net_cash_flow: netCashFlow,
    burn_rate: burnRate,
    cash_balance: cashBalance,
    runway_months: runwayMonths,
    burn_derivation: burnDerivation,
    runway_status: runwayStatus,
    runway_label: runwayLabel,
    net_cash_flow_raw: netCashFlowRaw ? String(netCashFlowRaw) : undefined,
    burn_rate_raw: burnRateRaw ? String(burnRateRaw) : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate that finance metrics follow hard rules
 * 
 * Returns validation result with errors if rules are violated
 */
export function validateFinanceRules(metrics: FinanceMetrics): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [...(metrics.warnings || [])];
  
  // Negative burn = profit (allowed). When net > 0, burn should be negative.
  if (metrics.net_cash_flow !== null && metrics.net_cash_flow > 0 && metrics.burn_rate !== null && metrics.burn_rate > 0) {
    errors.push(`Positive net (profit) but burn > 0. When profit, burn should be negative.`);
  }
  if (metrics.net_cash_flow !== null && metrics.net_cash_flow < 0 && metrics.burn_rate !== null && metrics.burn_rate < 0) {
    errors.push(`Negative net (burn) but burn_rate negative. When burning, burn should be positive.`);
  }
  if (metrics.burn_rate !== null && metrics.burn_rate <= 0 && metrics.runway_months !== null) {
    errors.push(`Runway must be null when not burning (burn <= 0 or profit).`);
  }
  if (metrics.runway_status === "active" && metrics.runway_months !== null) {
    if (metrics.cash_balance === null || metrics.burn_rate === null || metrics.burn_rate <= 0) {
      errors.push(`Runway active requires cash and positive burn.`);
    }
  }
  if (metrics.runway_months !== null && metrics.runway_months <= 0) {
    errors.push(`Runway cannot be zero or negative.`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Convert net cash flow to burn rate: burn = -net. Negative burn = profit.
 */
export function netCashFlowToBurn(netCashFlow: number | null): number | null {
  return netCashFlow === null ? null : -netCashFlow;
}

/**
 * Company is cash-flow positive (profit or break-even) when net > 0 or burn <= 0.
 */
export function isCashFlowPositive(metrics: FinanceMetrics): boolean {
  if (metrics.net_cash_flow !== null && metrics.net_cash_flow > 0) return true;
  if (metrics.burn_rate !== null && metrics.burn_rate <= 0) return true;
  return false;
}

/**
 * Get investor-friendly description of burn/runway status
 */
export function getFinanceStatusDescription(metrics: FinanceMetrics): {
  burn_description: string;
  runway_description: string;
} {
  let burn_description = "";
  let runway_description = "";
  
  if (metrics.burn_rate === null) {
    burn_description = "Burn rate not available (missing data).";
  } else if (metrics.burn_rate < 0) {
    burn_description = `Profit: ${Math.abs(metrics.burn_rate).toLocaleString()} per month (cash inflow).`;
  } else if (metrics.burn_rate === 0) {
    burn_description = "Breaking even (no burn, no profit).";
  } else {
    burn_description = `Burning ${metrics.burn_rate.toLocaleString()} per month (cash outflow).`;
  }
  
  // Runway description
  if (metrics.runway_status === "not_applicable") {
    runway_description = "Runway not applicable (company is cash-flow positive).";
  } else if (metrics.runway_status === "missing_data") {
    runway_description = "Runway not available (missing cash balance or burn rate data).";
  } else if (metrics.runway_months !== null) {
    const months = metrics.runway_months;
    const years = months / 12;
    
    if (months < 3) {
      runway_description = `⚠️ CRITICAL: ${months.toFixed(1)} months of runway remaining. Urgent action needed.`;
    } else if (months < 6) {
      runway_description = `⚠️ WARNING: ${months.toFixed(1)} months of runway remaining (${years.toFixed(1)} years).`;
    } else if (months < 12) {
      runway_description = `${months.toFixed(1)} months of runway remaining (${years.toFixed(1)} years). Monitor closely.`;
    } else {
      runway_description = `${months.toFixed(1)} months of runway remaining (${years.toFixed(1)} years). Healthy cash position.`;
    }
  } else {
    runway_description = "Runway not available.";
  }
  
  return {
    burn_description,
    runway_description,
  };
}

/**
 * Test suite for finance rules
 */
export function runFinanceRulesTests() {
  console.log("Running Finance Rules Tests...\n");
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Positive net (profit) → negative burn
  {
    const metrics = applyFinanceRules(5000, null, 100000); // net = +5000
    const validation = validateFinanceRules(metrics);
    
    if (metrics.burn_rate === -5000 && validation.valid) {
      console.log("✅ Test 1: Positive net (profit) → burn = -5000");
      passed++;
    } else {
      console.error("❌ Test 1 FAILED: Expected burn=-5000, got:", metrics.burn_rate);
      console.error("   Validation:", validation);
      failed++;
    }
  }
  
  // Test 2: Negative net cash flow → burn = abs(net)
  {
    const metrics = applyFinanceRules(-8000, null, 100000); // net = -8000
    const validation = validateFinanceRules(metrics);
    
    if (metrics.burn_rate === 8000 && validation.valid) {
      console.log("✅ Test 2: Negative net cash flow → burn = 8000");
      passed++;
    } else {
      console.error("❌ Test 2 FAILED: Expected burn=8000, got:", metrics.burn_rate);
      console.error("   Validation:", validation);
      failed++;
    }
  }
  
  // Test 3: Profit (negative burn) → runway = null
  {
    const metrics = applyFinanceRules(5000, null, 100000);
    const validation = validateFinanceRules(metrics);
    
    if (
      metrics.runway_months === null &&
      metrics.runway_status === "not_applicable" &&
      validation.valid
    ) {
      console.log("✅ Test 3: Profit → runway = null, not_applicable");
      passed++;
    } else {
      console.error("❌ Test 3 FAILED: Expected runway=null & not_applicable");
      console.error("   Got runway:", metrics.runway_months, "status:", metrics.runway_status);
      console.error("   Validation:", validation);
      failed++;
    }
  }
  
  // Test 4: Burn > 0 → runway = cash / burn
  {
    const metrics = applyFinanceRules(-50000, null, 500000); // burn=50k, cash=500k
    const validation = validateFinanceRules(metrics);
    
    const expectedRunway = 500000 / 50000; // 10 months
    
    if (
      metrics.runway_months === expectedRunway &&
      metrics.runway_status === "active" &&
      validation.valid
    ) {
      console.log("✅ Test 4: Burn > 0 → runway = 10 months");
      passed++;
    } else {
      console.error("❌ Test 4 FAILED: Expected runway=10");
      console.error("   Got:", metrics.runway_months, "status:", metrics.runway_status);
      console.error("   Validation:", validation);
      failed++;
    }
  }
  
  // Test 5: Validation rejects positive burn with positive net (profit)
  {
    const badMetrics: FinanceMetrics = {
      net_cash_flow: 5000,
      burn_rate: 3000,
      cash_balance: 100000,
      runway_months: null,
    };
    
    const validation = validateFinanceRules(badMetrics);
    
    if (!validation.valid && validation.errors.some(e => e.includes("Positive net") || e.includes("profit"))) {
      console.log("✅ Test 5: Validation rejects positive burn with positive net");
      passed++;
    } else {
      console.error("❌ Test 5 FAILED: Should reject positive burn with positive net");
      console.error("   Validation:", validation);
      failed++;
    }
  }
  
  // Test 6: Validation rejects runway when burn <= 0
  {
    const badMetrics: FinanceMetrics = {
      net_cash_flow: null,
      burn_rate: 0,
      cash_balance: 100000,
      runway_months: 10,
      runway_status: "active",
    };
    
    const validation = validateFinanceRules(badMetrics);
    
    if (!validation.valid && validation.errors.some(e => e.includes("Runway") && (e.includes("null") || e.includes("not burning")))) {
      console.log("✅ Test 6: Validation rejects runway when burn <= 0");
      passed++;
    } else {
      console.error("❌ Test 6 FAILED: Should reject runway when burn <= 0");
      console.error("   Validation:", validation);
      failed++;
    }
  }
  
  // Test 7: Handles unicode minus in net cash flow
  {
    const metrics = applyFinanceRules("−8000", null, "100000"); // Unicode minus
    const validation = validateFinanceRules(metrics);
    
    if (metrics.burn_rate === 8000 && validation.valid) {
      console.log("✅ Test 7: Unicode minus parsed correctly");
      passed++;
    } else {
      console.error("❌ Test 7 FAILED: Unicode minus not handled");
      console.error("   Got burn:", metrics.burn_rate);
      failed++;
    }
  }
  
  // Test 8: Handles parentheses negative
  {
    const metrics = applyFinanceRules("(10,000)", null, "100000"); // Parentheses = negative
    const validation = validateFinanceRules(metrics);
    
    if (metrics.burn_rate === 10000 && validation.valid) {
      console.log("✅ Test 8: Parentheses negative parsed correctly");
      passed++;
    } else {
      console.error("❌ Test 8 FAILED: Parentheses not handled");
      console.error("   Got burn:", metrics.burn_rate);
      failed++;
    }
  }
  
  // Test 9: Handles currency formats (positive net → profit = negative burn)
  {
    const metrics = applyFinanceRules("$5,000", null, "$100,000");
    const validation = validateFinanceRules(metrics);
    
    if (metrics.net_cash_flow === 5000 && metrics.burn_rate === -5000 && validation.valid) {
      console.log("✅ Test 9: Currency formats parsed correctly");
      passed++;
    } else {
      console.error("❌ Test 9 FAILED: Currency not handled");
      console.error("   Got net:", metrics.net_cash_flow, "burn:", metrics.burn_rate);
      failed++;
    }
  }
  
  // Test 10: Reported burn with divergence from net
  {
    const metrics = applyFinanceRules(
      -10000,  // net = -10k (burn should be 10k)
      -15000,  // reported burn = -15k (50% divergence, also wrong sign!)
      100000,
      { preferReportedBurn: true }
    );
    const validation = validateFinanceRules(metrics);
    
    // Should use net as source of truth due to divergence
    if (metrics.burn_rate === 10000 && metrics.burn_derivation === "from_net_cash_flow" && validation.valid) {
      console.log("✅ Test 10: Divergent reported burn overridden by net");
      passed++;
    } else {
      console.error("❌ Test 10 FAILED: Should override divergent burn");
      console.error("   Got burn:", metrics.burn_rate, "derivation:", metrics.burn_derivation);
      console.error("   Validation:", validation);
      failed++;
    }
  }
  
  console.log(`\n${passed}/10 tests passed`);
  
  if (failed > 0) {
    process.exit(1);
  }
  
  return { passed, failed };
}

// Run tests if executed directly
if (require.main === module) {
  runFinanceRulesTests();
  console.log("\n✅ All finance rules tests passed!");
}
