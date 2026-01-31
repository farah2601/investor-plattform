/**
 * Shared routing logic after authentication
 * 
 * Single source of truth for routing users after successful login.
 * Used by both email/password login and OAuth callback.
 */

import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { SupabaseClient } from "@supabase/supabase-js";

type CompanyRow = {
  id: string;
  profile_published: boolean | null;
};

/**
 * Get the primary (newest) company for a user
 * Uses companies.owner_id as the source of truth
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID to check
 * @returns The newest company owned by the user, or null if none exists
 */
async function getUserPrimaryCompany(
  supabase: SupabaseClient,
  userId: string
): Promise<CompanyRow | null> {
  const { data, error } = await supabase
    .from("companies")
    .select("id, profile_published")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[getUserPrimaryCompany] Error fetching company:", error);
    return null;
  }

  // Read from array instead of using .single() or .maybeSingle()
  return (data?.[0] ?? null) as CompanyRow | null;
}

/**
 * Route user to appropriate page after authentication
 * 
 * Routing rules:
 * - If no company -> /onboarding
 * - If company exists but profile_published === false -> /company-profile
 * - If company exists and profile_published === true -> /company-dashboard?companyId=<id>
 */
export async function routeUserAfterAuth(
  router: AppRouterInstance,
  supabase: SupabaseClient
): Promise<void> {
  // Get session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error("[routeUserAfterAuth] Failed to get session:", sessionError);
    router.replace("/login?error=session_error");
    return;
  }

  if (!session?.user) {
    console.error("[routeUserAfterAuth] No session found");
    router.replace("/login");
    return;
  }

  const userId = session.user.id;

  // Check if user has a company using robust query (handles multiple companies)
  const company = await getUserPrimaryCompany(supabase, userId);

  // Count total companies for logging (optional, but helpful for debugging)
  const { data: allCompanies, error: countError } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_id", userId);

  const companiesFound = allCompanies?.length ?? 0;
  const selectedCompanyId = company?.id ?? null;

  // Debug logging (no secrets, no raw data)
  console.log("[routeUserAfterAuth] routing decision:", {
    userId,
    companiesFound,
    selectedCompanyId,
    profile_published: company?.profile_published ?? null,
  });

  // Routing rules
  if (!company?.id) {
    // No company → onboarding (user can create company from there)
    console.log("[routeUserAfterAuth] No company found, routing to onboarding");
    router.replace("/onboarding");
    return;
  }

  if (company.profile_published === false) {
    // Company exists but not published → company profile (edit mode)
    console.log(
      "[routeUserAfterAuth] Company not published, routing to company-profile:",
      selectedCompanyId
    );
    router.replace("/company-profile");
    return;
  }

  // Company exists and published → company dashboard
  console.log(
    "[routeUserAfterAuth] Company published, routing to company-dashboard:",
    selectedCompanyId
  );
  router.replace(`/company-dashboard?companyId=${company.id}`);
}
