-- Migration: Add investor_view_config to companies
-- Controls what investors see: ARR & MRR, Burn & Runway, Growth charts, AI insights

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS investor_view_config jsonb NOT NULL DEFAULT '{"arrMrr":true,"burnRunway":true,"growthCharts":true,"aiInsights":false}'::jsonb;

COMMENT ON COLUMN companies.investor_view_config IS 'Config for /investor view: arrMrr, burnRunway, growthCharts, aiInsights';
