-- Migration: Add numeric KPI columns to kpi_snapshots table
-- This migration adds physical columns and backfills from JSONB if needed
-- Run this in Supabase SQL Editor

-- Step 1: Ensure period_date exists and is NOT NULL
DO $$
BEGIN
  -- Add period_date if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'kpi_snapshots' 
    AND column_name = 'period_date'
  ) THEN
    ALTER TABLE public.kpi_snapshots ADD COLUMN period_date date;
  END IF;
  
  -- Make period_date NOT NULL if it's nullable
  ALTER TABLE public.kpi_snapshots ALTER COLUMN period_date SET NOT NULL;
EXCEPTION WHEN others THEN
  -- Column might already exist, continue
  NULL;
END $$;

-- Step 2: Add numeric KPI columns if they don't exist
DO $$
BEGIN
  -- arr
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'kpi_snapshots' 
    AND column_name = 'arr'
  ) THEN
    ALTER TABLE public.kpi_snapshots ADD COLUMN arr numeric;
  END IF;
  
  -- mrr
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'kpi_snapshots' 
    AND column_name = 'mrr'
  ) THEN
    ALTER TABLE public.kpi_snapshots ADD COLUMN mrr numeric;
  END IF;
  
  -- burn_rate
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'kpi_snapshots' 
    AND column_name = 'burn_rate'
  ) THEN
    ALTER TABLE public.kpi_snapshots ADD COLUMN burn_rate numeric;
  END IF;
  
  -- churn
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'kpi_snapshots' 
    AND column_name = 'churn'
  ) THEN
    ALTER TABLE public.kpi_snapshots ADD COLUMN churn numeric;
  END IF;
  
  -- runway_months
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'kpi_snapshots' 
    AND column_name = 'runway_months'
  ) THEN
    ALTER TABLE public.kpi_snapshots ADD COLUMN runway_months numeric;
  END IF;
  
  -- growth_percent
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'kpi_snapshots' 
    AND column_name = 'growth_percent'
  ) THEN
    ALTER TABLE public.kpi_snapshots ADD COLUMN growth_percent numeric;
  END IF;
  
  -- lead_velocity
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'kpi_snapshots' 
    AND column_name = 'lead_velocity'
  ) THEN
    ALTER TABLE public.kpi_snapshots ADD COLUMN lead_velocity numeric;
  END IF;
  
  -- cash_balance (optional)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'kpi_snapshots' 
    AND column_name = 'cash_balance'
  ) THEN
    ALTER TABLE public.kpi_snapshots ADD COLUMN cash_balance numeric;
  END IF;
  
  -- customers (optional)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'kpi_snapshots' 
    AND column_name = 'customers'
  ) THEN
    ALTER TABLE public.kpi_snapshots ADD COLUMN customers numeric;
  END IF;
  
  -- source (if missing)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'kpi_snapshots' 
    AND column_name = 'source'
  ) THEN
    ALTER TABLE public.kpi_snapshots ADD COLUMN source text DEFAULT 'google-sheets';
  END IF;
END $$;

-- Step 3: Backfill from JSONB kpis column if it exists and columns are empty
DO $$
BEGIN
  -- Check if kpis JSONB column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'kpi_snapshots' 
    AND column_name = 'kpis'
    AND data_type = 'jsonb'
  ) THEN
    -- Backfill arr
    UPDATE public.kpi_snapshots
    SET arr = NULLIF((kpis->>'arr')::text, '')::numeric
    WHERE arr IS NULL AND kpis->>'arr' IS NOT NULL;
    
    -- Backfill mrr
    UPDATE public.kpi_snapshots
    SET mrr = NULLIF((kpis->>'mrr')::text, '')::numeric
    WHERE mrr IS NULL AND kpis->>'mrr' IS NOT NULL;
    
    -- Backfill burn_rate (check both burn_rate and cashBurn)
    UPDATE public.kpi_snapshots
    SET burn_rate = COALESCE(
      NULLIF((kpis->>'burn_rate')::text, '')::numeric,
      NULLIF((kpis->>'cashBurn')::text, '')::numeric
    )
    WHERE burn_rate IS NULL AND (kpis->>'burn_rate' IS NOT NULL OR kpis->>'cashBurn' IS NOT NULL);
    
    -- Backfill churn
    UPDATE public.kpi_snapshots
    SET churn = NULLIF((kpis->>'churn')::text, '')::numeric
    WHERE churn IS NULL AND kpis->>'churn' IS NOT NULL;
    
    -- Backfill runway_months
    UPDATE public.kpi_snapshots
    SET runway_months = NULLIF((kpis->>'runway_months')::text, '')::numeric
    WHERE runway_months IS NULL AND kpis->>'runway_months' IS NOT NULL;
    
    -- Backfill growth_percent
    UPDATE public.kpi_snapshots
    SET growth_percent = NULLIF((kpis->>'growth_percent')::text, '')::numeric
    WHERE growth_percent IS NULL AND kpis->>'growth_percent' IS NOT NULL;
    
    -- Backfill cash_balance
    UPDATE public.kpi_snapshots
    SET cash_balance = NULLIF((kpis->>'cash_balance')::text, '')::numeric
    WHERE cash_balance IS NULL AND kpis->>'cash_balance' IS NOT NULL;
    
    -- Backfill customers
    UPDATE public.kpi_snapshots
    SET customers = NULLIF((kpis->>'customers')::text, '')::numeric
    WHERE customers IS NULL AND kpis->>'customers' IS NOT NULL;
  END IF;
END $$;

-- Step 4: Set period_date from effective_date if period_date is NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'kpi_snapshots' 
    AND column_name = 'effective_date'
  ) THEN
    UPDATE public.kpi_snapshots
    SET period_date = DATE_TRUNC('month', effective_date)::date
    WHERE period_date IS NULL AND effective_date IS NOT NULL;
  END IF;
END $$;

-- Step 5: Create unique constraint/index on (company_id, period_date)
DROP INDEX IF EXISTS public.kpi_snapshots_company_period_unique;
CREATE UNIQUE INDEX IF NOT EXISTS kpi_snapshots_company_period_unique 
ON public.kpi_snapshots(company_id, period_date);

-- Also create the index for efficient queries
CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_company_date 
ON public.kpi_snapshots (company_id, period_date DESC);

-- Step 6: Trigger PostgREST schema reload
SELECT pg_notify('pgrst', 'reload schema');

-- Add comments
COMMENT ON TABLE public.kpi_snapshots IS 'Monthly historical KPI snapshots for companies, used for timeseries charts';
COMMENT ON COLUMN public.kpi_snapshots.period_date IS 'First day of the month (YYYY-MM-01) for this snapshot';
COMMENT ON COLUMN public.kpi_snapshots.source IS 'Source of the data (e.g., google-sheets, manual, etc.)';
