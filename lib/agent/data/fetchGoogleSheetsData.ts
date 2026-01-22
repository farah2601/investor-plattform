/**
 * Shared Google Sheets data fetching and parsing logic
 * Used by both API route and MCP agent
 */

/**
 * Convert Google Sheets URL to CSV export URL
 * Supports both numeric gid and tab name
 */
export function getSheetsCsvUrl(sheetUrl: string, tabName?: string | null): string {
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
export function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        currentCell += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      // End of cell
      currentRow.push(currentCell);
      currentCell = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      // End of row
      if (char === "\r" && nextChar === "\n") {
        i++; // Skip \n in \r\n
      }
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += char;
    }
  }

  // Add remaining cell and row
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((cell) => cell.trim()));
}

/**
 * Normalize key for comparison (remove special chars, lowercase)
 */
function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Map header key to KPI field name
 */
function mapKeyToKPIField(key: string): string | null {
  const normalized = normalizeKey(key);

  // MRR
  if (normalized === "mrr" || normalized === "monthlyrecurringrevenue") {
    return "mrr";
  }

  // ARR
  if (normalized === "arr" || normalized === "annualrecurringrevenue") {
    return "arr";
  }

  // Burn Rate
  if (
    normalized === "burnrate" ||
    normalized === "burn" ||
    normalized === "monthlyburn"
  ) {
    return "burn_rate";
  }

  // Churn
  if (normalized === "churn" || normalized === "churnrate") {
    return "churn";
  }

  // Growth
  if (
    normalized === "growth" ||
    normalized === "growthrate" ||
    normalized === "growthpercent"
  ) {
    return "growth_percent";
  }

  // Runway
  if (normalized === "runway" || normalized === "runwaymonths") {
    return "runway_months";
  }

  // Lead Velocity
  if (
    normalized === "leadvelocity" ||
    normalized === "leads" ||
    normalized === "newleads"
  ) {
    return "lead_velocity";
  }

  // Cash Balance
  if (
    normalized === "cash" ||
    normalized === "cashbalance" ||
    normalized === "balance"
  ) {
    return "cash_balance";
  }

  // Customers
  if (
    normalized === "customers" ||
    normalized === "activeusers" ||
    normalized === "users"
  ) {
    return "customers";
  }

  return null;
}

/**
 * AI-based column matching using OpenAI
 * Returns a mapping of column index to KPI field name
 * Falls back to existing matching if AI is unavailable or fails
 */
async function matchColumnsWithAI(
  headerColumns: string[]
): Promise<{ [key: number]: string } | null> {
  // Check if OpenAI is available
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log("[matchColumnsWithAI] OPENAI_API_KEY not found, skipping AI matching");
    return null; // No API key, fallback to regular matching
  }

  console.log("[matchColumnsWithAI] Attempting AI-based column matching for", headerColumns.length, "columns");

  try {
    // Dynamically import OpenAI (works in both Next.js and Node.js)
    let OpenAI: any;
    try {
      OpenAI = (await import("openai")).default;
    } catch {
      // OpenAI not available in this environment
      return null;
    }

    const openai = new OpenAI({ apiKey });

    // Available KPI fields
    const kpiFields = [
      "mrr",
      "arr",
      "burn_rate",
      "churn",
      "growth_percent",
      "runway_months",
      "lead_velocity",
      "cash_balance",
      "customers",
    ];

    // Build prompt
    const prompt = `You are a data mapping assistant. Match the following column headers from a Google Sheet to KPI field names.

Available KPI fields:
- mrr (Monthly Recurring Revenue)
- arr (Annual Recurring Revenue)
- burn_rate (Monthly Burn Rate)
- churn (Churn Rate)
- growth_percent (Growth Percentage)
- runway_months (Runway in Months)
- lead_velocity (Lead Velocity)
- cash_balance (Cash Balance)
- customers (Number of Customers)

Column headers to match:
${headerColumns.map((col, idx) => `${idx}: "${col}"`).join("\n")}

Return a JSON object mapping column index (as string) to KPI field name. Only include matches you're confident about. Skip columns that are "Month", "Year", "Måned", "År", or other date-related columns. If a column doesn't match any KPI field, don't include it.

Example response:
{
  "0": "mrr",
  "2": "burn_rate",
  "4": "customers"
}

Response (JSON only, no explanation):`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";
    if (!raw) return null;

    // Parse JSON response
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = raw.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        return null;
      }
    }

    // Validate and build mapping
    const columnMap: { [key: number]: string } = {};
    for (const [indexStr, fieldName] of Object.entries(parsed)) {
      const index = parseInt(indexStr);
      if (isNaN(index) || index < 0 || index >= headerColumns.length) {
        console.warn(`[matchColumnsWithAI] Invalid column index from AI: ${indexStr}`);
        continue;
      }
      
      const field = String(fieldName).trim();
      if (kpiFields.includes(field)) {
        columnMap[index] = field;
        console.log(`[matchColumnsWithAI] AI matched column ${index} "${headerColumns[index]}" -> ${field}`);
      } else {
        console.warn(`[matchColumnsWithAI] AI returned invalid field name: "${field}" for column ${index}`);
      }
    }

    const matchCount = Object.keys(columnMap).length;
    if (matchCount > 0) {
      console.log(`[matchColumnsWithAI] Successfully matched ${matchCount} columns using AI`);
      return columnMap;
    } else {
      console.warn(`[matchColumnsWithAI] AI returned no valid matches`);
      return null;
    }
  } catch (error: any) {
    console.warn("[matchColumnsWithAI] AI matching failed, using fallback:", error.message);
    return null; // Fallback to regular matching
  }
}

/**
 * Parse month string to period_date (YYYY-MM-DD)
 */
function parseMonthToPeriodDate(monthStr: string, year?: number | null): string | null {
  if (!monthStr) return null;

  const trimmed = monthStr.trim();
  if (!trimmed) return null;

  // Try to parse as "YYYY-MM" or "YYYY-MM-DD"
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(trimmed)) {
    if (trimmed.length === 7) {
      return `${trimmed}-01`;
    }
    return trimmed;
  }

  // Try to parse month name (e.g., "January", "Jan", "Januar", "Jan 2024")
  const monthNames = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
    "januar", "februar", "mars", "april", "mai", "juni",
    "juli", "august", "september", "oktober", "november", "desember"
  ];

  const parts = trimmed.toLowerCase().split(/\s+/);
  let monthIndex: number | null = null;
  let yearFromString: number | null = null;

  for (const part of parts) {
    // Check if it's a month name
    const idx = monthNames.findIndex((m) => m.startsWith(part));
    if (idx !== -1) {
      monthIndex = (idx % 12) + 1;
    }
    
    // Check if it's a year
    const yearMatch = part.match(/^\d{4}$/);
    if (yearMatch) {
      const parsedYear = parseInt(yearMatch[0]);
      if (parsedYear > 2000 && parsedYear < 2100) {
        yearFromString = parsedYear;
      }
    }
  }

  if (monthIndex !== null) {
    const finalYear = yearFromString ?? year ?? new Date().getFullYear();
    const monthStr = monthIndex.toString().padStart(2, "0");
    return `${finalYear}-${monthStr}-01`;
  }

  return null;
}

/**
 * Parse number from string, handling various formats
 */
function parseNumber(value: string, fieldName: string): number | null {
  if (!value || typeof value !== "string") return null;

  let cleaned = value.trim();
  
  // Remove currency symbols and whitespace
  cleaned = cleaned.replace(/[$€£¥kr\s]/gi, "");
  
  // Remove thousand separators (commas and spaces)
  cleaned = cleaned.replace(/,/g, "");
  
  // Handle percentages
  if (cleaned.endsWith("%")) {
    cleaned = cleaned.slice(0, -1);
    const num = parseFloat(cleaned);
    if (isNaN(num)) return null;
    
    // For churn and growth_percent, keep as decimal (5% = 5, not 0.05)
    if (fieldName === "churn" || fieldName === "growth_percent") {
      return num;
    }
    
    // For other fields, convert to decimal
    return num / 100;
  }
  
  // Handle negative numbers
  const isNegative = cleaned.startsWith("-") || cleaned.startsWith("(");
  if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
    cleaned = cleaned.slice(1, -1);
  }
  
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  
  return isNegative && !cleaned.startsWith("-") ? -num : num;
}

export type KPISnapshot = {
  period_date: string;
  mrr: number | null;
  arr: number | null;
  burn_rate: number | null;
  churn: number | null;
  growth_percent: number | null;
  runway_months: number | null;
  lead_velocity: number | null;
  cash_balance: number | null;
  customers: number | null;
};

/**
 * Fetch and parse Google Sheets data, merging multiple sheets
 * Returns array of KPI snapshots
 */
export async function fetchGoogleSheetsData(
  googleSheetsUrl: string,
  googleSheetsTab?: string | null
): Promise<KPISnapshot[]> {
  // Parse sheets - support both old format (single sheet) and new format (array)
  let sheets: Array<{ url: string; tab: string }> = [];
  
  try {
    const parsed = JSON.parse(googleSheetsUrl);
    if (Array.isArray(parsed)) {
      sheets = parsed;
    } else {
      // Old format: single sheet
      sheets = [{
        url: googleSheetsUrl,
        tab: googleSheetsTab || "",
      }];
    }
  } catch {
    // Not JSON, treat as old format
    sheets = [{
      url: googleSheetsUrl,
      tab: googleSheetsTab || "",
    }];
  }

  if (sheets.length === 0) {
    throw new Error("No Google Sheets configured");
  }

  console.log(`[fetchGoogleSheetsData] Processing ${sheets.length} sheet(s)`);

  // Process all sheets and collect snapshots
  const allSnapshots: KPISnapshot[] = [];

  // Process each sheet
  for (let sheetIndex = 0; sheetIndex < sheets.length; sheetIndex++) {
    const sheet = sheets[sheetIndex];
    console.log(`[fetchGoogleSheetsData] Processing sheet ${sheetIndex + 1}/${sheets.length}: ${sheet.url}`);

    try {
      // Get CSV URL and fetch data
      const csvUrl = getSheetsCsvUrl(sheet.url, sheet.tab);
      console.log("[fetchGoogleSheetsData] Fetching CSV from:", csvUrl);
      
      const csvResponse = await fetch(csvUrl, {
        cache: "no-store",
      });
      
      if (!csvResponse.ok) {
        console.error(`[fetchGoogleSheetsData] Fetch failed for sheet ${sheetIndex + 1}:`, csvResponse.status);
        continue; // Skip this sheet
      }
      
      const csvText = await csvResponse.text();
      console.log(`[fetchGoogleSheetsData] Successfully fetched CSV from sheet ${sheetIndex + 1}, length:`, csvText.length);

      // Parse CSV
      const rows = parseCSV(csvText);
      if (rows.length === 0) {
        console.warn(`[fetchGoogleSheetsData] Sheet ${sheetIndex + 1} is empty, skipping...`);
        continue;
      }

      // Find header row (first row)
      const headerRow = rows[0];
      if (!headerRow || headerRow.length === 0) {
        console.warn(`[fetchGoogleSheetsData] Sheet ${sheetIndex + 1} has no header row, skipping...`);
        continue;
      }

      // Map header columns to KPI fields and find Month/Year columns
      let columnMap: { [key: number]: string } = {};
      let monthColumnIndex: number | null = null;
      let yearColumnIndex: number | null = null;
      
      // Log all header columns for debugging
      console.log(`[fetchGoogleSheetsData] Sheet ${sheetIndex + 1} header columns:`, headerRow.map((col, idx) => `${idx}: "${col}"`).join(", "));
      
      // Try AI-based matching first
      const aiMapping = await matchColumnsWithAI(headerRow);
      if (aiMapping) {
        console.log(`[fetchGoogleSheetsData] AI matched ${Object.keys(aiMapping).length} columns:`, Object.entries(aiMapping).map(([idx, field]) => `col ${idx} -> ${field}`).join(", "));
        columnMap = { ...aiMapping };
      } else {
        console.log(`[fetchGoogleSheetsData] AI matching not available or failed, using fallback matching`);
      }
      
      // Always check for Month/Year columns and do fallback matching
      const unmatchedColumns: string[] = [];
      for (let i = 0; i < headerRow.length; i++) {
        const key = headerRow[i]?.trim();
        if (!key) continue;
        
        // Check if this is the Month column
        const normalizedKey = normalizeKey(key);
        if (normalizedKey === "month" || normalizedKey === "måned") {
          monthColumnIndex = i;
          console.log(`[fetchGoogleSheetsData] Found Month column at index ${i}: "${key}"`);
          continue;
        }
        
        // Check if this is the Year column
        if (normalizedKey === "year" || normalizedKey === "år") {
          yearColumnIndex = i;
          console.log(`[fetchGoogleSheetsData] Found Year column at index ${i}: "${key}"`);
          continue;
        }
        
        // Fallback: Map to KPI field if not already matched by AI
        if (!columnMap[i]) {
          const field = mapKeyToKPIField(key);
          if (field) {
            columnMap[i] = field;
            console.log(`[fetchGoogleSheetsData] Fallback matched column ${i} "${key}" -> ${field}`);
          } else {
            unmatchedColumns.push(`col ${i}: "${key}"`);
          }
        }
      }

      // Log final column mapping
      console.log(`[fetchGoogleSheetsData] Final column mapping:`, Object.entries(columnMap).map(([idx, field]) => `col ${idx} -> ${field}`).join(", "));
      if (unmatchedColumns.length > 0) {
        console.log(`[fetchGoogleSheetsData] Unmatched columns (${unmatchedColumns.length}):`, unmatchedColumns.join(", "));
      }

      if (Object.keys(columnMap).length === 0) {
        console.warn(`[fetchGoogleSheetsData] Sheet ${sheetIndex + 1} has no recognized KPI columns, skipping...`);
        continue;
      }

      // Parse ALL data rows and build snapshots for this sheet
      for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        if (!row || row.length === 0) continue;

        // Parse month and year if columns exist
        let periodDate: string | null = null;
        if (monthColumnIndex !== null && row[monthColumnIndex]) {
          const monthStr = row[monthColumnIndex];
          let year: number | null = null;
          
          // Try to get year from Year column if it exists
          if (yearColumnIndex !== null && row[yearColumnIndex]) {
            const yearStr = row[yearColumnIndex].trim();
            const parsedYear = parseInt(yearStr);
            if (!isNaN(parsedYear) && parsedYear > 2000 && parsedYear < 2100) {
              year = parsedYear;
            }
          }
          
          // Parse month with optional year
          periodDate = parseMonthToPeriodDate(monthStr, year);
        }

        // If no valid period_date, skip this row
        if (!periodDate) {
          continue;
        }

        // Build snapshot payload for this row
        const snapshotPayload: KPISnapshot = {
          period_date: periodDate,
          mrr: null,
          arr: null,
          burn_rate: null,
          churn: null,
          growth_percent: null,
          runway_months: null,
          lead_velocity: null,
          cash_balance: null,
          customers: null,
        };

        // Parse KPI values from this row
        const parsedValues: string[] = [];
        for (const [colIndexStr, fieldName] of Object.entries(columnMap)) {
          const colIndex = parseInt(colIndexStr);
          const rawValue = row[colIndex]?.trim();
          
          if (!rawValue) {
            parsedValues.push(`${fieldName}: (empty)`);
            continue;
          }
          
          parsedValues.push(`${fieldName}: "${rawValue}"`);
          
          // Special handling for runway_months: handle cases where cell has multiple numbers (e.g., "10.4 4.0")
          if (fieldName === "runway_months") {
            const parts = rawValue.split(/\s+/);
            if (parts.length > 1) {
              // Take the first number
              const firstPart = parseNumber(parts[0], fieldName);
              if (firstPart !== null) {
                snapshotPayload.runway_months = firstPart;
                continue;
              }
            }
          }
          
          const parsedValue = parseNumber(rawValue, fieldName);
          if (parsedValue !== null) {
            // Map field names to snapshot payload
            if (fieldName === "mrr") snapshotPayload.mrr = parsedValue;
            else if (fieldName === "arr") snapshotPayload.arr = parsedValue;
            else if (fieldName === "burn_rate") snapshotPayload.burn_rate = parsedValue;
            else if (fieldName === "churn") snapshotPayload.churn = parsedValue;
            else if (fieldName === "growth_percent") snapshotPayload.growth_percent = parsedValue;
            else if (fieldName === "runway_months") snapshotPayload.runway_months = parsedValue;
            else if (fieldName === "lead_velocity") snapshotPayload.lead_velocity = parsedValue;
            else if (fieldName === "cash_balance") snapshotPayload.cash_balance = parsedValue;
            else if (fieldName === "customers") snapshotPayload.customers = parsedValue;
          } else {
            parsedValues[parsedValues.length - 1] += " (failed to parse)";
          }
        }

        // Log parsed values for debugging (only for first few rows to avoid spam)
        if (rowIndex <= 3) {
          console.log(`[fetchGoogleSheetsData] Row ${rowIndex} (${periodDate}):`, parsedValues.join(", "));
        }

        // Only add snapshot if it has at least one KPI value
        const hasAnyValue = Object.values(snapshotPayload).some(
          (val, idx) => idx > 0 && val !== null // Skip period_date (index 0)
        );

        if (hasAnyValue) {
          allSnapshots.push(snapshotPayload);
          if (rowIndex <= 3) {
            console.log(`[fetchGoogleSheetsData] Snapshot for ${periodDate}:`, {
              mrr: snapshotPayload.mrr,
              arr: snapshotPayload.arr,
              burn_rate: snapshotPayload.burn_rate,
              churn: snapshotPayload.churn,
              growth_percent: snapshotPayload.growth_percent,
              runway_months: snapshotPayload.runway_months,
            });
          }
        } else if (rowIndex <= 3) {
          console.warn(`[fetchGoogleSheetsData] Row ${rowIndex} (${periodDate}) has no valid KPI values, skipping`);
        }
      }
    } catch (error: any) {
      console.error(`[fetchGoogleSheetsData] Error processing sheet ${sheetIndex + 1}:`, error.message);
      // Continue with other sheets
    }
  }

  // Merge snapshots by period_date - sum values from multiple sheets
  const mergedSnapshotsMap = new Map<string, KPISnapshot>();

  for (const snapshot of allSnapshots) {
    const existing = mergedSnapshotsMap.get(snapshot.period_date);
    
    if (existing) {
      // Merge: sum numeric values, keep non-null values for non-additive fields
      const merged: KPISnapshot = {
        period_date: snapshot.period_date,
        // Sum additive KPIs
        mrr: (existing.mrr !== null && snapshot.mrr !== null) ? existing.mrr + snapshot.mrr : (snapshot.mrr ?? existing.mrr),
        arr: (existing.arr !== null && snapshot.arr !== null) ? existing.arr + snapshot.arr : (snapshot.arr ?? existing.arr),
        burn_rate: (existing.burn_rate !== null && snapshot.burn_rate !== null) ? existing.burn_rate + snapshot.burn_rate : (snapshot.burn_rate ?? existing.burn_rate),
        lead_velocity: (existing.lead_velocity !== null && snapshot.lead_velocity !== null) ? existing.lead_velocity + snapshot.lead_velocity : (snapshot.lead_velocity ?? existing.lead_velocity),
        cash_balance: (existing.cash_balance !== null && snapshot.cash_balance !== null) ? existing.cash_balance + snapshot.cash_balance : (snapshot.cash_balance ?? existing.cash_balance),
        customers: (existing.customers !== null && snapshot.customers !== null) ? existing.customers + snapshot.customers : (snapshot.customers ?? existing.customers),
        // Keep latest value for non-additive KPIs
        churn: snapshot.churn ?? existing.churn,
        growth_percent: snapshot.growth_percent ?? existing.growth_percent,
        runway_months: snapshot.runway_months ?? existing.runway_months,
      };
      
      mergedSnapshotsMap.set(snapshot.period_date, merged);
    } else {
      mergedSnapshotsMap.set(snapshot.period_date, { ...snapshot });
    }
  }

  const mergedSnapshots = Array.from(mergedSnapshotsMap.values());
  console.log("[fetchGoogleSheetsData] Merged", mergedSnapshots.length, "unique snapshots from all sheets");

  return mergedSnapshots;
}
