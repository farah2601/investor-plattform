"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../app/lib/supabaseClient";

/**
 * Post-auth routing logic:
 * - No company → /onboarding
 * - Company but profile_published = false → /company-profile
 * - Company and profile_published = true → /company-dashboard
 */
export default function PostAuthPage() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Not logged in → redirect to login
      if (!session?.user) {
        router.replace("/login");
        return;
      }

      // Check if user has a company and its publication status
      const { data: company } = await supabase
        .from("companies")
        .select("id, profile_published")
        .eq("owner_id", session.user.id)
        .maybeSingle();

      // No company → onboarding
      if (!company?.id) {
        router.replace("/onboarding");
        return;
      }

      // Company exists but not published → company profile (edit mode)
      if (company.profile_published === false) {
        router.replace("/company-profile");
        return;
      }

      // Company exists and published → dashboard
      router.replace("/company-dashboard");
    };

    run();
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
      <p className="text-sm text-slate-400">Loading…</p>
    </main>
  );
}