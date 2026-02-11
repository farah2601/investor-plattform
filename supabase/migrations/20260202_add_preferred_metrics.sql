-- Migration: Add preferred_metrics to companies
-- User can choose which metrics to display when their accounting uses different metrics.

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS preferred_metrics jsonb DEFAULT NULL;

COMMENT ON COLUMN companies.preferred_metrics IS 'Optional array of KPI keys to display as Key Metrics, e.g. ["cash_balance", "burn_rate", "runway_months", "churn", "mrr", "arr"]. If null, use AI-inferred or default.';
