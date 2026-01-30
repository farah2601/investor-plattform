"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { cn } from "@/lib/utils";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

type Company = {
  id: string;
  name: string | null;
  industry: string | null;
  google_sheets_url?: string | null;
  google_sheets_tab?: string | null;
  google_sheets_last_sync_at?: string | null;
  last_agent_run_at?: string | null;
  created_at?: string | null;
};

type AccessRequest = {
  id: string;
  investor_name?: string | null;
  investor_email?: string | null;
  status?: string | null;
  company_id: string | null;
  created_at?: string | null;
  companies?: { name: string } | null;
};

type InvestorLink = {
  id: string;
  access_token: string;
  expires_at: string | null;
  created_at?: string | null;
  company_id: string | null;
  request_id?: string | null;
};

type AdminSection = "access" | "companies" | "risk" | "system";

function hasGoogleSheets(company: { google_sheets_url?: string | null; google_sheets_tab?: string | null }): boolean {
  if (!company.google_sheets_url) return false;
  try {
    const parsed = JSON.parse(company.google_sheets_url);
    return Array.isArray(parsed) ? parsed.length > 0 : !!(company.google_sheets_url && company.google_sheets_tab);
  } catch {
    return !!(company.google_sheets_url && company.google_sheets_tab);
  }
}

const ADMIN_CODE = process.env.NEXT_PUBLIC_ADMIN_CODE || "admin2024"; // Fallback kode

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSection>("access");
  const [state, setState] = useState<"loading" | "idle">("loading");
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [links, setLinks] = useState<InvestorLink[]>([]);

  const [companyFilter, setCompanyFilter] = useState<"all" | "warning" | "error" | "no-data">("all");
  const [showAllRequests, setShowAllRequests] = useState(false);
  
  const REQUEST_DISPLAY_LIMIT = 10;
  const displayedRequests = showAllRequests ? requests : requests.slice(0, REQUEST_DISPLAY_LIMIT);

  // Check if admin is already authenticated (sessionStorage)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const authStatus = sessionStorage.getItem("admin_authenticated");
      if (authStatus === "true") {
        setIsAuthenticated(true);
      }
    }
  }, []);

  const handleAdminCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError(null);

    if (adminCode === ADMIN_CODE) {
      setIsAuthenticated(true);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("admin_authenticated", "true");
      }
    } else {
      setCodeError("Incorrect admin code");
      setAdminCode("");
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadAdminData = async () => {
      try {
        setState("loading");
        setError(null);

        const nowIso = new Date().toISOString();

        const [
          { data: companiesData, error: companiesError },
          { data: requestsData, error: requestsError },
          { data: linksData, error: linksError },
        ] = await Promise.all([
          supabase
            .from("companies")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("access_requests")
            .select("*, companies(name)")
            .order("created_at", { ascending: false }),
          supabase
            .from("investor_links")
            .select("*")
            .order("created_at", { ascending: false }),
        ]);

        if (cancelled) return;

        if (companiesError || requestsError || linksError) {
          console.error("Admin dashboard error:", {
            companiesError,
            requestsError,
            linksError,
          });

          const firstError =
            companiesError?.message ||
            requestsError?.message ||
            linksError?.message ||
            "Could not load admin data from Supabase.";

          setError(firstError);
          setState("idle");
          return;
        }

        setCompanies((companiesData as Company[]) ?? []);
        setRequests((requestsData as AccessRequest[]) ?? []);
        setLinks((linksData as InvestorLink[]) ?? []);
        setState("idle");
      } catch (err: any) {
        if (cancelled) return;
        console.error("Admin dashboard unexpected error:", err);
        setError(
          typeof err?.message === "string"
            ? err.message
            : "Could not load admin data.",
        );
        setState("idle");
      }
    };

    loadAdminData();

    return () => {
      cancelled = true;
    };
  }, []);

  // Company name map
  const companyNameById = new Map<string, string>(
    companies.map((c) => [c.id, c.name ?? "Unknown company"]),
  );

  // Filtered companies based on status
  const filteredCompanies = companies.filter((company) => {
    if (companyFilter === "all") return true;
    
    const hasData = company.google_sheets_last_sync_at || company.last_agent_run_at;
    const hasConnection = hasGoogleSheets(company);
    
    if (companyFilter === "no-data") return !hasData;
    if (companyFilter === "error") return false; // TODO: Implement error detection
    if (companyFilter === "warning") {
      const lastSync = company.google_sheets_last_sync_at 
        ? new Date(company.google_sheets_last_sync_at) 
        : null;
      const daysSinceSync = lastSync 
        ? (Date.now() - lastSync.getTime()) / (1000 * 60 * 60 * 24)
        : null;
      return hasConnection && (daysSinceSync === null || daysSinceSync > 7);
    }
    
    return true;
  });

  // Status counts
  const pendingRequests = requests.filter((r) => r.status === "pending").length;
  const approvedRequests = requests.filter((r) => r.status === "approved").length;
  const rejectedRequests = requests.filter((r) => r.status === "rejected").length;
  const activeLinks = links.filter((l) => {
    if (!l.expires_at) return true;
    return new Date(l.expires_at) > new Date();
  }).length;
  const expiredLinks = links.length - activeLinks;

  // High-view links (more than 10 views - mock data for now)
  const highViewLinks = links.slice(0, 3); // Placeholder

  async function handleRequestAction(requestId: string, action: "approve" | "reject") {
    const { error } = await supabase
      .from("access_requests")
      .update({ status: action === "approve" ? "approved" : "rejected" })
      .eq("id", requestId);

    if (error) {
      alert("Error: " + error.message);
      return;
    }

    // Reload data
    window.location.reload();
  }

  async function handleRevokeLink(linkId: string) {
    if (!confirm("Revoke this investor link? This will immediately prevent access.")) {
      return;
    }

    const { error } = await supabase
      .from("investor_links")
      .update({ expires_at: new Date().toISOString() })
      .eq("id", linkId);

    if (error) {
      alert("Error: " + error.message);
      return;
    }

    window.location.reload();
  }

  // Show admin code entry if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center">
        <div className="w-full max-w-md px-4">
          <div className="border border-slate-200 rounded-xl bg-white shadow-sm p-8">
            <h1 className="text-2xl font-semibold text-slate-900 mb-2">Admin Access</h1>
            <p className="text-sm text-slate-600 mb-6">Enter admin code to continue</p>
            <form onSubmit={handleAdminCodeSubmit} className="space-y-4">
              <div>
                <Input
                  type="password"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  placeholder="Enter admin code"
                  className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                  autoFocus
                />
                {codeError && (
                  <p className="mt-2 text-sm text-red-600">{codeError}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full bg-[#2B74FF] hover:bg-[#2563EB] text-white"
              >
                Authenticate
              </Button>
            </form>
            <div className="mt-6 text-center">
              <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
                ← Back to homepage
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r border-slate-200 bg-white min-h-screen sticky top-0 shadow-sm">
          <div className="p-6 border-b border-slate-200">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <span className="text-lg">⌂</span>
              <span className="text-sm text-slate-600 hover:text-slate-900">Home</span>
            </Link>
            <h1 className="text-xl font-semibold text-slate-900">Admin Panel</h1>
            <p className="text-xs text-slate-600 mt-1">Control Center</p>
          </div>

          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveSection("access")}
              className={cn(
                "w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                activeSection === "access"
                  ? "bg-[#2B74FF]/10 text-[#2B74FF] border border-[#2B74FF]/30"
                  : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              Access Control
            </button>
            <button
              onClick={() => setActiveSection("companies")}
              className={cn(
                "w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                activeSection === "companies"
                  ? "bg-[#2B74FF]/10 text-[#2B74FF] border border-[#2B74FF]/30"
                  : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              Companies
            </button>
            <button
              onClick={() => setActiveSection("risk")}
              className={cn(
                "w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                activeSection === "risk"
                  ? "bg-[#2B74FF]/10 text-[#2B74FF] border border-[#2B74FF]/30"
                  : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              Risk & Security
            </button>
            <button
              onClick={() => setActiveSection("system")}
              className={cn(
                "w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                activeSection === "system"
                  ? "bg-[#2B74FF]/10 text-[#2B74FF] border border-[#2B74FF]/30"
                  : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              System Tools
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 bg-slate-50">
          {error && (
            <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Access Control Section */}
          {activeSection === "access" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">Access Control</h2>
                <p className="text-sm text-slate-600">Control who sees what across the platform</p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatusCard label="Pending Requests" value={pendingRequests} variant="warning" />
                <StatusCard label="Approved Requests" value={approvedRequests} variant="success" />
                <StatusCard label="Active Links" value={activeLinks} variant="info" />
                <StatusCard label="Expired Links" value={expiredLinks} variant="neutral" />
              </div>

              {/* Investor Requests */}
              <div className="border border-slate-200 rounded-xl bg-white shadow-sm">
                <div className="border-b border-slate-200 p-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">Investor Requests</h3>
                    <p className="text-xs text-slate-600">Manage access requests from investors</p>
                  </div>
                  {requests.length > REQUEST_DISPLAY_LIMIT && (
                    <span className="text-xs text-slate-600">
                      Showing {displayedRequests.length} of {requests.length}
                    </span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Investor</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Company</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Requested</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {state === "loading" ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-600">Loading…</td>
                        </tr>
                      ) : requests.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-600">No requests</td>
                        </tr>
                      ) : (
                        displayedRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-slate-900">{req.investor_name || "Unknown"}</div>
                              <div className="text-xs text-slate-600">{req.investor_email || "—"}</div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {companyNameById.get(req.company_id || "") || "Unknown company"}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={req.status || "pending"} />
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600">
                              {req.created_at ? new Date(req.created_at).toLocaleDateString() : "—"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {req.status === "pending" && (
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleRequestAction(req.id, "approve")}
                                    className="h-7 px-3 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleRequestAction(req.id, "reject")}
                                    className="h-7 px-3 text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}
                              {req.status === "approved" && (
                                <span className="text-xs text-slate-500">Approved</span>
                              )}
                              {req.status === "rejected" && (
                                <span className="text-xs text-slate-500">Rejected</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {requests.length > REQUEST_DISPLAY_LIMIT && (
                  <div className="border-t border-slate-200 p-4 text-center">
                    <Button
                      variant="outline"
                      onClick={() => setShowAllRequests(!showAllRequests)}
                      className="text-sm bg-white hover:bg-slate-50 text-slate-700 border-slate-300"
                    >
                      {showAllRequests ? "Show less" : `Show all ${requests.length} requests`}
                    </Button>
                  </div>
                )}
              </div>

              {/* Active Investor Links */}
              <div className="border border-slate-200 rounded-xl bg-white shadow-sm">
                <div className="border-b border-slate-200 p-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">Active Investor Links</h3>
                  <p className="text-xs text-slate-600">Token-based access links for investors</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Token</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Company</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Expires</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {state === "loading" ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-600">Loading…</td>
                        </tr>
                      ) : links.filter(l => !l.expires_at || new Date(l.expires_at) > new Date()).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-600">No active links</td>
                        </tr>
                      ) : (
                        links
                          .filter(l => !l.expires_at || new Date(l.expires_at) > new Date())
                          .map((link) => (
                            <tr key={link.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3">
                                <code className="text-xs font-mono text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                                  {link.access_token.slice(0, 12)}…
                                </code>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-700">
                                {companyNameById.get(link.company_id || "") || "Unknown company"}
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-600">
                                {link.expires_at ? new Date(link.expires_at).toLocaleDateString() : "Never"}
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge 
                                  status={link.expires_at && new Date(link.expires_at) > new Date() ? "active" : "expired"} 
                                />
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button
                                  size="sm"
                                  onClick={() => handleRevokeLink(link.id)}
                                  className="h-7 px-3 text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
                                >
                                  Revoke
                                </Button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Companies Operations Section */}
          {activeSection === "companies" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900 mb-2">Company Operations</h2>
                  <p className="text-sm text-slate-600">Monitor data quality & sync status</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={companyFilter === "all" ? "default" : "outline"}
                    onClick={() => setCompanyFilter("all")}
                    className={companyFilter === "all" ? "bg-[#2B74FF] text-white border-[#2B74FF]" : "bg-white border-slate-300 text-slate-700"}
                  >
                    All
                  </Button>
                  <Button
                    size="sm"
                    variant={companyFilter === "warning" ? "default" : "outline"}
                    onClick={() => setCompanyFilter("warning")}
                    className={companyFilter === "warning" ? "bg-amber-500 text-white border-amber-500" : "bg-white border-slate-300 text-slate-700"}
                  >
                    Needs Attention
                  </Button>
                  <Button
                    size="sm"
                    variant={companyFilter === "no-data" ? "default" : "outline"}
                    onClick={() => setCompanyFilter("no-data")}
                    className={companyFilter === "no-data" ? "bg-red-500 text-white border-red-500" : "bg-white border-slate-300 text-slate-700"}
                  >
                    No Data
                  </Button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Company</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Sync Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Last Sync</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Last Agent Run</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Health</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {state === "loading" ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-600">Loading…</td>
                        </tr>
                      ) : filteredCompanies.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-600">No companies found</td>
                        </tr>
                      ) : (
                        filteredCompanies.map((company) => {
                          const lastSync = company.google_sheets_last_sync_at
                            ? new Date(company.google_sheets_last_sync_at)
                            : null;
                          const lastAgent = company.last_agent_run_at
                            ? new Date(company.last_agent_run_at)
                            : null;
                          const daysSinceSync = lastSync
                            ? (Date.now() - lastSync.getTime()) / (1000 * 60 * 60 * 24)
                            : null;
                          const hasConnection = hasGoogleSheets(company);
                          const hasData = lastSync || lastAgent;

                          let healthStatus: "healthy" | "warning" | "broken" = "healthy";
                          if (!hasData) {
                            healthStatus = "broken";
                          } else if (hasConnection && daysSinceSync !== null && daysSinceSync > 7) {
                            healthStatus = "warning";
                          }

                          return (
                            <tr key={company.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium text-slate-900">{company.name || "Untitled company"}</div>
                                <div className="text-xs text-slate-600">{company.industry || "—"}</div>
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge 
                                  status={hasConnection ? "connected" : "not-connected"} 
                                />
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-600">
                                {lastSync ? (
                                  <>
                                    {lastSync.toLocaleDateString()}
                                    {daysSinceSync !== null && daysSinceSync > 7 && (
                                      <span className="ml-2 text-amber-600">({Math.round(daysSinceSync)}d ago)</span>
                                    )}
                                  </>
                                ) : (
                                  "Never"
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-600">
                                {lastAgent ? lastAgent.toLocaleDateString() : "Never"}
                              </td>
                              <td className="px-4 py-3">
                                <HealthBadge status={healthStatus} />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Risk & Security Section */}
          {activeSection === "risk" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">Risk & Security</h2>
                <p className="text-sm text-slate-600">Monitor suspicious activity and protect data</p>
              </div>

              {/* High-view Links */}
              <div className="border border-slate-200 rounded-xl bg-white shadow-sm">
                <div className="border-b border-slate-200 p-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">High-View Token Links</h3>
                  <p className="text-xs text-slate-600">Links with unusually high access counts</p>
                </div>
                <div className="p-4">
                  <div className="text-sm text-slate-600">No high-view links detected</div>
                </div>
              </div>

              {/* Suspicious Activity */}
              <div className="border border-slate-200 rounded-xl bg-white shadow-sm">
                <div className="border-b border-slate-200 p-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">Suspicious Activity</h3>
                  <p className="text-xs text-slate-600">Unusual access patterns or rapid sharing</p>
                </div>
                <div className="p-4">
                  <div className="text-sm text-slate-600">No suspicious activity detected</div>
                </div>
              </div>

              {/* Company Lock Controls */}
              <div className="border border-slate-200 rounded-xl bg-white shadow-sm">
                <div className="border-b border-slate-200 p-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">Company Access Controls</h3>
                  <p className="text-xs text-slate-600">Lock or pause access for specific companies</p>
                </div>
                <div className="p-4">
                  <div className="space-y-2">
                    {companies.slice(0, 5).map((company) => (
                      <div key={company.id} className="flex items-center justify-between py-2 border-b border-slate-200 last:border-0">
                        <span className="text-sm text-slate-700">{company.name || "Untitled company"}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-3 text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200"
                        >
                          Lock Access
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* System Tools Section */}
          {activeSection === "system" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">System Tools</h2>
                <p className="text-sm text-slate-600">Internal utilities for platform management</p>
              </div>

              <div className="border border-slate-200 rounded-xl bg-white shadow-sm">
                <div className="border-b border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">Admin Utilities</h3>
                      <p className="text-xs text-slate-600">Platform management tools</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-xs bg-white border-slate-300 text-slate-700"
                    >
                      {showAdvanced ? "Hide" : "Show"} Advanced
                    </Button>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <ToolButton label="Clear Cache" onClick={() => alert("Coming soon")} />
                    <ToolButton label="Refresh Tokens" onClick={() => alert("Coming soon")} />
                    <ToolButton label="View System Logs" onClick={() => alert("Coming soon")} />
                    <ToolButton label="System Status" onClick={() => alert("Coming soon")} />
                  </div>
                  
                  {showAdvanced && (
                    <div className="pt-4 border-t border-slate-200 space-y-3">
                      <div className="text-xs text-slate-600 mb-2">Advanced Tools</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <ToolButton label="Test AI Agent" onClick={() => alert("Coming soon")} variant="danger" />
                        <ToolButton label="Database Backup" onClick={() => alert("Coming soon")} variant="danger" />
                        <ToolButton label="Reset All Sessions" onClick={() => alert("Coming soon")} variant="danger" />
                        <ToolButton label="Emergency Shutdown" onClick={() => alert("Coming soon")} variant="danger" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* --------------------------- COMPONENTS --------------------------- */

function StatusCard({ label, value, variant }: { label: string; value: number; variant: "success" | "warning" | "info" | "neutral" }) {
  const colors = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    neutral: "bg-slate-100 text-slate-700 border-slate-300",
  };

  return (
    <div className={`border rounded-lg p-4 ${colors[variant]}`}>
      <div className="text-2xl font-semibold mb-1">{value}</div>
      <div className="text-xs opacity-80">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-200" },
    approved: { label: "Approved", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    rejected: { label: "Rejected", className: "bg-red-50 text-red-700 border-red-200" },
    active: { label: "Active", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    expired: { label: "Expired", className: "bg-slate-100 text-slate-600 border-slate-300" },
    connected: { label: "Connected", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    "not-connected": { label: "Not Connected", className: "bg-slate-100 text-slate-600 border-slate-300" },
  };

  const config = statusMap[status] || { label: status, className: "bg-slate-100 text-slate-600 border-slate-300" };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
}

function HealthBadge({ status }: { status: "healthy" | "warning" | "broken" }) {
  const config = {
    healthy: { label: "Healthy", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    warning: { label: "Warning", className: "bg-amber-50 text-amber-700 border-amber-200" },
    broken: { label: "Broken", className: "bg-red-50 text-red-700 border-red-200" },
  };

  const { label, className } = config[status];

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${className}`}>
      {label}
    </span>
  );
}

function ToolButton({ label, onClick, variant = "default" }: { label: string; onClick: () => void; variant?: "default" | "danger" }) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className={cn(
        "w-full justify-start text-sm",
        variant === "danger"
          ? "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
          : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300"
      )}
    >
      {label}
    </Button>
  );
}
