// mcp-server/src/agent/utils/kpi_format.ts

/**
 * Format money values with currency and scale
 */
export function formatMoney(
  value: number | null | undefined,
  currency: string = "USD",
  scale: "unit" | "k" | "m" = "unit"
): string | null {
  if (value === null || value === undefined) return null;

  const num = Number(value);
  if (Number.isNaN(num)) return null;

  let formatted: number;
  let suffix = "";

  if (scale === "k") {
    formatted = num / 1000;
    suffix = "k";
  } else if (scale === "m") {
    formatted = num / 1000000;
    suffix = "m";
  } else {
    formatted = num;
  }

  // Format with commas for thousands
  const formattedStr = formatted.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: formatted >= 1000 ? 0 : 1,
  });

  const symbol = currency === "USD" ? "$" : currency === "NOK" ? "kr" : currency === "EUR" ? "€" : currency;

  return `${symbol}${formattedStr}${suffix}`;
}

/**
 * Format percentage values
 */
export function formatPercent(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;

  const num = Number(value);
  if (Number.isNaN(num)) return null;

  // If value is between 0 and 1, assume it's a decimal (0.02 = 2%)
  // If value is >= 1, assume it's already a percentage (15 = 15%)
  const percent = num < 1 && num > 0 ? num * 100 : num;

  return `${percent.toFixed(1)}%`;
}

/**
 * Format runway months
 */
export function formatRunway(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;

  const num = Number(value);
  if (Number.isNaN(num)) return null;

  return `${num} months`;
}

/**
 * Format KPIs for LLM prompts
 * Returns formatted strings that can be safely used in prompts
 */
export function formatKpisForPrompt(company: {
  mrr?: number | null;
  arr?: number | null;
  burn_rate?: number | null;
  runway_months?: number | null;
  churn?: number | null;
  growth_percent?: number | null;
  kpi_currency?: string | null;
  kpi_scale?: "unit" | "k" | "m" | null;
}): {
  mrr_str: string;
  arr_str: string;
  burn_rate_str: string;
  runway_str: string;
  churn_str: string;
  growth_str: string;
} {
  const currency = company.kpi_currency || "USD";
  const scale = company.kpi_scale || "unit";

  const mrrFormatted = formatMoney(company.mrr, currency, scale);
  const arrFormatted = formatMoney(company.arr, currency, scale);
  const burnRateFormatted = formatMoney(company.burn_rate, currency, scale);
  const runwayFormatted = formatRunway(company.runway_months);
  const churnFormatted = formatPercent(company.churn);
  const growthFormatted = formatPercent(company.growth_percent);

  return {
    mrr_str: mrrFormatted ? `MRR: ${mrrFormatted}` : company.mrr != null ? `MRR: ${company.mrr} (unit unknown)` : "MRR: n/a",
    arr_str: arrFormatted ? `ARR: ${arrFormatted}` : company.arr != null ? `ARR: ${company.arr} (unit unknown)` : "ARR: n/a",
    burn_rate_str: burnRateFormatted
      ? `Burn rate: ${burnRateFormatted}`
      : company.burn_rate != null
        ? `Burn rate: ${company.burn_rate} (unit unknown)`
        : "Burn rate: n/a",
    runway_str: runwayFormatted ? `Runway: ${runwayFormatted}` : "Runway: n/a",
    churn_str: churnFormatted ? `Churn: ${churnFormatted}` : company.churn != null ? `Churn: ${company.churn}` : "Churn: n/a",
    growth_str: growthFormatted
      ? `Growth: ${growthFormatted}`
      : company.growth_percent != null
        ? `Growth: ${company.growth_percent}%`
        : "Growth: n/a",
  };
}

