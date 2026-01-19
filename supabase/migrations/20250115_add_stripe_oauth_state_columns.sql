-- Add columns for Stripe OAuth Connect state management
-- These columns support CSRF protection via state/nonce validation

ALTER TABLE public.integrations
ADD COLUMN IF NOT EXISTS oauth_state TEXT,
ADD COLUMN IF NOT EXISTS oauth_state_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS connected_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN public.integrations.oauth_state IS 'OAuth state string (companyId:nonce) for CSRF protection';
COMMENT ON COLUMN public.integrations.oauth_state_expires_at IS 'Expiration time for OAuth state (typically 15 minutes)';
COMMENT ON COLUMN public.integrations.stripe_account_id IS 'Stripe connected account ID (from OAuth token response)';
COMMENT ON COLUMN public.integrations.connected_at IS 'Timestamp when OAuth connection was established';
