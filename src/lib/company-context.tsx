"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

type Company = {
  id: string;
  name: string;
  logoUrl: string | null;
  headerStyle: "minimal" | "branded";
  brandColor: string | null;
};

type CompanyContextType = {
  activeCompany: Company | null;
  companies: Company[];
  loading: boolean;
  setActiveCompany: (company: Company | null) => void;
  refreshActiveCompany: () => Promise<void>;
  refreshCompanies: () => Promise<void>;
};

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeCompany, setActiveCompanyState] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      // Fetch all companies the user owns
      // Try with branding columns first, fallback if they don't exist
      let { data: companiesData, error } = await supabase
        .from("companies")
        .select("id, name, logo_url, header_style, brand_color")
        .eq("owner_id", session.user.id)
        .order("created_at", { ascending: false });

      // If branding columns don't exist (migration not run), fetch without them
      if (error && (error.message?.includes("column") || error.message?.includes("does not exist") || error.code === "42703")) {
        console.warn("[company-context] Branding columns not found, fetching without them.");
        const fallbackResult = await supabase
          .from("companies")
          .select("id, name")
          .eq("owner_id", session.user.id)
          .order("created_at", { ascending: false });
        
        // Fix TypeScript error: map fallback data to include required fields with defaults
        if (fallbackResult.error) {
          console.error("Error fetching companies:", fallbackResult.error);
          setLoading(false);
          return;
        }
        
        // Map fallback data to include required fields with null defaults
        companiesData = (fallbackResult.data || []).map((item: { id: string; name: string }) => ({
          id: item.id,
          name: item.name,
          logo_url: null,
          header_style: null,
          brand_color: null,
        })) as typeof companiesData;
        error = null;
      }

      if (error) {
        console.error("Error fetching companies:", error);
        setLoading(false);
        return;
      }

      const mappedCompanies: Company[] = (companiesData || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        logoUrl: c.logo_url || null,
        headerStyle: (c.header_style || "minimal") as "minimal" | "branded",
        brandColor: c.brand_color || null,
      }));

      setCompanies(mappedCompanies);

      // Set active company from URL or localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const companyIdFromUrl = urlParams.get("companyId") || urlParams.get("company");
      
      if (companyIdFromUrl && mappedCompanies.length > 0) {
        const company = mappedCompanies.find(c => c.id === companyIdFromUrl);
        if (company) {
          setActiveCompanyState(company);
          localStorage.setItem("activeCompanyId", company.id);
        }
      } else {
        // Try to restore from localStorage
        const savedCompanyId = localStorage.getItem("activeCompanyId");
        if (savedCompanyId) {
          const company = mappedCompanies.find(c => c.id === savedCompanyId);
          if (company) {
            setActiveCompanyState(company);
          } else if (mappedCompanies.length > 0) {
            // Use first company if saved one doesn't exist
            setActiveCompanyState(mappedCompanies[0]);
            localStorage.setItem("activeCompanyId", mappedCompanies[0].id);
          }
        } else if (mappedCompanies.length > 0) {
          // Use first company if nothing saved
          setActiveCompanyState(mappedCompanies[0]);
          localStorage.setItem("activeCompanyId", mappedCompanies[0].id);
        }
      }

      setLoading(false);
    } catch (err) {
      console.error("Error in fetchCompanies:", err);
      setLoading(false);
    }
  };

  const refreshActiveCompany = async () => {
    if (!activeCompany?.id) return;
    
    try {
      let { data, error } = await supabase
        .from("companies")
        .select("id, name, logo_url, header_style, brand_color")
        .eq("id", activeCompany.id)
        .maybeSingle();

      // If branding columns don't exist, fallback to basic query
      if (error && (error.message?.includes("column") || error.message?.includes("does not exist") || error.code === "42703")) {
        const fallbackResult = await supabase
          .from("companies")
          .select("id, name")
          .eq("id", activeCompany.id)
          .maybeSingle();
        
        // Fix TypeScript error: map fallback data to include required fields with defaults
        if (fallbackResult.error || !fallbackResult.data) {
          console.error("Error refreshing company:", fallbackResult.error);
          return;
        }
        
        // Map fallback data to include required fields with null defaults
        data = {
          id: fallbackResult.data.id,
          name: fallbackResult.data.name,
          logo_url: null,
          header_style: null,
          brand_color: null,
        } as typeof data;
        error = null;
      }

      if (error || !data) {
        console.error("Error refreshing company:", error);
        return;
      }

      const updatedCompany: Company = {
        id: data.id,
        name: data.name,
        logoUrl: data.logo_url || null,
        headerStyle: (data.header_style || "minimal") as "minimal" | "branded",
        brandColor: data.brand_color || null,
      };

      setActiveCompanyState(updatedCompany);

      // Also update in companies list
      setCompanies(prev => prev.map(c => 
        c.id === data.id ? updatedCompany : c
      ));
    } catch (err) {
      console.error("Error refreshing active company:", err);
    }
  };

  const setActiveCompany = (company: Company | null) => {
    setActiveCompanyState(company);
    if (company) {
      localStorage.setItem("activeCompanyId", company.id);
    } else {
      localStorage.removeItem("activeCompanyId");
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Listen to URL changes and update activeCompany accordingly
  useEffect(() => {
    if (companies.length === 0) return;

    const urlCompanyId = searchParams.get("companyId") || searchParams.get("company");
    
    if (urlCompanyId) {
      const company = companies.find(c => c.id === urlCompanyId);
      if (company && company.id !== activeCompany?.id) {
        setActiveCompanyState(company);
        localStorage.setItem("activeCompanyId", company.id);
      }
    }
  }, [pathname, searchParams, companies, activeCompany?.id]);

  return (
    <CompanyContext.Provider
      value={{
        activeCompany,
        companies,
        loading,
        setActiveCompany,
        refreshActiveCompany,
        refreshCompanies: fetchCompanies,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
}
