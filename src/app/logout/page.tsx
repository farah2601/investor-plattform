"use client";

import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function LogoutPage() {
  useEffect(() => {
    async function doLogout() {
      try {
        await supabase.auth.signOut();
      } finally {
        window.location.replace("/login");
      }
    }

    doLogout();
  }, []);

  return (
    <main className="min-h-screen text-slate-50 flex items-center justify-center px-4">
      <div className="text-sm text-slate-400">
        Signing out…
      </div>
    </main>
  );
}