/**
 * Robust Number Parser for Google Sheets
 * 
 * Handles various negative number formats that cause sign confusion:
 * - Unicode minus: "−123" (U+2212)
 * - En-dash: "–123" (U+2013)
 * - Em-dash: "—123" (U+2014)
 * - Parentheses negatives: "(123)", "(1,234.56)"
 * - Spaces in numbers: "1 234.56", "− 1,234"
 * - Currency prefixes/suffixes: "$1,234", "1234 kr", "€-1234"
 * - Accounting format: "1,234 -", "(1,234)"
 * 
 * Returns: { value: number, sign: 1 | -1, formatted: string, isNegative: boolean }
 */

export type ParsedNumber = {
  value: number;           // Absolute value (always positive)
  sign: 1 | -1;           // Explicit sign (-1 for negative, 1 for positive)
  formatted: string;       // Original formatted string
  isNegative: boolean;     // Convenience flag
  signalValue: number;     // Final signed value (value * sign)
};

/**
 * Parse a cell value from Google Sheets and return normalized number with explicit sign
 * 
 * @param cell - Cell value from Google Sheets (string or number)
 * @returns ParsedNumber object or null if not a valid number
 */
export function parseSheetNumber(cell: unknown): ParsedNumber | null {
  if (cell === null || cell === undefined || cell === "") {
    return null;
  }
  
  // If already a number, return it
  if (typeof cell === "number") {
    if (!Number.isFinite(cell)) {
      return null;
    }
    return {
      value: Math.abs(cell),
      sign: cell < 0 ? -1 : 1,
      formatted: String(cell),
      isNegative: cell < 0,
      signalValue: cell,
    };
  }
  
  const original = String(cell).trim();
  if (!original) {
    return null;
  }
  
  let str = original;
  let detectedSign: 1 | -1 = 1;
  
  // 1. Detect parentheses negatives: "(123)" or "(1,234.56)"
  const parenMatch = str.match(/^\s*\(\s*([\d\s,.]+)\s*\)\s*$/);
  if (parenMatch) {
    str = parenMatch[1]!;
    detectedSign = -1;
  }
  
  // 2. Replace unicode minus signs with regular hyphen
  str = str.replace(/[\u2212\u2013\u2014]/g, "-"); // U+2212 (minus), U+2013 (en-dash), U+2014 (em-dash)
  
  // 3. Remove currency symbols (common ones) - but keep minus sign
  str = str.replace(/[$€£¥₹₽₩₪₺₴₦₨₱₡₵₲₸₾₿¢]/gi, "");
  str = str.replace(/\bkr\b/gi, ""); // Remove "kr" as word
  
  // 4. Detect trailing minus (accounting format): "123 -" or "123-"
  const trailingMinusMatch = str.match(/^([\d\s,.]+)\s*-\s*$/);
  if (trailingMinusMatch) {
    str = trailingMinusMatch[1]!;
    detectedSign = -1;
  }
  
  // 5. Detect leading minus: "-123" or "- 123"
  const leadingMinusMatch = str.match(/^\s*-\s*([\d\s,.]+)$/);
  if (leadingMinusMatch) {
    str = leadingMinusMatch[1]!;
    detectedSign = -1;
  }
  
  // 6. Remove all spaces (handles "1 234" format)
  str = str.replace(/\s+/g, "");
  
  // 7. Handle both comma and period as decimal separators
  // Strategy: Look at the LAST occurrence of comma/period to determine decimal separator
  const commaCount = (str.match(/,/g) || []).length;
  const periodCount = (str.match(/\./g) || []).length;
  const lastCommaPos = str.lastIndexOf(",");
  const lastPeriodPos = str.lastIndexOf(".");
  
  if (commaCount > 0 && periodCount > 0) {
    // Both present: whichever comes last is the decimal separator
    if (lastCommaPos > lastPeriodPos) {
      // EU format: "1.234,56" → comma is decimal
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      // US format: "1,234.56" → period is decimal
      str = str.replace(/,/g, "");
    }
  } else if (commaCount > 1) {
    // Multiple commas, no period: "1,234,567" → all are thousands
    str = str.replace(/,/g, "");
  } else if (periodCount > 1) {
    // Multiple periods, no comma: "1.234.567" → all are thousands
    str = str.replace(/\./g, "");
  } else if (commaCount === 1 && periodCount === 0) {
    // Single comma, no period: ambiguous
    // Heuristic: if 2 digits after comma → decimal, if 3 → thousands
    const parts = str.split(",");
    const afterComma = parts[1] || "";
    if (afterComma.length === 2) {
      // EU decimal: "1,23"
      str = str.replace(",", ".");
    } else {
      // US thousands: "1,234"
      str = str.replace(",", "");
    }
  } else if (periodCount === 1 && commaCount === 0) {
    // Single period, no comma: could be "1.234" (EU thousands) or "1.23" (decimal)
    // Heuristic: if 3 digits after period → thousands, otherwise decimal
    const parts = str.split(".");
    const afterPeriod = parts[1] || "";
    if (afterPeriod.length === 3 && parts[0]!.length <= 1) {
      // EU thousands: "1.234"
      str = str.replace(".", "");
    }
    // Otherwise keep period as decimal
  }
  
  // 8. Parse the cleaned string
  const num = Number(str);
  
  if (!Number.isFinite(num) || isNaN(num)) {
    return null;
  }
  
  const absoluteValue = Math.abs(num);
  const finalSign: 1 | -1 = num < 0 ? -1 : detectedSign;
  
  return {
    value: absoluteValue,
    sign: finalSign,
    formatted: original,
    isNegative: finalSign === -1,
    signalValue: absoluteValue * finalSign,
  };
}

/**
 * Parse multiple cells and return array of parsed numbers
 */
export function parseSheetNumbers(cells: unknown[]): ParsedNumber[] {
  return cells
    .map(cell => parseSheetNumber(cell))
    .filter((parsed): parsed is ParsedNumber => parsed !== null);
}

/**
 * Get numeric value (signed) from parsed number
 */
export function getSignedValue(parsed: ParsedNumber | null): number | null {
  if (parsed === null) {
    return null;
  }
  return parsed.signalValue;
}

/**
 * Finance domain parser: interprets "Net (in - out)" correctly
 * 
 * Net cash flow semantics:
 * - Positive net = cash inflow (good for company)
 * - Negative net = cash outflow (burning cash)
 * 
 * Returns parsed number with financial context
 */
export function parseNetCashFlow(cell: unknown): {
  parsed: ParsedNumber | null;
  interpretation: "inflow" | "outflow" | "neutral";
  isBurning: boolean;
} | null {
  const parsed = parseSheetNumber(cell);
  
  if (parsed === null) {
    return null;
  }
  
  const interpretation = parsed.isNegative 
    ? "outflow" 
    : parsed.signalValue > 0 
    ? "inflow" 
    : "neutral";
  
  const isBurning = parsed.isNegative; // Negative net = burning cash
  
  return {
    parsed,
    interpretation,
    isBurning,
  };
}

/**
 * Test suite for robust number parser
 */
export function runParserTests() {
  const tests: Array<{ input: unknown; expected: number | null; description: string }> = [
    // Standard formats
    { input: "123", expected: 123, description: "Plain positive" },
    { input: "-123", expected: -123, description: "Plain negative" },
    { input: 123, expected: 123, description: "Native number positive" },
    { input: -123, expected: -123, description: "Native number negative" },
    
    // Parentheses (accounting negatives)
    { input: "(123)", expected: -123, description: "Parentheses negative" },
    { input: "(1,234)", expected: -1234, description: "Parentheses with comma" },
    { input: "(1,234.56)", expected: -1234.56, description: "Parentheses with decimal" },
    
    // Unicode minus signs
    { input: "−123", expected: -123, description: "Unicode minus (U+2212)" },
    { input: "–123", expected: -123, description: "En-dash (U+2013)" },
    { input: "—123", expected: -123, description: "Em-dash (U+2014)" },
    
    // Spaces in numbers
    { input: "1 234", expected: 1234, description: "Space thousands separator" },
    { input: "− 1 234", expected: -1234, description: "Unicode minus with spaces" },
    { input: "1 234.56", expected: 1234.56, description: "Space thousands with decimal" },
    
    // Currency formats
    { input: "$1,234", expected: 1234, description: "Dollar prefix" },
    { input: "€-1,234", expected: -1234, description: "Euro prefix with minus" },
    { input: "1234 kr", expected: 1234, description: "Norwegian krone suffix" },
    { input: "-1234 kr", expected: -1234, description: "Negative with currency suffix" },
    
    // Trailing minus (accounting)
    { input: "123 -", expected: -123, description: "Trailing minus with space" },
    { input: "123-", expected: -123, description: "Trailing minus no space" },
    { input: "1,234.56 -", expected: -1234.56, description: "Trailing minus decimal" },
    
    // Thousand separators
    { input: "1,234", expected: 1234, description: "US thousands (comma)" },
    { input: "1,234,567", expected: 1234567, description: "US millions" },
    { input: "1.234", expected: 1234, description: "EU thousands (period)" },
    { input: "1.234.567", expected: 1234567, description: "EU millions" },
    
    // Decimal separators
    { input: "1,234.56", expected: 1234.56, description: "US decimal (comma thousands)" },
    { input: "1.234,56", expected: 1234.56, description: "EU decimal (period thousands)" },
    { input: "1,23", expected: 1.23, description: "EU decimal ambiguous (2 digits)" },
    { input: "1,234", expected: 1234, description: "US thousands ambiguous (3 digits)" },
    
    // Edge cases
    { input: "", expected: null, description: "Empty string" },
    { input: null, expected: null, description: "Null" },
    { input: undefined, expected: null, description: "Undefined" },
    { input: "abc", expected: null, description: "Non-numeric text" },
    { input: "0", expected: 0, description: "Zero" },
    { input: "-0", expected: 0, description: "Negative zero" },
  ];
  
  let passed = 0;
  let failed = 0;
  
  console.log("Running Robust Number Parser Tests...\n");
  
  for (const test of tests) {
    const result = parseSheetNumber(test.input);
    const actual = result ? result.signalValue : null;
    
    const success = actual === test.expected;
    
    if (success) {
      passed++;
      console.log(`✅ ${test.description}`);
      console.log(`   Input: ${JSON.stringify(test.input)} → ${actual}`);
    } else {
      failed++;
      console.error(`❌ ${test.description}`);
      console.error(`   Input: ${JSON.stringify(test.input)}`);
      console.error(`   Expected: ${test.expected}, Got: ${actual}`);
      if (result) {
        console.error(`   Debug: value=${result.value}, sign=${result.sign}, isNeg=${result.isNegative}`);
      }
    }
  }
  
  console.log(`\n${passed}/${tests.length} tests passed`);
  
  if (failed > 0) {
    process.exit(1);
  }
  
  return { passed, failed };
}

// Run tests if executed directly
if (require.main === module) {
  runParserTests();
  console.log("\n✅ All parser tests passed!");
}
