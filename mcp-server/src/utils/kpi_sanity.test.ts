/**
 * Unit tests for KPI sanity post-processor.
 * KPI Stress Test: proves burn is not 0 when negative net months exist, runway not 90+ when cash declines.
 */

import { postProcessKpis, type MetricInferenceDataRow } from "./kpi_sanity";

/** KPI Stress Test sheet: header + 4 months, net (in-out) has 3 negative months, cash declining */
const STRESS_GRID: string[][] = [
  ["period", "net (in-out)", "cash balance", "mrr", "arr", "customers"],
  ["2024-01-01", "-80000", "400000", "120000", "1440000", "45"],
  ["2024-02-01", "-85000", "315000", "124000", "1488000", "47"],
  ["2024-03-01", "-90000", "230000", "118000", "1416000", "46"],
  ["2024-04-01", "-88000", "142000", "125000", "1500000", "48"],
];

function row(
  period_date: string,
  mrr: number | null,
  arr: number | null,
  mrr_growth_mom: number | null,
  burn_rate: number | null,
  runway_months: number | null,
  churn: number | null,
  customers: number | null
): MetricInferenceDataRow {
  return {
    period_date,
    mrr,
    arr,
    mrr_growth_mom,
    burn_rate,
    runway_months,
    churn,
    customers,
  };
}

// --- Tests: Burn must not be 0 when >=2 negative net months ---
const parsedWithZeroBurn: MetricInferenceDataRow[] = [
  row("2024-01-01", 120000, 1440000, null, 0, 5, null, 45),
  row("2024-02-01", 124000, 1488000, 3.3, 0, 3.7, null, 47),
  row("2024-03-01", 118000, 1416000, -4.8, 0, 2.6, null, 46),
  row("2024-04-01", 125000, 1500000, 5.9, 0, 1.6, null, 48),
];

const { rows: outZeroBurn } = postProcessKpis(parsedWithZeroBurn, STRESS_GRID);

const burnOverridden = outZeroBurn.every((r) => r.burn_rate !== 0 && r.burn_rate !== null);
const burnMedianOrRecent = outZeroBurn.some((r) => r.burn_rate !== null && r.burn_rate! >= 80000 && r.burn_rate! <= 90000);

if (!burnOverridden) {
  console.error("FAIL: Burn must not be 0 when >=2 negative net months. Got:", outZeroBurn.map((r) => r.burn_rate));
  process.exit(1);
}
if (!burnMedianOrRecent) {
  console.error("FAIL: Burn proxy should be median of negative months (or most recent). Got:", outZeroBurn.map((r) => r.burn_rate));
  process.exit(1);
}
console.log("PASS: Burn overridden from negative net months (typical downside).");

// --- Tests: Runway must not exceed 36 and must not increase when cash declining ---
const parsedWithHugeRunway: MetricInferenceDataRow[] = [
  row("2024-01-01", 120000, 1440000, null, 80000, 120, null, 45),
  row("2024-02-01", 124000, 1488000, 3.3, 85000, 95, null, 47),
  row("2024-03-01", 118000, 1416000, -4.8, 90000, 90, null, 46),
  row("2024-04-01", 125000, 1500000, 5.9, 88000, 88, null, 48),
];

const { rows: outRunway } = postProcessKpis(parsedWithHugeRunway, STRESS_GRID);

const runwayCapped = outRunway.every((r) => r.runway_months === null || r.runway_months <= 36);
if (!runwayCapped) {
  console.error("FAIL: Runway must be capped at 36. Got:", outRunway.map((r) => r.runway_months));
  process.exit(1);
}
console.log("PASS: Runway capped at 36.");

const sortedByDate = [...outRunway].sort((a, b) => (a.period_date || "").localeCompare(b.period_date || ""));
let prevRunway: number | null = null;
let runwayNotIncreasing = true;
for (const r of sortedByDate) {
  const run = r.runway_months;
  if (run !== null && prevRunway !== null && run > prevRunway) {
    runwayNotIncreasing = false;
    break;
  }
  if (run !== null) prevRunway = run;
}
if (!runwayNotIncreasing) {
  console.error("FAIL: When cash declining, runway must not increase period-to-period. Got:", sortedByDate.map((r) => r.runway_months));
  process.exit(1);
}
console.log("PASS: Runway does not increase when cash declining.");

// --- Smoke: no grid still returns rows and meta ---
const { rows: noGridRows, rowMeta: noGridMeta } = postProcessKpis(parsedWithZeroBurn);
if (noGridRows.length !== parsedWithZeroBurn.length || noGridMeta.length !== parsedWithZeroBurn.length) {
  console.error("FAIL: postProcessKpis without grid should return same row count.");
  process.exit(1);
}
console.log("PASS: postProcessKpis(rows) without grid returns same length.");

console.log("All KPI sanity tests passed.");
