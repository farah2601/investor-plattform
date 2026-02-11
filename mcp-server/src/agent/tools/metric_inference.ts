import { z } from "zod";
import { getSheetGridForCompany, parseSheetRows } from "../../sources/sheets";
import { postProcessKpis, type RowKpiMeta, type KpiKey } from "../../utils/kpi_sanity";

const InputSchema = z.object({
  companyId: z.string().uuid(),
});

const MAX_ROWS = 80;
const MAX_COLS = 24;
/** Max data rows returned in the "rows" array (only include rows that exist in the sheet). */
const MAX_DATA_ROWS = 60;

export type MetricInferenceRow = {
  metric: string;
  value: string | number;
  confidence: "High" | "Medium" | "Low";
  evidence: string;
  whyThisMapping: string;
};

/** One period row from the sheet: six KPIs + period_date + customers; net_cash_flow/cash_balance used for finance rules. */
export type MetricInferenceDataRow = {
  period_date: string;
  mrr: number | null;
  arr: number | null;
  mrr_growth_mom: number | null;
  burn_rate: number | null;
  runway_months: number | null;
  churn: number | null;
  customers: number | null;
  net_cash_flow?: number | null;
  cash_balance?: number | null;
};

export type MetricInferenceOutput = {
  ok: boolean;
  companyId: string;
  tab?: string | null;
  sheetId?: string;
  /** Per-period rows from the sheet (source of truth). */
  rows?: MetricInferenceDataRow[];
  /** Detected maturity level 1–4 (hierarchy). */
  detectedMaturityLevel?: 1 | 2 | 3 | 4;
  /** Primary metrics derived from latest row (for dashboard cards). Meta from sanity layer. */
  primaryMetricsTable?: Array<{
    metric: string;
    value: string | number;
    confidence: "High" | "Medium" | "Low";
    evidence: string;
    rationale: string;
    is_proxy?: boolean;
    proxy_source?: string;
    warnings?: string[];
  }>;
  secondarySignals?: string;
  whyHigherLevelNotUsed?: string;
  /** Backward-compatible: same as primaryMetricsTable with rationale → whyThisMapping. */
  kpiTable: MetricInferenceRow[];
  altCandidatesConsidered: string;
  whatDataWouldIncreaseConfidence: string;
  assumptions: string[];
  error?: string;
};

/**
 * Valyxo's financial inference agent: populate standard investor KPIs from a raw Google Sheet grid.
 * LLM does semantic inference + proxies; correctness enforced by postProcessKpis (kpi_sanity.ts).
 */
export async function runMetricInference(input: unknown): Promise<MetricInferenceOutput> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      companyId: "",
      kpiTable: [],
      altCandidatesConsidered: "",
      whatDataWouldIncreaseConfidence: "",
      assumptions: [],
      error: "Invalid input: companyId required (UUID)",
    };
  }

  const { companyId } = parsed.data;

  let grid: string[][];
  let tab: string | null;
  let sheetId: string | undefined;

  try {
    const result = await getSheetGridForCompany(companyId);
    grid = (result.grid ?? []).map((row) => (row ?? []).map((c) => String(c ?? "")));
    tab = result.tab;
    sheetId = result.sheetId;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      companyId,
      kpiTable: [],
      altCandidatesConsidered: "",
      whatDataWouldIncreaseConfidence: "",
      assumptions: [],
      error: msg,
    };
  }

  if (!grid.length) {
    return {
      ok: true,
      companyId,
      tab,
      sheetId,
      kpiTable: [],
      altCandidatesConsidered: "No sheet data to infer from.",
      whatDataWouldIncreaseConfidence: "Connect a Google Sheet with financial or operational columns.",
      assumptions: [],
    };
  }

  // LLM proposes column mapping only; parseSheetRows does mechanical extraction + finance rules
  const tabLabel = tab ? `Tab: "${tab}"` : "Tab: (default)";

  try {
    const { parsed: sheetParsed } = await parseSheetRows(grid);
    const parsedRows: MetricInferenceDataRow[] = sheetParsed.slice(0, MAX_DATA_ROWS).map((row) => {
      const v = row.values;
      return {
        period_date: row.periodDate,
        mrr: v.mrr ?? null,
        arr: v.arr ?? null,
        mrr_growth_mom: v.mrr_growth_mom ?? null,
        burn_rate: v.burn_rate ?? null,
        runway_months: v.runway_months ?? null,
        churn: v.churn ?? null,
        customers: v.customers ?? null,
        net_cash_flow: row.net_cash_flow ?? undefined,
        cash_balance: v.cash_balance ?? undefined,
      };
    });

    const { rows: sanityRows, rowMeta, logWarnings } = postProcessKpis(parsedRows, grid);
    if (logWarnings.length > 0) {
      logWarnings.forEach((w) => console.warn("[metric_inference]", w));
    }

    const sortedByDate = [...sanityRows].filter((r) => r.period_date).sort((a, b) => (a.period_date! < b.period_date! ? -1 : 1));
    const latestRow = sortedByDate.length > 0 ? sortedByDate[sortedByDate.length - 1] : sanityRows[0];
    const latestIndex = latestRow ? sanityRows.findIndex((r) => r === latestRow) : -1;
    const latestMeta: RowKpiMeta | undefined = latestIndex >= 0 ? rowMeta[latestIndex] : undefined;

    const evidenceBase = `${tabLabel}`;
    const rationaleBase = "Column mapping from LLM; values and KPIs computed mechanically.";
    const kpiLabels: Array<{ key: KpiKey; label: string }> = [
      { key: "cash_balance", label: "Cash Balance" },
      { key: "burn_rate", label: "Burn" },
      { key: "runway_months", label: "Runway" },
      { key: "churn", label: "Churn" },
      { key: "mrr", label: "MRR" },
      { key: "arr", label: "ARR" },
    ];

    const primaryMetricsTable = latestRow
      ? kpiLabels.map(({ key, label }) => {
          const val = latestRow[key];
          const value = val !== null && val !== undefined ? val : "N/A";
          const meta = latestMeta?.[key];
          return {
            metric: label,
            value,
            confidence: (meta?.confidence ?? "Medium") as "High" | "Medium" | "Low",
            evidence: evidenceBase,
            rationale: meta?.warnings?.length ? [...(meta.warnings || []), rationaleBase].join("; ") : rationaleBase,
            is_proxy: meta?.is_proxy,
            proxy_source: meta?.proxy_source,
            warnings: meta?.warnings,
          };
        })
      : [];

    const kpiTable: MetricInferenceRow[] = primaryMetricsTable.map((row) => ({
      metric: row.metric,
      value: row.value,
      confidence: row.confidence,
      evidence: row.evidence,
      whyThisMapping: row.rationale,
    }));

    return {
      ok: true,
      companyId,
      tab,
      sheetId,
      rows: sanityRows.length > 0 ? sanityRows : undefined,
      detectedMaturityLevel: 1,
      primaryMetricsTable,
      secondarySignals: "",
      whyHigherLevelNotUsed: "",
      kpiTable,
      altCandidatesConsidered: "Mechanical extraction; no LLM numeric output.",
      whatDataWouldIncreaseConfidence: "More clearly labeled columns; standard KPI naming.",
      assumptions: ["LLM proposes column mapping only; all numbers from mechanical parsing."],
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      companyId,
      tab,
      sheetId,
      kpiTable: [],
      altCandidatesConsidered: "",
      whatDataWouldIncreaseConfidence: "",
      assumptions: [],
      error: msg,
    };
  }
}
