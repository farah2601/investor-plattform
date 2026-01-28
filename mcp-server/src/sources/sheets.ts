/**
 * Google Sheets KPI Source for MCP
 * 
 * Fetches and parses Google Sheets data for company KPIs.
 * This is the ONLY place that fetches sheets data - Next.js is just a gateway.
 */

import { supabase } from "../db/supabase";

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
 */
function parseHorizontalLayout(
  rows: SheetRows
): { parsed: ParsedRow[]; debug: ParseDebug } {
  const parsed: Array<{ periodDate: string; values: Record<string, number | null> }> = [];
  let skippedRows = 0;

  const headerInfo = findBestHeaderRow(rows);
  if (!headerInfo) {
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

  const { headerRowIndex, columnMap } = headerInfo;

  // Find month column index
  let monthColumnIndex = -1;
  const headerRow = rows[headerRowIndex];
  for (let i = 0; i < headerRow.length; i++) {
    const normalized = normalizeHeader(String(headerRow[i] || ""));
    if (HEADER_MAP[normalized] === "month") {
      monthColumnIndex = i;
      break;
    }
  }

  if (monthColumnIndex < 0) {
    return {
      parsed: [],
      debug: {
        detectedLayout: "horizontal",
        totalRows: rows.length,
        parsedRows: 0,
        skippedRows: rows.length,
      },
    };
  }

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
 */
function parseSheetRows(rows: SheetRows): {
  parsed: ParsedRow[];
  debug: ParseDebug;
} {
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

  // Try horizontal layout first
  const horizontalResult = parseHorizontalLayout(rows);
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

  // Extract sheet ID from URL
  const sheetIdMatch = company.google_sheets_url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const sheetId = sheetIdMatch ? sheetIdMatch[1] : undefined;

  // Get CSV export URL
  const range: string | null = null;
  const csvUrl = getSheetsCsvUrl(company.google_sheets_url, company.google_sheets_tab, range);

  console.log(`[loadSheetsKpisForCompany] Loading Google Sheet for company ${companyId}:`, {
    hasUrl: true,
    tabProvided: !!company.google_sheets_tab,
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

  // Parse sheet rows
  const { parsed, debug } = parseSheetRows(rows);

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
      tab: company.google_sheets_tab || undefined,
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
