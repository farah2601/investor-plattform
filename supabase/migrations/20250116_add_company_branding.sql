-- Migration: Add branding fields to companies table
-- Run this SQL in Supabase SQL Editor

-- Add logo URL column
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS logo_url text;

-- Add header style column (minimal or branded)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS header_style text CHECK (header_style IN ('minimal', 'branded'))
DEFAULT 'minimal';

-- Add brand color column
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS brand_color text;

-- Add comments for documentation
COMMENT ON COLUMN companies.logo_url IS 'Public URL to company logo stored in Supabase Storage';
COMMENT ON COLUMN companies.header_style IS 'Header display style: minimal or branded';
COMMENT ON COLUMN companies.brand_color IS 'Primary brand color (hex code) for the company';
