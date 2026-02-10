-- Add runway_status column to companies table to handle cash-flow positive companies
-- When burn_rate <= 0, runway_months should be null and runway_status should be "cash-flow-positive"

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS runway_status TEXT DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN companies.runway_status IS 'Status of runway calculation: null (normal), "cash-flow-positive" (burn <= 0), "missing-data" (cannot calculate)';
