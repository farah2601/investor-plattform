/**
 * Post-processing sanity checks for sheet-inferred KPIs.
 * Enforces financial realism and downgrades confidence when proxies stack.
 * Both semantic extraction and column-mapping fallback should run through this layer.
 */

export type Confidence = "High" | "Medium" | "Low";

export type KpiMeta = {
  confidence: Confidence;
  is_proxy: boolean;
  proxy_source?: string;
  warnings: string[];
};

export type KpiKey = "cash_balance" | "mrr" | "arr" | "mrr_growth_mom" | "burn_rate" | "runway_months" | "churn";

export type RowKpiMeta = Partial<Record<KpiKey, KpiMeta>>;

export type MetricInferenceDataRow = {
  period_date: string;
  mrr: number | null;
  arr: number | null;
  mrr_growth_mom: number | null;
  burn_rate: number | null;
  runway_months: number | null;
  churn: number | null;
  customers: number | null;
  cash_balance?: number | null;
};

const MAX_RUNWAY_MONTHS = 36;
const KPI_KEYS: KpiKey[] = ["cash_balance", "mrr", "arr", "mrr_growth_mom", "burn_rate", "runway_months", "churn"];

/** Detect column index by header (first row) substring match, case-insensitive */
function findColumnIndex(grid: string[][], ...patterns: string[]): number | null {
  if (!grid.length) return null;
  const headerRow = grid[0] ?? [];
  const lower = (s: string) => String(s ?? "").toLowerCase();
  for (let c = 0; c < headerRow.length; c++) {
    const cell = lower(headerRow[c] ?? "");
    if (patterns.some((p) => cell.includes(lower(p)))) return c;
  }
  return null;
}

/** Parse numeric value from cell; returns null if not a number */
function parseNum(cell: string): number | null {
  const s = String(cell ?? "").trim().replace(/,/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Extract numeric series for a column from data rows (skip header). */
function getNumericSeries(grid: string[][], colIndex: number): number[] {
  const out: number[] = [];
  for (let r = 1; r < grid.length; r++) {
    const row = grid[r] ?? [];
    const v = parseNum(String(row[colIndex] ?? ""));
    if (v !== null) out.push(v);
  }
  return out;
}

/** Median of an array of numbers */
function median(arr: number[]): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

/** Check if series is declining (each value <= previous) */
function isDeclining(series: number[]): boolean {
  for (let i = 1; i < series.length; i++) {
    if (series[i]! > series[i - 1]!) return false;
  }
  return series.length > 1;
}

/** Default meta for a KPI */
function defaultMeta(confidence: Confidence = "Medium", isProxy = false): KpiMeta {
  return { confidence, is_proxy: isProxy, warnings: [] };
}

/** Clone row and ensure meta exists per key */
function cloneRow(row: MetricInferenceDataRow): MetricInferenceDataRow {
  return { ...row };
}

/**
 * Post-process parsed KPI rows with deterministic sanity checks.
 * Recomputes or overrides unrealistic values, downgrades confidence when proxies stack, logs warnings.
 */
export function postProcessKpis(
  parsedRows: MetricInferenceDataRow[],
  rawGrid?: string[][]
): { rows: MetricInferenceDataRow[]; rowMeta: RowKpiMeta[]; logWarnings: string[] } {
  const logWarnings: string[] = [];
  const rows = parsedRows.map(cloneRow);
  const rowMeta: RowKpiMeta[] = rows.map(() => ({}));

  if (!rows.length) return { rows, rowMeta, logWarnings };

  const grid = rawGrid ?? [];
  const netCol = grid.length ? findColumnIndex(grid, "net (in-out)", "net result", "net cashflow", "net") : null;
  const cashCol = grid.length ? findColumnIndex(grid, "cash", "cash balance", "cash_balance") : null;
  const oneOffCol = grid.length
    ? findColumnIndex(grid, "one-off", "one off", "implementation", "project", "setup fee", "non-recurring")
    : null;

  const netSeries = netCol !== null ? getNumericSeries(grid, netCol) : [];
  const cashSeries = cashCol !== null ? getNumericSeries(grid, cashCol) : [];
  const negativeNetMonths = netSeries.filter((v) => v < 0);
  const cashDeclining = cashSeries.length > 1 && isDeclining(cashSeries);

  // --- A) Burn: must not be 0 if >=2 negative net months or cash decline ---
  if (negativeNetMonths.length >= 2 || (cashDeclining && cashSeries.length >= 2)) {
    const burnProxy =
      negativeNetMonths.length >= 3
        ? median(negativeNetMonths)
        : negativeNetMonths.length > 0
          ? negativeNetMonths[negativeNetMonths.length - 1]!
          : null;
    const burnProxyValue = burnProxy !== null ? Math.abs(burnProxy) : null;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      const meta = rowMeta[i]!;
      const currentBurn = r.burn_rate;
      const shouldOverride =
        (currentBurn === 0 || currentBurn === null) && burnProxyValue !== null && burnProxyValue > 0;

      if (shouldOverride) {
        r.burn_rate = burnProxyValue;
        meta.burn_rate = {
          ...defaultMeta("Medium", true),
          proxy_source: negativeNetMonths.length >= 3 ? "median(negative net months)" : "most recent negative net month",
          warnings: ["Burn was 0 or missing; overridden from negative net/cash series."],
        };
        logWarnings.push(`[row ${i}] Burn overridden to ${burnProxyValue} (typical downside).`);
      } else if (currentBurn !== null && currentBurn !== undefined && meta.burn_rate === undefined) {
        meta.burn_rate = defaultMeta("Medium", true);
        meta.burn_rate.warnings.push("Burn inferred with negative net months present; verify not averaged.");
      }
    }
  }

  // --- B) Runway: cap >36; if cash declining, runway cannot increase period-to-period (chronological) ---
  const indicesByDate = rows
    .map((_, i) => i)
    .sort((a, b) => (rows[a]!.period_date || "").localeCompare(rows[b]!.period_date || ""));
  let prevRunway: number | null = null;
  for (const i of indicesByDate) {
    const r = rows[i]!;
    const meta = rowMeta[i]!;
    let runway = r.runway_months;

    if (runway !== null && runway !== undefined) {
      if (runway > MAX_RUNWAY_MONTHS) {
        logWarnings.push(`[row ${i}] Runway ${runway} capped to ${MAX_RUNWAY_MONTHS}.`);
        r.runway_months = MAX_RUNWAY_MONTHS;
        runway = MAX_RUNWAY_MONTHS;
      }
      if (runway < 0 || !Number.isFinite(runway)) {
        r.runway_months = null;
        runway = null;
      }
    }

    if (cashDeclining && runway !== null && prevRunway !== null && runway > prevRunway) {
      r.runway_months = prevRunway;
      if (!meta.runway_months) meta.runway_months = defaultMeta("Low", true);
      meta.runway_months.warnings.push("Runway reduced: cash declining, runway cannot increase.");
      logWarnings.push(`[row ${i}] Runway reduced to ${prevRunway} (cash declining).`);
    }
    if (runway !== null) prevRunway = runway;

    if (r.runway_months != null && meta.runway_months === undefined) {
      meta.runway_months = defaultMeta(meta.burn_rate?.is_proxy ? "Low" : "Medium", !!meta.burn_rate?.is_proxy);
      if (meta.burn_rate?.is_proxy) meta.runway_months.warnings.push("Runway depends on burn proxy; confidence lowered.");
    }
  }

  // --- C) One-off: warn and downgrade recurring metrics when one-off column exists ---
  if (oneOffCol !== null) {
    logWarnings.push("One-off / non-recurring column detected; recurring metrics may be inflated.");
    for (let i = 0; i < rowMeta.length; i++) {
      const meta = rowMeta[i]!;
      for (const key of ["mrr", "arr", "mrr_growth_mom"] as const) {
        if (rows[i]![key] != null) {
          if (!meta[key]) meta[key] = defaultMeta("Medium", true);
          meta[key]!.warnings.push("One-off revenue column present; exclude from recurring if applicable.");
          if (meta[key]!.confidence === "High") meta[key]!.confidence = "Medium";
        }
      }
    }
  }

  // --- D) Growth: volatile or mixed trend → lower confidence ---
  const growthValues = rows.map((r) => r.mrr_growth_mom).filter((v): v is number => v != null && Number.isFinite(v));
  if (growthValues.length >= 2) {
    const mean = growthValues.reduce((a, b) => a + b, 0) / growthValues.length;
    const variance = growthValues.reduce((s, v) => s + (v - mean) ** 2, 0) / growthValues.length;
    const std = Math.sqrt(variance);
    const volatile = std > 15 || growthValues.some((v) => v > 0) !== growthValues.every((v) => v > 0);
    if (volatile) {
      for (let i = 0; i < rowMeta.length; i++) {
        const meta = rowMeta[i]!;
        if (rows[i]!.mrr_growth_mom != null) {
          if (!meta.mrr_growth_mom) meta.mrr_growth_mom = defaultMeta("Low", true);
          else meta.mrr_growth_mom.confidence = "Low";
          meta.mrr_growth_mom.warnings.push("Growth series volatile or mixed trend; confidence lowered.");
        }
      }
      logWarnings.push("Growth series volatile; confidence downgraded.");
    }
  }

  // --- E) Churn: if inferred from customer deltas, cap confidence Medium; no deltas → do not guess ---
  const hasCustomerCol =
    grid.length && findColumnIndex(grid, "customers", "customer count", "lost_customers", "starting_customers") !== null;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    const meta = rowMeta[i]!;
    if (r.churn != null) {
      if (!meta.churn) meta.churn = defaultMeta("Medium", true);
      if (hasCustomerCol) {
        meta.churn.proxy_source = "customer count change (lost/starting)";
        if (meta.churn.confidence === "High") meta.churn.confidence = "Medium";
      } else {
        meta.churn.warnings.push("Churn present but no customer-delta columns; treat as proxy or null.");
      }
    }
  }

  return { rows, rowMeta, logWarnings };
}
