-- Add columns for Stripe Level 1 integration (secret key storage)
-- These columns support storing encrypted Stripe secret keys and metadata

ALTER TABLE public.integrations
ADD COLUMN IF NOT EXISTS secret_encrypted TEXT,
ADD COLUMN IF NOT EXISTS masked TEXT,
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN public.integrations.secret_encrypted IS 'Encrypted Stripe secret key (AES-256-GCM)';
COMMENT ON COLUMN public.integrations.masked IS 'Masked version of secret key for display (e.g., sk_live_****abcd)';
COMMENT ON COLUMN public.integrations.last_verified_at IS 'Timestamp when the integration was last verified with the provider';
