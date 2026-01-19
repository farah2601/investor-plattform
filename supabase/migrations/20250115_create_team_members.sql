-- Migration: Create team_members table for company team management
-- Run this SQL in Supabase SQL Editor

-- Create the team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'finance', 'viewer')),
  
  -- Permissions
  can_edit_templates boolean NOT NULL DEFAULT false,
  can_change_branding boolean NOT NULL DEFAULT false,
  can_share_investor_links boolean NOT NULL DEFAULT false,
  can_access_dashboard boolean NOT NULL DEFAULT true,
  can_view_overview boolean NOT NULL DEFAULT true,
  
  -- Invitation tracking
  invitation_token uuid UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  invited_by uuid REFERENCES auth.users(id),
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  
  -- User reference (when they accept invitation and create account)
  user_id uuid REFERENCES auth.users(id),
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_team_members_company_id ON team_members(company_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
CREATE INDEX IF NOT EXISTS idx_team_members_invitation_token ON team_members(invitation_token);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);

-- Ensure unique email per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_company_email ON team_members(company_id, LOWER(email));

-- Add comments for documentation
COMMENT ON TABLE team_members IS 'Team members with access to company dashboard and features';
COMMENT ON COLUMN team_members.invitation_token IS 'Unique token for invitation acceptance';
COMMENT ON COLUMN team_members.status IS 'Invitation status: pending, accepted, or rejected';
COMMENT ON COLUMN team_members.user_id IS 'Reference to auth.users when member accepts invitation and creates account';

-- Enable RLS (Row Level Security)
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Policy: Owners can view all team members for their company
CREATE POLICY "Owners can view team members for their company"
  ON team_members
  FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

-- Policy: Owners can insert team members for their company
CREATE POLICY "Owners can insert team members for their company"
  ON team_members
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

-- Policy: Owners can update team members for their company
CREATE POLICY "Owners can update team members for their company"
  ON team_members
  FOR UPDATE
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

-- Policy: Owners can delete team members for their company
CREATE POLICY "Owners can delete team members for their company"
  ON team_members
  FOR DELETE
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

-- Policy: Team members can view their own record
CREATE POLICY "Team members can view their own record"
  ON team_members
  FOR SELECT
  USING (user_id = auth.uid());
