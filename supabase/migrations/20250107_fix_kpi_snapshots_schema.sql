-- Migration: Add numeric KPI columns to kpi_snapshots table (simplified, robust version)
-- Run this in Supabase SQL Editor

-- Step 1: Add columns directly (ignore if they exist)
ALTER TABLE public.kpi_snapshots 
  ADD COLUMN IF NOT EXISTS arr numeric,
  ADD COLUMN IF NOT EXISTS mrr numeric,
  ADD COLUMN IF NOT EXISTS burn_rate numeric,
  ADD COLUMN IF NOT EXISTS churn numeric,
  ADD COLUMN IF NOT EXISTS runway_months numeric,
  ADD COLUMN IF NOT EXISTS growth_percent numeric,
  ADD COLUMN IF NOT EXISTS lead_velocity numeric,
  ADD COLUMN IF NOT EXISTS cash_balance numeric,
  ADD COLUMN IF NOT EXISTS customers numeric,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'google-sheets';

-- Step 2: Ensure period_date exists
ALTER TABLE public.kpi_snapshots 
  ADD COLUMN IF NOT EXISTS period_date date;

-- Step 3: Backfill period_date from effective_date if needed
UPDATE public.kpi_snapshots
SET period_date = DATE_TRUNC('month', effective_date)::date
WHERE period_date IS NULL 
  AND effective_date IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'kpi_snapshots' 
    AND column_name = 'effective_date'
  );

-- Step 4: Backfill from JSONB kpis column if it exists
UPDATE public.kpi_snapshots
SET 
  arr = COALESCE(arr, NULLIF((kpis->>'arr')::text, '')::numeric),
  mrr = COALESCE(mrr, NULLIF((kpis->>'mrr')::text, '')::numeric),
  burn_rate = COALESCE(burn_rate, 
    NULLIF((kpis->>'burn_rate')::text, '')::numeric,
    NULLIF((kpis->>'cashBurn')::text, '')::numeric
  ),
  churn = COALESCE(churn, NULLIF((kpis->>'churn')::text, '')::numeric),
  runway_months = COALESCE(runway_months, NULLIF((kpis->>'runway_months')::text, '')::numeric),
  growth_percent = COALESCE(growth_percent, NULLIF((kpis->>'growth_percent')::text, '')::numeric),
  cash_balance = COALESCE(cash_balance, NULLIF((kpis->>'cash_balance')::text, '')::numeric),
  customers = COALESCE(customers, NULLIF((kpis->>'customers')::text, '')::numeric)
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'kpi_snapshots' 
  AND column_name = 'kpis'
  AND data_type = 'jsonb'
)
AND kpis IS NOT NULL;

-- Step 5: Create unique constraint/index on (company_id, period_date)
DROP INDEX IF EXISTS public.kpi_snapshots_company_period_unique;
CREATE UNIQUE INDEX IF NOT EXISTS kpi_snapshots_company_period_unique 
ON public.kpi_snapshots(company_id, period_date);

-- Step 6: Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_company_date 
ON public.kpi_snapshots (company_id, period_date DESC);

-- Step 7: CRITICAL - Trigger PostgREST schema reload (multiple ways to ensure it works)
SELECT pg_notify('pgrst', 'reload schema');

-- Also try alternative method
NOTIFY pgrst, 'reload schema';

-- Add comments
COMMENT ON TABLE public.kpi_snapshots IS 'Monthly historical KPI snapshots for companies, used for timeseries charts';
COMMENT ON COLUMN public.kpi_snapshots.period_date IS 'First day of the month (YYYY-MM-01) for this snapshot';
COMMENT ON COLUMN public.kpi_snapshots.source IS 'Source of the data (e.g., google-sheets, manual, etc.)';
