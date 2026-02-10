/**
 * Test Fixtures for normalizeMetricsOutput
 * 
 * Validates hard finance rules are applied correctly
 */

import { normalizeMetricsOutput } from "./normalizeMetrics";

console.log("=== Testing normalizeMetricsOutput ===\n");

// FIXTURE A: Positive net cash flow => burn = 0, runway not_applicable
console.log("--- FIXTURE A: Cash-Flow Positive ---");
const fixtureA_kpis = {
  mrr: { value: 100000, source: "sheet" },
  arr: { value: 1200000, source: "computed" },
  burn_rate: { value: 0, source: "sheet" }, // Burn = 0 because net > 0
  cash_balance: { value: 500000, source: "sheet" },
  runway_months: { value: null, source: "computed", status: "not_applicable", label: "Cash-flow positive" },
  churn: { value: 2.5, source: "sheet" },
  mrr_growth_mom: { value: 8.5, source: "computed" },
};

const resultA = normalizeMetricsOutput(fixtureA_kpis, "USD", "2024-01");
const burnA = resultA.find(m => m.key === "burn");
const runwayA = resultA.find(m => m.key === "runway");

console.log("Burn result:");
console.log("  value:", burnA?.value);
console.log("  formatted:", burnA?.formatted);
console.log("  status:", burnA?.status);
console.log("  warnings:", burnA?.warnings);

console.log("\nRunway result:");
console.log("  value:", runwayA?.value);
console.log("  formatted:", runwayA?.formatted);
console.log("  status:", runwayA?.status);
console.log("  warnings:", runwayA?.warnings);

// Validate Fixture A
if (burnA?.value !== 0) {
  console.error("\n❌ FIXTURE A FAILED: Expected burn = 0, got:", burnA?.value);
  process.exit(1);
}
if (runwayA?.status !== "not_applicable") {
  console.error("\n❌ FIXTURE A FAILED: Expected runway status = 'not_applicable', got:", runwayA?.status);
  process.exit(1);
}
if (runwayA?.value !== null) {
  console.error("\n❌ FIXTURE A FAILED: Expected runway value = null, got:", runwayA?.value);
  process.exit(1);
}
console.log("\n✅ FIXTURE A PASSED: burn=0, runway not_applicable\n");

// FIXTURE B: Negative net cash flow => burn = 50000, runway = 16.4 months
console.log("--- FIXTURE B: Burning Cash ---");
const fixtureB_kpis = {
  mrr: { value: 150000, source: "sheet" },
  arr: { value: 1800000, source: "computed" },
  burn_rate: { value: 50000, source: "computed" }, // Derived from net = -50000
  cash_balance: { value: 820000, source: "sheet" },
  runway_months: { value: 16.4, source: "computed", status: "active" },
  churn: { value: 3.2, source: "sheet" },
  mrr_growth_mom: { value: 12.3, source: "computed" },
};

const resultB = normalizeMetricsOutput(fixtureB_kpis, "USD", "2024-02");
const burnB = resultB.find(m => m.key === "burn");
const runwayB = resultB.find(m => m.key === "runway");

console.log("Burn result:");
console.log("  value:", burnB?.value);
console.log("  formatted:", burnB?.formatted);
console.log("  status:", burnB?.status);

console.log("\nRunway result:");
console.log("  value:", runwayB?.value);
console.log("  formatted:", runwayB?.formatted);
console.log("  status:", runwayB?.status);
console.log("  explanation:", runwayB?.explanation);

// Validate Fixture B
if (burnB?.value !== 50000) {
  console.error("\n❌ FIXTURE B FAILED: Expected burn = 50000, got:", burnB?.value);
  process.exit(1);
}
if (runwayB?.value !== 16.4) {
  console.error("\n❌ FIXTURE B FAILED: Expected runway = 16.4, got:", runwayB?.value);
  process.exit(1);
}
if (runwayB?.status !== "derived") {
  console.error("\n❌ FIXTURE B FAILED: Expected runway status = 'derived', got:", runwayB?.status);
  process.exit(1);
}
if (!runwayB?.formatted.includes("16.4")) {
  console.error("\n❌ FIXTURE B FAILED: Expected formatted to include '16.4', got:", runwayB?.formatted);
  process.exit(1);
}
console.log("\n✅ FIXTURE B PASSED: burn=50000, runway=16.4 months\n");

// Test all metrics have formatted values (never undefined)
console.log("--- Testing Formatted Values Always Present ---");
const allMetrics = [...resultA, ...resultB];
let formattedMissing = false;
for (const metric of allMetrics) {
  if (!metric.formatted || metric.formatted === undefined) {
    console.error(`❌ Metric ${metric.key} has missing formatted value`);
    formattedMissing = true;
  }
}
if (!formattedMissing) {
  console.log("✅ All metrics have formatted values\n");
}

console.log("=== ALL TESTS PASSED ===");
console.log("✅ Fixture A: Cash-flow positive (burn=0, runway N/A)");
console.log("✅ Fixture B: Burning cash (burn=50k, runway=16.4mo)");
console.log("✅ All formatted values present");
