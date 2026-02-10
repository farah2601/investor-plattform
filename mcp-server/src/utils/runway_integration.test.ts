/**
 * Integration test: Runway status flow from computation to companies table
 * Tests the full flow: computeDerivedMetrics → kpi_snapshots → refresh-from-snapshots → companies
 */

import { computeDerivedMetrics } from "./kpi_snapshots";

console.log("Testing full runway status integration flow...\n");

// Simulate the MCP flow
console.log("=== STEP 1: Compute Derived Metrics (MCP) ===");
const result = computeDerivedMetrics(
  100000,  // mrr
  1200000, // arr
  0,       // burn_rate = 0 (breaking even)
  500000,  // cash_balance
  null,    // runway_months from merged
  90000    // previous month MRR
);

console.log("Computed runway_months:");
console.log("  value:", result.runway_months.value);
console.log("  source:", result.runway_months.source);
console.log("  status:", result.runway_months.status);
console.log("  label:", result.runway_months.label);
console.log("  confidence:", result.runway_months.confidence);
console.log();

// Verify MCP output
if (result.runway_months.status !== "not_applicable") {
  console.error("❌ FAIL: Status should be 'not_applicable'");
  process.exit(1);
}
if (result.runway_months.label !== "Cash-flow positive") {
  console.error("❌ FAIL: Label should be 'Cash-flow positive'");
  process.exit(1);
}
console.log("✅ MCP computation correct\n");

// Simulate kpi_snapshots insert
console.log("=== STEP 2: Write to kpi_snapshots (would be JSON in DB) ===");
const snapshotKpis = {
  period_date: "2024-01-01",
  kpis: {
    mrr: result.mrr,
    arr: result.arr,
    burn_rate: result.burn_rate,
    runway_months: result.runway_months,
    mrr_growth_mom: result.mrr_growth_mom,
  },
};
console.log("kpi_snapshots.kpis.runway_months:", JSON.stringify(snapshotKpis.kpis.runway_months, null, 2));
console.log();

// Simulate refresh-from-snapshots logic
console.log("=== STEP 3: Refresh from Snapshots (API logic) ===");
const kpis = snapshotKpis.kpis as any;
const runwayKpi = kpis.runway_months;
const runwayMonths = runwayKpi?.value;
const runwayStatus = runwayKpi?.status;

const updatePayload: Record<string, any> = {};

if (runwayStatus === "not_applicable") {
  // Cash-flow positive: burn <= 0
  updatePayload.runway_months = null;
  updatePayload.runway_status = "cash-flow-positive";
  console.log("Detected status === 'not_applicable'");
} else if (runwayMonths != null) {
  // Normal case: burning cash
  updatePayload.runway_months = runwayMonths;
  updatePayload.runway_status = null;
  console.log("Normal case: runway =", runwayMonths);
} else {
  // Missing data
  updatePayload.runway_status = null;
  console.log("Missing data case");
}

console.log("\nUpdate payload for companies table:");
console.log("  runway_months:", updatePayload.runway_months);
console.log("  runway_status:", updatePayload.runway_status);
console.log();

// Verify companies table update
if (updatePayload.runway_months !== null) {
  console.error("❌ FAIL: runway_months should be null in companies table when cash-flow positive");
  process.exit(1);
}
if (updatePayload.runway_status !== "cash-flow-positive") {
  console.error("❌ FAIL: runway_status should be 'cash-flow-positive' in companies table");
  process.exit(1);
}
console.log("✅ Companies table update correct\n");

// Test normal burning case
console.log("=== STEP 4: Test Normal Burning Case (burn > 0) ===");
const normalResult = computeDerivedMetrics(
  100000,  // mrr
  1200000, // arr
  50000,   // burn_rate = 50000 (burning cash)
  500000,  // cash_balance
  null,    // runway_months from merged
  90000    // previous month MRR
);

console.log("Normal case - runway_months:");
console.log("  value:", normalResult.runway_months.value);
console.log("  status:", normalResult.runway_months.status);
console.log();

const normalKpis = { runway_months: normalResult.runway_months } as any;
const normalRunwayMonths = normalKpis.runway_months?.value;
const normalRunwayStatus = normalKpis.runway_months?.status;

const normalUpdatePayload: Record<string, any> = {};

if (normalRunwayStatus === "not_applicable") {
  normalUpdatePayload.runway_months = null;
  normalUpdatePayload.runway_status = "cash-flow-positive";
} else if (normalRunwayMonths != null) {
  normalUpdatePayload.runway_months = normalRunwayMonths;
  normalUpdatePayload.runway_status = null;
}

console.log("Normal case - companies table update:");
console.log("  runway_months:", normalUpdatePayload.runway_months);
console.log("  runway_status:", normalUpdatePayload.runway_status);
console.log();

if (normalUpdatePayload.runway_months !== 10) {
  console.error("❌ FAIL: runway_months should be 10 for normal burning case");
  process.exit(1);
}
if (normalUpdatePayload.runway_status !== null) {
  console.error("❌ FAIL: runway_status should be null for normal case");
  process.exit(1);
}
console.log("✅ Normal case correct\n");

console.log("✅ Full integration flow test passed!");
console.log("\n=== Summary ===");
console.log("1. MCP computes runway with status='not_applicable' when burn <= 0");
console.log("2. kpi_snapshots stores full object with status/label/confidence");
console.log("3. refresh-from-snapshots reads status and sets companies.runway_status");
console.log("4. companies table has runway_months=null, runway_status='cash-flow-positive'");
console.log("5. UI can now display cash-flow positive indicator! 🎉");
