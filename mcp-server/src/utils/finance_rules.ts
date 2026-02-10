/**
 * Hard Finance Rules for KPI Calculations
 * 
 * STRICT RULES to prevent sign confusion and ensure financial logic is correct:
 * 
 * 1. net_cash_flow > 0 => burn = 0, label "cash-flow positive"
 * 2. burn = max(0, -net_cash_flow)  (burn is always >= 0)
 * 3. runway only computed when burn > 0; otherwise runway = null with label "Not applicable (cash-flow positive)"
 * 4. Validation rejects outputs that violate these rules
 * 
 * Acceptance: No scenario where positive net cash flow becomes positive burn,
 * and runway never shown when burn <= 0.
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
 * Apply hard finance rules to compute burn and runway
 * 
 * HARD RULES:
 * - burn is ALWAYS non-negative (>= 0)
 * - burn = 0 when net_cash_flow > 0 (cash inflow)
 * - burn = -net_cash_flow when net_cash_flow < 0 (cash outflow)
 * - runway = null when burn <= 0 (not burning cash)
 * - runway = cash / burn when burn > 0
 */
export function applyFinanceRules(
  netCashFlowRaw: unknown,
  burnRateRaw: unknown,
  cashBalanceRaw: unknown,
  options?: {
    preferReportedBurn?: boolean; // If true, use reported burn unless it violates rules
  }
): FinanceMetrics {
  const warnings: string[] = [];
  
  // Parse inputs with robust parser
  const netParsed = parseSheetNumber(netCashFlowRaw);
  const burnParsed = parseSheetNumber(burnRateRaw);
  const cashParsed = parseSheetNumber(cashBalanceRaw);
  
  const netCashFlow = netParsed ? netParsed.signalValue : null;
  const reportedBurn = burnParsed ? burnParsed.signalValue : null;
  const cashBalance = cashParsed ? cashParsed.signalValue : null;
  
  let burnRate: number | null = null;
  let burnDerivation: "from_net_cash_flow" | "reported" | "computed" = "computed";
  
  // HARD RULE 1: If net_cash_flow exists, use it to compute burn (unless preferReportedBurn)
  if (netCashFlow !== null) {
    if (netCashFlow > 0) {
      // Cash inflow: not burning
      burnRate = 0;
      burnDerivation = "from_net_cash_flow";
      warnings.push("Net cash flow is positive (inflow); burn set to 0 (cash-flow positive).");
    } else if (netCashFlow < 0) {
      // Cash outflow: burning
      const burnFromNet = -netCashFlow; // Convert to positive
      
      // If reported burn exists, validate against net
      if (reportedBurn !== null && options?.preferReportedBurn) {
        const absoluteReportedBurn = Math.abs(reportedBurn);
        const divergence = Math.abs(absoluteReportedBurn - burnFromNet) / burnFromNet;
        
        if (divergence > 0.10) {
          // >10% divergence: use net_cash_flow as source of truth
          warnings.push(`Reported burn (${absoluteReportedBurn}) diverges ${(divergence * 100).toFixed(0)}% from net cash flow (${burnFromNet}). Using net cash flow as source of truth.`);
          burnRate = burnFromNet;
          burnDerivation = "from_net_cash_flow";
        } else {
          // Close enough: use reported
          burnRate = absoluteReportedBurn;
          burnDerivation = "reported";
        }
      } else {
        // No reported burn, or not preferring it: use net
        burnRate = burnFromNet;
        burnDerivation = "from_net_cash_flow";
      }
    } else {
      // Net = 0: breaking even
      burnRate = 0;
      burnDerivation = "from_net_cash_flow";
      warnings.push("Net cash flow is zero (breaking even); burn set to 0.");
    }
  } else if (reportedBurn !== null) {
    // No net_cash_flow, but have reported burn
    // HARD RULE: Burn must be non-negative
    burnRate = Math.abs(reportedBurn);
    burnDerivation = "reported";
    
    if (reportedBurn < 0) {
      warnings.push(`Reported burn was negative (${reportedBurn}); converted to positive (${burnRate}).`);
    }
  }
  
  // HARD RULE 2: Runway calculation
  let runwayMonths: number | null = null;
  let runwayStatus: "active" | "not_applicable" | "missing_data" = "missing_data";
  let runwayLabel: string | undefined;
  
  if (burnRate !== null && cashBalance !== null) {
    if (burnRate <= 0) {
      // HARD RULE: No runway when not burning
      runwayMonths = null;
      runwayStatus = "not_applicable";
      runwayLabel = "Not applicable (cash-flow positive)";
    } else {
      // Normal case: burning cash
      runwayMonths = cashBalance / burnRate;
      runwayStatus = "active";
      
      // Sanity cap at 999 months (likely data error if higher)
      if (runwayMonths > 999) {
        warnings.push(`Runway ${runwayMonths.toFixed(1)} months seems unrealistic; capping at 999. Check cash and burn values.`);
        runwayMonths = 999;
      }
    }
  } else if (burnRate !== null && burnRate <= 0) {
    // Burn is 0 but no cash balance: still mark as cash-flow positive
    runwayMonths = null;
    runwayStatus = "not_applicable";
    runwayLabel = "Not applicable (cash-flow positive)";
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
  
  // RULE 1: Burn must be non-negative
  if (metrics.burn_rate !== null && metrics.burn_rate < 0) {
    errors.push(`VIOLATION: Burn rate cannot be negative. Got: ${metrics.burn_rate}`);
  }
  
  // RULE 2: If net_cash_flow > 0, burn must be 0
  if (metrics.net_cash_flow !== null && metrics.net_cash_flow > 0) {
    if (metrics.burn_rate !== null && metrics.burn_rate > 0) {
      errors.push(`VIOLATION: Positive net cash flow (${metrics.net_cash_flow}) but burn > 0 (${metrics.burn_rate}). When cash inflow, burn must be 0.`);
    }
  }
  
  // RULE 3: If net_cash_flow < 0, burn should equal -net_cash_flow (or close)
  if (metrics.net_cash_flow !== null && metrics.net_cash_flow < 0) {
    const expectedBurn = -metrics.net_cash_flow;
    if (metrics.burn_rate !== null) {
      const divergence = Math.abs(metrics.burn_rate - expectedBurn) / expectedBurn;
      if (divergence > 0.15) {
        warnings.push(`Burn (${metrics.burn_rate}) diverges ${(divergence * 100).toFixed(0)}% from net cash flow (-${metrics.net_cash_flow}). May indicate inconsistent data.`);
      }
    }
  }
  
  // RULE 4: Runway must be null when burn <= 0
  if (metrics.burn_rate !== null && metrics.burn_rate <= 0) {
    if (metrics.runway_months !== null) {
      errors.push(`VIOLATION: Runway (${metrics.runway_months}) shown when burn <= 0. Runway must be null when not burning cash.`);
    }
    if (metrics.runway_status !== "not_applicable" && metrics.runway_status !== "missing_data") {
      errors.push(`VIOLATION: Runway status must be "not_applicable" when burn <= 0. Got: ${metrics.runway_status}`);
    }
  }
  
  // RULE 5: Runway must be positive when calculated
  if (metrics.runway_months !== null && metrics.runway_months <= 0) {
    errors.push(`VIOLATION: Runway cannot be zero or negative. Got: ${metrics.runway_months}`);
  }
  
  // RULE 6: Runway requires both cash and burn > 0
  if (metrics.runway_status === "active" && metrics.runway_months !== null) {
    if (metrics.cash_balance === null) {
      errors.push(`VIOLATION: Runway active (${metrics.runway_months}) but cash_balance is null.`);
    }
    if (metrics.burn_rate === null || metrics.burn_rate <= 0) {
      errors.push(`VIOLATION: Runway active (${metrics.runway_months}) but burn_rate is null or <= 0.`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Helper: Convert net cash flow to burn rate
 * 
 * Net cash flow semantics:
 * - Positive = cash inflow (good) → burn = 0
 * - Negative = cash outflow (burning) → burn = abs(net)
 * - Zero = breaking even → burn = 0
 */
export function netCashFlowToBurn(netCashFlow: number | null): number | null {
  if (netCashFlow === null) {
    return null;
  }
  
  // HARD RULE: burn = max(0, -net_cash_flow)
  return Math.max(0, -netCashFlow);
}

/**
 * Helper: Determine if company is cash-flow positive
 */
export function isCashFlowPositive(metrics: FinanceMetrics): boolean {
  // Cash-flow positive if:
  // 1. Net cash flow > 0, OR
  // 2. Burn rate = 0
  if (metrics.net_cash_flow !== null && metrics.net_cash_flow > 0) {
    return true;
  }
  if (metrics.burn_rate !== null && metrics.burn_rate === 0) {
    return true;
  }
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
  
  // Burn description
  if (metrics.burn_rate === null) {
    burn_description = "Burn rate not available (missing data).";
  } else if (metrics.burn_rate === 0) {
    burn_description = "Not burning cash (cash-flow positive). Company is profitable or breaking even.";
  } else {
    burn_description = `Burning ${metrics.burn_rate.toLocaleString()} per month (cash outflow).`;
    if (metrics.burn_derivation === "from_net_cash_flow") {
      burn_description += " Derived from net cash flow.";
    }
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
  
  // Test 1: Positive net cash flow → burn = 0
  {
    const metrics = applyFinanceRules(5000, null, 100000); // net = +5000
    const validation = validateFinanceRules(metrics);
    
    if (metrics.burn_rate === 0 && validation.valid) {
      console.log("✅ Test 1: Positive net cash flow → burn = 0");
      passed++;
    } else {
      console.error("❌ Test 1 FAILED: Expected burn=0, got:", metrics.burn_rate);
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
  
  // Test 3: Burn = 0 → runway = null, status = "not_applicable"
  {
    const metrics = applyFinanceRules(5000, null, 100000);
    const validation = validateFinanceRules(metrics);
    
    if (
      metrics.runway_months === null &&
      metrics.runway_status === "not_applicable" &&
      validation.valid
    ) {
      console.log("✅ Test 3: Burn = 0 → runway = null, not_applicable");
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
  
  // Test 5: Validation rejects positive burn with positive net cash flow
  {
    const badMetrics: FinanceMetrics = {
      net_cash_flow: 5000, // POSITIVE (inflow)
      burn_rate: 3000,     // POSITIVE (should be 0!)
      cash_balance: 100000,
      runway_months: null,
    };
    
    const validation = validateFinanceRules(badMetrics);
    
    if (!validation.valid && validation.errors.some(e => e.includes("Positive net cash flow"))) {
      console.log("✅ Test 5: Validation rejects positive burn with positive net");
      passed++;
    } else {
      console.error("❌ Test 5 FAILED: Should reject positive burn with positive net");
      console.error("   Validation:", validation);
      failed++;
    }
  }
  
  // Test 6: Validation rejects runway shown when burn <= 0
  {
    const badMetrics: FinanceMetrics = {
      net_cash_flow: null,
      burn_rate: 0,
      cash_balance: 100000,
      runway_months: 10, // WRONG! Should be null
      runway_status: "active",
    };
    
    const validation = validateFinanceRules(badMetrics);
    
    if (!validation.valid && validation.errors.some(e => e.includes("Runway") && e.includes("burn <= 0"))) {
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
  
  // Test 9: Handles currency formats
  {
    const metrics = applyFinanceRules("$5,000", null, "$100,000");
    const validation = validateFinanceRules(metrics);
    
    if (metrics.net_cash_flow === 5000 && metrics.burn_rate === 0 && validation.valid) {
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
