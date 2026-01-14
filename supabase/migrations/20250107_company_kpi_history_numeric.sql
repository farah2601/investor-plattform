-- Migration: Ensure company_kpi_history exists with numeric columns
-- Run this in Supabase SQL Editor

-- Create table if not exists
CREATE TABLE IF NOT EXISTS company_kpi_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  mrr numeric,
  arr numeric,
  burn_rate numeric,
  churn numeric,
  growth_percent numeric,
  runway_months numeric
);

-- Alter columns to numeric if they exist as different types
-- Using safe conversion with NULLIF to handle empty strings
DO $$
BEGIN
  -- mrr
  BEGIN
    ALTER TABLE company_kpi_history 
    ALTER COLUMN mrr TYPE numeric 
    USING NULLIF(mrr::text, '')::numeric;
  EXCEPTION WHEN others THEN
    NULL; -- Column already numeric or doesn't exist
  END;
  
  -- arr
  BEGIN
    ALTER TABLE company_kpi_history 
    ALTER COLUMN arr TYPE numeric 
    USING NULLIF(arr::text, '')::numeric;
  EXCEPTION WHEN others THEN
    NULL;
  END;
  
  -- burn_rate
  BEGIN
    ALTER TABLE company_kpi_history 
    ALTER COLUMN burn_rate TYPE numeric 
    USING NULLIF(burn_rate::text, '')::numeric;
  EXCEPTION WHEN others THEN
    NULL;
  END;
  
  -- churn
  BEGIN
    ALTER TABLE company_kpi_history 
    ALTER COLUMN churn TYPE numeric 
    USING NULLIF(churn::text, '')::numeric;
  EXCEPTION WHEN others THEN
    NULL;
  END;
  
  -- growth_percent
  BEGIN
    ALTER TABLE company_kpi_history 
    ALTER COLUMN growth_percent TYPE numeric 
    USING NULLIF(growth_percent::text, '')::numeric;
  EXCEPTION WHEN others THEN
    NULL;
  END;
  
  -- runway_months
  BEGIN
    ALTER TABLE company_kpi_history 
    ALTER COLUMN runway_months TYPE numeric 
    USING NULLIF(runway_months::text, '')::numeric;
  EXCEPTION WHEN others THEN
    NULL;
  END;
END $$;

-- Create index for efficient queries (company_id + recorded_at descending)
CREATE INDEX IF NOT EXISTS idx_company_kpi_history_company_recorded 
ON company_kpi_history (company_id, recorded_at DESC);

-- Add comments
COMMENT ON TABLE company_kpi_history IS 'Historical KPI snapshots for companies, used for timeseries charts';
COMMENT ON COLUMN company_kpi_history.recorded_at IS 'Timestamp when this KPI snapshot was recorded';
