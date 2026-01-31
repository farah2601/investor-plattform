import { z } from "zod";
import { getOpenAI } from "../../llm/openai";
import { getSheetGridForCompany } from "../../sources/sheets";
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

/** One period row from the sheet: six KPIs + period_date + customers. */
export type MetricInferenceDataRow = {
  period_date: string;
  mrr: number | null;
  arr: number | null;
  mrr_growth_mom: number | null;
  burn_rate: number | null;
  runway_months: number | null;
  churn: number | null;
  customers: number | null;
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

  if (!process.env.OPENAI_API_KEY) {
    return {
      ok: false,
      companyId,
      tab,
      sheetId,
      kpiTable: [],
      altCandidatesConsidered: "",
      whatDataWouldIncreaseConfidence: "",
      assumptions: [],
      error: "OPENAI_API_KEY is not set; metric inference requires an LLM.",
    };
  }

  const rowsToSend = grid.slice(0, MAX_ROWS);
  const colsToSend = Math.min(MAX_COLS, Math.max(1, ...rowsToSend.map((r) => (r ?? []).length)));
  const tabLabel = tab ? `Tab: "${tab}"` : "Tab: (default)";
  const sheetRef = sheetId ? `Sheet ID: ${sheetId}` : "";
  const gridLines = rowsToSend.map((row, rowIdx) => {
    const cells = (row ?? []).slice(0, colsToSend).map((c, colIdx) => `col${colIdx}="${String(c ?? "").trim().replace(/"/g, "'")}"`);
    return `row${rowIdx} ${cells.join(" ")}`;
  }).join("\n");

  const systemPrompt = `You are Valyxo's financial inference agent. Infer KPIs from the sheet semantically; do not depend on exact column names.
Rules: Never invent numbers or periods. Always output the 6 headline KPIs (MRR, ARR, Growth MoM, Burn, Runway, Churn) using canonical definitions when data supports them, otherwise use proxies. Mark internally when a value is a proxy (proxiesUsed). Prefer null over guessing when no defensible proxy exists.`;

  const userPrompt = `Context: ${tabLabel}. ${sheetRef}

Grid:
${gridLines}

Output one row per period with: period_date (YYYY-MM-01), mrr, arr, mrr_growth_mom, burn_rate, runway_months, churn, customers. Use proxies if needed; list them in proxiesUsed. mrr_growth_mom and churn as percentages (e.g. 6.5 for 6.5%). Max ${MAX_DATA_ROWS} rows.

Return a single JSON object with: "rows" (array), "assumptions" (array), "whatDataWouldIncreaseConfidence" (string), "proxiesUsed" (optional string). Only valid JSON, no markdown.`;

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";
    if (!raw) {
      return {
        ok: true,
        companyId,
        tab,
        sheetId,
        kpiTable: [],
        altCandidatesConsidered: "",
        whatDataWouldIncreaseConfidence: "",
        assumptions: [],
        error: "Empty response from model",
      };
    }

    type DataRow = {
      period_date?: string;
      mrr?: number | null;
      arr?: number | null;
      mrr_growth_mom?: number | null;
      burn_rate?: number | null;
      runway_months?: number | null;
      churn?: number | null;
      customers?: number | null;
    };
    let data: {
      rows?: DataRow[];
      assumptions?: string[];
      whatDataWouldIncreaseConfidence?: string;
      proxiesUsed?: string;
    };
    try {
      data = JSON.parse(raw);
    } catch {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) data = JSON.parse(jsonMatch[0]);
      else {
        return {
          ok: true,
          companyId,
          tab,
          sheetId,
          kpiTable: [],
          altCandidatesConsidered: "",
          whatDataWouldIncreaseConfidence: "",
          assumptions: [],
          error: "Could not parse model response as JSON",
        };
      }
    }

    const rawRows = Array.isArray(data.rows) ? data.rows : [];
    const parsedRows: MetricInferenceDataRow[] = rawRows.slice(0, MAX_DATA_ROWS).map((r: DataRow) => ({
      period_date: typeof r.period_date === "string" ? r.period_date : "",
      mrr: typeof r.mrr === "number" ? r.mrr : r.mrr === null ? null : null,
      arr: typeof r.arr === "number" ? r.arr : r.arr === null ? null : null,
      mrr_growth_mom: typeof r.mrr_growth_mom === "number" ? r.mrr_growth_mom : r.mrr_growth_mom === null ? null : null,
      burn_rate: typeof r.burn_rate === "number" ? r.burn_rate : r.burn_rate === null ? null : null,
      runway_months: typeof r.runway_months === "number" ? r.runway_months : r.runway_months === null ? null : null,
      churn: typeof r.churn === "number" ? r.churn : r.churn === null ? null : null,
      customers: typeof r.customers === "number" ? r.customers : r.customers === null ? null : null,
    }));

    const { rows: sanityRows, rowMeta, logWarnings } = postProcessKpis(parsedRows, rowsToSend);
    if (logWarnings.length > 0) {
      logWarnings.forEach((w) => console.warn("[metric_inference]", w));
    }

    const sortedByDate = [...sanityRows].filter((r) => r.period_date).sort((a, b) => (a.period_date! < b.period_date! ? -1 : 1));
    const latestRow = sortedByDate.length > 0 ? sortedByDate[sortedByDate.length - 1] : sanityRows[0];
    const latestIndex = latestRow ? sanityRows.findIndex((r) => r === latestRow) : -1;
    const latestMeta: RowKpiMeta | undefined = latestIndex >= 0 ? rowMeta[latestIndex] : undefined;

    const evidenceBase = `${tabLabel}`;
    const rationaleBase = data.proxiesUsed ?? "Values from sheet; sanity checks applied.";
    const kpiLabels: Array<{ key: KpiKey; label: string }> = [
      { key: "mrr", label: "MRR" },
      { key: "arr", label: "ARR" },
      { key: "mrr_growth_mom", label: "Growth (MoM)" },
      { key: "burn_rate", label: "Burn" },
      { key: "runway_months", label: "Runway" },
      { key: "churn", label: "Churn" },
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
      whyHigherLevelNotUsed: data.proxiesUsed ?? "",
      kpiTable,
      altCandidatesConsidered: data.proxiesUsed ?? "",
      whatDataWouldIncreaseConfidence: data.whatDataWouldIncreaseConfidence ?? "",
      assumptions: Array.isArray(data.assumptions) ? data.assumptions : [],
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
