-- Migration: Create company_kpi_history table for historical KPI timeseries
-- Run this SQL in Supabase SQL Editor

-- Create the table
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

-- Create index for efficient queries (company_id + recorded_at descending)
CREATE INDEX IF NOT EXISTS idx_company_kpi_history_company_recorded 
ON company_kpi_history (company_id, recorded_at DESC);

-- Add comment for documentation
COMMENT ON TABLE company_kpi_history IS 'Historical KPI snapshots for companies, used for timeseries charts';
COMMENT ON COLUMN company_kpi_history.recorded_at IS 'Timestamp when this KPI snapshot was recorded';
