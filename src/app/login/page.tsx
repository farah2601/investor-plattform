"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

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

    // Innlogging OK → videre til dashboard
    router.push("/company-dashboard");
  }

  return (
    <main className="min-h-screen bg-[#050712] text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-[#0B0E17] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">Logg inn</h1>
          <p className="text-sm text-slate-400">
            Skriv inn e-post og passord for å åpne dashboardet.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-slate-400">E-post</label>
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
            <label className="text-xs text-slate-400">Passord</label>
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
            className="w-full bg-emerald-600 hover:bg-emerald-500"
            disabled={loading}
          >
            {loading ? "Logger inn..." : "Logg inn"}
          </Button>
        </form>

        <p className="text-[11px] text-slate-500">
          (MVP: Bruker opprettes manuelt i Supabase under{" "}
          <b>Auth → Users</b>.)
        </p>
      </div>
    </main>
  );
}