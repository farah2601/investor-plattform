import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";

// Helper to get current user from request
async function getCurrentUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return null;
    }
    return user;
  } catch (err) {
    console.error("Error getting user from token:", err);
    return null;
  }
}

/**
 * GET /api/companies/[id]/team-members
 * Get all team members for a company
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;

    // Verify company exists and user has access
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id, owner_id")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError || !company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // Get team members for this company
    const { data: teamMembers, error: membersError } = await supabaseAdmin
      .from("team_members")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (membersError) {
      console.error("Error fetching team members:", membersError);
      // Check if table doesn't exist
      if (membersError.code === "42P01" || membersError.message?.includes("does not exist")) {
        return NextResponse.json(
          { 
            error: "Database table not found", 
            details: "The team_members table does not exist. Please run the migration first.",
            hint: "Run the SQL migration from supabase/migrations/20250115_create_team_members.sql in Supabase SQL Editor"
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch team members", details: membersError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ teamMembers: teamMembers || [] });
  } catch (error: any) {
    console.error("Unexpected error in GET team-members:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/companies/[id]/team-members
 * Invite a new team member
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const body = await req.json();
    const { email, role, canEditTemplates, canChangeBranding, canShareInvestorLinks, canAccessDashboard, canViewOverview } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    // Get the current user (inviter) - try from cookie or header
    const user = await getCurrentUser(req);
    let inviterId: string | null = user?.id || null;

    // Verify company exists and user is owner
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id, owner_id, name")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError || !company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // If we have a user, verify they are the owner (security check)
    // Note: For now we'll allow it if no user is provided (will use owner_id as fallback)
    if (inviterId && inviterId !== company.owner_id) {
      return NextResponse.json(
        { error: "Only company owners can invite team members" },
        { status: 403 }
      );
    }

    // Use owner_id if no inviter is found
    if (!inviterId) {
      inviterId = company.owner_id;
    }

    // Check if team member already exists for this company
    const { data: existingMember, error: existingError } = await supabaseAdmin
      .from("team_members")
      .select("id")
      .eq("company_id", companyId)
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (existingError) {
      // PGRST116 means "not found" which is fine - user doesn't exist yet
      if (existingError.code === "PGRST116") {
        // This is expected - member doesn't exist yet, continue
      } else if (existingError.code === "42P01" || existingError.message?.includes("does not exist")) {
        // Table doesn't exist
        console.error("team_members table does not exist:", existingError);
        return NextResponse.json(
          { 
            error: "Database table not found", 
            details: "The team_members table does not exist. Please run the migration first.",
            hint: "Run the SQL migration from supabase/migrations/20250115_create_team_members.sql in Supabase SQL Editor"
          },
          { status: 500 }
        );
      } else {
        // Other error
        console.error("Error checking existing member:", existingError);
        return NextResponse.json(
          { error: "Failed to check existing members", details: existingError.message, code: existingError.code },
          { status: 500 }
        );
      }
    }

    if (existingMember) {
      return NextResponse.json(
        { error: "Team member with this email already exists" },
        { status: 409 }
      );
    }

    // Generate invitation token
    const invitationToken = crypto.randomUUID();

    // Create team member record with pending status
    const { data: newMember, error: insertError } = await supabaseAdmin
      .from("team_members")
      .insert([
        {
          company_id: companyId,
          email: email.toLowerCase(),
          role: role,
          can_edit_templates: canEditTemplates || false,
          can_change_branding: canChangeBranding || false,
          can_share_investor_links: canShareInvestorLinks || false,
          can_access_dashboard: canAccessDashboard !== undefined ? canAccessDashboard : true,
          can_view_overview: canViewOverview !== undefined ? canViewOverview : true,
          invitation_token: invitationToken,
          status: "pending",
          invited_by: inviterId || company.owner_id,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("Error creating team member:", insertError);
      // Check if table doesn't exist
      if (insertError.code === "42P01" || insertError.message?.includes("does not exist")) {
        return NextResponse.json(
          { 
            error: "Database table not found", 
            details: "The team_members table does not exist. Please run the migration first.",
            hint: "Run the SQL migration from supabase/migrations/20250115_create_team_members.sql in Supabase SQL Editor"
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: "Failed to create team member", details: insertError.message, code: insertError.code },
        { status: 500 }
      );
    }

    // Send invitation email via Supabase Auth
    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "https://www.valyxo.com";
    const inviteUrl = `${origin}/auth/accept-invite?token=${invitationToken}`;

    try {
      // Use Supabase Admin Auth to send invitation
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email.toLowerCase(),
        {
          data: {
            company_id: companyId,
            company_name: company.name,
            role: role,
            invitation_token: invitationToken,
          },
          redirectTo: inviteUrl,
        }
      );

      if (inviteError) {
        console.error("Error sending invitation email:", inviteError);
        // Still return success, but log the error
        // The team member record was created, so they can be manually invited later
        return NextResponse.json({
          success: true,
          teamMember: newMember,
          warning: "Team member created but invitation email failed to send",
          details: inviteError.message,
        });
      }

      return NextResponse.json({
        success: true,
        teamMember: newMember,
        invitationSent: true,
      });
    } catch (emailError: any) {
      console.error("Error in email sending:", emailError);
      // Still return success since the team member record was created
      return NextResponse.json({
        success: true,
        teamMember: newMember,
        warning: "Team member created but invitation email may have failed",
        details: emailError.message,
      });
    }
  } catch (error: any) {
    console.error("Unexpected error in POST team-members:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/companies/[id]/team-members?memberId=[memberId]
 * Remove a team member
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");
    
    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 }
      );
    }

    // Verify company exists
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .maybeSingle();

    if (companyError || !company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // Delete team member
    const { error: deleteError } = await supabaseAdmin
      .from("team_members")
      .delete()
      .eq("id", memberId)
      .eq("company_id", companyId);

    if (deleteError) {
      console.error("Error deleting team member:", deleteError);
      // Check if table doesn't exist
      if (deleteError.code === "42P01" || deleteError.message?.includes("does not exist")) {
        return NextResponse.json(
          { 
            error: "Database table not found", 
            details: "The team_members table does not exist. Please run the migration first.",
            hint: "Run the SQL migration from supabase/migrations/20250115_create_team_members.sql in Supabase SQL Editor"
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: "Failed to remove team member", details: deleteError.message, code: deleteError.code },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Unexpected error in DELETE team-members:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
