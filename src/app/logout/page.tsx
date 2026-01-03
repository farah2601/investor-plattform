"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    async function doLogout() {
      // Sign out from Supabase
      await supabase.auth.signOut();
      // Redirect to login
      router.replace("/login");
    }

    doLogout();
  }, [router]);

  return (
    <main className="min-h-screen bg-[#050712] text-slate-50 flex items-center justify-center px-4">
      <div className="text-sm text-slate-400">
        Signing out…
      </div>
    </main>
  );
}