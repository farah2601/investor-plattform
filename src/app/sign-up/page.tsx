"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password length
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    // Sign up user
    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // After successful sign-up, redirect to onboarding
    router.push("/onboarding");
  }

  return (
    <main className="min-h-screen bg-[#050712] text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-[#0B0E17] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">Sign up</h1>
          <p className="text-sm text-slate-400">
            Create an account to get started with Valyxo.
          </p>
        </header>

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

          <div className="space-y-2">
            <label className="text-xs text-slate-400">Confirm Password</label>
            <Input
              type="password"
              required
              className="bg-slate-900 border-slate-700"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm((f) => ({ ...f, confirmPassword: e.target.value }))
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
            {loading ? "Creating account..." : "Sign up"}
          </Button>
        </form>

        <p className="text-xs text-slate-500 text-center">
          Already have an account?{" "}
          <a href="/login" className="text-[#2B74FF] hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}

