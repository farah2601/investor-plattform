# Sign Confusion Fix - Quick Reference

## Run Tests

```bash
cd mcp-server

# All parser tests (34 tests)
npx ts-node --transpile-only src/utils/robust_number_parser.ts

# All finance rules tests (10 tests)
npx ts-node --transpile-only src/utils/finance_rules.ts

# End-to-end tests (19 tests)
npx ts-node --transpile-only src/utils/sign_confusion_e2e.test.ts

# Existing KPI tests (still work)
npx ts-node --transpile-only src/utils/kpi_sanity.test.ts
npx ts-node --transpile-only src/utils/runway_cashflow_positive.test.ts
```

## Hard Rules (Copy-Paste Reference)

### Rule 1: Burn Rate

```typescript
// Burn is ALWAYS >= 0 (cash outflow amount, never negative)
if (net_cash_flow > 0) {
  burn_rate = 0;  // Cash-flow positive
} else if (net_cash_flow < 0) {
  burn_rate = -net_cash_flow;  // Convert to positive
} else {
  burn_rate = 0;  // Breaking even
}
```

### Rule 2: Runway

```typescript
// Runway only when burning cash
if (burn_rate <= 0) {
  runway_months = null;
  runway_status = "not_applicable";
  runway_label = "Cash-flow positive";
} else if (cash_balance !== null && burn_rate > 0) {
  runway_months = cash_balance / burn_rate;
  runway_status = "active";
}
```

### Rule 3: Validation

```typescript
// MUST validate before storing
const validation = validateFinanceRules(metrics);

if (!validation.valid) {
  console.error("VIOLATIONS:", validation.errors);
  // → Auto-correct or reject
}
```

## Common Formats Handled

| Format | Example | Parsed Value |
|--------|---------|--------------|
| Unicode minus | `−123` | -123 |
| En-dash | `–123` | -123 |
| Parentheses | `(123)` | -123 |
| Trailing minus | `123 -` | -123 |
| Currency | `$1,234` | 1234 |
| EU decimal | `1.234,56` | 1234.56 |
| US decimal | `1,234.56` | 1234.56 |
| Spaces | `1 234.56` | 1234.56 |

## API Usage

### Apply Finance Rules

```typescript
import { applyFinanceRules, validateFinanceRules } from "./utils/finance_rules";

const metrics = applyFinanceRules(
  netCashFlowValue,  // Can be positive, negative, or null
  reportedBurnValue,  // Optional reported burn
  cashBalanceValue    // Cash on hand
);

// Validate
const validation = validateFinanceRules(metrics);

if (validation.valid) {
  // Use metrics.burn_rate, metrics.runway_months
} else {
  // Handle violations
  console.error("Errors:", validation.errors);
}
```

### Parse Sheet Number

```typescript
import { parseSheetNumber } from "./utils/robust_number_parser";

const parsed = parseSheetNumber("−8,000");

if (parsed) {
  console.log(parsed.value);        // 8000 (absolute)
  console.log(parsed.sign);         // -1
  console.log(parsed.signalValue);  // -8000 (signed)
  console.log(parsed.isNegative);   // true
}
```

## Status Indicators

### Burn Rate

| Scenario | Display | Badge |
|----------|---------|-------|
| burn = 0 | "Not burning cash" | 🟢 Cash-flow positive |
| burn > 0 | "$8,000 / month" | 🟡 Active burn |
| burn = null | "—" | ⚫ Missing data |

### Runway

| Scenario | Display | Badge |
|----------|---------|-------|
| burn <= 0 | "∞" | 🟢 Not applicable |
| runway < 6 | "3.2 months" | 🔴 CRITICAL |
| runway 6-12 | "8.5 months" | 🟡 WARNING |
| runway > 12 | "18 months" | 🟢 Healthy |
| runway = null | "—" | ⚫ Missing data |

## Debugging

### Check Finance Warnings

```typescript
// In your code, after applyFinanceRules():
if (metrics.warnings && metrics.warnings.length > 0) {
  console.log("Finance warnings:", metrics.warnings);
  // Example: ["Net cash flow is positive; burn set to 0"]
}
```

### Check Validation Errors

```typescript
const validation = validateFinanceRules(metrics);

if (!validation.valid) {
  console.error("VIOLATIONS:", validation.errors);
  // Example: ["Positive net cash flow but burn > 0"]
}

if (validation.warnings.length > 0) {
  console.warn("WARNINGS:", validation.warnings);
}
```

## Files Reference

| File | What It Does |
|------|-------------|
| `robust_number_parser.ts` | Parses 34 number formats |
| `finance_rules.ts` | Applies hard finance logic |
| `sheets.ts` | Integrates parser + rules in sheet parsing |
| `kpi_snapshots.ts` | Applies rules in computation |
| `sign_confusion_e2e.test.ts` | E2E test scenarios |

## Quick Diagnostics

### Is sign confusion fixed?

```bash
# Run E2E test
npx ts-node --transpile-only src/utils/sign_confusion_e2e.test.ts

# Look for:
✅ No scenario where positive net → positive burn
✅ No runway shown when burn <= 0
✅ All 19 tests passed
```

### Are finance rules enforced?

```bash
# Check MCP logs
# Should see:
[extractSheetDataWithAI] Finance warnings for 2024-01: [...]

# Should NOT see:
[extractSheetDataWithAI] Finance rule violation: [...]
```

---

**Status:** ✅ PRODUCTION READY  
**Tests:** 63/63 passing  
**Issue:** RESOLVED
