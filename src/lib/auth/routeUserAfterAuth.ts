/**
 * Shared routing logic after authentication
 * 
 * Single source of truth for routing users after successful login.
 * Used by both email/password login and OAuth callback.
 */

import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Route user to appropriate page after authentication
 * 
 * Routing rules:
 * - If no company -> /overview
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

  // Check if user has a company and its publication status
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, profile_published")
    .eq("owner_id", userId)
    .maybeSingle();

  if (companyError) {
    console.error("[routeUserAfterAuth] Error checking company:", companyError);
    // Default to overview on error
    router.replace("/overview");
    return;
  }

  // Debug logging (no secrets)
  console.log("[Auth] company routing:", {
    hasCompany: !!company?.id,
    profile_published: company?.profile_published,
  });

  // Routing rules
  if (!company?.id) {
    // No company → overview (user can create company from there)
    console.log("[routeUserAfterAuth] No company found, routing to overview:", userId);
    router.replace("/overview");
    return;
  }

  if (company.profile_published === false) {
    // Company exists but not published → company profile (edit mode)
    console.log(
      "[routeUserAfterAuth] Company not published, routing to company-profile:",
      userId
    );
    router.replace("/company-profile");
    return;
  }

  // Company exists and published → company dashboard (company overview)
  console.log(
    "[routeUserAfterAuth] Company published, routing to company-dashboard:",
    userId,
    company.id
  );
  router.replace(`/company-dashboard?companyId=${company.id}`);
}
