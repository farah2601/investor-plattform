// mcp-server/src/agent/tools/run_sheets_kpi_refresh.ts
import { z } from "zod";
import { supabase } from "../../db/supabase";
import { env } from "../../env";

const InputSchema = z.object({
  companyId: z.string().uuid(),
});

type CompanyRow = {
  id: string;
  google_sheets_url: string | null;
  google_sheets_tab: string | null;
};

/**
 * Extract spreadsheet ID from Google Sheets URL
 * Supports formats:
 * - https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
 * - https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=0
 */
function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Fetch data from Google Sheets API
 * Supports public sheets or service account authentication
 */
async function fetchSheetData(
  spreadsheetId: string,
  tabName: string
): Promise<string[][]> {
  const range = `${tabName}!A1:Z100`; // Adjust range as needed
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;

  // Try public API first (if sheet is public)
  let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  
  if (apiKey) {
    url += `?key=${apiKey}`;
  }

  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Google Sheets API error: ${response.status} ${response.statusText}. ${errorText}`
    );
  }

  const data = await response.json();
  return data.values || [];
}

/**
 * Parse a number value robustly
 * Handles:
 * - "45" -> 45
 * - "45k" -> 45000
 * - "45,000" -> 45000
 * - "2%" -> 0.02 (for churn and growth_percent)
 */
function parseNumber(value: string, isPercent: boolean = false): number | null {
  if (!value || typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  // Remove commas
  let cleaned = trimmed.replace(/,/g, "");

  // Handle percentage
  if (isPercent && cleaned.endsWith("%")) {
    cleaned = cleaned.slice(0, -1);
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num / 100;
  }

  // Handle k/K suffix (thousands)
  if (cleaned.toLowerCase().endsWith("k")) {
    const num = parseFloat(cleaned.slice(0, -1));
    return isNaN(num) ? null : num * 1000;
  }

  // Handle m/M suffix (millions)
  if (cleaned.toLowerCase().endsWith("m")) {
    const num = parseFloat(cleaned.slice(0, -1));
    return isNaN(num) ? null : num * 1000000;
  }

  // Regular number
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Find column index by header name (case-insensitive)
 */
function findColumnIndex(headers: string[], headerName: string): number | null {
  const lowerName = headerName.toLowerCase().trim();
  for (let i = 0; i < headers.length; i++) {
    if (headers[i]?.toLowerCase().trim() === lowerName) {
      return i;
    }
  }
  return null;
}

export async function runSheetsKpiRefresh(input: unknown) {
  const parsed = InputSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: "Invalid input: missing or invalid companyId" };
  }

  const { companyId } = parsed.data;

  // 1) Fetch company from DB
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, google_sheets_url, google_sheets_tab")
    .eq("id", companyId)
    .single<CompanyRow>();

  if (companyError) {
    return { ok: false, error: `Database error: ${companyError.message}` };
  }

  if (!company) {
    return { ok: false, error: "Company not found" };
  }

  // 2) Check if google_sheets_url exists
  if (!company.google_sheets_url) {
    return { ok: false, error: "Missing google_sheets_url" };
  }

  // 3) Extract spreadsheet ID
  const spreadsheetId = extractSpreadsheetId(company.google_sheets_url);
  if (!spreadsheetId) {
    return { ok: false, error: "Invalid Google Sheets URL format" };
  }

  // 4) Fetch data from Google Sheet
  const tabName = company.google_sheets_tab || "KPI";
  let sheetData: string[][];
  try {
    sheetData = await fetchSheetData(spreadsheetId, tabName);
  } catch (err: any) {
    return {
      ok: false,
      error: `Failed to fetch Google Sheet: ${err?.message || String(err)}`,
    };
  }

  if (sheetData.length < 2) {
    return {
      ok: false,
      error: "Sheet must have at least 2 rows (headers + values)",
    };
  }

  // 5) Parse headers and values
  const headers = sheetData[0] || [];
  const values = sheetData[1] || [];

  // 6) Find column indices
  const mrrIdx = findColumnIndex(headers, "mrr");
  const arrIdx = findColumnIndex(headers, "arr");
  const burnRateIdx = findColumnIndex(headers, "burn_rate");
  const runwayMonthsIdx = findColumnIndex(headers, "runway_months");
  const churnIdx = findColumnIndex(headers, "churn");
  const growthPercentIdx = findColumnIndex(headers, "growth_percent");

  // 7) Extract and parse values
  const kpis = {
    mrr: mrrIdx !== null ? parseNumber(values[mrrIdx] || "") : null,
    arr: arrIdx !== null ? parseNumber(values[arrIdx] || "") : null,
    burn_rate:
      burnRateIdx !== null ? parseNumber(values[burnRateIdx] || "") : null,
    runway_months:
      runwayMonthsIdx !== null
        ? parseNumber(values[runwayMonthsIdx] || "")
        : null,
    churn: churnIdx !== null ? parseNumber(values[churnIdx] || "", true) : null,
    growth_percent:
      growthPercentIdx !== null
        ? parseNumber(values[growthPercentIdx] || "", true)
        : null,
  };

  // 8) Update companies table
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("companies")
    .update({
      ...kpis,
      google_sheets_last_sync_at: now,
      google_sheets_last_sync_by: "google-sheets",
      last_agent_run_at: now,
      last_agent_run_by: "google-sheets",
    })
    .eq("id", companyId);

  if (updateError) {
    console.error("[runSheetsKpiRefresh] DB update error:", updateError);
    return {
      ok: false,
      error: `Database update failed: ${updateError.message}`,
    };
  }

  return {
    ok: true,
    companyId,
    updated: kpis,
    google_sheets_last_sync_at: now,
    google_sheets_last_sync_by: "google-sheets",
  };
}

/*
TEST COMMANDS:

# Test run_sheets_kpi_refresh
curl -X POST http://localhost:3001/tools/run_sheets_kpi_refresh \
  -H "Content-Type: application/json" \
  -H "x-mcp-secret: YOUR_SECRET" \
  -d '{"companyId": "YOUR_COMPANY_ID"}'

# Test run_all
curl -X POST http://localhost:3001/tools/run_all \
  -H "Content-Type: application/json" \
  -H "x-mcp-secret: YOUR_SECRET" \
  -d '{"companyId": "YOUR_COMPANY_ID"}'
*/

