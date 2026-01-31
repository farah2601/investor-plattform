"use client";

import { useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation"; 
import Link from "next/link";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";
import { routeUserAfterAuth } from "@/lib/auth/routeUserAfterAuth";

/**
 * OAuth callback handler - Client-side implementation
 * 
 * Handles OAuth redirects with ?code= parameter.
 * After successful exchange, routes user using shared routeUserAfterAuth function.
 * 
 * Anti-loop: Uses useRef to ensure callback logic runs only once.
 */
function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ranRef = useRef<boolean>(false);

  useEffect(() => {
    // Anti-loop: Prevent multiple executions
    if (ranRef.current) {
      return;
    }

    const handleCallback = async () => {
      // Mark as running immediately
      ranRef.current = true;

      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        console.error("[AuthCallback] Supabase not configured");
        router.replace("/login?error=config_missing");
        return;
      }

      const code = searchParams.get("code");
      const errorParam = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      // Debug logging (no secrets)
      console.log("[Auth] callback code?", !!code);

      // Handle OAuth error from provider
      if (errorParam) {
        console.error("[AuthCallback] OAuth error from provider:", {
          error: errorParam,
          description: errorDescription,
        });
        router.replace(
          `/login?error=oauth_failed&details=${encodeURIComponent(errorDescription || errorParam)}`
        );
        return;
      }

      // FLOW 1: OAuth with ?code= parameter
      if (code) {
        try {
          const { data, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error("[AuthCallback] Failed to exchange code for session:", exchangeError);
            router.replace(
              `/login?error=oauth_failed&details=${encodeURIComponent(exchangeError.message)}`
            );
            return;
          }

          if (!data?.session?.user) {
            console.error("[AuthCallback] No session or user after code exchange");
            router.replace("/login?error=oauth_failed&details=no_session");
            return;
          }

          // Remove query string to prevent re-triggering on refresh
          window.history.replaceState({}, "", "/auth/callback");

          // Get session to ensure it's set
          const { data: sessionData } = await supabase.auth.getSession();
          
          // Debug logging
          console.log("[Auth] has session?", !!sessionData?.session?.user);

          if (!sessionData?.session?.user) {
            router.replace("/login?error=oauth_failed&details=no_session");
            return;
          }

          // Route user using shared function
          await routeUserAfterAuth(router, supabase);
          return;
        } catch (err) {
          console.error("[AuthCallback] Unexpected error during code exchange:", err);
          router.replace(
            `/login?error=oauth_failed&details=${encodeURIComponent(
              err instanceof Error ? err.message : "unknown_error"
            )}`
          );
          return;
        }
      }

      // FLOW 2: No code - check if user already has a session (safety fallback)
      // This handles edge cases where user might land here without code
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Debug logging
        console.log("[Auth] has session?", !!session?.user);

        if (session?.user) {
          // User has session, route them
          await routeUserAfterAuth(router, supabase);
          return;
        }

        // No session and no code -> redirect to login
        console.error("[AuthCallback] No code and no session");
        router.replace("/login");
      } catch (err) {
        console.error("[AuthCallback] Unexpected error during session check:", err);
        router.replace("/login");
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <main className="min-h-screen flex items-center justify-center text-slate-400">
      <div className="text-center space-y-4">
        <p>Completing sign in…</p>
        <p className="text-xs text-slate-500">
          If this takes too long,{" "}
          <Link href="/login" className="text-[#2B74FF] hover:underline">
            return to login
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center text-slate-400">
          Loading…
        </main>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}