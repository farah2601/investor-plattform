"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    async function doLogout() {
      // 1) Logg ut i Supabase
      await supabase.auth.signOut();
      // 2) Send bruker til login
      router.replace("/login");
    }

    doLogout();
  }, [router]);

  return (
    <main className="min-h-screen bg-[#050712] text-slate-50 flex items-center justify-center px-4">
      <div className="text-sm text-slate-400">
        Logger deg ut…
      </div>
    </main>
  );
}