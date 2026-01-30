"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormattedDate } from "@/components/ui/FormattedDate";
import { useUserCompany } from "@/lib/user-company-context";

type Integration = {
  title: string;
  category: string;
  description: string;
  status: "Connected" | "Not connected" | "Coming soon";
};

const integrations: Integration[] = [
  {
    title: "Tripletex",
    category: "Accounting",
    description: "Fetch accounting, revenue and costs automatically.",
    status: "Not connected",
  },
  {
    title: "Fiken",
    category: "Accounting",
    description: "Sync invoices, results and balance.",
    status: "Not connected",
  },
  {
    title: "Pipedrive",
    category: "CRM",
    description: "Fetch pipeline, deals and sales data.",
    status: "Not connected",
  },
  {
    title: "HubSpot",
    category: "CRM",
    description: "Sync customers, sales and pipeline automatically.",
    status: "Not connected",
  },
  {
    title: "Google Sheets",
    category: "Sheets",
    description: "Import KPIs directly from spreadsheets.",
    status: "Connected",
  },
  {
    category: "Marketing",
    title: "Excel",
    description: "Import KPIs from Excel spreadsheets.",
    status: "Coming soon",
  },
];

function IntegrationsContent() {
  const router = useRouter();
  const { company, loading: userCompanyLoading, isAuthenticated } = useUserCompany();
  const companyId = company?.id ?? null;
  const dashboardHref = "/company-dashboard";

  // Google Sheets modal state
  const [sheetsModalOpen, setSheetsModalOpen] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [sheetsTab, setSheetsTab] = useState("");
  const [savingSheets, setSavingSheets] = useState(false);
  const [syncingKPIs, setSyncingKPIs] = useState(false);
  const [sheetsStatus, setSheetsStatus] = useState<"Connected" | "Not connected">("Not connected");
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);

  useEffect(() => {
    if (userCompanyLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
  }, [userCompanyLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!companyId) return;
    async function loadCompanyData() {
      try {
        const res = await fetch(`/api/companies/${companyId}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.company) {
            const company = data.company;
            if (company.google_sheets_url) {
              let url = "";
              let tab = "";
              try {
                const parsed = JSON.parse(company.google_sheets_url);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  url = parsed[0].url ?? "";
                  tab = parsed[0].tab ?? company.google_sheets_tab ?? "";
                } else {
                  url = company.google_sheets_url;
                  tab = company.google_sheets_tab ?? "";
                }
              } catch {
                url = company.google_sheets_url;
                tab = company.google_sheets_tab ?? "";
              }
              if (url) {
                setSheetsStatus("Connected");
                setSheetsUrl(url);
                setSheetsTab(tab);
                setLastSyncAt(company.google_sheets_last_sync_at || null);
              }
            }
          }
        }
      } catch (e) {
        console.error("Failed to load company data:", e);
      }
    }
    
    loadCompanyData();
  }, [companyId]);

  async function handleSaveSheets() {
    if (!companyId) {
      alert("No company selected");
      return;
    }

    if (!sheetsUrl.trim()) {
      alert("Please enter a Google Sheets URL");
      return;
    }

    setSavingSheets(true);
    try {
      const res = await fetch("/api/sheets/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          sheetUrl: sheetsUrl.trim(),
          tabName: sheetsTab.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to save Google Sheets configuration");
      }

      setSheetsStatus("Connected");
      setSheetsModalOpen(false);
      alert("Google Sheets configuration saved successfully!");
    } catch (e: any) {
      console.error("Error saving Google Sheets:", e);
      alert("Error: " + (e?.message || "Failed to save configuration"));
    } finally {
      setSavingSheets(false);
    }
  }

  async function handleSyncKPIs() {
    if (!companyId) {
      alert("No company selected");
      return;
    }

    setSyncingKPIs(true);
    setSyncSuccess(false);
    try {
      // Use MCP agent run-all instead of direct sheets sync
      const res = await fetch("/api/agent/run-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        const errorMsg = data?.error || "Failed to sync KPIs";
        throw new Error(errorMsg);
      }

      setSyncSuccess(true);
      setLastSyncAt(new Date().toISOString());
      router.refresh();
      
      // Hide success message after 3 seconds
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch (e: any) {
      console.error("Error syncing KPIs:", e);
      alert("Error: " + (e?.message || "Failed to sync KPIs"));
    } finally {
      setSyncingKPIs(false);
    }
  }

  function handleClick(integration: Integration) {
    if (integration.status === "Coming soon") {
      alert("This integration will be available in the next version.");
    } else if (integration.title === "Google Sheets") {
      setSheetsModalOpen(true);
    } else {
      alert("Integrations will be connected in the next version of the platform.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 py-16 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Back button */}
        <div className="mb-6">
          <Link
            href={dashboardHref}
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to dashboard
          </Link>
        </div>

        {/* Header */}
        <header className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>

          <p className="text-slate-400 max-w-3xl text-sm">
            Connect accounting, CRM and other systems. Integrations will be available in the next version.
          </p>

          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
            Available integrations
          </p>

          {/* subtil linje + ekstra luft ned til kortene */}
          <div className="mt-6 h-px w-full bg-slate-800/80" />
        </header>

        {/* Integrations grid */}
        <section className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {integrations.map((item) => (
            <div
              key={item.title}
              className="border border-white/10 rounded-xl p-6 bg-slate-900/70 shadow-sm backdrop-blur-sm"
            >
              <p className="text-xs uppercase text-slate-400 mb-1">
                {item.category}
              </p>

              <h2 className="text-xl font-semibold mb-1">{item.title}</h2>

              <p className="text-slate-400 text-sm mb-4">
                {item.description}
              </p>

              <div className="flex items-center justify-between mt-4">
                <p
                  className={
                    item.title === "Google Sheets" && sheetsStatus === "Connected"
                      ? "text-emerald-400 text-sm"
                      : item.status === "Connected"
                      ? "text-emerald-400 text-sm"
                      : item.status === "Coming soon"
                      ? "text-amber-400 text-sm"
                      : "text-slate-400 text-sm"
                  }
                >
                  Status: {item.title === "Google Sheets" ? sheetsStatus : item.status}
                </p>

                <button
                  type="button"
                  onClick={() => handleClick(item)}
                  className="
                    px-3 py-1 rounded-md
                    text-sm font-medium
                    border border-slate-500
                    text-slate-50
                    bg-transparent
                  "
                >
                  {item.title === "Google Sheets" && sheetsStatus === "Connected"
                    ? "Open"
                    : item.status === "Connected"
                    ? "Open"
                    : item.status === "Coming soon"
                    ? "Soon"
                    : "Connect"}
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>

      {/* Google Sheets Modal */}
      <Dialog open={sheetsModalOpen} onOpenChange={setSheetsModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-50 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Google Sheets Integration</DialogTitle>
            <DialogDescription className="text-sm text-slate-400">
              Connect your Google Sheet to automatically sync KPI data to your dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sheets-url" className="text-sm text-slate-300">
                Google Sheets URL
              </Label>
              <Input
                id="sheets-url"
                value={sheetsUrl}
                onChange={(e) => setSheetsUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="bg-slate-900 border-slate-700 text-slate-50"
              />
              <p className="text-xs text-slate-500">
                Make sure the sheet is publicly accessible or shared with the service account.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sheets-tab" className="text-sm text-slate-300">
                Tab Name (optional)
              </Label>
              <Input
                id="sheets-tab"
                value={sheetsTab}
                onChange={(e) => setSheetsTab(e.target.value)}
                placeholder="Sheet1"
                className="bg-slate-900 border-slate-700 text-slate-50"
              />
              <p className="text-xs text-slate-500">
                Leave empty to use the first tab.
              </p>
            </div>

            {sheetsStatus === "Connected" && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                    <p className="text-sm text-emerald-300">
                      ✓ Connected
                      {lastSyncAt && (
                        <span className="text-xs text-emerald-400/70 ml-2">
                          Last synced: <FormattedDate date={lastSyncAt} />
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
            {sheetsStatus === "Connected" && (
              <Button
                onClick={handleSyncKPIs}
                disabled={syncingKPIs || !companyId}
                className="bg-[#2B74FF] hover:bg-[#2B74FF]/90 text-white w-full sm:w-auto"
              >
                {syncingKPIs ? "Syncing..." : "Sync KPIs"}
              </Button>
            )}
            <Button
              onClick={handleSaveSheets}
              disabled={savingSheets || !companyId}
              className="bg-white text-slate-950 hover:bg-white/90 w-full sm:w-auto"
            >
              {savingSheets ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setSheetsModalOpen(false)}
              className="border-slate-700 text-slate-300 bg-slate-800/40 hover:bg-slate-700/50 w-full sm:w-auto"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400">Loading...</p>
      </main>
    }>
      <IntegrationsContent />
    </Suspense>
  );
}