/**
 * Google Sheets KPI Source for MCP
 * 
 * Fetches and parses Google Sheets data for company KPIs.
 * This is the ONLY place that fetches sheets data - Next.js is just a gateway.
 * Uses AI to match column headers to KPI fields so any phrasing (e.g. "Monthly recurring revenue (USD)") is understood.
 * 
 * ROBUST NUMBER PARSING: Uses robust_number_parser to handle unicode minus, parentheses, currency formats
 * FINANCE RULES: Applies hard rules to prevent sign confusion (burn always >= 0, runway only when burn > 0)
 */

import { supabase } from "../db/supabase";
import { getOpenAI } from "../llm/openai";
import { parseSheetNumber, getSignedValue } from "../utils/robust_number_parser";
import { applyFinanceRules, validateFinanceRules } from "../utils/finance_rules";

// KPI keys we support from sheets (net_revenue / booked omitted; can come from Stripe)
const KPI_KEYS = [
  "mrr",
  "arr",
  "mrr_growth_mom",
  "churn",
  "burn_rate",
  "cash_balance",
  "customers",
  "runway_months",
] as const;

type KpiKey = typeof KPI_KEYS[number];

// Type definitions for sheet parsing
type SheetRow = Array<string | number | null | undefined>;
type SheetRows = SheetRow[];
type ParsedRow = { periodDate: string; values: Record<string, number | null>; net_cash_flow?: number | null };
type ParseDebug = {
  detectedLayout: string;
  totalRows: number;
  parsedRows: number;
  skippedRows: number;
};

// Header mapping: normalized header -> KPI key
const HEADER_MAP: Record<string, KpiKey | "month" | "net_cash_flow"> = {
  // Month/Date
  month: "month",
  date: "month",
  period: "month",
  
  // ARR
  "arr (usd)": "arr",
  "arr usd": "arr",
  arr: "arr",
  
  // MRR
  "mrr (usd)": "mrr",
  "mrr usd": "mrr",
  mrr: "mrr",
  
  // MRR Growth
  "mrr growth %": "mrr_growth_mom",
  "growth %": "mrr_growth_mom",
  "mrr growth": "mrr_growth_mom",
  "mrr_growth_mom": "mrr_growth_mom",
  "mom growth": "mrr_growth_mom",
  
  // Burn Rate
  "burn (usd)": "burn_rate",
  "burn usd": "burn_rate",
  burn: "burn_rate",
  "burn rate": "burn_rate",
  
  // Runway
  "runway (months)": "runway_months",
  "runway months": "runway_months",
  runway: "runway_months",
  
  // Churn
  "churn %": "churn",
  churn: "churn",
  
  // Cash Balance
  "cash balance (usd)": "cash_balance",
  "cash balance usd": "cash_balance",
  "cash balance": "cash_balance",
  cash: "cash_balance",
  
  // Customers
  customers: "customers",
  subs: "customers",
  subscribers: "customers",

  // Net cash flow (profit/burn); used for finance rules only
  "net (in-out)": "net_cash_flow",
  "net in-out": "net_cash_flow",
  "net cash flow": "net_cash_flow",
  "profit/loss": "net_cash_flow",
  "p&l": "net_cash_flow",
  net: "net_cash_flow",
  result: "net_cash_flow",
};

/**
 * All sheet recognition is via LLM: find numbers, find information, interpret information.
 * No static HEADER_MAP or findBestHeaderRow – semantic extraction first, then index-based LLM fallback.
 */

/**
 * Normalize header string for matching
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[:\-()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Column map can map to a KPI key or to net_cash_flow (used only for finance rules, not stored in snapshot). */
type ColumnMapKey = KpiKey | "net_cash_flow";

/** One entry for why a column was selected for a field (audit trail, no chain-of-thought). */
export type MappingRationaleEntry = {
  column_index: number;
  header: string;
  field: string;
  reason: string;
};

/** One entry for a column considered but rejected (audit trail). */
export type RejectedColumnEntry = {
  column_index: number;
  header: string;
  reason: string;
};

/** Result of AI grid scan: which row is header, which column is month, and column → field mapping. */
type MatchColumnsAIResult = {
  headerRowIndex: number;
  columnMap: Map<number, ColumnMapKey>;
  monthColumnIndex: number | null;
  mappingRationale?: MappingRationaleEntry[];
  rejectedColumns?: RejectedColumnEntry[];
};

/** Normalize AI-returned field name to ColumnMapKey (KPI or net_cash_flow). */
function normalizeAIFieldToKpiKey(value: string): ColumnMapKey | null {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
  if (normalized === "net_cash_flow") return "net_cash_flow";
  const netAliases = ["net", "profit", "p&l", "profit_loss", "cash_flow", "result", "net_in_out"];
  if (netAliases.includes(normalized)) return "net_cash_flow";
  if (KPI_KEYS.includes(normalized as KpiKey)) return normalized as KpiKey;
  const aliases: Record<string, KpiKey> = {
    burn_rate: "burn_rate",
    burn: "burn_rate",
    cash_balance: "cash_balance",
    cash: "cash_balance",
    runway_months: "runway_months",
    runway: "runway_months",
    mrr_growth_mom: "mrr_growth_mom",
    growth: "mrr_growth_mom",
  };
  return aliases[normalized] ?? null;
}

// Caps for AI scan (flexible: we send actual sheet size up to these limits)
const MAX_GRID_ROWS_CAP = 200;
const MAX_GRID_COLS_CAP = 50;

/**
 * Semantic Interpreter: proposes column-to-field mapping from a Google Sheets grid.
 * Grid size is dynamic (actual rows/columns from the sheet, up to caps). Header row can be anywhere.
 * Returns null if OPENAI_API_KEY is missing or the API call fails.
 */
async function matchColumnsWithAI(grid: SheetRows): Promise<MatchColumnsAIResult | null> {
  if (!grid.length) return null;

  const rowsToSend = grid.slice(0, MAX_GRID_ROWS_CAP);
  const actualMaxCols = Math.max(1, ...rowsToSend.map((r) => (r ?? []).length));
  const colsToSend = Math.min(actualMaxCols, MAX_GRID_COLS_CAP);

  if (!process.env.OPENAI_API_KEY) {
    console.log("[matchColumnsWithAI] OPENAI_API_KEY not set, skipping column matching");
    return null;
  }

  const gridLines = rowsToSend.map((row, rowIdx) => {
    const cells = (row ?? []).slice(0, colsToSend).map((c, colIdx) => `${colIdx}="${String(c ?? "").trim().replace(/"/g, "'")}"`);
    return `row ${rowIdx}: ${cells.join(", ")}`;
  }).join("\n");

  try {
    const openai = getOpenAI();
    const prompt = `You are a Semantic Interpreter. You interpret language and structure only; you do not decide truth or compute values. You propose candidate mappings and list ambiguity.

Grid from Google Sheets (rows 0–${rowsToSend.length - 1}, cols 0–${colsToSend - 1}). Header row can be anywhere.

TASK: Propose a mapping from column index to field name. Use ONLY interpretation of headers and structure:
- Identify header row and month/period column.
- For each data column: interpret the header (e.g. "Net", "Result", "P&L", "Subscription revenue", "MRR", "Monthly recurring") and propose which field it might represent.
- OMIT any column you are unsure about. Prefer rejection over guessing.

Allowed field names: mrr, arr, mrr_growth_mom, burn_rate, cash_balance, runway_months, churn, customers, net_cash_flow.
Synonyms for net_cash_flow: Net, Profit/Loss, P&L, Cash flow, Result (the system handles sign mechanically).

Grid:
${gridLines}

Return JSON: header_row_index (0-based), month_column (0-based), mapping from column index to field name. Example: {"header_row_index":0,"month_column":0,"1":"mrr","2":"arr","3":"net_cash_flow"}. Include only mappings you are confident about.

Optionally include mapping_rationale: for each column you mapped, one entry {"column_index": number, "header": string, "field": string, "reason": string}. Reasons must be short and factual (e.g. "header suggests subscription revenue", "label matches MRR"). Optionally include rejected_columns: for columns you considered but rejected, {"column_index": number, "header": string, "reason": string} (e.g. "too generic", "looks like forecast").`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";
    if (!raw) return null;

    let parsed: Record<string, string | number>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const jsonMatch = raw.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[1]);
      else return null;
    }

    let headerRowIndex: number = 0;
    const rawHeaderRow = parsed.header_row_index;
    const hri = typeof rawHeaderRow === "number" ? rawHeaderRow : parseInt(String(rawHeaderRow ?? "0"), 10);
    if (!isNaN(hri) && hri >= 0 && hri < rowsToSend.length) {
      headerRowIndex = hri;
    }
    const headerRow = grid[headerRowIndex] ?? [];
    const maxCol = colsToSend;

    const columnMap = new Map<number, ColumnMapKey>();
    let monthColumnIndex: number | null = null;

    // If model put mapping inside a nested object (e.g. "columns" or "mapping"), use that
    let toIterate: Record<string, string | number> = parsed;
    if (typeof parsed.columns === "object" && parsed.columns !== null) {
      toIterate = parsed.columns as Record<string, string | number>;
    } else if (typeof parsed.mapping === "object" && parsed.mapping !== null) {
      toIterate = parsed.mapping as Record<string, string | number>;
    }

    for (const [key, value] of Object.entries(toIterate)) {
      if (key === "month_column" || key === "header_row_index" || key === "rejected_columns" || key === "mapping_rationale") {
        if (key === "month_column") {
          const n = typeof value === "number" ? value : parseInt(String(value), 10);
          if (!isNaN(n) && n >= 0 && n < maxCol) monthColumnIndex = n;
        }
        continue;
      }
      const index = parseInt(key, 10);
      const canonical = normalizeAIFieldToKpiKey(String(value));
      if (isNaN(index) || index < 0 || index >= maxCol) continue;
      if (!canonical) continue;
      columnMap.set(index, canonical);
    }

    // Parse mapping_rationale (audit trail; optional)
    let mappingRationale: MappingRationaleEntry[] | undefined;
    const rawRationale = parsed.mapping_rationale;
    if (Array.isArray(rawRationale) && rawRationale.length > 0) {
      mappingRationale = [];
      for (const item of rawRationale) {
        if (item && typeof item === "object" && "column_index" in item && "field" in item && "reason" in item) {
          const header = typeof (item as { header?: string }).header === "string" ? (item as { header: string }).header : "";
          mappingRationale.push({
            column_index: Number((item as { column_index: number }).column_index),
            header,
            field: String((item as { field: string }).field),
            reason: String((item as { reason: string }).reason),
          });
        }
      }
      if (mappingRationale.length === 0) mappingRationale = undefined;
    }

    // Parse rejected_columns (audit trail; optional)
    let rejectedColumns: RejectedColumnEntry[] | undefined;
    const rejected = parsed.rejected_columns;
    if (Array.isArray(rejected) && rejected.length > 0) {
      rejectedColumns = [];
      for (const item of rejected) {
        if (item && typeof item === "object" && "column_index" in item && "reason" in item) {
          const header = typeof (item as { header?: string }).header === "string" ? (item as { header: string }).header : "";
          rejectedColumns.push({
            column_index: Number((item as { column_index: number }).column_index),
            header,
            reason: String((item as { reason: string }).reason),
          });
        }
      }
      if (rejectedColumns.length === 0) rejectedColumns = undefined;
    }

    // month_column might be at top level if mapping was nested
    if (monthColumnIndex === null && typeof parsed.month_column === "number") {
      const n = parsed.month_column;
      if (n >= 0 && n < maxCol) monthColumnIndex = n;
    } else if (monthColumnIndex === null && typeof parsed.month_column === "string") {
      const n = parseInt(parsed.month_column, 10);
      if (!isNaN(n) && n >= 0 && n < maxCol) monthColumnIndex = n;
    }

    if (columnMap.size >= 2) {
      return {
        headerRowIndex,
        columnMap,
        monthColumnIndex,
        mappingRationale: mappingRationale?.length ? mappingRationale : undefined,
        rejectedColumns: rejectedColumns?.length ? rejectedColumns : undefined,
      };
    }
    return null;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[matchColumnsWithAI] AI matching failed:", msg);
    return null;
  }
}

/**
 * Parse month string to YYYY-MM-01 format
 */
function parseMonthToPeriodDate(
  monthStr: string | number,
  contextYear?: number | null
): string | null {
  if (monthStr === null || monthStr === undefined || monthStr === "") {
    return null;
  }

  // Handle Excel serial numbers
  if (typeof monthStr === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + (monthStr - 1) * 24 * 60 * 60 * 1000);
    if (!isNaN(date.getTime())) {
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth() + 1;
      return `${year}-${String(month).padStart(2, "0")}-01`;
    }
    return null;
  }

  const str = String(monthStr).trim();
  if (!str) return null;

  // Try ISO format: "2026-01" or "2026-01-01"
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    if (year >= 2000 && year < 2100 && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, "0")}-01`;
    }
  }

  // Try month name: "Jan 2026", "January 2026"
  const monthNameMatch = str.match(/^([a-z]+)\s+(\d{4})$/i);
  if (monthNameMatch) {
    const monthName = monthNameMatch[1].toLowerCase();
    const year = parseInt(monthNameMatch[2], 10);
    
    const monthMap: Record<string, number> = {
      jan: 1, january: 1,
      feb: 2, february: 2,
      mar: 3, march: 3,
      apr: 4, april: 4,
      may: 5,
      jun: 6, june: 6,
      jul: 7, july: 7,
      aug: 8, august: 8,
      sep: 9, september: 9, sept: 9,
      oct: 10, october: 10,
      nov: 11, november: 11,
      dec: 12, december: 12,
    };
    
    const month = monthMap[monthName];
    if (month && year >= 2000 && year < 2100) {
      return `${year}-${String(month).padStart(2, "0")}-01`;
    }
  }

  // Try just month name: "Oct" (infer year from context)
  const monthOnlyMatch = str.match(/^([a-z]+)$/i);
  if (monthOnlyMatch) {
    const monthName = monthOnlyMatch[1].toLowerCase();
    const monthMap: Record<string, number> = {
      jan: 1, january: 1,
      feb: 2, february: 2,
      mar: 3, march: 3,
      apr: 4, april: 4,
      may: 5,
      jun: 6, june: 6,
      jul: 7, july: 7,
      aug: 8, august: 8,
      sep: 9, september: 9, sept: 9,
      oct: 10, october: 10,
      nov: 11, november: 11,
      dec: 12, december: 12,
    };
    
    const month = monthMap[monthName];
    if (month) {
      const now = new Date();
      const currentYear = now.getUTCFullYear();
      const currentMonth = now.getUTCMonth() + 1;
      
      if (contextYear && contextYear >= 2000 && contextYear < 2100) {
        return `${contextYear}-${String(month).padStart(2, "0")}-01`;
      }
      
      const year = month <= currentMonth ? currentYear : currentYear - 1;
      return `${year}-${String(month).padStart(2, "0")}-01`;
    }
  }

  return null;
}

/**
 * Parse number from string, handling various formats
 * NOW USES ROBUST PARSER to handle unicode minus, parentheses, currency, etc.
 */
function parseNumber(value: unknown, isPercent = false): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  // Handle percentage symbol first
  if (typeof value === "string" && value.includes("%")) {
    const cleaned = value.replace(/%/g, "").trim();
    const parsed = parseSheetNumber(cleaned);
    return parsed ? Math.abs(parsed.signalValue) : null; // Percentages are always positive
  }

  // Use robust parser for all other numbers
  const parsed = parseSheetNumber(value);
  
  if (parsed === null) {
    return null;
  }

  // Handle percent fields: if value is <= 1, treat as fraction and multiply by 100
  const absoluteValue = Math.abs(parsed.signalValue);
  if (isPercent && absoluteValue <= 1 && absoluteValue > 0) {
    return absoluteValue * 100;
  }

  // Return signed value (preserves sign from parser)
  return parsed.signalValue;
}

/**
 * Score a row as a potential header row
 */
function scoreHeaderRow(
  row: SheetRow,
  knownKpiKeys: readonly string[]
): { score: number; columnMap: Map<number, KpiKey> } {
  let score = 0;
  const columnMap = new Map<number, KpiKey>();
  let hasMonth = false;

  for (let i = 0; i < row.length; i++) {
    const cell = row[i];
    if (!cell) continue;

    const normalized = normalizeHeader(String(cell));
    const kpiKey = HEADER_MAP[normalized];

    if (kpiKey === "month") {
      hasMonth = true;
      score += 10;
    } else if (kpiKey && kpiKey !== "net_cash_flow" && knownKpiKeys.includes(kpiKey)) {
      columnMap.set(i, kpiKey);
      score += 5;
    }
  }

  if (hasMonth && columnMap.size >= 2) {
    return { score, columnMap };
  }

  return { score: 0, columnMap: new Map() };
}

/**
 * Find best header row in horizontal layout
 */
function findBestHeaderRow(
  rows: SheetRows,
  maxRowsToCheck = 20
): { headerRowIndex: number; columnMap: Map<number, KpiKey> } | null {
  let bestScore = 0;
  let bestHeaderRowIndex = -1;
  let bestColumnMap = new Map<number, KpiKey>();

  for (let i = 0; i < Math.min(rows.length, maxRowsToCheck); i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const { score, columnMap } = scoreHeaderRow(row, KPI_KEYS);
    if (score > bestScore) {
      bestScore = score;
      bestHeaderRowIndex = i;
      bestColumnMap = columnMap;
    }
  }

  if (bestHeaderRowIndex >= 0 && bestColumnMap.size >= 2) {
    return {
      headerRowIndex: bestHeaderRowIndex,
      columnMap: bestColumnMap,
    };
  }

  return null;
}

/**
 * Extract data region from header row
 */
function extractDataRegion(
  rows: SheetRows,
  headerRowIndex: number,
  monthColumnIndex: number
): SheetRows {
  const dataRows: SheetRows = [];
  let emptyMonthCount = 0;

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) {
      emptyMonthCount++;
      if (emptyMonthCount >= 2) break;
      continue;
    }

    const monthValue = row[monthColumnIndex];
    if (!monthValue || String(monthValue).trim() === "") {
      emptyMonthCount++;
      if (emptyMonthCount >= 2) break;
      continue;
    }

    emptyMonthCount = 0;
    dataRows.push(row);
  }

  return dataRows;
}

/** Column-mapping rationale from Semantic Interpreter (audit trail, no chain-of-thought). */
export type ColumnRationale = {
  mappingRationale?: MappingRationaleEntry[];
  rejectedColumns?: RejectedColumnEntry[];
};

/** Per-metric rationale for details panel (selected column + rejected candidates). */
export type KpiRationale = Record<
  string,
  {
    selected?: { sheetName?: string; column_index?: number; range?: string; header?: string; reason?: string };
    rejected?: Array<{ column_index: number; header: string; reason: string }>;
  }
>;

/**
 * Parse horizontal layout
 * All recognition via LLM: semantic extraction first, then index-based LLM fallback.
 */
async function parseHorizontalLayout(
  rows: SheetRows
): Promise<{ parsed: ParsedRow[]; debug: ParseDebug; columnRationale?: ColumnRationale }> {
  const parsed: ParsedRow[] = [];
  let skippedRows = 0;

  let headerRowIndex: number;
  let columnMap: Map<number, ColumnMapKey>;
  let monthColumnIndex: number;

  // All via LLM: find numbers, find information, interpret – no static HEADER_MAP or findBestHeaderRow
  if (rows.length < 2) {
    return {
      parsed: [],
      debug: { detectedLayout: "none", totalRows: rows.length, parsedRows: 0, skippedRows: rows.length },
    };
  }
  const grid = rows.slice(0, MAX_GRID_ROWS_CAP);
  // LLM proposes column mapping only; all value extraction and calculation is mechanical
  const aiResult = await matchColumnsWithAI(grid);
  if (!aiResult || aiResult.columnMap.size < 1) {
    return {
      parsed: [],
      debug: { detectedLayout: "horizontal", totalRows: rows.length, parsedRows: 0, skippedRows: rows.length },
    };
  }
  headerRowIndex = aiResult.headerRowIndex;
  columnMap = aiResult.columnMap;
  monthColumnIndex = aiResult.monthColumnIndex ?? 0;

  const dataRows = extractDataRegion(rows, headerRowIndex, monthColumnIndex);

  for (const row of dataRows) {
    const monthValue = row[monthColumnIndex];
    if (monthValue === null || monthValue === undefined) {
      skippedRows++;
      continue;
    }
    const periodDate = parseMonthToPeriodDate(monthValue);
    
    if (!periodDate) {
      skippedRows++;
      continue;
    }

    const values: Record<string, number | null> = {};
    let rowNetCashFlow: number | null = null;

    for (const [colIndex, fieldKey] of columnMap.entries()) {
      const rawValue = row[parseInt(String(colIndex))];
      const isPercent = fieldKey === "churn" || fieldKey === "mrr_growth_mom";
      const parsedValue = parseNumber(rawValue, isPercent);
      if (fieldKey === "net_cash_flow") {
        rowNetCashFlow = parsedValue;
      } else {
        values[fieldKey] = parsedValue;
      }
    }

    if (Object.values(values).some(v => v !== null) || rowNetCashFlow !== null) {
      parsed.push({ periodDate, values, net_cash_flow: rowNetCashFlow ?? undefined });
    } else {
      skippedRows++;
    }
  }

  // POST-PROCESSING: Apply hard finance rules to all parsed rows
  for (const row of parsed) {
    const { values } = row;
    const netCashFlow = row.net_cash_flow ?? null;
    
    if (netCashFlow !== null || values.burn_rate !== null || values.cash_balance !== null) {
      const financeMetrics = applyFinanceRules(
        netCashFlow,
        values.burn_rate,
        values.cash_balance,
        { preferReportedBurn: netCashFlow === null }
      );
      
      // Validate
      const validation = validateFinanceRules(financeMetrics);
      if (!validation.valid) {
        console.error(`[parseSheetData] Finance rule violation in period ${row.periodDate}:`, validation.errors);
      }
      
      // Apply corrected values
      if (financeMetrics.burn_rate !== null) {
        values.burn_rate = financeMetrics.burn_rate;
      }
      if (financeMetrics.runway_months !== null) {
        values.runway_months = financeMetrics.runway_months;
      } else if (financeMetrics.runway_status === "not_applicable") {
        values.runway_months = null;
      }
      
      // Log warnings
      if (financeMetrics.warnings && financeMetrics.warnings.length > 0) {
        console.log(`[parseSheetData] Finance warnings for ${row.periodDate}:`, financeMetrics.warnings);
      }
    }
  }

  const columnRationale: ColumnRationale | undefined =
    aiResult.mappingRationale?.length || aiResult.rejectedColumns?.length
      ? {
          mappingRationale: aiResult.mappingRationale?.length ? aiResult.mappingRationale : undefined,
          rejectedColumns: aiResult.rejectedColumns?.length ? aiResult.rejectedColumns : undefined,
        }
      : undefined;

  return {
    parsed,
    debug: {
      detectedLayout: "horizontal",
      totalRows: rows.length,
      parsedRows: parsed.length,
      skippedRows,
    },
    columnRationale,
  };
}

/**
 * Detect vertical layout
 */
function detectVerticalLayout(rows: SheetRows): boolean {
  if (rows.length < 2) return false;

  const firstRow = rows[0];
  const firstColumn: string[] = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row && row[0]) {
      firstColumn.push(String(row[0]).trim().toLowerCase());
    }
  }

  let kpiLabelCount = 0;
  for (const label of firstColumn) {
    const normalized = normalizeHeader(label);
    if (HEADER_MAP[normalized] && HEADER_MAP[normalized] !== "month") {
      kpiLabelCount++;
    }
  }

  let monthCount = 0;
  for (let i = 1; i < firstRow.length; i++) {
    const cell = firstRow[i];
    if (cell && parseMonthToPeriodDate(cell)) {
      monthCount++;
    }
  }

  return kpiLabelCount >= 2 && monthCount >= 2;
}

/**
 * Parse vertical layout
 */
function parseVerticalLayout(
  rows: SheetRows
): { parsed: ParsedRow[]; debug: ParseDebug } {
  const parsed: ParsedRow[] = [];
  let skippedRows = 0;

  if (rows.length < 2) {
    return {
      parsed: [],
      debug: {
        detectedLayout: "vertical",
        totalRows: rows.length,
        parsedRows: 0,
        skippedRows: rows.length,
      },
    };
  }

  const firstRow = rows[0];
  
  const monthColumns: Array<{ index: number; periodDate: string }> = [];
  for (let i = 1; i < firstRow.length; i++) {
    const cell = firstRow[i];
    if (cell === null || cell === undefined) continue;
    const periodDate = parseMonthToPeriodDate(cell);
    if (periodDate) {
      monthColumns.push({ index: i, periodDate });
    }
  }

  if (monthColumns.length === 0) {
    return {
      parsed: [],
      debug: {
        detectedLayout: "vertical",
        totalRows: rows.length,
        parsedRows: 0,
        skippedRows: rows.length,
      },
    };
  }

  const kpiLabelMap = new Map<number, ColumnMapKey>();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;

    const normalized = normalizeHeader(String(row[0]));
    const fieldKey = HEADER_MAP[normalized];
    if (fieldKey && fieldKey !== "month") {
      kpiLabelMap.set(i, fieldKey);
    }
  }

  if (kpiLabelMap.size === 0) {
    return {
      parsed: [],
      debug: {
        detectedLayout: "vertical",
        totalRows: rows.length,
        parsedRows: 0,
        skippedRows: rows.length,
      },
    };
  }

  for (const { index: monthColIndex, periodDate } of monthColumns) {
    const values: Record<string, number | null> = {};
    let rowNetCashFlow: number | null = null;

    for (const [rowIndex, fieldKey] of kpiLabelMap.entries()) {
      const row = rows[rowIndex];
      if (!row) continue;

      const rawValue = row[monthColIndex];
      const isPercent = fieldKey === "churn" || fieldKey === "mrr_growth_mom";
      const parsedValue = parseNumber(rawValue, isPercent);
      if (fieldKey === "net_cash_flow") {
        rowNetCashFlow = parsedValue;
      } else {
        values[fieldKey] = parsedValue;
      }
    }

    if (Object.values(values).some(v => v !== null) || rowNetCashFlow !== null) {
      parsed.push({ periodDate, values, net_cash_flow: rowNetCashFlow ?? undefined });
    } else {
      skippedRows++;
    }
  }

  // Apply finance rules (same as horizontal fallback)
  for (const row of parsed) {
    const { values } = row;
    const netCashFlow = row.net_cash_flow ?? null;
    if (netCashFlow === null && values.burn_rate === null && values.cash_balance === null) continue;
    const financeMetrics = applyFinanceRules(
      netCashFlow,
      values.burn_rate,
      values.cash_balance,
      { preferReportedBurn: netCashFlow === null }
    );
    if (financeMetrics.burn_rate !== null) values.burn_rate = financeMetrics.burn_rate;
    if (financeMetrics.runway_months !== null) values.runway_months = financeMetrics.runway_months;
    else if (financeMetrics.runway_status === "not_applicable") values.runway_months = null;
  }

  return {
    parsed,
    debug: {
      detectedLayout: "vertical",
      totalRows: rows.length,
      parsedRows: parsed.length,
      skippedRows,
    },
  };
}

/**
 * Parse sheet rows.
 * LLM proposes column mapping only; all value extraction and KPI calculation is mechanical.
 * Exported for metric_inference (shared pipeline).
 */
export async function parseSheetRows(rows: SheetRows): Promise<{
  parsed: ParsedRow[];
  debug: ParseDebug;
  columnRationale?: ColumnRationale;
}> {
  if (!rows || rows.length === 0) {
    return {
      parsed: [],
      debug: {
        detectedLayout: "none",
        totalRows: 0,
        parsedRows: 0,
        skippedRows: 0,
      },
    };
  }

  // Try horizontal layout first (AI column matching used here when available)
  const horizontalResult = await parseHorizontalLayout(rows);
  if (horizontalResult.parsed.length > 0) {
    return horizontalResult;
  }

  // Try vertical layout
  if (detectVerticalLayout(rows)) {
    const verticalResult = parseVerticalLayout(rows);
    if (verticalResult.parsed.length > 0) {
      return verticalResult;
    }
  }

  return {
    parsed: [],
    debug: {
      detectedLayout: "none",
      totalRows: rows.length,
      parsedRows: 0,
      skippedRows: rows.length,
    },
  };
}

/**
 * Convert Google Sheets URL to CSV export URL
 */
function getSheetsCsvUrl(sheetUrl: string, tabName?: string | null, range?: string | null): string {
  const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    throw new Error("Invalid Google Sheets URL format");
  }
  const spreadsheetId = match[1];

  let csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
  
  if (tabName && tabName.trim()) {
    const trimmedTab = tabName.trim();
    const isNumeric = /^\d+$/.test(trimmedTab);
    
    if (isNumeric) {
      csvUrl += `&gid=${trimmedTab}`;
    } else {
      csvUrl += `&sheet=${encodeURIComponent(trimmedTab)}`;
    }
  }

  if (range && range.trim()) {
    csvUrl += `&range=${encodeURIComponent(range.trim())}`;
  }

  return csvUrl;
}

/**
 * Parse CSV text into 2D array
 */
function parseCSV(csvText: string): SheetRows {
  const rows: SheetRows = [];
  const lines = csvText.split("\n");
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Simple CSV parsing (handles quoted fields)
    const cells: SheetRow = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    
    cells.push(current.trim());
    rows.push(cells);
  }
  
  return rows;
}

/**
 * Load Google Sheets KPIs for a company
 */
export async function loadSheetsKpisForCompany(companyId: string): Promise<Array<{
  source: "google_sheets";
  period_date: string;
  kpis: Record<string, number | null>;
  meta: {
    sheetId?: string;
    tab?: string;
    range?: string;
    detectedLayout?: "horizontal" | "vertical" | "none";
    parsedRows?: number;
    skippedRows?: number;
    mapping_used?: Record<string, string>;
  };
}>> {
  // Fetch company's Google Sheets config
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, google_sheets_url, google_sheets_tab")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError) {
    console.error("[loadSheetsKpisForCompany] DB error:", companyError);
    throw new Error(`Failed to fetch company: ${companyError.message}`);
  }

  if (!company) {
    throw new Error(`Company ${companyId} not found`);
  }

  if (!company.google_sheets_url) {
    console.log(`[loadSheetsKpisForCompany] No Google Sheets URL configured for company ${companyId}`);
    return [];
  }

  // Support both old format (single url + tab) and new format (JSON array of sheets)
  let sheetUrl: string;
  let sheetTab: string | null;
  try {
    const parsed = JSON.parse(company.google_sheets_url);
    if (Array.isArray(parsed) && parsed.length > 0) {
      sheetUrl = (parsed[0].url ?? "").trim();
      sheetTab = (parsed[0].tab ?? company.google_sheets_tab ?? "").trim() || null;
    } else {
      sheetUrl = company.google_sheets_url;
      sheetTab = company.google_sheets_tab ?? null;
    }
  } catch {
    sheetUrl = company.google_sheets_url;
    sheetTab = company.google_sheets_tab ?? null;
  }

  if (!sheetUrl) {
    console.log(`[loadSheetsKpisForCompany] No valid sheet URL for company ${companyId}`);
    return [];
  }

  // Extract sheet ID from URL
  const sheetIdMatch = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const sheetId = sheetIdMatch ? sheetIdMatch[1] : undefined;

  // Get CSV export URL
  const range: string | null = null;
  const csvUrl = getSheetsCsvUrl(sheetUrl, sheetTab, range);

  console.log(`[loadSheetsKpisForCompany] Loading Google Sheet for company ${companyId}:`, {
    hasUrl: true,
    tabProvided: !!sheetTab,
    rangeProvided: !!range,
  });

  // Fetch CSV data
  let csvText: string;
  try {
    const response = await fetch(csvUrl, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Google Sheet: ${response.status} ${response.statusText}`);
    }

    csvText = await response.text();
  } catch (fetchError: unknown) {
    const errorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
    console.error(`[loadSheetsKpisForCompany] Fetch error for company ${companyId}:`, errorMsg);
    throw new Error(`Failed to fetch Google Sheet: ${errorMsg}`);
  }

  // Parse CSV
  const rows = parseCSV(csvText);
  if (rows.length === 0) {
    console.log(`[loadSheetsKpisForCompany] Empty sheet for company ${companyId}`);
    return [];
  }

  // Parse sheet rows (AI column matching used for horizontal layout when OPENAI_API_KEY is set)
  const { parsed, debug } = await parseSheetRows(rows);

  // Log summary (safe - no raw cells)
  console.log(`[loadSheetsKpisForCompany] Parsed sheet for company ${companyId}:`, {
    detectedLayout: debug.detectedLayout,
    totalRows: debug.totalRows,
    parsedRows: debug.parsedRows,
    skippedRows: debug.skippedRows,
  });

  // Build mapping_used from header detection (for debugging)
  const mappingUsed: Record<string, string> = {};
  // This would require storing header info, but for now we'll skip it

  // Return structured data
  return parsed.map(({ periodDate, values }) => ({
    source: "google_sheets" as const,
    period_date: periodDate,
    kpis: values,
    meta: {
      sheetId,
      tab: sheetTab || undefined,
      range: range || undefined,
      detectedLayout: (debug.detectedLayout === "horizontal" || debug.detectedLayout === "vertical" || debug.detectedLayout === "none") 
        ? debug.detectedLayout 
        : undefined,
      parsedRows: debug.parsedRows,
      skippedRows: debug.skippedRows,
      mapping_used: mappingUsed,
    },
  }));
}

/**
 * Load raw sheet grid for a company (for metric inference / candidate scoring).
 * Returns the CSV-parsed grid plus tab and sheetId for evidence references.
 */
export async function getSheetGridForCompany(companyId: string): Promise<{
  grid: SheetRows;
  tab: string | null;
  sheetId: string | undefined;
}> {
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, google_sheets_url, google_sheets_tab")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError) throw new Error(`Failed to fetch company: ${companyError.message}`);
  if (!company) throw new Error(`Company ${companyId} not found`);
  if (!company.google_sheets_url) {
    return { grid: [], tab: null, sheetId: undefined };
  }

  let sheetUrl: string;
  let sheetTab: string | null;
  try {
    const parsed = JSON.parse(company.google_sheets_url);
    if (Array.isArray(parsed) && parsed.length > 0) {
      sheetUrl = (parsed[0].url ?? "").trim();
      sheetTab = (parsed[0].tab ?? company.google_sheets_tab ?? "").trim() || null;
    } else {
      sheetUrl = company.google_sheets_url;
      sheetTab = company.google_sheets_tab ?? null;
    }
  } catch {
    sheetUrl = company.google_sheets_url;
    sheetTab = company.google_sheets_tab ?? null;
  }

  if (!sheetUrl) return { grid: [], tab: null, sheetId: undefined };

  const sheetIdMatch = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const sheetId = sheetIdMatch ? sheetIdMatch[1] : undefined;
  const csvUrl = getSheetsCsvUrl(sheetUrl, sheetTab, null);

  const response = await fetch(csvUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
  const csvText = await response.text();
  const grid = parseCSV(csvText);

  return { grid, tab: sheetTab, sheetId };
}
