"use client";

import { useEffect, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";

/**
 * OAuth callback handler
 * 
 * This page handles authentication callbacks from:
 * - Google OAuth (redirects with ?code=)
 * - Email/password login (session refresh)
 * 
 * ROUTING LOGIC:
 * - New user (no company) → /onboarding
 * - Existing user (has company) → /company-dashboard
 * 
 * ERROR HANDLING:
 * - OAuth exchange fails → /login?error=oauth_failed&details=...
 * - Session missing → /login
 * - Configuration missing → /login?error=config_missing
 * 
 * SUPABASE AUTH URL CONFIGURATION CHECKLIST:
 * 1. Site URL: https://www.valyxo.com
 * 2. Redirect URLs (in Supabase Dashboard > Authentication > URL Configuration):
 *    - http://localhost:3000/auth/callback (for local development)
 *    - https://www.valyxo.com/auth/callback (for production)
 * 3. Vercel Environment Variables (must be set in Vercel dashboard):
 *    - NEXT_PUBLIC_SUPABASE_URL
 *    - NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        console.error("[AuthCallback] Supabase not configured");
        router.replace("/login?error=config_missing");
        return;
      }

      const code = searchParams.get("code");
      const errorParam = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      // Handle OAuth error from provider
      if (errorParam) {
        console.error("[AuthCallback] OAuth error from provider:", {
          error: errorParam,
          description: errorDescription,
        });
        router.replace(`/login?error=oauth_failed&details=${encodeURIComponent(errorDescription || errorParam)}`);
        return;
      }

      // 1. OAuth redirect (Google) - exchange code for session
      if (code) {
        try {
          const { data, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error("[AuthCallback] Failed to exchange code for session:", exchangeError);
            router.replace(`/login?error=oauth_failed&details=${encodeURIComponent(exchangeError.message)}`);
            return;
          }

          if (!data?.session?.user) {
            console.error("[AuthCallback] No session or user after code exchange");
            router.replace("/login?error=oauth_failed&details=no_session");
            return;
          }

          console.log("[AuthCallback] OAuth successful, routing user:", data.session.user.id);
          await routeUser(data.session.user.id);
          return;
        } catch (err) {
          console.error("[AuthCallback] Unexpected error during code exchange:", err);
          router.replace(`/login?error=oauth_failed&details=${encodeURIComponent(err instanceof Error ? err.message : "unknown_error")}`);
          return;
        }
      }

      // 2. Normal session refresh / reload (email/password login)
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("[AuthCallback] Failed to get session:", sessionError);
          router.replace("/login?error=session_error");
          return;
        }

        if (!data?.session?.user) {
          console.error("[AuthCallback] No session found");
          router.replace("/login");
          return;
        }

        console.log("[AuthCallback] Session found, routing user:", data.session.user.id);
        await routeUser(data.session.user.id);
      } catch (err) {
        console.error("[AuthCallback] Unexpected error during session check:", err);
        router.replace(`/login?error=session_error&details=${encodeURIComponent(err instanceof Error ? err.message : "unknown_error")}`);
      }
    };

    const routeUser = async (userId: string) => {
      try {
        const { data: company, error: companyError } = await supabase
          .from("companies")
          .select("id")
          .eq("owner_id", userId)
          .maybeSingle();

        if (companyError) {
          console.error("[AuthCallback] Error checking company:", companyError);
          // Still route to onboarding if we can't check company
          router.replace("/onboarding");
          return;
        }

        if (company?.id) {
          console.log("[AuthCallback] User has company, routing to dashboard");
          router.replace(`/company-dashboard?companyId=${company.id}`);
        } else {
          console.log("[AuthCallback] User has no company, routing to onboarding");
          router.replace("/onboarding");
        }
      } catch (err) {
        console.error("[AuthCallback] Unexpected error during routing:", err);
        // Default to onboarding on error
        router.replace("/onboarding");
      }
    };

    handleCallback();
  }, [router, searchParams]);

  // Show error message if error state is set (shouldn't happen often, but good UX)
  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#050712] text-slate-400">
        <div className="text-center space-y-4">
          <p className="text-rose-400">Error: {error}</p>
          <button
            onClick={() => router.push("/login")}
            className="text-[#2B74FF] hover:underline"
          >
            Return to login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#050712] text-slate-400">
      Completing sign in…
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-[#050712] text-slate-400">
        Loading…
      </main>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}