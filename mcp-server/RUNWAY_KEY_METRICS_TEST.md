# Runway Status in Key Metrics - Integration Test

## Changes Made

### 1. Database Migration
**File:** `supabase/migrations/20260201_add_runway_status.sql`

Added `runway_status` column to `companies` table:
- `NULL` = Normal case (burning cash, runway calculated)
- `"cash-flow-positive"` = Burn rate ≤ 0 (not burning cash)
- `"missing-data"` = Cannot calculate runway (missing cash or burn data)

### 2. API Update: refresh-from-snapshots
**File:** `src/app/api/companies/[id]/refresh-from-snapshots/route.ts`

Updated to handle runway status when copying from `kpi_snapshots` to `companies`:

```typescript
// SYSTEM RULE: Handle runway_months with status
const runwayKpi = kpis?.runway_months as any;
const runwayStatus = runwayKpi?.status;

if (runwayStatus === "not_applicable") {
  // Cash-flow positive: burn <= 0
  updatePayload.runway_months = null;
  updatePayload.runway_status = "cash-flow-positive";
} else if (runwayMonths != null) {
  // Normal case: burning cash
  updatePayload.runway_months = runwayMonths;
  updatePayload.runway_status = null;
}
```

### 3. API Update: companies/[id]
**File:** `src/app/api/companies/[id]/route.ts`

Added `runway_status` to SELECT statements so it's returned in API responses.

## Testing Steps

### Step 1: Run Database Migration

```bash
# Apply the migration to add runway_status column
psql $DATABASE_URL -f supabase/migrations/20260201_add_runway_status.sql

# Or via Supabase CLI
supabase db push
```

### Step 2: Create Test Company with Cash-Flow Positive Scenario

```typescript
// In MCP or test script
const testData = {
  company_id: "test-company-uuid",
  period_date: "2024-01-01",
  kpis: {
    mrr: { value: 100000, source: "sheet", updated_at: "2024-01-15T10:00:00Z" },
    arr: { value: 1200000, source: "computed", updated_at: "2024-01-15T10:00:00Z" },
    burn_rate: { value: 0, source: "sheet", updated_at: "2024-01-15T10:00:00Z" },
    cash_balance: { value: 500000, source: "sheet", updated_at: "2024-01-15T10:00:00Z" },
    runway_months: {
      value: null,
      source: "computed",
      updated_at: "2024-01-15T10:00:00Z",
      status: "not_applicable",
      label: "Cash-flow positive",
      confidence: "High"
    }
  }
};

// Insert into kpi_snapshots
await supabase.from("kpi_snapshots").insert(testData);
```

### Step 3: Refresh Company from Snapshots

```bash
# Call the refresh API
curl -X POST http://localhost:3000/api/companies/{company-id}/refresh-from-snapshots \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Result in companies table:**
```json
{
  "runway_months": null,
  "runway_status": "cash-flow-positive",
  "burn_rate": 0,
  "cash_balance": 500000
}
```

### Step 4: Verify in UI/API

```bash
# Get company data
curl http://localhost:3000/api/companies/{company-id} \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected JSON Response:**
```json
{
  "id": "...",
  "mrr": 100000,
  "arr": 1200000,
  "burn_rate": 0,
  "cash_balance": 500000,
  "runway_months": null,
  "runway_status": "cash-flow-positive"
}
```

## UI Display Logic

### Dashboard View

```tsx
function RunwayDisplay({ runway_months, runway_status }) {
  if (runway_status === "cash-flow-positive") {
    return (
      <div className="kpi-card runway cash-flow-positive">
        <h3>Runway</h3>
        <div className="value">∞</div>
        <div className="status success">Cash-flow positive</div>
        <p className="description">
          Company is not burning cash (profitable or breaking even)
        </p>
      </div>
    );
  }
  
  if (runway_months !== null) {
    return (
      <div className="kpi-card runway">
        <h3>Runway</h3>
        <div className="value">{runway_months.toFixed(1)} months</div>
        <p className="description">
          At current burn rate
        </p>
      </div>
    );
  }
  
  return (
    <div className="kpi-card runway missing">
      <h3>Runway</h3>
      <div className="value">—</div>
      <p className="description">Missing data</p>
    </div>
  );
}
```

### Investor View

```tsx
function InvestorRunwayDisplay({ runway_months, runway_status }) {
  if (runway_status === "cash-flow-positive") {
    return (
      <Alert variant="success">
        ✅ Company is cash-flow positive (profitable or breaking even).
        Runway calculation not applicable.
      </Alert>
    );
  }
  
  if (runway_months !== null) {
    const urgency = runway_months < 6 ? "critical" : runway_months < 12 ? "warning" : "normal";
    return (
      <Alert variant={urgency}>
        ⏰ Company has {runway_months.toFixed(1)} months of runway at current burn rate.
      </Alert>
    );
  }
  
  return null;
}
```

## Full Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Google Sheets / Stripe Data Ingestion                      │
│     → burn_rate = 0 detected                                    │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. MCP: computeDerivedMetrics()                                │
│     → if (burn <= 0):                                           │
│        runway_months = {                                        │
│          value: null,                                           │
│          status: "not_applicable",                              │
│          label: "Cash-flow positive",                           │
│          confidence: "High"                                     │
│        }                                                        │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. Write to kpi_snapshots                                      │
│     → period_date: "2024-01-01"                                 │
│     → kpis.runway_months.status = "not_applicable"              │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. API: refresh-from-snapshots                                 │
│     → Extract runway_months KPI                                 │
│     → Check status === "not_applicable"                         │
│     → Set companies.runway_months = null                        │
│     → Set companies.runway_status = "cash-flow-positive"        │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  5. UI/Investor View                                            │
│     → Display "∞" or "Cash-flow positive" badge                 │
│     → Show success message                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Verification Checklist

- [ ] Database migration applied (runway_status column exists)
- [ ] MCP test passes (runway_cashflow_positive.test.ts)
- [ ] kpi_snapshots has status/label/confidence fields
- [ ] refresh-from-snapshots copies status correctly
- [ ] companies table has runway_status = "cash-flow-positive" when burn <= 0
- [ ] API returns runway_status in /api/companies/[id]
- [ ] UI displays cash-flow positive indicator
- [ ] Investor view shows appropriate message

## Rollback Plan

If issues arise:

```sql
-- Remove runway_status column
ALTER TABLE companies DROP COLUMN IF EXISTS runway_status;

-- Revert refresh-from-snapshots logic (git revert or manual)
```

## Related Files

- `mcp-server/src/utils/kpi_snapshots.ts` - Computes runway with status
- `mcp-server/src/utils/runway_cashflow_positive.test.ts` - Unit tests
- `mcp-server/RUNWAY_CASHFLOW_RULE.md` - Documentation
- `supabase/migrations/20260201_add_runway_status.sql` - Database migration
- `src/app/api/companies/[id]/refresh-from-snapshots/route.ts` - API update
- `src/app/api/companies/[id]/route.ts` - API response

---

**Status:** ✅ Implementation Complete  
**Needs:** Database migration + Frontend UI update
