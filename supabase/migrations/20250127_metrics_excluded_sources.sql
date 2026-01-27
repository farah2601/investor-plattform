-- Migration: Add metrics_excluded_sources to companies
-- When a source (stripe, sheets) is excluded, its data is not used in metrics/KPI refresh.

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS metrics_excluded_sources jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN companies.metrics_excluded_sources IS 'Sources excluded from metrics: { "stripe": true, "sheets": true }';
