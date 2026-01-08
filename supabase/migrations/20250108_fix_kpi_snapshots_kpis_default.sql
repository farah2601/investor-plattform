-- Migration: Fix kpis column NOT NULL constraint by adding default
-- This ensures kpis always has a value, even if empty object

-- Step 1: Set default empty JSON object for kpis column
ALTER TABLE public.kpi_snapshots
  ALTER COLUMN kpis SET DEFAULT '{}'::jsonb;

-- Step 2: Backfill any existing NULL values with empty object
UPDATE public.kpi_snapshots
SET kpis = '{}'::jsonb
WHERE kpis IS NULL;

-- Step 3: Ensure NOT NULL constraint is maintained (with default, this is safe)
-- The column should already be NOT NULL, but we verify it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'kpi_snapshots' 
    AND column_name = 'kpis'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.kpi_snapshots
      ALTER COLUMN kpis SET NOT NULL;
  END IF;
END $$;

-- Step 4: CRITICAL - Trigger PostgREST schema reload
SELECT pg_notify('pgrst', 'reload schema');
NOTIFY pgrst, 'reload schema';

-- Add comment
COMMENT ON COLUMN public.kpi_snapshots.kpis IS 'JSONB object containing all KPI values. Always required (default: empty object).';
