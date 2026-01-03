"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  async function handleGoogleOAuth() {
    setError(null);
    setOauthLoading(true);

    const origin = window.location.origin;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setOauthLoading(false);
    }
    // Note: If successful, user will be redirected to OAuth provider,
    // then back to /auth/callback, so we don't need to handle success here
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
    <main className="min-h-screen bg-[#050712] text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-[#0B0E17] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="text-sm text-slate-400">
            Enter your email and password to access your dashboard.
          </p>
        </header>

        {/* OAuth button */}
        <Button
          type="button"
          onClick={handleGoogleOAuth}
          disabled={loading || oauthLoading}
          className="w-full bg-white hover:bg-white/90 text-slate-900 font-medium flex items-center justify-center gap-3"
        >
          {oauthLoading ? (
            "Connecting..."
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
            <div className="w-full border-t border-slate-700"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#0B0E17] px-2 text-slate-500">Or</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-slate-400">Email</label>
            <Input
              type="email"
              required
              className="bg-slate-900 border-slate-700"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400">Password</label>
            <Input
              type="password"
              required
              className="bg-slate-900 border-slate-700"
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

          <Button
            type="submit"
            className="w-full bg-[#2B74FF] hover:bg-[#2B74FF]/90"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="text-xs text-slate-500 text-center">
          If you signed up with Google, use Google to sign in again.
        </p>

        <p className="text-xs text-slate-500 text-center">
          Don't have an account?{" "}
          <a href="/sign-up" className="text-[#2B74FF] hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </main>
  );
}