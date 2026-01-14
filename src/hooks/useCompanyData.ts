import { useState, useEffect } from "react";
import { supabase } from "@/app/lib/supabaseClient";

export type CompanyData = {
  id: string;
  name: string;
  google_sheets_url: string | null;
  google_sheets_tab: string | null;
  google_sheets_last_sync_at: string | null;
  last_agent_run_at: string | null;
  mrr: number | null;
  arr: number | null;
  burn_rate: number | null;
  runway_months: number | null;
  churn: number | null;
  growth_percent: number | null;
};

export type InvestorRequest = {
  id: string;
  status: string;
  investor_name: string;
  investor_email: string;
  created_at: string;
  company_id: string;
};

export type InvestorLink = {
  id: string;
  access_token: string;
  expires_at: string | null;
  request_id: string | null;
  company_id: string;
};

export type CompanyOverviewData = {
  company: CompanyData | null;
  investorRequests: InvestorRequest[];
  investorLinks: InvestorLink[];
  loading: boolean;
  error: string | null;
};

/**
 * Shared hook to fetch company data, investor requests, and links.
 * Reuses the same data fetching logic as the dashboard.
 * 
 * Data sources:
 * - Company data: companies table (same fields as dashboard uses via /api/companies/[id])
 * - Investor requests: access_requests table filtered by company_id
 * - Investor links: investor_links table filtered by company_id
 */
export function useCompanyData(companyId: string | null): CompanyOverviewData {
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [investorRequests, setInvestorRequests] = useState<InvestorRequest[]>([]);
  const [investorLinks, setInvestorLinks] = useState<InvestorLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch company data - same fields as dashboard uses
        // Dashboard fetches via /api/companies/[id] which returns these fields
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select("id, name, google_sheets_url, google_sheets_tab, google_sheets_last_sync_at, last_agent_run_at, mrr, arr, burn_rate, runway_months, churn, growth_percent")
          .eq("id", companyId)
          .maybeSingle();

        if (companyError) {
          console.error("Error loading company:", companyError);
          setError(companyError.message);
          setLoading(false);
          return;
        }

        if (!companyData) {
          setError("Company not found");
          setLoading(false);
          return;
        }

        setCompany(companyData as CompanyData);

        // Fetch investor requests and links - same logic as dashboard but filtered by company
        // Dashboard fetches all requests/links, but for overview we filter by company_id
        const [requestsRes, linksRes] = await Promise.all([
          supabase
            .from("access_requests")
            .select("id, status, investor_name, investor_email, created_at, company_id")
            .eq("company_id", companyId)
            .order("created_at", { ascending: false }),
          supabase
            .from("investor_links")
            .select("id, access_token, expires_at, request_id, company_id")
            .eq("company_id", companyId)
        ]);

        if (requestsRes.error) {
          console.error("Error loading investor requests:", requestsRes.error);
        } else {
          setInvestorRequests((requestsRes.data as InvestorRequest[]) || []);
        }

        if (linksRes.error) {
          console.error("Error loading investor links:", linksRes.error);
        } else {
          setInvestorLinks((linksRes.data as InvestorLink[]) || []);
        }
      } catch (err) {
        console.error("Error in loadData:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [companyId]);

  return {
    company,
    investorRequests,
    investorLinks,
    loading,
    error,
  };
}
