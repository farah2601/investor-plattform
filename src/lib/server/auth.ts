/**
 * Server-side authentication helper for API routes
 * Uses Bearer token authentication (no cookies)
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Get authenticated user from Bearer token
 * Uses Supabase Admin to verify token
 */
export async function getAuthenticatedUser(req: Request): Promise<{
  user: { id: string; email?: string } | null;
  error: string | null;
}> {
  // Read Authorization header (case-insensitive)
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) {
    return { user: null, error: "Missing Authorization header" };
  }

  // Extract Bearer token
  if (!auth.startsWith("Bearer ") && !auth.startsWith("bearer ")) {
    return { user: null, error: "Invalid Authorization header format" };
  }

  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return { user: null, error: "Missing token in Authorization header" };
  }

  // Verify token using Supabase Admin
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    return { user: null, error: "Invalid or expired token" };
  }

  return { user: { id: data.user.id, email: data.user.email }, error: null };
}

/**
 * Verify user has access to company
 * Checks company_members table first, falls back to companies.owner_id
 */
export async function verifyCompanyAccess(
  userId: string,
  companyId: string
): Promise<{ ok: boolean; error: string | null }> {
  try {
    // First, check if company_members table exists by trying to query it
    const { data: membersData, error: membersError } = await supabaseAdmin
      .from("company_members")
      .select("company_id")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .maybeSingle();

    // If table exists and we found a matching record, grant access
    if (!membersError && membersData) {
      return { ok: true, error: null };
    }

    // If table doesn't exist (PostgreSQL error code 42P01), fall back to owner_id check
    const isTableNotFound = 
      membersError?.code === "42P01" || 
      membersError?.message?.includes("does not exist") ||
      (membersError?.message?.includes("relation") && membersError?.message?.includes("does not exist"));

    if (isTableNotFound) {
      // Check owner_id in companies table
      const { data: companyData, error: companyError } = await supabaseAdmin
        .from("companies")
        .select("id, owner_id")
        .eq("id", companyId)
        .maybeSingle();

      if (companyError) {
        console.error("[auth] Error checking company:", companyError);
        return { ok: false, error: "Failed to verify company access" };
      }

      if (!companyData) {
        return { ok: false, error: "Company not found" };
      }

      // If company has owner_id, check if it matches
      if (companyData.owner_id && companyData.owner_id === userId) {
        return { ok: true, error: null };
      }

      // If no owner_id, allow access for backward compatibility (temporary)
      // TODO: Require owner_id to be set in production
      if (!companyData.owner_id) {
        console.warn(`[auth] Company ${companyId} has no owner_id, allowing access for ${userId} (backward compatibility)`);
        return { ok: true, error: null };
      }

      return { ok: false, error: "You don't have access to this company" };
    }

    // If membersError but table exists (e.g., column doesn't exist), log and fall back to owner_id
    if (membersError) {
      console.warn("[auth] company_members query failed, falling back to owner_id:", membersError.message);
      
      // Fall back to owner_id check
      const { data: companyData, error: companyError } = await supabaseAdmin
        .from("companies")
        .select("id, owner_id")
        .eq("id", companyId)
        .maybeSingle();

      if (companyError) {
        console.error("[auth] Error checking company:", companyError);
        return { ok: false, error: "Failed to verify company access" };
      }

      if (!companyData) {
        return { ok: false, error: "Company not found" };
      }

      // If company has owner_id, check if it matches
      if (companyData.owner_id && companyData.owner_id === userId) {
        return { ok: true, error: null };
      }

      // If no owner_id, allow access for backward compatibility
      if (!companyData.owner_id) {
        console.warn(`[auth] Company ${companyId} has no owner_id, allowing access for ${userId} (backward compatibility)`);
        return { ok: true, error: null };
      }

      return { ok: false, error: "You don't have access to this company" };
    }

    // If no data found in company_members and no error, deny access
    return { ok: false, error: "You don't have access to this company" };
  } catch (err: any) {
    console.error("[auth] Error verifying company access:", err);
    return { ok: false, error: "Failed to verify access" };
  }
}

/**
 * Combined helper: Get user and verify company access
 * Returns NextResponse if auth fails, null if successful
 */
export async function requireAuthAndCompanyAccess(
  req: Request,
  companyId: string
): Promise<{
  user: { id: string; email?: string } | null;
  res: NextResponse | null;
}> {
  const { user, error: authError } = await getAuthenticatedUser(req);

  if (authError || !user) {
    return {
      user: null,
      res: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }),
    };
  }

  const access = await verifyCompanyAccess(user.id, companyId);

  if (!access.ok) {
    const statusCode = access.error?.includes("not found") ? 404 : 403;
    return {
      user: null,
      res: NextResponse.json({ ok: false, error: access.error || "Forbidden" }, { status: statusCode }),
    };
  }

  return { user, res: null };
}
