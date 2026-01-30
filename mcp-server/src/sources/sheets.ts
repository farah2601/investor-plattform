/**
 * Google Sheets KPI Source for MCP
 * 
 * Fetches and parses Google Sheets data for company KPIs.
 * This is the ONLY place that fetches sheets data - Next.js is just a gateway.
 * Uses AI to match column headers to KPI fields so any phrasing (e.g. "Monthly recurring revenue (USD)") is understood.
 */

import * as fs from "fs";
import * as path from "path";
import { supabase } from "../db/supabase";
import { getOpenAI } from "../llm/openai";

// #region agent log
function debugLog(payload: { location: string; message: string; data?: object; hypothesisId?: string }) {
  const line = JSON.stringify({ ...payload, timestamp: Date.now(), sessionId: "debug-session" }) + "\n";
  const logPath = path.join(process.cwd(), "..", ".cursor", "debug.log");
  try {
    fs.appendFileSync(logPath, line);
  } catch (_) {}
}
// #endregion

// KPI keys we support (must match everywhere)
const KPI_KEYS = [
  "mrr",
  "arr",
  "mrr_growth_mom",
  "churn",
  "net_revenue",
  "failed_payment_rate",
  "refund_rate",
  "burn_rate",
  "cash_balance",
  "customers",
  "runway_months",
] as const;

type KpiKey = typeof KPI_KEYS[number];

// Type definitions for sheet parsing
type SheetRow = Array<string | number | null | undefined>;
type SheetRows = SheetRow[];
type ParsedRow = { periodDate: string; values: Record<string, number | null> };
type ParseDebug = {
  detectedLayout: string;
  totalRows: number;
  parsedRows: number;
  skippedRows: number;
};

// Header mapping: normalized header -> KPI key
const HEADER_MAP: Record<string, KpiKey | "month"> = {
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
  
  // Net Revenue (may not be in sheets)
  "net revenue": "net_revenue",
  "net revenue (usd)": "net_revenue",
  
  // Failed Payment Rate
  "failed payment rate": "failed_payment_rate",
  "failed payment %": "failed_payment_rate",
  
  // Refund Rate
  "refund rate": "refund_rate",
  "refund %": "refund_rate",
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

/** Result of AI grid scan: which row is header, which column is month, and column → KPI mapping for that row. */
type MatchColumnsAIResult = {
  headerRowIndex: number;
  columnMap: Map<number, KpiKey>;
  monthColumnIndex: number | null;
};

/** Normalize AI-returned field name to canonical KpiKey (case-insensitive, spaces → underscore, common aliases). */
function normalizeAIFieldToKpiKey(value: string): KpiKey | null {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
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
    net_revenue: "net_revenue",
    failed_payment_rate: "failed_payment_rate",
    refund_rate: "refund_rate",
  };
  return aliases[normalized] ?? null;
}

// Caps for AI scan (flexible: we send actual sheet size up to these limits)
const MAX_GRID_ROWS_CAP = 200;
const MAX_GRID_COLS_CAP = 50;

/**
 * AI scans a Google Sheets grid to find the header row and map columns to KPI fields.
 * Grid size is dynamic (actual rows/columns from the sheet, up to caps). Header row can be anywhere.
 * Returns null if OPENAI_API_KEY is missing or the API call fails.
 */
async function matchColumnsWithAI(grid: SheetRows): Promise<MatchColumnsAIResult | null> {
  if (!grid.length) return null;

  const rowsToSend = grid.slice(0, MAX_GRID_ROWS_CAP);
  const actualMaxCols = Math.max(1, ...rowsToSend.map((r) => (r ?? []).length));
  const colsToSend = Math.min(actualMaxCols, MAX_GRID_COLS_CAP);

  // #region agent log
  debugLog({
    location: "sheets.ts:matchColumnsWithAI:entry",
    message: "grid sent to AI",
    data: { rows: rowsToSend.length, cols: colsToSend },
    hypothesisId: "H1-H3",
  });
  fetch("http://127.0.0.1:7242/ingest/d791096d-e9b3-45ec-a7c6-17c4fea0a92c", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "sheets.ts:matchColumnsWithAI:entry",
      message: "grid sent to AI",
      data: { rows: rowsToSend.length, cols: colsToSend },
      timestamp: Date.now(),
      sessionId: "debug-session",
      hypothesisId: "H1-H3",
    }),
  }).catch(() => {});
  // #endregion
  if (!process.env.OPENAI_API_KEY) {
    console.log("[matchColumnsWithAI] OPENAI_API_KEY not set, skipping AI matching");
    return null;
  }

  const gridLines = rowsToSend.map((row, rowIdx) => {
    const cells = (row ?? []).slice(0, colsToSend).map((c, colIdx) => `${colIdx}="${String(c ?? "").trim().replace(/"/g, "'")}"`);
    return `row ${rowIdx}: ${cells.join(", ")}`;
  }).join("\n");

  try {
    const openai = getOpenAI();
    const prompt = `You are looking at a grid from Google Sheets. The size may vary: rows 0 to ${rowsToSend.length - 1}, columns 0 to ${colsToSend - 1}. Use what is actually shown—the header row can be anywhere (e.g. row 0 or a few rows down).

Task: Scan the grid and find the row that contains column headers (field names). Map columns by meaning, not exact wording—e.g. "Monthly recurring revenue (USD)", "MRR", "Månedlig inntekt" should map to mrr. Also identify which column is month/period/date.

KPI fields (use these exact strings in JSON):
- mrr: monthly recurring revenue, MRR
- arr: annual recurring revenue, ARR
- mrr_growth_mom: MRR Growth %, Growth %, MoM growth
- burn_rate: burn, burn rate, monthly spend
- cash_balance: cash, cash balance
- runway_months: runway, runway in months
- churn: churn, Churn %
- customers: customers, users, subscribers
- net_revenue: net revenue
- failed_payment_rate: failed payments
- refund_rate: refund rate

Grid (row 0–${rowsToSend.length - 1}, col 0–${colsToSend - 1}):
${gridLines}

Return JSON with:
- header_row_index: (number) 0-based row index of the header row.
- month_column: (number) 0-based column index for month/period.
- Mapping from column index (string "0", "1", …) to KPI field. Map ONLY data columns to KPI—the month/period column (month_column) must NOT be mapped to mrr, arr or any other KPI field.

Example when column 0 is month: {"header_row_index": 0, "month_column": 0, "1": "mrr", "2": "arr", "3": "mrr_growth_mom", "4": "burn_rate"}

You MUST include at least one column in the mapping. Only header_row_index and month_column alone is invalid.`;

    console.log("[matchColumnsWithAI] Sending grid rows 0–" + (rowsToSend.length - 1) + ", cols 0–" + (colsToSend - 1));
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";
    if (!raw) return null;
    // #region agent log
    debugLog({
      location: "sheets.ts:matchColumnsWithAI:raw",
      message: "AI raw response",
      data: { rawFirst600: raw.slice(0, 600) },
      hypothesisId: "H2-H4",
    });
    fetch("http://127.0.0.1:7242/ingest/d791096d-e9b3-45ec-a7c6-17c4fea0a92c", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "sheets.ts:matchColumnsWithAI:raw",
        message: "AI raw response",
        data: { rawFirst600: raw.slice(0, 600) },
        timestamp: Date.now(),
        sessionId: "debug-session",
        hypothesisId: "H2-H4",
      }),
    }).catch(() => {});
    // #endregion
    console.log("[matchColumnsWithAI] AI raw response (first 500 chars):", raw.slice(0, 500));

    let parsed: Record<string, string | number>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const jsonMatch = raw.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[1]);
      else return null;
    }

    console.log("[matchColumnsWithAI] AI raw response keys:", Object.keys(parsed).join(", "));

    let headerRowIndex: number = 0;
    const rawHeaderRow = parsed.header_row_index;
    const hri = typeof rawHeaderRow === "number" ? rawHeaderRow : parseInt(String(rawHeaderRow ?? "0"), 10);
    if (!isNaN(hri) && hri >= 0 && hri < rowsToSend.length) {
      headerRowIndex = hri;
    }
    const headerRow = grid[headerRowIndex] ?? [];
    const maxCol = colsToSend;

    const columnMap = new Map<number, KpiKey>();
    let monthColumnIndex: number | null = null;

    // If model put mapping inside a nested object (e.g. "columns" or "mapping"), use that
    let toIterate: Record<string, string | number> = parsed;
    if (typeof parsed.columns === "object" && parsed.columns !== null) {
      toIterate = parsed.columns as Record<string, string | number>;
    } else if (typeof parsed.mapping === "object" && parsed.mapping !== null) {
      toIterate = parsed.mapping as Record<string, string | number>;
    }
    // #region agent log
    debugLog({
      location: "sheets.ts:matchColumnsWithAI:parsed",
      message: "parsed and toIterate keys",
      data: { parsedKeys: Object.keys(parsed), toIterateKeys: Object.keys(toIterate), headerRowIndex },
      hypothesisId: "H2",
    });
    fetch("http://127.0.0.1:7242/ingest/d791096d-e9b3-45ec-a7c6-17c4fea0a92c", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "sheets.ts:matchColumnsWithAI:parsed",
        message: "parsed and toIterate keys",
        data: { parsedKeys: Object.keys(parsed), toIterateKeys: Object.keys(toIterate), headerRowIndex },
        timestamp: Date.now(),
        sessionId: "debug-session",
        hypothesisId: "H2",
      }),
    }).catch(() => {});
    // #endregion

    for (const [key, value] of Object.entries(toIterate)) {
      if (key === "month_column" || key === "header_row_index") {
        if (key === "month_column") {
          const n = typeof value === "number" ? value : parseInt(String(value), 10);
          if (!isNaN(n) && n >= 0 && n < maxCol) monthColumnIndex = n;
        }
        continue;
      }
      const index = parseInt(key, 10);
      const canonical = normalizeAIFieldToKpiKey(String(value));
      if (isNaN(index) || index < 0 || index >= maxCol) {
        // #region agent log
        debugLog({
          location: "sheets.ts:matchColumnsWithAI:skipIndex",
          message: "skipped: invalid index",
          data: { key, value, index, maxCol },
          hypothesisId: "H5",
        });
        fetch("http://127.0.0.1:7242/ingest/d791096d-e9b3-45ec-a7c6-17c4fea0a92c", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "sheets.ts:matchColumnsWithAI:skipIndex",
            message: "skipped: invalid index",
            data: { key, value, index, maxCol },
            timestamp: Date.now(),
            sessionId: "debug-session",
            hypothesisId: "H5",
          }),
        }).catch(() => {});
        // #endregion
        continue;
      }
      if (!canonical) {
        // #region agent log
        debugLog({
          location: "sheets.ts:matchColumnsWithAI:skipCanonical",
          message: "skipped: normalizeAIFieldToKpiKey returned null",
          data: { key, value, index },
          hypothesisId: "H5",
        });
        fetch("http://127.0.0.1:7242/ingest/d791096d-e9b3-45ec-a7c6-17c4fea0a92c", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "sheets.ts:matchColumnsWithAI:skipCanonical",
            message: "skipped: normalizeAIFieldToKpiKey returned null",
            data: { key, value, index },
            timestamp: Date.now(),
            sessionId: "debug-session",
            hypothesisId: "H5",
          }),
        }).catch(() => {});
        // #endregion
        continue;
      }
      columnMap.set(index, canonical);
      console.log(`[matchColumnsWithAI] row ${headerRowIndex} col ${index} "${String(headerRow[index] ?? "").trim()}" -> ${canonical}`);
    }

    // month_column might be at top level if mapping was nested
    if (monthColumnIndex === null && typeof parsed.month_column === "number") {
      const n = parsed.month_column;
      if (n >= 0 && n < maxCol) monthColumnIndex = n;
    } else if (monthColumnIndex === null && typeof parsed.month_column === "string") {
      const n = parseInt(parsed.month_column, 10);
      if (!isNaN(n) && n >= 0 && n < maxCol) monthColumnIndex = n;
    }

    // #region agent log
    debugLog({
      location: "sheets.ts:matchColumnsWithAI:outcome",
      message: "result before return",
      data: { headerRowIndex, columnMapSize: columnMap.size, monthColumnIndex },
      hypothesisId: "H1-H5",
    });
    fetch("http://127.0.0.1:7242/ingest/d791096d-e9b3-45ec-a7c6-17c4fea0a92c", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "sheets.ts:matchColumnsWithAI:outcome",
        message: "result before return",
        data: { columnMapSize: columnMap.size, monthColumnIndex },
        timestamp: Date.now(),
        sessionId: "debug-session",
        hypothesisId: "H1-H5",
      }),
    }).catch(() => {});
    // #endregion
    if (columnMap.size >= 2) {
      console.log(`[matchColumnsWithAI] header_row=${headerRowIndex}, matched ${columnMap.size} columns, month_column=${monthColumnIndex}`);
      return { headerRowIndex, columnMap, monthColumnIndex };
    }
    console.warn("[matchColumnsWithAI] AI returned fewer than 2 columns; parsed keys:", Object.keys(parsed).join(", "));
    return null;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[matchColumnsWithAI] AI matching failed:", msg);
    return null;
  }
}

/**
 * Semantic extraction: AI finds where the metrics are and returns extracted rows directly.
 * No column indices – model understands content and places values in the right KPI fields.
 */
async function extractSheetDataWithAI(grid: SheetRows): Promise<{ parsed: ParsedRow[] } | null> {
  if (!grid.length || !process.env.OPENAI_API_KEY) return null;

  const rowsToSend = grid.slice(0, MAX_GRID_ROWS_CAP);
  const actualMaxCols = Math.max(1, ...rowsToSend.map((r) => (r ?? []).length));
  const colsToSend = Math.min(actualMaxCols, MAX_GRID_COLS_CAP);
  const gridLines = rowsToSend.map((row, rowIdx) => {
    const cells = (row ?? []).slice(0, colsToSend).map((c, colIdx) => `${colIdx}="${String(c ?? "").trim().replace(/"/g, "'")}"`);
    return `row ${rowIdx}: ${cells.join(", ")}`;
  }).join("\n");

  const maxDataRows = Math.max(0, rowsToSend.length - 1);
  const systemPrompt = `You are Valyxo's sheet parser. You receive a grid from a Google Sheet and must find the KPI values (month/period, MRR, ARR, Burn, Cash, Runway, Churn, Customers, etc.) and return them in the specified JSON format. Use only what appears in the grid—do not invent rows or numbers.`;

  const userPrompt = `Here is an excerpt from a Google Sheet (rows are numbered, cells are columnIndex="value"):

${gridLines}

Identify where month/period, MRR, ARR, Burn, Cash, Runway, Churn and Customers are, and for each data row: read the values and fill an object with the keys period_date (YYYY-MM-01), mrr, arr, mrr_growth_mom, burn_rate, cash_balance, runway_months, churn, customers, net_revenue, failed_payment_rate, refund_rate. Use null where there is no value. Return a single JSON object with a "rows" array of such objects—only what actually appears in the sheet, max ${maxDataRows} rows. Percentages as numbers (e.g. 10.5 for 10.5%).`;

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
    if (!raw) return null;

    let data: { rows?: Array<Record<string, unknown>> };
    try {
      data = JSON.parse(raw);
    } catch {
      const jsonMatch = raw.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) data = JSON.parse(jsonMatch[1]);
      else return null;
    }

    const rows = Array.isArray(data.rows) ? data.rows : [];
    const parsed: ParsedRow[] = [];
    const seenPeriods = new Set<string>();
    const maxRows = Math.max(0, rowsToSend.length - 1); // cap: only as many data rows as possible in grid

    for (const row of rows) {
      if (parsed.length >= maxRows) break; // do not return more rows than exist in sheet
      if (!row || typeof row !== "object") continue;
      let periodDate: string | null = null;
      const rawDate = row.period_date ?? row.periodDate;
      if (typeof rawDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        periodDate = rawDate;
      } else if (rawDate != null) {
        periodDate = parseMonthToPeriodDate(String(rawDate)) ?? null;
      }
      if (!periodDate || seenPeriods.has(periodDate)) continue; // one row per period, no duplicates
      seenPeriods.add(periodDate);

      const values: Record<string, number | null> = {};
      for (const key of KPI_KEYS) {
        const v = row[key];
        if (v === null || v === undefined || v === "") {
          values[key] = null;
        } else if (typeof v === "number" && !Number.isNaN(v)) {
          values[key] = v;
        } else if (typeof v === "string") {
          const num = parseNumber(v, key === "churn" || key === "mrr_growth_mom" || key === "failed_payment_rate" || key === "refund_rate");
          values[key] = num;
        } else {
          values[key] = null;
        }
      }
      if (Object.values(values).some((v) => v !== null)) {
        parsed.push({ periodDate, values });
      }
    }

    if (parsed.length > 0) {
      console.log(`[extractSheetDataWithAI] Extracted ${parsed.length} rows semantically`);
      return { parsed };
    }
    return null;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[extractSheetDataWithAI] Semantic extraction failed:", msg);
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
 */
function parseNumber(value: unknown, isPercent = false): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    if (isPercent && value <= 1 && value > 0) {
      return value * 100;
    }
    return isNaN(value) ? null : value;
  }

  const str = String(value).trim();
  if (!str) return null;

  // Remove currency symbols, spaces
  let cleaned = str
    .replace(/[$€£kr,\s]/g, "")
    .replace(/NOK|USD|EUR/gi, "")
    .trim();

  // Handle percentage
  const hasPercent = cleaned.includes("%");
  if (hasPercent) {
    cleaned = cleaned.replace(/%/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  // Handle comma as decimal separator (European format)
  const hasCommaDecimal = /^\d+,\d+$/.test(cleaned);
  if (hasCommaDecimal) {
    cleaned = cleaned.replace(",", ".");
  } else {
    cleaned = cleaned.replace(/,/g, "");
  }

  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;

  // If it's a percent field and value is <= 1, treat as fraction
  if (isPercent && num <= 1 && num > 0) {
    return num * 100;
  }

  return num;
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
    } else if (kpiKey && knownKpiKeys.includes(kpiKey)) {
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

/**
 * Parse horizontal layout
 * All recognition via LLM: semantic extraction first, then index-based LLM fallback.
 */
async function parseHorizontalLayout(
  rows: SheetRows
): Promise<{ parsed: ParsedRow[]; debug: ParseDebug }> {
  const parsed: Array<{ periodDate: string; values: Record<string, number | null> }> = [];
  let skippedRows = 0;

  let headerRowIndex: number;
  let columnMap: Map<number, KpiKey>;
  let monthColumnIndex: number;

  // All via LLM: find numbers, find information, interpret – no static HEADER_MAP or findBestHeaderRow
  if (rows.length < 2) {
    return {
      parsed: [],
      debug: { detectedLayout: "none", totalRows: rows.length, parsedRows: 0, skippedRows: rows.length },
    };
  }
  const grid = rows.slice(0, MAX_GRID_ROWS_CAP);
  const semanticResult = await extractSheetDataWithAI(grid);
  if (semanticResult && semanticResult.parsed.length > 0) {
    return {
      parsed: semanticResult.parsed,
      debug: {
        detectedLayout: "horizontal",
        totalRows: rows.length,
        parsedRows: semanticResult.parsed.length,
        skippedRows: rows.length - semanticResult.parsed.length,
      },
    };
  }
  // Fallback: LLM returns column indices, we read cells
  const aiResult = await matchColumnsWithAI(grid);
  if (!aiResult || aiResult.columnMap.size < 2) {
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

    for (const [colIndex, kpiKey] of columnMap.entries()) {
      const rawValue = row[parseInt(String(colIndex))];
      const isPercent = kpiKey === "churn" || kpiKey === "mrr_growth_mom" || 
                       kpiKey === "failed_payment_rate" || kpiKey === "refund_rate";
      const parsedValue = parseNumber(rawValue, isPercent);
      values[kpiKey] = parsedValue;
    }

    if (Object.values(values).some(v => v !== null)) {
      parsed.push({ periodDate, values });
    } else {
      skippedRows++;
    }
  }

  return {
    parsed,
    debug: {
      detectedLayout: "horizontal",
      totalRows: rows.length,
      parsedRows: parsed.length,
      skippedRows,
    },
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
  const parsed: Array<{ periodDate: string; values: Record<string, number | null> }> = [];
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

  const kpiLabelMap = new Map<number, KpiKey>();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;

    const normalized = normalizeHeader(String(row[0]));
    const kpiKey = HEADER_MAP[normalized];
    if (kpiKey && kpiKey !== "month") {
      kpiLabelMap.set(i, kpiKey);
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

    for (const [rowIndex, kpiKey] of kpiLabelMap.entries()) {
      const row = rows[rowIndex];
      if (!row) continue;

      const rawValue = row[monthColIndex];
      const isPercent = kpiKey === "churn" || kpiKey === "mrr_growth_mom" ||
                       kpiKey === "failed_payment_rate" || kpiKey === "refund_rate";
      const parsedValue = parseNumber(rawValue, isPercent);
      values[kpiKey] = parsedValue;
    }

    if (Object.values(values).some(v => v !== null)) {
      parsed.push({ periodDate, values });
    } else {
      skippedRows++;
    }
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
 * Parse sheet rows
 * Uses AI for horizontal layout column matching when OPENAI_API_KEY is set.
 */
async function parseSheetRows(rows: SheetRows): Promise<{
  parsed: ParsedRow[];
  debug: ParseDebug;
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
    // No sheets configured - return empty array
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
