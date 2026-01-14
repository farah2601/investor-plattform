"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeoutMessage, setTimeoutMessage] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const oauthStartTimeRef = useRef<number | null>(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  // Check if user is already logged in and redirect them
  useEffect(() => {
    const checkSession = async () => {
      if (!isSupabaseConfigured()) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // User is already logged in, redirect through callback for proper routing
          console.log("[Login] User already logged in, redirecting to callback");
          router.replace("/auth/callback");
        }
      } catch (err) {
        console.error("[Login] Error checking session:", err);
        // Continue with login page if there's an error
      }
    };

    checkSession();
  }, [router]);

  // Check for error query params from callback redirect
  useEffect(() => {
    const errorParam = searchParams.get("error");
    const details = searchParams.get("details");
    
    if (errorParam) {
      let errorMessage = "Authentication failed. Please try again.";
      
      if (errorParam === "oauth_failed") {
        errorMessage = details 
          ? `Google sign-in failed: ${decodeURIComponent(details)}`
          : "Google sign-in failed. Please try again.";
      } else if (errorParam === "session_error") {
        errorMessage = "Session error. Please sign in again.";
      } else if (errorParam === "config_missing") {
        errorMessage = "Configuration error. Please contact support.";
      }
      
      setError(errorMessage);
      // Reset OAuth loading if we get an error
      setOauthLoading(false);
    }
  }, [searchParams]);

  // Reset OAuth loading when pathname changes away from login
  useEffect(() => {
    if (pathname !== "/login" && oauthLoading) {
      console.log("[Login] Pathname changed away from /login, resetting OAuth loading");
      setOauthLoading(false);
      oauthStartTimeRef.current = null;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [pathname, oauthLoading]);

  // Reset OAuth loading when user comes back (focus, visibility, popstate)
  useEffect(() => {
    const resetOAuthLoading = () => {
      // Only reset if we're still on login page and OAuth is loading
      // and we don't have a code in URL (which means we're in callback)
      if (pathname === "/login" && oauthLoading) {
        const code = searchParams.get("code");
        if (!code) {
          console.log("[Login] User returned, resetting OAuth loading");
          setOauthLoading(false);
          oauthStartTimeRef.current = null;
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
        }
      }
    };

    // Window focus (user switches back to tab)
    const handleFocus = () => {
      resetOAuthLoading();
    };

    // Visibility change (user switches tabs/windows)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        resetOAuthLoading();
      }
    };

    // Popstate (user presses back button)
    const handlePopState = () => {
      resetOAuthLoading();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [pathname, oauthLoading, searchParams]);

  // Timeout safety: reset loading after 12 seconds
  useEffect(() => {
    if (oauthLoading) {
      // Start timeout
      oauthStartTimeRef.current = Date.now();
      timeoutRef.current = setTimeout(() => {
        console.log("[Login] OAuth timeout (12s), resetting loading");
        setOauthLoading(false);
        setTimeoutMessage("Login cancelled. Try again.");
        oauthStartTimeRef.current = null;
        // Clear timeout message after 5 seconds
        setTimeout(() => {
          setTimeoutMessage(null);
        }, 5000);
      }, 12000);
    } else {
      // Clear timeout if loading stops
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      oauthStartTimeRef.current = null;
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [oauthLoading]);

  async function handleGoogleOAuth() {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      setError("Authentication is not configured. Please contact support.");
      return;
    }

    setError(null);
    setOauthLoading(true);

    try {
      // Always use window.location.origin for redirectTo (never hardcode localhost)
      const origin = window.location.origin;
      const redirectTo = `${origin}/auth/callback`;

      console.log("[Login] Initiating Google OAuth, redirectTo:", redirectTo);

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (oauthError) {
        console.error("[Login] OAuth error:", oauthError);
        setError(oauthError.message || "Failed to connect to Google. Please try again.");
        setOauthLoading(false);
        return;
      }

      // If successful, user will be redirected to OAuth provider,
      // then back to /auth/callback, so we don't need to handle success here
      // The loading state will persist until redirect happens
      console.log("[Login] OAuth initiated successfully, redirecting to:", data?.url);
    } catch (err) {
      console.error("[Login] Unexpected error during OAuth:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
      setOauthLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // After successful login, route through callback for consistent routing logic
    router.push("/auth/callback");
  }

  return (
    <main className="min-h-screen text-slate-50 flex items-center justify-center px-4 relative">
      <div className="w-full max-w-sm">
        {/* Back to home link - repositioned */}
        <Link
          href="/"
          className="inline-flex items-center text-xs text-slate-400 hover:text-slate-200 transition-colors mb-4 group"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            className="w-3 h-3 mr-1.5 group-hover:-translate-x-0.5 transition-transform"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to home
        </Link>

        {/* Card with subtle depth */}
        <div 
          className="relative bg-gradient-to-b from-[#0B0E17]/95 to-[#080B14]/95 border border-white/10 rounded-2xl p-8 shadow-2xl space-y-6 backdrop-blur-sm"
          style={{
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          }}
        >
          <header className="space-y-2">
            <h1 className="text-2xl font-semibold text-white">Welcome back to Valyxo</h1>
            <p className="text-sm text-slate-400">
              Access your investor-ready dashboard
            </p>
          </header>

          {/* OAuth button - dark/glass style */}
          <Button
            type="button"
            onClick={handleGoogleOAuth}
            disabled={loading || oauthLoading || !isSupabaseConfigured()}
            className="w-full bg-slate-900/50 hover:bg-slate-800/60 border border-slate-700/50 text-slate-200 font-medium flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed rounded-md backdrop-blur-sm transition-all"
          >
          {oauthLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Connecting...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </>
          )}
        </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700/50"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gradient-to-b from-[#0B0E17]/95 to-[#080B14]/95 px-3 text-slate-500">Or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium">Email</label>
              <Input
                type="email"
                required
                className="bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-500"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium">Password</label>
              <Input
                type="password"
                required
                className="bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-500"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
              />
            </div>

            {error && (
              <p className="text-xs text-rose-400">
                {error}
              </p>
            )}

            {timeoutMessage && (
              <p className="text-xs text-amber-400">
                {timeoutMessage}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-[#2B74FF] to-[#4D9FFF] hover:from-[#2563EB] hover:to-[#3B82F6] text-white font-medium shadow-lg shadow-[#2B74FF]/20 hover:shadow-[#4D9FFF]/30 transition-all disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="space-y-3 pt-2">
            <p className="text-xs text-slate-500 text-center">
              If you signed up with Google, use Google to sign in again.
            </p>

            <p className="text-xs text-slate-500 text-center">
              Don't have an account?{" "}
              <a href="/sign-up" className="text-[#4D9FFF] hover:text-[#60A5FA] hover:underline transition-colors">
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}