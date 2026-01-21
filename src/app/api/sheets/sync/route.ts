import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fetchGoogleSheetsData, type KPISnapshot } from "../../../../../lib/agent/data/fetchGoogleSheetsData";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isValidUUID(str: string | null | undefined): boolean {
  if (!str) return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Convert Google Sheets URL to CSV export URL
 * Supports both numeric gid and tab name
 */
function getSheetsCsvUrl(sheetUrl: string, tabName?: string | null): string {
  // Extract spreadsheet ID from URL
  // Format: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit...
  const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    throw new Error("Invalid Google Sheets URL format");
  }
  const spreadsheetId = match[1];

  // Build CSV export URL
  let csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
  
  if (tabName && tabName.trim()) {
    const trimmedTab = tabName.trim();
    // Check if tabName is numeric (gid)
    const isNumeric = /^\d+$/.test(trimmedTab);
    
    if (isNumeric) {
      // Use gid parameter for numeric tab IDs
      csvUrl += `&gid=${trimmedTab}`;
    } else {
      // Use sheet parameter for tab names (e.g., "KPI")
      csvUrl += `&sheet=${encodeURIComponent(trimmedTab)}`;
    }
  }

  return csvUrl;
}

/**
 * Parse CSV text into rows
 */
function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  const lines = csvText.split("\n");
  
  for (const line of lines) {
    if (!line.trim()) continue;
    // Simple CSV parsing (handles quoted fields)
    const row: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        row.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    rows.push(row);
  }
  
  return rows;
}

/**
 * Normalize key for matching (lowercase, trim, remove special chars)
 */
function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .trim()
    .replace(/[:\-()]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Map column name to KPI field
 */
function mapKeyToKPIField(key: string): string | null {
  const normalized = normalizeKey(key);
  
  // PRIORITY: Check growth_percent FIRST (before mrr) to avoid "MRR Growth %" mapping to mrr
  if (normalized === "mrr growth %" || normalized === "mrr growth" ||
      normalized.includes("growth %") || normalized.includes("growth%") ||
      normalized.includes("revenue growth") || normalized.includes("growth rate")) {
    return "growth_percent";
  }
  
  // Exact matches for specified column names (after normalization: "arr usd", "burn usd", etc.)
  if (normalized === "arr usd" || normalized === "arr" || normalized.startsWith("arr ")) return "arr";
  if (normalized === "mrr usd" || normalized === "mrr" || normalized.startsWith("mrr ")) return "mrr";
  if (normalized === "burn usd" || normalized === "burn" || normalized.startsWith("burn ")) return "burn_rate";
  if (normalized === "runway months" || normalized === "runway" || normalized.startsWith("runway ")) return "runway_months";
  if (normalized === "churn %" || normalized === "churn" || normalized.includes("churn %")) return "churn";
  if (normalized === "lead velocity" || normalized.includes("lead velocity")) return "lead_velocity";
  if (normalized.includes("cash balance") || normalized === "cash") return "cash_balance";
  if (normalized === "customers" || normalized === "customer count") return "customers";
  
  // Synonyms (check after specific patterns)
  if (normalized.includes("annual recurring revenue")) return "arr";
  if (normalized.includes("monthly recurring revenue")) return "mrr";
  if (normalized.includes("monthly burn") || normalized.includes("burn rate")) return "burn_rate";
  if (normalized.includes("customer churn") || normalized.includes("churn rate")) return "churn";
  
  return null;
}

/**
 * Parse number from string, handling commas, percentages, currency symbols, and date-formatted numbers
 */
function parseNumber(value: string, fieldName: string): number | null {
  if (!value || typeof value !== "string") return null;
  
  // Remove currency symbols, spaces, and other text
  let cleaned = value
    .replace(/[kr$€£,\s]/g, "")
    .replace(/NOK|USD|EUR/gi, "")
    .trim();
  
  // CRITICAL FIX: Handle date-formatted numbers (e.g., "11.01.2026" should be "11.1")
  // Google Sheets sometimes formats percentages as dates (DD.MM.YYYY or MM.DD.YYYY)
  // When "11.1%" is formatted as a date, it becomes "11.01.2026" (DD.MM.YYYY format)
  // We extract: first part (11) as integer, first digit of second part (0) as decimal
  const datePattern = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
  const dateMatch = cleaned.match(datePattern);
  if (dateMatch) {
    const firstPart = parseFloat(dateMatch[1]);
    const secondPart = parseFloat(dateMatch[2]);
    // Extract decimal: if secondPart is "01", we want "0", if "10" we want "1", if "15" we want "1"
    // Strategy: take first digit of secondPart (or secondPart itself if < 10)
    const decimalDigit = secondPart < 10 ? secondPart : Math.floor(secondPart / 10);
    // Use firstPart as integer, decimalDigit as decimal
    cleaned = `${firstPart}.${decimalDigit}`;
  }
  
  // Handle percentage
  const isPercent = cleaned.includes("%");
  if (isPercent) {
    cleaned = cleaned.replace(/%/g, "");
    const num = parseFloat(cleaned);
    if (isNaN(num)) return null;
    // For churn, percentage is already in decimal (e.g., 4.5% = 4.5, not 0.045)
    // For growth, same (e.g., 12% = 12)
    return num;
  }
  
  // Replace comma with dot for decimal
  cleaned = cleaned.replace(/,/g, ".");
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse month name to period_date (first day of month)
 * Supports: Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec
 * And Norwegian: Jan, Feb, Mar, Apr, Mai, Jun, Jul, Aug, Sep, Okt, Nov, Des
 * Returns YYYY-MM-01 format or null if invalid
 * @param monthStr - Month name (e.g., "Jan", "February")
 * @param year - Optional year (if not provided, intelligently determines year)
 */
function parseMonthToPeriodDate(monthStr: string, year?: number | null): string | null {
  if (!monthStr || typeof monthStr !== "string") return null;
  
  const normalized = monthStr.trim().toLowerCase();
  
  // Month name to index mapping (0-11)
  const monthMap: { [key: string]: number } = {
    // English
    "jan": 0, "january": 0,
    "feb": 1, "february": 1,
    "mar": 2, "march": 2,
    "apr": 3, "april": 3,
    "may": 4,
    "jun": 5, "june": 5,
    "jul": 6, "july": 6,
    "aug": 7, "august": 7,
    "sep": 8, "september": 8, "sept": 8,
    "oct": 9, "october": 9,
    "nov": 10, "november": 10,
    "dec": 11, "december": 11,
    // Norwegian
    "mai": 4,
    "okt": 9,
    "des": 11,
  };
  
  const monthIndex = monthMap[normalized];
  if (monthIndex === undefined) return null;
  
  // Intelligently determine year if not provided
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();
  
  let targetYear: number;
  if (year && year > 2000 && year < 2100) {
    targetYear = year;
  } else {
    // If no year provided, assume current year for most months
    // If we're early in the year (Jan-Jun) and the month is later (Jul-Dec),
    // it might be from previous year, but for KPI data, we typically use current year
    // unless explicitly specified
    targetYear = currentYear;
  }
  
  const date = new Date(Date.UTC(targetYear, monthIndex, 1));
  
  // Format as YYYY-MM-01
  const finalYear = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${finalYear}-${month}-01`;
}

/**
 * Find the latest row with actual KPI data (iterate backwards)
 * Only checks columns that are in columnMap (KPI columns)
 * Used for updating companies table with latest snapshot
 */
function findLatestRow(rows: string[][], headerRowIndex: number, columnMap: { [key: number]: string }): string[] | null {
  if (rows.length <= headerRowIndex + 1) return null;
  
  const kpiColumnIndices = Object.keys(columnMap).map(k => parseInt(k));
  if (kpiColumnIndices.length === 0) return null;
  
  // Iterate backwards from the end
  for (let i = rows.length - 1; i > headerRowIndex; i--) {
    const row = rows[i];
    // Check if row has at least one numeric value in KPI columns only
    for (const colIndex of kpiColumnIndices) {
      const value = row[colIndex]?.trim();
      if (value && !isNaN(parseFloat(value.replace(/,/g, "").replace(/%/g, "")))) {
        return row;
      }
    }
  }
  
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { companyId } = body;

    if (!companyId) {
      return NextResponse.json(
        { error: "Missing companyId" },
        { status: 400 }
      );
    }

    if (!isValidUUID(companyId)) {
      return NextResponse.json(
        { error: "Invalid companyId format (must be UUID)" },
        { status: 400 }
      );
    }

    // Fetch company to get Google Sheets config
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id, google_sheets_url, google_sheets_tab")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError) {
      console.error("[api/sheets/sync] Database error:", companyError);
      return NextResponse.json(
        { error: "Failed to fetch company", details: companyError.message },
        { status: 500 }
      );
    }

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    if (!company.google_sheets_url) {
      return NextResponse.json(
        { error: "Google Sheets URL not configured for this company" },
        { status: 400 }
      );
    }

    // Use shared function to fetch and parse Google Sheets data
    let snapshots;
    try {
      snapshots = await fetchGoogleSheetsData(company.google_sheets_url, company.google_sheets_tab);
    } catch (error: any) {
      console.error("[api/sheets/sync] Error fetching Google Sheets data:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch Google Sheets data" },
        { status: 500 }
      );
    }

    if (snapshots.length === 0) {
      return NextResponse.json(
        { error: "No valid KPI snapshots found in any Google Sheets" },
        { status: 400 }
      );
    }

    // Find latest snapshot (by period_date) for updating companies table
    const latestSnapshot = snapshots.reduce((latest: KPISnapshot, current: KPISnapshot) => {
      return current.period_date > latest.period_date ? current : latest;
    }, snapshots[0]);

    console.log("[api/sheets/sync] Latest snapshot period:", latestSnapshot.period_date);
    console.log("[api/sheets/sync] Latest snapshot values:", {
      mrr: latestSnapshot.mrr,
      arr: latestSnapshot.arr,
      burn_rate: latestSnapshot.burn_rate,
      churn: latestSnapshot.churn,
      growth_percent: latestSnapshot.growth_percent,
      runway_months: latestSnapshot.runway_months,
      lead_velocity: latestSnapshot.lead_velocity,
    });

    // Build update payload for companies table from latest snapshot
    // CRITICAL: Only update fields that have actual values (not null)
    // Do NOT overwrite with null - only update fields we have data for
    const updatePayload: any = {};
    if (latestSnapshot.mrr !== null && latestSnapshot.mrr !== undefined) {
      updatePayload.mrr = Math.round(latestSnapshot.mrr);
    }
    if (latestSnapshot.arr !== null && latestSnapshot.arr !== undefined) {
      updatePayload.arr = Math.round(latestSnapshot.arr);
    }
    if (latestSnapshot.burn_rate !== null && latestSnapshot.burn_rate !== undefined) {
      updatePayload.burn_rate = Math.round(latestSnapshot.burn_rate);
    }
    if (latestSnapshot.churn !== null && latestSnapshot.churn !== undefined) {
      updatePayload.churn = latestSnapshot.churn;
    }
    if (latestSnapshot.growth_percent !== null && latestSnapshot.growth_percent !== undefined) {
      updatePayload.growth_percent = latestSnapshot.growth_percent;
    }
    if (latestSnapshot.runway_months !== null && latestSnapshot.runway_months !== undefined) {
      updatePayload.runway_months = latestSnapshot.runway_months;
    }
    if (latestSnapshot.lead_velocity !== null && latestSnapshot.lead_velocity !== undefined) {
      updatePayload.lead_velocity = Math.round(latestSnapshot.lead_velocity);
    }

    console.log("[api/sheets/sync] Update payload for companies table:", updatePayload);

    // UPSERT snapshots into kpi_snapshots table
    const now = new Date().toISOString();
    let upsertedCount = 0;
    
    try {
      // Prepare snapshots for upsert (add company_id, source, and kpis JSONB object)
      // CRITICAL: kpis column is NOT NULL, so we must always provide it
      const snapshotsToUpsert = snapshots.map((snapshot: KPISnapshot) => {
        // Build kpis JSONB object with all KPI values
        const kpisObject: any = {
          source: "google-sheets",
        };
        
        // Only include non-null values in kpis object
        if (snapshot.arr !== null) kpisObject.arr = snapshot.arr;
        if (snapshot.mrr !== null) kpisObject.mrr = snapshot.mrr;
        if (snapshot.burn_rate !== null) kpisObject.burn_rate = snapshot.burn_rate;
        if (snapshot.churn !== null) kpisObject.churn = snapshot.churn;
        if (snapshot.growth_percent !== null) kpisObject.growth_percent = snapshot.growth_percent;
        if (snapshot.runway_months !== null) kpisObject.runway_months = snapshot.runway_months;
        if (snapshot.lead_velocity !== null) kpisObject.lead_velocity = snapshot.lead_velocity;
        if (snapshot.cash_balance !== null) kpisObject.cash_balance = snapshot.cash_balance;
        if (snapshot.customers !== null) kpisObject.customers = snapshot.customers;
        
        // CRITICAL: Only upsert fields that exist in the schema
        // Schema has: id, company_id, period_date, kpis (jsonb NOT NULL), effective_date, created_at
        // Do NOT include numeric columns (mrr, arr, etc.) as they don't exist
        return {
          company_id: companyId,
          period_date: snapshot.period_date,
          effective_date: new Date(snapshot.period_date).toISOString(),
          // CRITICAL: Always include kpis JSONB object (required NOT NULL column)
          kpis: kpisObject,
        };
      });

      // Upsert with conflict resolution on unique index (company_id, period_date)
      // Use the index name or column names
      const { data: upsertedData, error: upsertError } = await supabaseAdmin
        .from("kpi_snapshots")
        .upsert(snapshotsToUpsert, {
          onConflict: "company_id,period_date",
        })
        .select();

      if (upsertError) {
        console.error("[api/sheets/sync] Failed to upsert snapshots:", upsertError);
        
        // Check if it's a schema cache issue
        if (upsertError.message?.includes("schema cache") || 
            upsertError.message?.includes("does not exist") ||
            upsertError.code === "PGRST204" ||
            upsertError.code === "42703") {
          return NextResponse.json(
            {
              ok: false,
              error: "Database schema not updated. Please run migration and reload PostgREST schema.",
              details: upsertError.message,
              code: upsertError.code,
              hint: "Run the migration in Supabase SQL Editor, then execute: SELECT pg_notify('pgrst', 'reload schema');",
            },
            { status: 500 }
          );
        }
        
        // Check if it's a NOT NULL constraint violation (kpis column)
        if (upsertError.message?.includes("null value in column") && 
            upsertError.message?.includes("kpis")) {
          return NextResponse.json(
            {
              ok: false,
              error: "Failed to save KPI snapshots",
              details: `kpis column is required but was not provided. ${upsertError.message}`,
              code: upsertError.code,
              hint: "Ensure kpis JSONB object is always included in upsert payload.",
            },
            { status: 500 }
          );
        }
        
        return NextResponse.json(
          {
            ok: false,
            error: "Failed to save KPI snapshots",
            details: upsertError.message || "Unknown database error",
            code: upsertError.code || "UNKNOWN",
          },
          { status: 500 }
        );
      }

      upsertedCount = upsertedData?.length || snapshots.length;
      console.log("[api/sheets/sync] ✅ Upserted", upsertedCount, "snapshots into kpi_snapshots");
    } catch (snapshotErr) {
      console.error("[api/sheets/sync] Exception upserting snapshots:", snapshotErr);
      return NextResponse.json(
        {
          error: "Failed to save KPI snapshots",
          details: snapshotErr instanceof Error ? snapshotErr.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    // Update companies table with latest snapshot values
    const finalUpdatePayload: any = {
      ...updatePayload,
      google_sheets_last_sync_at: now,
      google_sheets_last_sync_by: "google-sheets",
    };

    let updatedCompany;
    let updateError;
    
    try {
      const result = await supabaseAdmin
        .from("companies")
        .update(finalUpdatePayload)
        .eq("id", companyId)
        .select()
        .maybeSingle();
      
      updatedCompany = result.data;
      updateError = result.error;
    } catch (err: any) {
      updateError = err;
      console.error("[api/sheets/sync] Update exception:", err);
    }

    if (updateError) {
      console.error("[api/sheets/sync] Update error:", updateError);
      const errorMessage = updateError.message || String(updateError);
      
      // Handle type mismatch for decimal KPI fields
      if (errorMessage.includes("invalid input syntax for type") && 
          (errorMessage.includes("bigint") || errorMessage.includes("integer"))) {
        console.log("[api/sheets/sync] Type mismatch detected - attempting to cast decimal fields to string");
        
        const decimalFields = ["growth_percent", "churn", "runway_months"];
        for (const field of decimalFields) {
          if (finalUpdatePayload[field] !== undefined && typeof finalUpdatePayload[field] === "number") {
            if (finalUpdatePayload[field] % 1 !== 0) {
              console.log(`[api/sheets/sync] Casting ${field} to string: ${finalUpdatePayload[field]}`);
              finalUpdatePayload[field] = finalUpdatePayload[field].toString();
            }
          }
        }
        
        const retryResult = await supabaseAdmin
          .from("companies")
          .update(finalUpdatePayload)
          .eq("id", companyId)
          .select()
          .maybeSingle();
        
        if (retryResult.error) {
          return NextResponse.json(
            { 
              error: "Failed to update company KPI data", 
              details: `Type mismatch error: ${retryResult.error.message || errorMessage}` 
            },
            { status: 500 }
          );
        }
        
        updatedCompany = retryResult.data;
      } else {
        return NextResponse.json(
          { 
            error: "Failed to update company KPI data", 
            details: errorMessage 
          },
          { status: 500 }
        );
      }
    }

    if (!updatedCompany) {
      return NextResponse.json(
        { 
          error: "Failed to update company KPI data", 
          details: "Update succeeded but no company data returned" 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        companyId,
        inserted: upsertedCount,
        updated: upsertedCount,
        latestPeriod: latestSnapshot.period_date,
        latestPayload: updatePayload,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.error("[api/sheets/sync] Unexpected error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

