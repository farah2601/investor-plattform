/**
 * Test for runway calculation system rule:
 * When burn_rate <= 0, runway should be marked as "not_applicable" with label "Cash-flow positive"
 */

import { computeDerivedMetrics } from "./kpi_snapshots";

console.log("Testing runway calculation with cash-flow positive scenario...\n");

// Test Case 1: Burn rate = 0 (breaking even)
{
  const result = computeDerivedMetrics(
    10000,   // mrr
    120000,  // arr
    0,       // burn_rate = 0 (breaking even)
    500000,  // cash_balance
    null,    // runway_months from merged
    9000     // previous month MRR
  );

  console.log("Test 1: Burn rate = 0 (breaking even)");
  console.log("  runway_months.value:", result.runway_months.value);
  console.log("  runway_months.status:", result.runway_months.status);
  console.log("  runway_months.label:", result.runway_months.label);
  console.log("  runway_months.confidence:", result.runway_months.confidence);

  if (result.runway_months.value !== null) {
    console.error("  ❌ FAIL: runway value should be null when burn = 0");
    process.exit(1);
  }
  if (result.runway_months.status !== "not_applicable") {
    console.error("  ❌ FAIL: runway status should be 'not_applicable' when burn = 0");
    process.exit(1);
  }
  if (result.runway_months.label !== "Cash-flow positive") {
    console.error("  ❌ FAIL: runway label should be 'Cash-flow positive' when burn = 0");
    process.exit(1);
  }
  if (result.runway_months.confidence !== "High") {
    console.error("  ❌ FAIL: runway confidence should be 'High' when burn = 0");
    process.exit(1);
  }
  console.log("  ✅ PASS\n");
}

// Test Case 2: Negative burn (profitable, cash inflow)
{
  const result = computeDerivedMetrics(
    10000,    // mrr
    120000,   // arr
    -5000,    // burn_rate = -5000 (profitable, cash inflow)
    500000,   // cash_balance
    null,     // runway_months from merged
    9000      // previous month MRR
  );

  console.log("Test 2: Burn rate = -5000 (profitable, cash inflow)");
  console.log("  runway_months.value:", result.runway_months.value);
  console.log("  runway_months.status:", result.runway_months.status);
  console.log("  runway_months.label:", result.runway_months.label);
  console.log("  runway_months.confidence:", result.runway_months.confidence);

  if (result.runway_months.value !== null) {
    console.error("  ❌ FAIL: runway value should be null when burn < 0");
    process.exit(1);
  }
  if (result.runway_months.status !== "not_applicable") {
    console.error("  ❌ FAIL: runway status should be 'not_applicable' when burn < 0");
    process.exit(1);
  }
  if (result.runway_months.label !== "Cash-flow positive") {
    console.error("  ❌ FAIL: runway label should be 'Cash-flow positive' when burn < 0");
    process.exit(1);
  }
  if (result.runway_months.confidence !== "High") {
    console.error("  ❌ FAIL: runway confidence should be 'High' when burn < 0");
    process.exit(1);
  }
  console.log("  ✅ PASS\n");
}

// Test Case 3: Positive burn (normal case, burning cash)
{
  const result = computeDerivedMetrics(
    10000,   // mrr
    120000,  // arr
    50000,   // burn_rate = 50000 (burning cash)
    500000,  // cash_balance
    null,    // runway_months from merged
    9000     // previous month MRR
  );

  console.log("Test 3: Burn rate = 50000 (burning cash, normal case)");
  console.log("  runway_months.value:", result.runway_months.value);
  console.log("  runway_months.status:", result.runway_months.status);
  console.log("  runway_months.confidence:", result.runway_months.confidence);

  if (result.runway_months.value !== 10) {
    console.error("  ❌ FAIL: runway value should be 10 months (500000 / 50000)");
    process.exit(1);
  }
  if (result.runway_months.status !== "active") {
    console.error("  ❌ FAIL: runway status should be 'active' when burn > 0");
    process.exit(1);
  }
  if (result.runway_months.confidence !== "High") {
    console.error("  ❌ FAIL: runway confidence should be 'High' when burn > 0");
    process.exit(1);
  }
  console.log("  ✅ PASS\n");
}

// Test Case 4: Missing cash balance (cannot calculate runway)
{
  const result = computeDerivedMetrics(
    10000,   // mrr
    120000,  // arr
    50000,   // burn_rate
    null,    // cash_balance = null
    null,    // runway_months from merged
    9000     // previous month MRR
  );

  console.log("Test 4: Missing cash balance (cannot calculate runway)");
  console.log("  runway_months.value:", result.runway_months.value);

  if (result.runway_months.value !== null) {
    console.error("  ❌ FAIL: runway value should be null when cash balance missing");
    process.exit(1);
  }
  console.log("  ✅ PASS\n");
}

console.log("✅ All runway cash-flow positive tests passed!");
