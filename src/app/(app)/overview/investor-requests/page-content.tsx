"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { supabase } from "@/app/lib/supabaseClient";
import { useCompanyData } from "@/hooks/useCompanyData";
import { useUserCompany } from "@/lib/user-company-context";

type RequestItem = {
  id: string;
  created_at: string;
  company_id: string;
  investor_name: string;
  investor_email: string;
  investor_company: string | null;
  message: string | null;
  status: string;
  link?: {
    id: string;
    access_token: string;
    expires_at: string;
  } | null;
};

function RequestActions({
  req,
  onUpdated,
}: {
  req: RequestItem;
  onUpdated: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  async function updateStatus(status: string) {
    startTransition(async () => {
      // 1) Update status
      const { error: updateError } = await supabase
        .from("access_requests")
        .update({ status })
        .eq("id", req.id);

      if (updateError) {
        console.error("Error updating status", updateError);
        alert("Error updating status: " + updateError.message);
        return;
      }

      // 2) Approved → create investor_link if it doesn't exist
      if (status === "approved") {
        const { data: existing, error: existingError } = await supabase
          .from("investor_links")
          .select("*")
          .eq("request_id", req.id)
          .maybeSingle();

        if (existingError) {
          console.error("Error fetching existing link", existingError);
        }

        if (!existing) {
          const token =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : Math.random().toString(36).slice(2) +
                Math.random().toString(36).slice(2);

          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);

          const { error: insertError } = await supabase
            .from("investor_links")
            .insert([
              {
                access_token: token,
                request_id: req.id,
                company_id: req.company_id,
                expires_at: expiresAt.toISOString(),
              },
            ]);

          if (insertError) {
            console.error("Error creating link", insertError);
            alert("Error creating access link: " + insertError.message);
          }
        }
      }

      // 3) Refresh UI
      await onUpdated();
    });
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        className="border-slate-700 text-slate-200 bg-slate-800/40 hover:bg-slate-700/50 text-xs h-7 px-2.5 light:border-slate-300 light:text-slate-700 light:bg-white light:hover:bg-slate-50"
        onClick={() => updateStatus("approved")}
        disabled={isPending}
      >
        Approve
      </Button>

      <Button
        size="sm"
        variant="outline"
        className="border-slate-700 text-slate-300 bg-slate-800/40 hover:bg-slate-700/50 text-xs h-7 px-2.5 light:border-slate-300 light:text-slate-600 light:bg-white light:hover:bg-slate-50"
        onClick={() => updateStatus("rejected")}
        disabled={isPending}
      >
        Decline
      </Button>
    </div>
  );
}

function RemoveAccessButton({
  req,
  onUpdated,
}: {
  req: RequestItem;
  onUpdated: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  async function removeAccess() {
    if (!confirm(`Remove access for ${req.investor_name}? This will revoke their investor link.`)) {
      return;
    }

    startTransition(async () => {
      // 1) Delete investor_link if it exists
      if (req.link) {
        const { error: linkError } = await supabase
          .from("investor_links")
          .delete()
          .eq("id", req.link.id);

        if (linkError) {
          console.error("Error deleting investor link", linkError);
          alert("Error removing access: " + linkError.message);
          return;
        }
      }

      // 2) Update status to rejected
      const { error: updateError } = await supabase
        .from("access_requests")
        .update({ status: "rejected" })
        .eq("id", req.id);

      if (updateError) {
        console.error("Error updating status", updateError);
        alert("Error removing access: " + updateError.message);
        return;
      }

      // 3) Refresh UI
      await onUpdated();
    });
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 hover:border-red-500/50 text-xs h-7 px-2.5 light:border-red-300 light:text-red-600 light:bg-red-50 light:hover:bg-red-100"
      onClick={removeAccess}
      disabled={isPending}
    >
      {isPending ? "Removing..." : "Remove"}
    </Button>
  );
}

export default function InvestorRequestsPageContent() {
  const router = useRouter();
  const { company: userCompany, loading: userCompanyLoading, isAuthenticated } = useUserCompany();
  const companyId = userCompany?.id ?? null;
  const { company, investorRequests, investorLinks, loading, error, refetch } = useCompanyData(companyId);

  function loadData() {
    refetch();
  }

  useEffect(() => {
    if (userCompanyLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
  }, [userCompanyLoading, isAuthenticated, router]);

  // Combine requests with their links and check for expired links
  const requestsWithLinks: RequestItem[] = investorRequests.map((req) => {
    const link = investorLinks.find((l) => l.request_id === req.id);
    
    // Check if link is expired
    let isExpired = false;
    if (link && link.expires_at) {
      const expiresAt = new Date(link.expires_at);
      const now = new Date();
      isExpired = expiresAt.getTime() < now.getTime();
    }
    
    // If request is approved but link is expired, mark as expired
    let displayStatus = req.status;
    if (req.status === "approved" && isExpired) {
      displayStatus = "expired";
    }
    
    return {
      id: req.id,
      created_at: req.created_at,
      company_id: req.company_id,
      investor_name: req.investor_name || req.investor_email.split("@")[0],
      investor_email: req.investor_email,
      investor_company: null, // Not in InvestorRequest type, but we can add it later
      message: null, // Not in InvestorRequest type, but we can add it later
      status: displayStatus, // Use displayStatus which may be "expired" for approved requests with expired links
      link: link
        ? {
            id: link.id,
            access_token: link.access_token,
            expires_at: link.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }
        : null,
    };
  });

  // Separate requests into pending, answered (approved and not expired), and expired
  const pendingRequests = requestsWithLinks.filter((req) => req.status === "pending");
  const answeredRequests = requestsWithLinks.filter((req) => req.status === "approved");
  const expiredRequests = requestsWithLinks.filter((req) => req.status === "expired");

  if (userCompanyLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-slate-400">No company found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border border-slate-700/50 rounded-xl p-6 sm:p-7 shadow-lg light:bg-white light:border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl sm:text-3xl font-semibold text-white light:text-slate-950">
            Investor Requests
          </h1>
          <Link href="/overview">
            <Button
              variant="outline"
              className="border-slate-600/40 text-slate-400 bg-slate-800/20 hover:bg-slate-700/30 text-sm light:border-slate-300 light:text-slate-700 light:bg-slate-100 light:hover:bg-slate-200"
            >
              Back to Overview
            </Button>
          </Link>
        </div>
        <p className="text-slate-400 text-sm light:text-slate-700">
          Manage access requests for {company.name}
        </p>
      </div>

      {/* Pending Requests Section - Compact */}
      {pendingRequests.length > 0 && (
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-700/40 border border-slate-700/50 rounded-xl p-4 sm:p-5 shadow-xl light:bg-white light:border-slate-200">
          <div className="mb-4">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-1 light:text-slate-950">
              Pending Requests
            </h2>
            <p className="text-xs text-slate-400 light:text-slate-700">
              Review and respond to new access requests.
            </p>
          </div>

          <div className="space-y-0 divide-y divide-slate-800/50 light:divide-slate-200">
            {pendingRequests.map((req) => (
              <div key={req.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-100 break-words light:text-slate-950">
                      {req.investor_name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 break-all light:text-slate-600">
                      {req.investor_email}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <RequestActions req={req} onUpdated={loadData} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Answered Requests Section */}
      <div className="bg-gradient-to-br from-slate-800/60 to-slate-700/40 border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-xl light:bg-white light:border-slate-200">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2 light:text-slate-950">
            Approved Requests
          </h2>
          <p className="text-sm text-slate-400 light:text-slate-700">
            Requests that have been approved and have active investor links.
          </p>
        </div>

        {answeredRequests.length === 0 && (
          <div className="text-center py-12">
            <svg
              className="w-12 h-12 mx-auto text-slate-500 mb-4 light:text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <p className="text-sm text-slate-400 light:text-slate-600">
              No answered requests yet.
            </p>
          </div>
        )}

        {answeredRequests.length > 0 && (
          <div className="space-y-0 divide-y divide-slate-800/50 light:divide-slate-200">
            {answeredRequests.map((req) => (
              <div key={req.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-100 break-words light:text-slate-950">
                      {req.investor_name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 break-all light:text-slate-600">
                      {req.investor_email}
                      {req.investor_company && ` · ${req.investor_company}`}
                    </p>
                    {req.message && (
                      <p className="text-xs text-slate-300 mt-1.5 italic break-words light:text-slate-700">
                        "{req.message}"
                      </p>
                    )}
                    {req.link && (
                      <p className={`text-xs mt-2 light:text-slate-600 ${
                        req.status === "expired" 
                          ? "text-amber-400 light:text-amber-600" 
                          : "text-slate-500"
                      }`}>
                        {req.status === "expired" ? "Link expired " : "Link expires "}
                        {new Date(req.link.expires_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2 sm:flex-col sm:items-end">
                    <div className="flex items-center gap-2">
                      {req.status === "expired" ? (
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 light:bg-amber-50 light:text-amber-700 light:border-amber-200">
                          Expired
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 light:bg-emerald-50 light:text-emerald-700 light:border-emerald-200">
                          Approved
                        </span>
                      )}
                      <RemoveAccessButton req={req} onUpdated={loadData} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Expired Requests Section */}
        {expiredRequests.length > 0 && (
          <div className="mt-8 pt-8 border-t border-slate-800/50 light:border-slate-200">
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2 light:text-slate-950">
                Expired Requests
              </h2>
              <p className="text-sm text-slate-400 light:text-slate-700">
                Requests with expired investor links.
              </p>
            </div>

            <div className="space-y-0 divide-y divide-slate-800/50 light:divide-slate-200">
              {expiredRequests.map((req) => (
                <div key={req.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-100 break-words light:text-slate-950">
                        {req.investor_name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 break-all light:text-slate-600">
                        {req.investor_email}
                        {req.investor_company && ` · ${req.investor_company}`}
                      </p>
                      {req.message && (
                        <p className="text-xs text-slate-300 mt-1.5 italic break-words light:text-slate-700">
                          "{req.message}"
                        </p>
                      )}
                      {req.link && (
                        <p className="text-xs text-amber-400 mt-2 light:text-amber-600">
                          Link expired{" "}
                          {new Date(req.link.expires_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2 sm:flex-col sm:items-end">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 light:bg-amber-50 light:text-amber-700 light:border-amber-200">
                          Expired
                        </span>
                        <RemoveAccessButton req={req} onUpdated={loadData} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
