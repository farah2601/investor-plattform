"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/app/lib/supabaseClient";

export type UserCompany = {
  id: string;
  name: string;
  logoUrl: string | null;
  headerStyle: "minimal" | "branded";
  brandColor: string | null;
};

type UserCompanyContextType = {
  company: UserCompany | null;
  loading: boolean;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
};

const UserCompanyContext = createContext<UserCompanyContextType | undefined>(undefined);

/**
 * Fetches the authenticated user's company (first company they own).
 * No switching, no companyId in URL – one company per user.
 */
export function UserCompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<UserCompany | null>(null);
  const [loading, setLoading] = useState(true);

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchUserCompany = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsAuthenticated(false);
        setCompany(null);
        setLoading(false);
        return;
      }
      setIsAuthenticated(true);

      let { data: row, error } = await supabase
        .from("companies")
        .select("id, name, logo_url, header_style, brand_color")
        .eq("owner_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && (error.message?.includes("column") || error.message?.includes("does not exist") || error.code === "42703")) {
        const fallback = await supabase
          .from("companies")
          .select("id, name")
          .eq("owner_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (fallback.error || !fallback.data) {
          setCompany(null);
          setLoading(false);
          return;
        }
        row = {
          ...fallback.data,
          logo_url: null,
          header_style: null,
          brand_color: null,
        } as typeof row;
        error = null;
      }

      if (error || !row) {
        setCompany(null);
        setLoading(false);
        return;
      }

      setCompany({
        id: row.id,
        name: row.name,
        logoUrl: row.logo_url ?? null,
        headerStyle: (row.header_style || "minimal") as "minimal" | "branded",
        brandColor: row.brand_color ?? null,
      });
    } catch (err) {
      console.error("Error fetching user company:", err);
      setCompany(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserCompany();
  }, []);

  return (
    <UserCompanyContext.Provider value={{ company, loading, isAuthenticated, refresh: fetchUserCompany }}>
      {children}
    </UserCompanyContext.Provider>
  );
}

export function useUserCompany() {
  const ctx = useContext(UserCompanyContext);
  if (ctx === undefined) {
    throw new Error("useUserCompany must be used within UserCompanyProvider");
  }
  return ctx;
}
