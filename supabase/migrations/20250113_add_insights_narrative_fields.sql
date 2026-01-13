-- Add narrative fields for LLM-rewritten language (optional, separate from deterministic insights)
-- Deterministic insights (facts) are in: latest_insights, based_on_snapshot_date
-- Narrative (language-only rewrite) is in: latest_insights_narrative

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS latest_insights_narrative text[],
ADD COLUMN IF NOT EXISTS latest_insights_narrative_generated_at timestamptz,
ADD COLUMN IF NOT EXISTS latest_insights_narrative_generated_by text;

-- Add comments for clarity
COMMENT ON COLUMN companies.latest_insights IS 'Deterministic insights computed from kpi_snapshots (facts, never overwritten by LLM)';
COMMENT ON COLUMN companies.latest_insights_narrative IS 'Optional LLM-rewritten language version of insights (language only, no new facts)';
COMMENT ON COLUMN companies.based_on_snapshot_date IS 'The period_date from kpi_snapshots that latest_insights are based on';
