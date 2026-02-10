/**
 * End-to-End Test: Sign Confusion Fix
 * 
 * Demonstrates the complete flow from raw sheet values to validated metrics
 * Proves that sign confusion is prevented at every layer
 */

import { parseSheetNumber } from "./robust_number_parser";
import { applyFinanceRules, validateFinanceRules } from "./finance_rules";
import { computeDerivedMetrics } from "./kpi_snapshots";

console.log("=== END-TO-END TEST: Sign Confusion Fix ===\n");

let testsPassed = 0;
let testsFailed = 0;

function test(name: string, fn: () => boolean) {
  try {
    const result = fn();
    if (result) {
      console.log(`✅ ${name}`);
      testsPassed++;
    } else {
      console.error(`❌ ${name} - assertion failed`);
      testsFailed++;
    }
  } catch (err) {
    console.error(`❌ ${name} - threw error:`, err);
    testsFailed++;
  }
}

// ============================================================================
// SCENARIO 1: Unicode Minus Confusion
// ============================================================================

console.log("--- Scenario 1: Unicode Minus (−8,000) ---");

test("1.1: Parser recognizes unicode minus", () => {
  const parsed = parseSheetNumber("−8,000");
  return parsed !== null && parsed.signalValue === -8000 && parsed.sign === -1;
});

test("1.2: Finance rules convert negative net to positive burn", () => {
  const metrics = applyFinanceRules("−8,000", null, "100,000");
  return metrics.burn_rate === 8000 && metrics.burn_rate >= 0;
});

test("1.3: Validation passes", () => {
  const metrics = applyFinanceRules("−8,000", null, "100,000");
  const validation = validateFinanceRules(metrics);
  return validation.valid && validation.errors.length === 0;
});

console.log();

// ============================================================================
// SCENARIO 2: Parentheses Negative (Accounting Format)
// ============================================================================

console.log("--- Scenario 2: Parentheses Negative (10,000) ---");

test("2.1: Parser recognizes parentheses as negative", () => {
  const parsed = parseSheetNumber("(10,000)");
  return parsed !== null && parsed.signalValue === -10000 && parsed.isNegative;
});

test("2.2: Finance rules convert to burn correctly", () => {
  const metrics = applyFinanceRules("(10,000)", null, "200,000");
  return metrics.burn_rate === 10000;
});

test("2.3: Runway calculated correctly", () => {
  const metrics = applyFinanceRules("(10,000)", null, "200,000");
  return metrics.runway_months === 20 && metrics.runway_status === "active";
});

console.log();

// ============================================================================
// SCENARIO 3: Positive Net Cash Flow (Cash-Flow Positive)
// ============================================================================

console.log("--- Scenario 3: Positive Net Cash Flow (+5,000) ---");

test("3.1: Parser recognizes positive number", () => {
  const parsed = parseSheetNumber("$5,000");
  return parsed !== null && parsed.signalValue === 5000 && !parsed.isNegative;
});

test("3.2: Finance rules set burn = 0 (cash-flow positive)", () => {
  const metrics = applyFinanceRules("$5,000", null, "100,000");
  return metrics.burn_rate === 0;
});

test("3.3: Runway set to null with not_applicable status", () => {
  const metrics = applyFinanceRules("$5,000", null, "100,000");
  return metrics.runway_months === null && metrics.runway_status === "not_applicable";
});

test("3.4: Validation passes", () => {
  const metrics = applyFinanceRules("$5,000", null, "100,000");
  const validation = validateFinanceRules(metrics);
  return validation.valid;
});

console.log();

// ============================================================================
// SCENARIO 4: Conflicting Data (Positive Net + Reported Burn)
// ============================================================================

console.log("--- Scenario 4: Conflict - Positive Net but Reported Burn ---");

test("4.1: Finance rules detect violation", () => {
  // Manually create bad metrics (simulating bad input)
  const badMetrics = {
    net_cash_flow: 5000,  // POSITIVE (inflow)
    burn_rate: 3000,      // POSITIVE (should be 0!)
    cash_balance: 100000,
    runway_months: null,
  };
  
  const validation = validateFinanceRules(badMetrics);
  return !validation.valid && validation.errors.some(e => e.includes("Positive net cash flow"));
});

test("4.2: Finance rules auto-correct", () => {
  // Apply rules with conflicting input
  const metrics = applyFinanceRules(
    5000,   // Positive net
    3000,   // Reported burn (wrong!)
    100000
  );
  
  // Should override reported burn
  return metrics.burn_rate === 0; // Corrected!
});

console.log();

// ============================================================================
// SCENARIO 5: MCP Integration (Full Flow)
// ============================================================================

console.log("--- Scenario 5: MCP Integration (computeDerivedMetrics) ---");

test("5.1: Burn = 0 → runway not_applicable", () => {
  const result = computeDerivedMetrics(
    100000,  // mrr
    1200000, // arr
    0,       // burn = 0
    500000,  // cash
    null,
    90000
  );
  
  return (
    result.runway_months.value === null &&
    result.runway_months.status === "not_applicable" &&
    result.runway_months.label === "Cash-flow positive"
  );
});

test("5.2: Burn > 0 → runway active", () => {
  const result = computeDerivedMetrics(
    100000,  // mrr
    1200000, // arr
    50000,   // burn = 50000
    500000,  // cash
    null,
    90000
  );
  
  return (
    result.runway_months.value === 10 &&
    result.runway_months.status === "active"
  );
});

console.log();

// ============================================================================
// SCENARIO 6: EU Format with Negative
// ============================================================================

console.log("--- Scenario 6: EU Format Negative (−1.234,56) ---");

test("6.1: Parser handles EU format with unicode minus", () => {
  const parsed = parseSheetNumber("−1.234,56");
  return parsed !== null && parsed.signalValue === -1234.56;
});

test("6.2: Finance rules apply correctly", () => {
  const metrics = applyFinanceRules("−1.234,56", null, "100.000,00");
  return (
    metrics.burn_rate === 1234.56 &&
    metrics.cash_balance === 100000 &&
    metrics.runway_months !== null
  );
});

console.log();

// ============================================================================
// SCENARIO 7: Trailing Minus (Accounting Format)
// ============================================================================

console.log("--- Scenario 7: Trailing Minus (8,000 -) ---");

test("7.1: Parser recognizes trailing minus", () => {
  const parsed = parseSheetNumber("8,000 -");
  return parsed !== null && parsed.signalValue === -8000;
});

test("7.2: Finance rules convert to burn", () => {
  const metrics = applyFinanceRules("8,000 -", null, "150,000");
  return metrics.burn_rate === 8000 && metrics.runway_months === 18.75;
});

console.log();

// ============================================================================
// SCENARIO 8: Multiple Formats in One Sheet
// ============================================================================

console.log("--- Scenario 8: Mixed Formats ---");

test("8.1: Can parse all formats consistently", () => {
  const formats = [
    { input: "−8,000", expected: -8000 },      // Unicode minus
    { input: "(10,000)", expected: -10000 },   // Parentheses
    { input: "$5,000", expected: 5000 },       // Currency positive
    { input: "1.234,56", expected: 1234.56 },  // EU decimal
    { input: "8,000 -", expected: -8000 },     // Trailing minus
  ];
  
  for (const { input, expected } of formats) {
    const parsed = parseSheetNumber(input);
    if (parsed === null || parsed.signalValue !== expected) {
      console.error(`  Failed on: ${input}, expected ${expected}, got ${parsed?.signalValue}`);
      return false;
    }
  }
  
  return true;
});

console.log();

// ============================================================================
// SUMMARY
// ============================================================================

console.log("=== SUMMARY ===");
console.log(`Tests passed: ${testsPassed}`);
console.log(`Tests failed: ${testsFailed}`);
console.log();

if (testsFailed > 0) {
  console.error("❌ Some tests failed!");
  process.exit(1);
}

console.log("✅ ALL TESTS PASSED!");
console.log();
console.log("Sign confusion fix verified end-to-end:");
console.log("  ✅ Parser handles all formats");
console.log("  ✅ Finance rules prevent violations");
console.log("  ✅ Validation catches bad data");
console.log("  ✅ MCP integration works correctly");
console.log("  ✅ No scenario where positive net → positive burn");
console.log("  ✅ No runway shown when burn <= 0");
console.log();
console.log("Ready for production! 🚀");
