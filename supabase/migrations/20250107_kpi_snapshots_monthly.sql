-- Migration: Create kpi_snapshots table for monthly historical KPI data
-- Run this in Supabase SQL Editor

-- Create table if not exists
CREATE TABLE IF NOT EXISTS public.kpi_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_date date NOT NULL,  -- First day of the month (YYYY-MM-01)
  mrr numeric,
  arr numeric,
  burn_rate numeric,
  churn numeric,
  growth_percent numeric,
  runway_months numeric,
  lead_velocity numeric,
  source text NOT NULL DEFAULT 'google-sheets',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create unique constraint to enable UPSERT
CREATE UNIQUE INDEX IF NOT EXISTS idx_kpi_snapshots_company_period 
ON public.kpi_snapshots (company_id, period_date);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_company_date 
ON public.kpi_snapshots (company_id, period_date DESC);

-- Add comments
COMMENT ON TABLE public.kpi_snapshots IS 'Monthly historical KPI snapshots for companies, used for timeseries charts';
COMMENT ON COLUMN public.kpi_snapshots.period_date IS 'First day of the month (YYYY-MM-01) for this snapshot';
COMMENT ON COLUMN public.kpi_snapshots.source IS 'Source of the data (e.g., google-sheets, manual, etc.)';
