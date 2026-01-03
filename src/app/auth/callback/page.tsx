"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

/**
 * OAuth callback handler
 * - New user (no company) → /onboarding
 * - Existing user → /company-dashboard
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");

      // 1. OAuth redirect (Google)
      if (code) {
        const { data, error } =
          await supabase.auth.exchangeCodeForSession(code);

        if (error || !data?.session?.user) {
          console.error("OAuth error:", error);
          router.replace("/login");
          return;
        }

        await routeUser(data.session.user.id);
        return;
      }

      // 2. Normal session refresh / reload
      const { data, error } = await supabase.auth.getSession();

      if (error || !data?.session?.user) {
        router.replace("/login");
        return;
      }

      await routeUser(data.session.user.id);
    };

    const routeUser = async (userId: string) => {
      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", userId)
        .maybeSingle();

      if (company?.id) {
        router.replace("/company-dashboard");
      } else {
        router.replace("/onboarding");
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#050712] text-slate-400">
      Completing sign in…
    </main>
  );
}