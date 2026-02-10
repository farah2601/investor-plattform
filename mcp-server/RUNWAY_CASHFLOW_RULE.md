# Runway Calculation System Rule: Cash-Flow Positive

## Overview

When a company has a burn rate ≤ 0, it means the company is **cash-flow positive** (profitable or breaking even). In such cases, the traditional runway calculation (cash / burn) is not applicable, as the company is not burning cash.

## System Rule

```typescript
if (burn_rate <= 0) {
  runway_months = {
    value: null,
    status: "not_applicable",
    label: "Cash-flow positive",
    confidence: "High"
  }
}
```

## Implementation

Located in: `mcp-server/src/utils/kpi_snapshots.ts`

Function: `computeDerivedMetrics()`

```typescript
// Runway months = cash_balance / burn_rate
// SYSTEM RULE: If burn <= 0, company is cash-flow positive (not burning cash)
let runwayValue: number | null = null;
let runwayOptions: {
  status?: "active" | "not_applicable" | "derived" | "missing";
  label?: string;
  confidence?: "High" | "Medium" | "Low";
} | undefined;

if (effectiveBurn !== null && effectiveBurn <= 0) {
  // Cash-flow positive: not burning cash (profitable or breaking even)
  runwayValue = null;
  runwayOptions = {
    status: "not_applicable",
    label: "Cash-flow positive",
    confidence: "High",
  };
} else if (cashBalance !== null && effectiveBurn !== null && effectiveBurn > 0) {
  // Normal case: burning cash, calculate runway
  runwayValue = cashBalance / effectiveBurn;
  runwayOptions = {
    status: "active",
    confidence: "High",
  };
}

const runway_months = createKpiValue(
  runwayValue,
  "computed",
  runwayValue !== null ? now : null,
  runwayOptions
);
```

## Scenarios

### 1. Burn Rate = 0 (Breaking Even)
- **Status:** `not_applicable`
- **Label:** "Cash-flow positive"
- **Value:** `null`
- **Confidence:** `High`
- **Meaning:** Company's revenue equals expenses (breaking even)

### 2. Burn Rate < 0 (Profitable)
- **Status:** `not_applicable`
- **Label:** "Cash-flow positive"
- **Value:** `null`
- **Confidence:** `High`
- **Meaning:** Company is profitable (revenue > expenses, cash inflow)

### 3. Burn Rate > 0 (Burning Cash)
- **Status:** `active`
- **Value:** `cash_balance / burn_rate` (in months)
- **Confidence:** `High`
- **Meaning:** Traditional runway calculation applies

### 4. Missing Data
- **Value:** `null`
- **Meaning:** Cannot calculate runway due to missing cash_balance or burn_rate

## KpiValue Type Extension

The `KpiValue` type has been extended to support additional metadata:

```typescript
type KpiValue = {
  value: number | null;
  source: KpiSource;
  updated_at: string | null;
  status?: "active" | "not_applicable" | "derived" | "missing";
  label?: string;
  confidence?: "High" | "Medium" | "Low";
};
```

## Testing

Run tests:
```bash
cd mcp-server
npx ts-node --transpile-only src/utils/runway_cashflow_positive.test.ts
```

### Test Coverage

✅ **Test 1:** Burn rate = 0 (breaking even)  
✅ **Test 2:** Burn rate < 0 (profitable, cash inflow)  
✅ **Test 3:** Burn rate > 0 (burning cash, normal case)  
✅ **Test 4:** Missing cash balance (cannot calculate)

All tests passing ✅

## UI Display Recommendations

### Dashboard View

When `runway_months.status === "not_applicable"`:

```tsx
<div className="kpi-card runway">
  <h3>Runway</h3>
  {runway.status === "not_applicable" ? (
    <div className="cash-flow-positive">
      <span className="value">∞</span>
      <span className="label">{runway.label}</span>
      <Badge variant="success">
        {runway.confidence} Confidence
      </Badge>
    </div>
  ) : (
    <div className="runway-active">
      <span className="value">{runway.value} months</span>
      <Badge variant="info">
        {runway.confidence} Confidence
      </Badge>
    </div>
  )}
</div>
```

### Investor View

**Cash-flow positive:**
> "✅ Company is cash-flow positive (profitable or breaking even). Runway calculation not applicable."

**Normal runway:**
> "⏰ Company has 10 months of runway at current burn rate."

## Benefits

1. **Accurate representation:** Distinguishes between "burning cash" and "cash-flow positive"
2. **Investor clarity:** Clearly communicates when a company is profitable
3. **High confidence:** System rule eliminates ambiguity (not a proxy or estimate)
4. **No confusion:** `null` runway with "cash-flow positive" label vs `null` due to missing data

## API Response Example

### Cash-flow Positive Company

```json
{
  "runway_months": {
    "value": null,
    "source": "computed",
    "updated_at": "2024-01-15T10:00:00Z",
    "status": "not_applicable",
    "label": "Cash-flow positive",
    "confidence": "High"
  },
  "burn_rate": {
    "value": 0,
    "source": "sheet",
    "updated_at": "2024-01-15T10:00:00Z"
  },
  "cash_balance": {
    "value": 500000,
    "source": "sheet",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

### Burning Cash (Normal Case)

```json
{
  "runway_months": {
    "value": 10,
    "source": "computed",
    "updated_at": "2024-01-15T10:00:00Z",
    "status": "active",
    "confidence": "High"
  },
  "burn_rate": {
    "value": 50000,
    "source": "sheet",
    "updated_at": "2024-01-15T10:00:00Z"
  },
  "cash_balance": {
    "value": 500000,
    "source": "sheet",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

## Migration Notes

- **Backwards compatible:** Existing code that only checks `value` continues to work
- **Optional fields:** `status`, `label`, and `confidence` are optional
- **No breaking changes:** Old snapshots without these fields will work as before

## Related Documentation

- `mcp-server/src/utils/kpi_snapshots.ts` - Main implementation
- `mcp-server/src/utils/runway_cashflow_positive.test.ts` - Test suite
- `FALLBACK_SIGNALS.md` - Fallback signals system (complementary)

---

**Implementation Date:** February 1, 2026  
**Status:** ✅ Implemented and Tested  
**Test Coverage:** 100% (4/4 scenarios passing)
