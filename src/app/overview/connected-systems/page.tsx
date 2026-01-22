"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/app/lib/supabaseClient";
import { authedFetch } from "@/lib/authedFetch";
import { useCompanyData } from "@/hooks/useCompanyData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../../components/ui/dialog";

const DATA_SOURCES = [
  { id: "stripe", category: "Billing", name: "Stripe", status: "not_connected" },
  { id: "sheets", category: "Manual input", name: "Google Sheets", status: "coming_soon" }, // Status determined dynamically based on hasGoogleSheets
];

function ConnectedSystemsPageContentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [requestSystemName, setRequestSystemName] = useState("");

  // Stripe integration
  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const [stripeManageModalOpen, setStripeManageModalOpen] = useState(false);
  const [stripeKey, setStripeKey] = useState("");
  const [savingStripe, setSavingStripe] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [connectingStripe, setConnectingStripe] = useState(false);

  // Google Sheets integration
  const [sheetsManageModalOpen, setSheetsManageModalOpen] = useState(false);
  const [googleSheets, setGoogleSheets] = useState<Array<{ url: string; tab: string; id: string }>>([]);
  const [newSheetUrl, setNewSheetUrl] = useState("");
  const [newSheetTab, setNewSheetTab] = useState("");
  const [savingSheets, setSavingSheets] = useState(false);
  const [syncingKPIs, setSyncingKPIs] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<{
    status: "not_connected" | "pending" | "connected";
    stripeAccountId: string | null;
    connectedAt: string | null;
    lastVerifiedAt: string | null;
    masked: string | null;
    pendingExpiresAt: string | null;
  }>({
    status: "not_connected",
    stripeAccountId: null,
    connectedAt: null,
    lastVerifiedAt: null,
    masked: null,
    pendingExpiresAt: null,
  });

  // Use shared hook to fetch company data
  const { company, loading, error } = useCompanyData(companyId);

  // Get company ID from user's session
  useEffect(() => {
    async function getCompanyId() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          router.replace("/login");
          return;
        }

        const { data: companyData, error } = await supabase
          .from("companies")
          .select("id")
          .eq("owner_id", session.user.id)
          .maybeSingle();

        if (error) {
          console.error("Error loading company ID:", error);
          return;
        }

        if (!companyData) {
          router.replace("/onboarding");
          return;
        }

        setCompanyId(companyData.id);
      } catch (err) {
        console.error("Error in getCompanyId:", err);
      }
    }

    getCompanyId();
  }, [router]);

  // Load Stripe status when company is available
  useEffect(() => {
    if (company?.id) {
      loadStripeStatus(company.id);
    }
  }, [company?.id]);

  // Handle Stripe OAuth callback
  useEffect(() => {
    async function handleStripeCallback() {
      const stripeCallback = searchParams.get("stripe");
      if (stripeCallback && company?.id) {
        await loadStripeStatus(company.id);
        
        // Clean URL
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete("stripe");
        newSearchParams.delete("msg");
        const cleanUrl = `${window.location.pathname}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ""}`;
        router.replace(cleanUrl);
      }
    }
    handleStripeCallback();
  }, [searchParams, company?.id, router]);

  async function loadStripeStatus(companyId: string) {
    try {
      const res = await authedFetch(`/api/stripe/status?companyId=${companyId}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data?.ok) {
        setStripeStatus({
          status: data.status || "not_connected",
          stripeAccountId: data.stripeAccountId || null,
          connectedAt: data.connectedAt || null,
          lastVerifiedAt: data.lastVerifiedAt || null,
          masked: data.masked || null,
          pendingExpiresAt: data.pendingExpiresAt || null,
        });
      } else {
        setStripeStatus({
          status: "not_connected",
          stripeAccountId: null,
          connectedAt: null,
          lastVerifiedAt: null,
          masked: null,
          pendingExpiresAt: null,
        });
      }
    } catch (e: any) {
      console.error("Failed to load Stripe status", e);
      if (e?.message !== "Not authenticated") {
        setStripeStatus({
          status: "not_connected",
          stripeAccountId: null,
          connectedAt: null,
          lastVerifiedAt: null,
          masked: null,
          pendingExpiresAt: null,
        });
      }
    }
  }

  async function handleSaveStripeKey() {
    if (!company?.id) {
      alert("No company selected");
      return;
    }

    if (!stripeKey.trim()) {
      setStripeError("Please enter a Stripe secret key");
      return;
    }

    setSavingStripe(true);
    setStripeError(null);

    try {
      const res = await authedFetch("/api/stripe/save-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.id,
          secretKey: stripeKey.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to save Stripe key");
      }

      setStripeModalOpen(false);
      setStripeKey("");
      setStripeError(null);
      await loadStripeStatus(company.id);
    } catch (e: any) {
      if (e?.message === "Not authenticated") {
        setStripeModalOpen(false);
        return;
      }
      setStripeError("Failed to save Stripe key. Please try again.");
    } finally {
      setSavingStripe(false);
    }
  }

  async function handleDisconnectStripe() {
    if (!company?.id) {
      alert("No company selected");
      return;
    }

    if (!confirm("Are you sure you want to disconnect Stripe? This will remove your Stripe key.")) {
      return;
    }

    try {
      const res = await authedFetch("/api/stripe/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to disconnect Stripe");
      }

      await loadStripeStatus(company.id);
    } catch (e: any) {
      console.error("Error disconnecting Stripe:", e);
      alert("Error: " + (e?.message || "Failed to disconnect Stripe"));
    }
  }

  async function handleConnectStripe() {
    if (!company?.id) {
      alert("No company selected");
      return;
    }

    if (connectingStripe) {
      return;
    }

    setConnectingStripe(true);

    try {
      const res = await authedFetch(`/api/stripe/connect?companyId=${company.id}`, {
        cache: "no-store",
      });

      const data = await res.json();
      
      // Log full response for debugging
      console.log("[handleConnectStripe] API response:", {
        ok: res.ok,
        status: res.status,
        dataOk: data?.ok,
        hasAuthorizeUrl: !!data?.authorizeUrl,
        error: data?.error,
        details: data?.details,
        code: data?.code,
      });

      if (!res.ok || !data?.ok || !data?.authorizeUrl) {
        // Use the error message from API, or fallback to a generic message
        const errorMsg = data?.error || "Failed to get Stripe authorization URL";
        const detailsMsg = data?.details ? `\n\nDetails: ${data.details}` : "";
        throw new Error(errorMsg + detailsMsg);
      }

      window.location.href = data.authorizeUrl;
    } catch (e: any) {
      console.error("Error connecting Stripe:", e);
      // Show the actual error message from API
      const errorMessage = e?.message || "Failed to connect Stripe. Please check your Stripe configuration.";
      alert(errorMessage);
      setConnectingStripe(false);
    }
  }

  function handleRequestIntegration() {
    if (!requestSystemName.trim()) {
      alert("Please enter a system name");
      return;
    }

    // TODO: Implement API call to submit integration request
    console.log("Integration request:", requestSystemName);
    
    // For now, use mailto as fallback
    window.location.href = `mailto:support@valyxo.com?subject=Integration Request&body=Hi, I would like to request integration with the following system:%0D%0A%0D%0ASystem name: ${encodeURIComponent(requestSystemName)}%0D%0A%0D%0AAdditional details:`;
    
    setRequestSystemName("");
  }

  // Load Google Sheets data when manage modal opens
  useEffect(() => {
    if (sheetsManageModalOpen && company) {
      // Parse existing sheets - support both old format (single sheet) and new format (array)
      let sheets: Array<{ url: string; tab: string; id: string }> = [];
      
      if (company.google_sheets_url) {
        // Try to parse as JSON array first (new format)
        try {
          const parsed = JSON.parse(company.google_sheets_url);
          if (Array.isArray(parsed)) {
            sheets = parsed;
          } else {
            // Old format: single URL
            sheets = [{
              url: company.google_sheets_url,
              tab: company.google_sheets_tab || "",
              id: `sheet-${Date.now()}`,
            }];
          }
        } catch {
          // Not JSON, treat as single URL (old format)
          sheets = [{
            url: company.google_sheets_url,
            tab: company.google_sheets_tab || "",
            id: `sheet-${Date.now()}`,
          }];
        }
      }
      
      setGoogleSheets(sheets);
      setNewSheetUrl("");
      setNewSheetTab("");
    }
  }, [sheetsManageModalOpen, company]);

  function handleAddSheet() {
    if (!newSheetUrl.trim()) {
      alert("Please enter a Google Sheets URL");
      return;
    }

    const newSheet = {
      url: newSheetUrl.trim(),
      tab: newSheetTab.trim() || "",
      id: `sheet-${Date.now()}-${Math.random()}`,
    };

    setGoogleSheets([...googleSheets, newSheet]);
    setNewSheetUrl("");
    setNewSheetTab("");
  }

  function handleRemoveSheet(id: string) {
    setGoogleSheets(googleSheets.filter((sheet) => sheet.id !== id));
  }

  async function handleSaveSheets() {
    if (!company?.id) {
      alert("No company selected");
      return;
    }

    if (googleSheets.length === 0) {
      alert("Please add at least one Google Sheet");
      return;
    }

    setSavingSheets(true);
    try {
      const res = await authedFetch("/api/sheets/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.id,
          sheets: googleSheets.map((s) => ({ url: s.url, tab: s.tab })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to save Google Sheets configuration");
      }

      setSheetsManageModalOpen(false);
      // Reload company data to reflect changes
      window.location.reload();
    } catch (e: any) {
      console.error("Error saving Google Sheets:", e);
      alert("Error: " + (e?.message || "Failed to save configuration"));
    } finally {
      setSavingSheets(false);
    }
  }

  async function handleSyncKPIs() {
    if (!company?.id) {
      alert("No company selected");
      return;
    }

    setSyncingKPIs(true);
    setSyncSuccess(false);
    try {
      const res = await authedFetch("/api/sheets/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to sync KPIs");
      }

      setSyncSuccess(true);
      // Reload company data after sync
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e: any) {
      console.error("Error syncing KPIs:", e);
      alert("Error: " + (e?.message || "Failed to sync KPIs"));
    } finally {
      setSyncingKPIs(false);
    }
  }

  if (loading) {
    return (
      <AppShell showNav={false}>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-slate-400">Loading...</p>
        </div>
      </AppShell>
    );
  }

  if (!company) {
    return (
      <AppShell showNav={false}>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-slate-400">Company not found</p>
        </div>
      </AppShell>
    );
  }

  // Calculate connected systems from real data
  // Support both old format (single sheet) and new format (array)
  let hasGoogleSheets = false;
  let googleSheetsList: Array<{ url: string; tab: string }> = [];
  
  if (company.google_sheets_url) {
    try {
      const parsed = JSON.parse(company.google_sheets_url);
      if (Array.isArray(parsed)) {
        googleSheetsList = parsed;
        hasGoogleSheets = parsed.length > 0;
      } else {
        // Old format
        hasGoogleSheets = !!(company.google_sheets_url && company.google_sheets_tab);
        if (hasGoogleSheets) {
          googleSheetsList = [{ url: company.google_sheets_url, tab: company.google_sheets_tab || "" }];
        }
      }
    } catch {
      // Not JSON, treat as old format
      hasGoogleSheets = !!(company.google_sheets_url && company.google_sheets_tab);
      if (hasGoogleSheets) {
        googleSheetsList = [{ url: company.google_sheets_url, tab: company.google_sheets_tab || "" }];
      }
    }
  }

  // Prepare all systems with their actual connection status
  const allSystems = [
    {
      id: "stripe",
      name: "Stripe",
      category: "Billing",
      description: "Connect your Stripe account to automatically sync revenue and subscription metrics.",
      isConnected: stripeStatus.status === "connected",
      isPending: stripeStatus.status === "pending",
      status: stripeStatus.status,
      masked: stripeStatus.masked,
      accountId: stripeStatus.stripeAccountId,
      lastSync: stripeStatus.lastVerifiedAt || stripeStatus.connectedAt,
    },
    ...DATA_SOURCES.filter((source) => source.id !== "stripe").map((source) => ({
      id: source.id,
      name: source.name,
      category: source.category,
      description: (() => {
        if (source.id === "sheets") {
          return "Import data from Google Sheets to automatically update your metrics.";
        }
        return "Connect to automatically sync data and metrics.";
      })(),
      isConnected: source.id === "sheets" ? hasGoogleSheets : source.status === "connected",
      isPending: false,
      status: source.id === "sheets" ? (hasGoogleSheets ? "connected" : "not_connected") : source.status,
      masked: null,
      accountId: source.id === "sheets" ? (googleSheetsList.length > 0 ? `${googleSheetsList.length} sheet${googleSheetsList.length > 1 ? "s" : ""}` : null) : null,
      lastSync: source.id === "sheets" ? company.google_sheets_last_sync_at : null,
    })),
  ];

  // Sort: connected first, then pending, then not connected
  const sortedSystems = allSystems.sort((a, b) => {
    if (a.isConnected && !b.isConnected) return -1;
    if (!a.isConnected && b.isConnected) return 1;
    if (a.isPending && !b.isPending) return -1;
    if (!a.isPending && b.isPending) return 1;
    return 0;
  });

  // Show all systems (sorted with connected first)
  const visibleSystems = sortedSystems;

  // Count connected systems
  const connectedCount = visibleSystems.filter((s) => s.isConnected).length;

  // Format last sync date
  function formatLastSync(dateString: string | null): string {
    if (!dateString) return "Never";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "Unknown";
    }
  }

  // Get overall last sync (most recent)
  const allLastSyncs = visibleSystems
    .filter((s) => s.isConnected && s.lastSync)
    .map((s) => new Date(s.lastSync!))
    .sort((a, b) => b.getTime() - a.getTime());
  const overallLastSync = allLastSyncs.length > 0 ? formatLastSync(allLastSyncs[0].toISOString()) : "Never";

  return (
    <AppShell showNav={false}>
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-8 space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <Link 
            href="/overview"
            className="text-slate-400 hover:text-slate-300 transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Company Overview
          </Link>
        </div>

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-semibold text-white mb-2 light:text-slate-950">
              Connected Systems
            </h1>
            <p className="text-slate-400 text-sm mb-2 light:text-slate-700">
              Automatically keeps your metrics up to date.
            </p>
            <div className="text-xs text-slate-500 light:text-slate-600">
              {connectedCount} connected • Last sync: {overallLastSync}
            </div>
          </div>
          <Button
            onClick={() => {
              // Find first not connected system
              const firstNotConnected = visibleSystems.find((s) => !s.isConnected && !s.isPending);
              
              if (firstNotConnected) {
                // Scroll to the first not connected system
                const element = document.getElementById(`system-${firstNotConnected.id}`);
                if (element) {
                  element.scrollIntoView({ behavior: "smooth", block: "center" });
                  // Add a subtle highlight effect
                  element.classList.add("ring-2", "ring-[#2B74FF]", "ring-opacity-50");
                  setTimeout(() => {
                    element.classList.remove("ring-2", "ring-[#2B74FF]", "ring-opacity-50");
                  }, 2000);
                }
              } else {
                // All systems are connected, scroll to request integration section
                const requestSection = document.getElementById("request-integration");
                if (requestSection) {
                  requestSection.scrollIntoView({ behavior: "smooth", block: "center" });
                  // Focus the input field
                  setTimeout(() => {
                    const input = requestSection.querySelector('input[type="text"]') as HTMLInputElement;
                    if (input) {
                      input.focus();
                    }
                  }, 500);
                }
              }
            }}
            className="bg-gradient-to-r from-[#2B74FF] to-[#4D9FFF] hover:from-[#2563EB] hover:to-[#3B82F6] text-white font-semibold shadow-lg shadow-[#2B74FF]/20 hover:shadow-[#4D9FFF]/30"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add system
          </Button>
        </div>

        {/* Systems Grid - 1 column on mobile, 2 columns on md+ */}
        {visibleSystems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 mb-4">No systems available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visibleSystems.map((system) => (
              <div
                key={system.id}
                id={`system-${system.id}`}
                className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 border border-slate-700/50 rounded-xl p-6 space-y-4 shadow-lg light:bg-white light:border-slate-200 min-h-[280px] flex flex-col"
              >
                {/* Title and Description */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2 light:text-slate-950">
                    {system.name}
                  </h3>
                  <p className="text-sm text-slate-400 light:text-slate-600 mb-4">
                    {system.description}
                  </p>
                </div>

                {/* Status and Info */}
                <div className="space-y-2">
                  {/* Status Chip */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {system.isConnected ? (
                      <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-[#2B74FF]/10 text-[#2B74FF] border border-[#2B74FF]/20">
                        Connected
                      </span>
                    ) : system.isPending ? (
                      <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        Pending
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-slate-800/60 text-slate-400 border border-slate-700/50">
                        Not connected
                      </span>
                    )}
                  </div>

                  {/* Account ID / Sheet Name */}
                  {system.isConnected && system.accountId && (
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-slate-500 font-mono truncate flex-1 min-w-0">
                        {system.id === "stripe" && system.masked ? system.masked : system.accountId}
                      </div>
                      {system.id === "sheets" && (
                        <button
                          type="button"
                          onClick={() => {
                            if (system.accountId) {
                              navigator.clipboard.writeText(system.accountId);
                              // TODO: Add toast notification
                            }
                          }}
                          className="flex-shrink-0 text-slate-400 hover:text-slate-300 transition-colors"
                          title="Copy URL"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Last Sync */}
                  {system.isConnected && (
                    <div className="text-xs text-slate-500 light:text-slate-600">
                      Last sync: {formatLastSync(system.lastSync)}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-700/30">
                  {system.id === "stripe" ? (
                    // Stripe-specific actions
                    system.isConnected ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStripeManageModalOpen(true)}
                          className="w-full sm:flex-1 border-slate-700 text-slate-300 bg-slate-800/40 hover:bg-slate-700/50"
                        >
                          Manage
                        </Button>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleConnectStripe}
                            disabled={connectingStripe}
                            className="flex-1 border-[#2B74FF]/30 text-[#2B74FF] bg-[#2B74FF]/10 hover:bg-[#2B74FF]/20"
                          >
                            {connectingStripe ? "Redirecting…" : "Reconnect"}
                          </Button>
                          <button
                            type="button"
                            onClick={handleDisconnectStripe}
                            className="text-xs text-red-400 hover:text-red-300 underline px-2 sm:px-3 text-left sm:text-center"
                          >
                            Disconnect
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (company?.id) {
                              setStripeModalOpen(true);
                            }
                          }}
                          className="text-xs text-slate-400 hover:text-slate-300 underline text-left"
                          title="We never store your Stripe secret key unless you choose manual setup."
                        >
                          Manual setup
                        </button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          onClick={handleConnectStripe}
                          disabled={connectingStripe}
                          className="w-full bg-[#2B74FF] hover:bg-[#2B74FF]/90 text-white disabled:opacity-50"
                        >
                          {connectingStripe ? "Redirecting…" : "Connect"}
                        </Button>
                        <button
                          type="button"
                          onClick={() => {
                            if (company?.id) {
                              setStripeModalOpen(true);
                            }
                          }}
                          className="text-xs text-slate-400 hover:text-slate-300 underline text-left"
                          title="We never store your Stripe secret key unless you choose manual setup."
                        >
                          Enter key manually
                        </button>
                      </>
                    )
                  ) : system.id === "sheets" ? (
                    // Google Sheets-specific actions
                    system.isConnected ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSheetsManageModalOpen(true)}
                          className="w-full sm:flex-1 border-slate-700 text-slate-300 bg-slate-800/40 hover:bg-slate-700/50"
                        >
                          Manage
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSheetsManageModalOpen(true)}
                          className="w-full sm:flex-1 border-slate-700 text-slate-300 bg-slate-800/40 hover:bg-slate-700/50"
                        >
                          Edit
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        className="w-full border-slate-700 text-slate-400 bg-slate-800/40 cursor-not-allowed"
                      >
                        Connect
                      </Button>
                    )
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Request Integration Section */}
        <div id="request-integration" className="mt-12 pt-8 border-t border-slate-800/50">
          <div className="bg-gradient-to-br from-[#2B74FF]/10 to-[#4D9FFF]/5 border border-[#2B74FF]/20 rounded-xl p-4 sm:p-6 space-y-4">
            <div className="text-center">
              <h3 className="text-base font-semibold text-white mb-1 light:text-slate-950">
                Missing an integration?
              </h3>
              <p className="text-sm text-slate-300 light:text-slate-700">
                Tell us what you use — we prioritize based on demand.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="text"
                placeholder="System name"
                value={requestSystemName}
                onChange={(e) => setRequestSystemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRequestIntegration();
                  }
                }}
                className="flex-1 bg-slate-900/50 border-slate-700 text-slate-50 placeholder:text-slate-500"
              />
              <Button
                onClick={handleRequestIntegration}
                className="bg-[#2B74FF] hover:bg-[#2B74FF]/90 text-white w-full sm:w-auto"
              >
                Request
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stripe Connect Modal */}
      <Dialog open={stripeModalOpen} onOpenChange={setStripeModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-50 w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Connect Stripe</DialogTitle>
            <DialogDescription className="text-sm text-slate-400">
              Advanced: only use this if you can't use Connect.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="stripe-key" className="text-sm text-slate-300">
                Stripe Secret Key
              </label>
              <Input
                id="stripe-key"
                type="password"
                value={stripeKey}
                onChange={(e) => {
                  setStripeKey(e.target.value);
                  setStripeError(null);
                }}
                placeholder="sk_live_..."
                className="bg-slate-900 border-slate-700 text-slate-50 font-mono text-sm"
              />
              <p className="text-xs text-slate-500">
                We use this key only to read billing metrics. It is encrypted and never shown again.
              </p>
            </div>

            {stripeError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
                <p className="text-sm text-red-300">{stripeError}</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              onClick={handleSaveStripeKey}
              disabled={savingStripe || !stripeKey.trim() || !company?.id}
              className="bg-[#2B74FF] hover:bg-[#2B74FF]/90 text-white w-full sm:w-auto"
            >
              {savingStripe ? "Verifying..." : "Save & Verify"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setStripeModalOpen(false);
                setStripeKey("");
                setStripeError(null);
              }}
              disabled={savingStripe}
              className="border-slate-700 text-slate-300 bg-slate-800/40 hover:bg-slate-700/50 w-full sm:w-auto"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stripe Manage Modal */}
      <Dialog open={stripeManageModalOpen} onOpenChange={setStripeManageModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-50 w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Manage Stripe Integration</DialogTitle>
            <DialogDescription className="text-sm text-slate-400">
              View and manage your Stripe connection details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Connection Status</label>
              <div className="flex items-center gap-2">
                {stripeStatus.status === "connected" ? (
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-[#2B74FF]/10 text-[#2B74FF] border border-[#2B74FF]/20">
                    Connected
                  </span>
                ) : stripeStatus.status === "pending" ? (
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    Pending
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-slate-800/60 text-slate-400 border border-slate-700/50">
                    Not connected
                  </span>
                )}
              </div>
            </div>

            {stripeStatus.status === "connected" && (
              <>
                {stripeStatus.masked && (
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">Account ID</label>
                    <div className="text-sm font-mono text-slate-400 bg-slate-900/50 border border-slate-700 rounded px-3 py-2">
                      {stripeStatus.masked}
                    </div>
                  </div>
                )}

                {stripeStatus.connectedAt && (
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">Connected At</label>
                    <div className="text-sm text-slate-400">
                      {new Date(stripeStatus.connectedAt).toLocaleString()}
                    </div>
                  </div>
                )}

                {stripeStatus.lastVerifiedAt && (
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">Last Verified</label>
                    <div className="text-sm text-slate-400">
                      {formatLastSync(stripeStatus.lastVerifiedAt)}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="pt-4 border-t border-slate-700/50 space-y-2">
              <p className="text-xs text-slate-500">
                Need to reconnect or disconnect? Use the actions on the integration card.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStripeManageModalOpen(false)}
              className="border-slate-700 text-slate-300 bg-slate-800/40 hover:bg-slate-700/50 w-full sm:w-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Google Sheets Manage Modal */}
      <Dialog open={sheetsManageModalOpen} onOpenChange={setSheetsManageModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-50 w-[calc(100vw-2rem)] sm:max-w-xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Manage Google Sheets Integration</DialogTitle>
            <DialogDescription className="text-sm text-slate-400">
              Add multiple Google Sheets to sync KPIs from different sources.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-x-hidden">
            {/* Existing Sheets List */}
            {googleSheets.length > 0 && (
              <div className="space-y-3 overflow-x-hidden">
                <label className="text-sm font-medium text-slate-300">Connected Sheets</label>
                <div className="space-y-2 overflow-x-hidden">
                  {googleSheets.map((sheet, index) => (
                    <div
                      key={sheet.id}
                      className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 flex items-start gap-3 overflow-x-hidden"
                    >
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="text-xs text-slate-400 mb-1">Sheet #{index + 1}</div>
                        <div className="text-sm font-mono text-slate-300 break-all mb-1 break-words overflow-wrap-anywhere">
                          {sheet.url}
                        </div>
                        {sheet.tab && (
                          <div className="text-xs text-slate-500">Tab: {sheet.tab}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSheet(sheet.id)}
                        className="flex-shrink-0 text-red-400 hover:text-red-300 transition-colors p-1"
                        title="Remove sheet"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Sheet Form */}
            <div className="border-t border-slate-700/50 pt-4 space-y-4">
              <label className="text-sm font-medium text-slate-300">Add New Sheet</label>
              <div className="space-y-2">
                <label htmlFor="new-sheets-url" className="text-sm text-slate-300">
                  Google Sheets URL
                </label>
                <Input
                  id="new-sheets-url"
                  value={newSheetUrl}
                  onChange={(e) => setNewSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="bg-slate-900 border-slate-700 text-slate-50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddSheet();
                    }
                  }}
                />
                <p className="text-xs text-slate-500">
                  Make sure the sheet is publicly accessible or shared with the service account.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="new-sheets-tab" className="text-sm text-slate-300">
                  Tab Name (optional)
                </label>
                <Input
                  id="new-sheets-tab"
                  value={newSheetTab}
                  onChange={(e) => setNewSheetTab(e.target.value)}
                  placeholder="Sheet1"
                  className="bg-slate-900 border-slate-700 text-slate-50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddSheet();
                    }
                  }}
                />
                <p className="text-xs text-slate-500">
                  Leave empty to use the first tab.
                </p>
              </div>

              <Button
                onClick={handleAddSheet}
                disabled={!newSheetUrl.trim()}
                className="w-full bg-[#2B74FF] hover:bg-[#2B74FF]/90 text-white"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Sheet
              </Button>
            </div>

            {hasGoogleSheets && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                <p className="text-sm text-emerald-300">
                  ✓ {googleSheets.length} sheet{googleSheets.length > 1 ? "s" : ""} connected
                  {company?.google_sheets_last_sync_at && (
                    <span className="text-xs text-emerald-400/70 ml-2">
                      Last synced: {formatLastSync(company.google_sheets_last_sync_at)}
                    </span>
                  )}
                </p>
              </div>
            )}

            {syncSuccess && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                <p className="text-sm text-emerald-300">✓ Synced successfully!</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {hasGoogleSheets && (
              <Button
                onClick={handleSyncKPIs}
                disabled={syncingKPIs || !company?.id}
                className="bg-[#2B74FF] hover:bg-[#2B74FF]/90 text-white w-full sm:w-auto"
              >
                {syncingKPIs ? "Syncing..." : "Sync KPIs"}
              </Button>
            )}
            <Button
              onClick={handleSaveSheets}
              disabled={savingSheets || !company?.id || googleSheets.length === 0}
              className="bg-white text-slate-950 hover:bg-white/90 w-full sm:w-auto"
            >
              {savingSheets ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setSheetsManageModalOpen(false)}
              className="border-slate-700 text-slate-300 bg-slate-800/40 hover:bg-slate-700/50 w-full sm:w-auto"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

export default function ConnectedSystemsPage() {
  return (
    <Suspense fallback={
      <AppShell showNav={false}>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-slate-400">Loading...</p>
        </div>
      </AppShell>
    }>
      <ConnectedSystemsPageContentInner />
    </Suspense>
  );
}
