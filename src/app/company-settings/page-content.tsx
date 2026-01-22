"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import { AppShell } from "@/components/shell/AppShell";
import { useCompany } from "@/lib/company-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/use-theme";
import { useAppearance } from "@/lib/use-appearance";

type SettingsSection = 
  | "appearance" 
  | "templates" 
  | "branding" 
  | "preferences" 
  | "team-roles" 
  | "data-defaults";

type AppearanceSettings = {
  theme: "system" | "dark" | "light";
  layoutDensity: "compact" | "comfortable";
  fontSize: "small" | "default" | "large";
};

type Template = {
  id: string;
  name: string;
  metrics: string[];
  tone: "formal" | "short" | "narrative";
  sections: string[];
  isDefault: boolean;
};

type BrandingSettings = {
  logoUrl: string | null;
  primaryColor: string;
  headerStyle: "minimal" | "branded";
};

type PreferencesSettings = {
  defaultDashboardView: string;
  defaultTimeRange: "30d" | "90d" | "ytd";
  notificationRules: {
    runwayThreshold: number;
    burnThreshold: number;
  };
  currency: string;
  growthDisplayStyle: "mom" | "qoq" | "yoy";
};

type TeamRole = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "finance" | "viewer";
  canEditTemplates: boolean;
  canChangeBranding: boolean;
  canShareInvestorLinks: boolean;
  canAccessDashboard: boolean;
  canViewOverview: boolean;
};

type DataDefaultsSettings = {
  revenueDefinition: string;
  burnCalculation: string;
  includeVAT: boolean;
  timezone: string;
  headcountRules: string;
};

// Default starter templates
const defaultTemplates: Omit<Template, "id" | "isDefault">[] = [
  {
    name: "Investor Update",
    metrics: ["MRR", "ARR", "Growth", "Burn Rate", "Runway"],
    tone: "formal",
    sections: ["Executive Summary", "Key Metrics", "Highlights", "Challenges"],
  },
  {
    name: "Board Report",
    metrics: ["ARR", "MRR", "Burn Rate", "Runway", "Churn", "Growth"],
    tone: "formal",
    sections: ["Overview", "Financials", "Operations", "Risks"],
  },
  {
    name: "Monthly Performance Summary",
    metrics: ["MRR", "Growth", "Burn Rate", "Runway"],
    tone: "short",
    sections: ["Metrics", "Trends", "Key Changes"],
  },
  {
    name: "Fundraising Update",
    metrics: ["ARR", "Growth", "Runway", "Burn Rate"],
    tone: "narrative",
    sections: ["Progress", "Metrics", "Use of Funds"],
  },
];

export function CompanySettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section") as SettingsSection | null;
  const { theme, setTheme } = useTheme();
  const { density, fontSize, setDensity, setFontSize } = useAppearance();
  
  // Try to get companyId from Company Context
  let contextCompanyId: string | null = null;
  try {
    const { activeCompany } = useCompany();
    contextCompanyId = activeCompany?.id || null;
  } catch {
    // Not in CompanyProvider context - that's ok
  }
  
  const [activeSection, setActiveSection] = useState<SettingsSection>(
    sectionParam || "appearance"
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(contextCompanyId);

  // Settings state
  const [appearance, setAppearance] = useState<AppearanceSettings>({
    theme: theme,
    layoutDensity: density,
    fontSize: fontSize,
  });

  // Sync theme, density, and fontSize from hooks to appearance state
  useEffect(() => {
    setAppearance(prev => ({ ...prev, theme }));
  }, [theme]);
  
  useEffect(() => {
    setAppearance(prev => ({ ...prev, layoutDensity: density }));
  }, [density]);
  
  useEffect(() => {
    setAppearance(prev => ({ ...prev, fontSize }));
  }, [fontSize]);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [branding, setBranding] = useState<BrandingSettings>({
    logoUrl: null,
    primaryColor: "#2B74FF",
    headerStyle: "minimal",
  });

  const [preferences, setPreferences] = useState<PreferencesSettings>({
    defaultDashboardView: "overview",
    defaultTimeRange: "30d",
    notificationRules: {
      runwayThreshold: 6,
      burnThreshold: 0,
    },
    currency: "USD",
    growthDisplayStyle: "mom",
  });

  const [teamRoles, setTeamRoles] = useState<TeamRole[]>([]);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "viewer" as "admin" | "finance" | "viewer",
  });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [dataDefaults, setDataDefaults] = useState<DataDefaultsSettings>({
    revenueDefinition: "All recurring revenue including subscriptions",
    burnCalculation: "Total monthly expenses minus revenue",
    includeVAT: false,
    timezone: "UTC",
    headcountRules: "Include all full-time employees",
  });

  // Logo upload state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  // Load company ID, branding, and team members
  useEffect(() => {
    async function loadCompanyId() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          router.replace("/login");
          return;
        }

        // First check URL params for companyId
        const companyIdFromUrl = searchParams.get("companyId");
        
        let targetCompanyId: string | null = null;
        let companyData: any = null;

        if (companyIdFromUrl) {
          // If companyId is in URL, fetch that specific company
          const { data, error } = await supabase
            .from("companies")
            .select("id, logo_url, header_style, brand_color, owner_id")
            .eq("id", companyIdFromUrl)
            .maybeSingle();
          
          if (!error && data && data.owner_id === session.user.id) {
            companyData = data;
            targetCompanyId = data.id;
          }
        }

        // If no companyId from URL or URL company not found, get user's first company
        if (!targetCompanyId) {
          const { data } = await supabase
            .from("companies")
            .select("id, logo_url, header_style, brand_color")
            .eq("owner_id", session.user.id)
            .maybeSingle();

          if (data?.id) {
            companyData = data;
            targetCompanyId = data.id;
          }
        }

        if (targetCompanyId && companyData) {
          setCompanyId(targetCompanyId);
          // Load branding data
          setBranding({
            logoUrl: companyData.logo_url || null,
            primaryColor: companyData.brand_color || "#2B74FF",
            headerStyle: (companyData.header_style || "minimal") as "minimal" | "branded",
          });
          // Load team members after company ID is set
          loadTeamMembers(targetCompanyId);
        } else if (contextCompanyId) {
          // Fallback to context companyId if database fetch failed
          setCompanyId(contextCompanyId);
          console.log("Using company ID from context:", contextCompanyId);
        } else {
          // Don't set error immediately - user might be redirected to onboarding
          console.warn("No company found for user. User may need to create a company first.");
          // Don't set logoError here as it shows immediately - let it show only if user tries to upload
        }
      } catch (err) {
        console.error("Error loading company:", err);
      } finally {
        setLoading(false);
      }
    }

    loadCompanyId();
  }, [router, searchParams]);

  // Load team members from API
  const loadTeamMembers = async (id?: string) => {
    const companyIdToUse = id || companyId;
    if (!companyIdToUse) return;

    try {
      const response = await fetch(`/api/companies/${companyIdToUse}/team-members`);
      
      if (!response.ok) {
        let errorData: any = {};
        let rawText = "";
        
        // Try to get error details from response
        try {
          // Clone response to avoid consuming the body
          const clonedResponse = response.clone();
          rawText = await clonedResponse.text();
          
          if (rawText && rawText.trim()) {
            try {
              errorData = JSON.parse(rawText);
            } catch (parseError) {
              // Response is not JSON, use raw text as error message
              errorData = { 
                error: rawText.substring(0, 200) || "Unknown error", 
                raw: rawText.substring(0, 500),
                parseError: String(parseError)
              };
            }
          } else {
            errorData = { 
              error: `HTTP ${response.status}: ${response.statusText || "Unknown error"}`,
              emptyResponse: true
            };
          }
        } catch (fetchError: any) {
          // Couldn't even read response text
          errorData = { 
            error: `Failed to read error response: ${fetchError?.message || String(fetchError)}`,
            fetchError: String(fetchError),
            status: response.status,
            statusText: response.statusText
          };
        }
        
        // Ensure we always have some error message
        const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText || "Unknown error"}`;
        
        // Log with all available details
        console.error("Failed to load team members:", {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          details: errorData.details || errorData.hint || null,
          code: errorData.code || null,
          fullError: errorData
        });
        
        // If table doesn't exist, just return empty array (don't show error to user)
        // User will see empty list and can still invite members (which will show migration error)
        if (errorData.error === "Database table not found" || 
            errorMessage.includes("does not exist") || 
            errorData.code === "42P01" ||
            (response.status === 500 && (errorData.error?.includes("table") || errorData.error?.includes("does not exist")))) {
          console.warn("team_members table might not exist yet. Run migration first. Details:", errorData);
          setTeamRoles([]);
          return;
        }
        
        // For other errors, still set empty array to avoid UI issues
        // Error is already logged to console for debugging
        setTeamRoles([]);
        return;
      }

      const data = await response.json();
      if (data.teamMembers) {
        // Map database format to TeamRole format
        const mappedMembers: TeamRole[] = data.teamMembers.map((member: any) => ({
          id: member.id,
          name: member.name || member.email.split("@")[0],
          email: member.email,
          role: member.role,
          canEditTemplates: member.can_edit_templates || false,
          canChangeBranding: member.can_change_branding || false,
          canShareInvestorLinks: member.can_share_investor_links || false,
          canAccessDashboard: member.can_access_dashboard !== undefined ? member.can_access_dashboard : true,
          canViewOverview: member.can_view_overview !== undefined ? member.can_view_overview : true,
        }));
        setTeamRoles(mappedMembers);
      } else {
        setTeamRoles([]);
      }
    } catch (err) {
      console.error("Error loading team members:", err);
      setTeamRoles([]);
    }
  };

  // Initialize templates on load
  useEffect(() => {
    if (templates.length === 0) {
      const initializedTemplates: Template[] = defaultTemplates.map((tpl, idx) => ({
        ...tpl,
        id: `template-${idx}`,
        isDefault: idx === 0,
      }));
      setTemplates(initializedTemplates);
    }
  }, [templates.length]);

  // Update URL when section changes
  useEffect(() => {
    if (activeSection) {
      const url = new URL(window.location.href);
      url.searchParams.set("section", activeSection);
      window.history.replaceState({}, "", url.toString());
    }
  }, [activeSection]);

  const handleSave = async () => {
    if (!companyId) return;
    
    setSaving(true);
    try {
      // Save branding settings
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase
        .from("companies")
        .update({
          header_style: branding.headerStyle,
          brand_color: branding.primaryColor,
        })
        .eq("id", companyId)
        .eq("owner_id", session.user.id);

      if (error) {
        console.error("Error saving branding:", error);
        alert("Failed to save branding settings");
      } else {
        console.log("Settings saved");
        // Trigger refresh in company context if available
        if (typeof window !== "undefined" && (window as any).refreshActiveCompany) {
          (window as any).refreshActiveCompany();
        }
      }
    } catch (err) {
      console.error("Error saving settings:", err);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHeaderStyle = async (style: "minimal" | "branded") => {
    if (!companyId) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase
        .from("companies")
        .update({ header_style: style })
        .eq("id", companyId)
        .eq("owner_id", session.user.id);

      if (error) {
        console.error("Error saving header style:", error);
        // Revert UI state on error
        setBranding(prev => ({ ...prev, headerStyle: prev.headerStyle }));
      } else {
        console.log("Header style saved:", style);
        // Trigger refresh in company context to update header immediately
        if (typeof window !== "undefined" && (window as any).refreshActiveCompany) {
          await (window as any).refreshActiveCompany();
        }
      }
    } catch (err) {
      console.error("Error saving header style:", err);
      // Revert UI state on error
      setBranding(prev => ({ ...prev, headerStyle: prev.headerStyle }));
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) {
      console.log("No file selected");
      setLogoError("No file selected");
      return;
    }
    
    if (!companyId) {
      setLogoError("No company found. Please create a company first or refresh the page.");
      console.error("No company ID found - user needs to create a company");
      // Optionally redirect to onboarding
      setTimeout(() => {
        if (confirm("No company found. Would you like to create one?")) {
          router.push("/onboarding");
        }
      }, 100);
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("File size exceeds 2MB limit");
      return;
    }

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      setLogoError("Invalid file type. Only PNG, JPG, or SVG are allowed.");
      return;
    }

    console.log("Starting upload:", { companyId, fileName: file.name, fileSize: file.size, fileType: file.type });

    setUploadingLogo(true);
    setLogoError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLogoError("Not authenticated");
        return;
      }

      const response = await fetch(`/api/companies/${companyId}/logo`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        // Combine error and details for more helpful message
        let errorMessage = errorData.error || `HTTP ${response.status}`;
        if (errorData.details) {
          errorMessage += `: ${errorData.details}`;
        }
        console.error("Upload failed:", errorMessage, errorData);
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Update local state
      setBranding(prev => ({ ...prev, logoUrl: data.logoUrl }));
      console.log("Logo uploaded successfully:", data.logoUrl);
      
      // Trigger refresh in company context
      if (typeof window !== "undefined" && (window as any).refreshActiveCompany) {
        await (window as any).refreshActiveCompany();
      }
    } catch (err) {
      console.error("Error uploading logo:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to upload logo";
      setLogoError(errorMessage);
      alert(`Failed to upload logo: ${errorMessage}. Please check the browser console for details.`);
    } finally {
      setUploadingLogo(false);
      // Reset file input
      e.target.value = "";
    }
  };

  const handleLogoRemove = async () => {
    if (!companyId || !branding.logoUrl) return;

    if (!confirm("Are you sure you want to remove the logo?")) return;

    setUploadingLogo(true);
    setLogoError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLogoError("Not authenticated");
        return;
      }

      const response = await fetch(`/api/companies/${companyId}/logo`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove logo");
      }

      // Update local state
      setBranding(prev => ({ ...prev, logoUrl: null }));
      
      // Trigger refresh in company context
      if (typeof window !== "undefined" && (window as any).refreshActiveCompany) {
        (window as any).refreshActiveCompany();
      }
    } catch (err) {
      console.error("Error removing logo:", err);
      setLogoError(err instanceof Error ? err.message : "Failed to remove logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  async function handleDeleteCompany() {
    if (!companyId) return;

    // Fetch company name for confirmation message
    let companyName = "this company";
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: companyData } = await supabase
          .from("companies")
          .select("name")
          .eq("id", companyId)
          .maybeSingle();
        if (companyData?.name) {
          companyName = companyData.name;
        }
      }
    } catch (err) {
      console.error("Error fetching company name:", err);
    }

    const confirmed = confirm(
      `Are you sure you want to delete "${companyName}"? This action cannot be undone and will delete all associated data.`
    );

    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error("Not authenticated");
      }

      const res = await fetch(`/api/companies/${companyId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error || "Failed to delete company");
      }

      // Company deleted successfully - reload page to show updated state
      window.location.href = "/overview";
    } catch (err) {
      console.error("Error deleting company:", err);
      setError(err instanceof Error ? err.message : "Failed to delete company");
      setDeleting(false);
    }
  }

  const handleInviteTeamMember = async () => {
    if (!inviteForm.email.trim()) {
      setInviteError("Email is required");
      return;
    }

    if (!companyId) {
      setInviteError("Company not found");
      return;
    }

    setInviteLoading(true);
    setInviteError(null);

    try {
      // Get role permissions based on role type
      const rolePermissions: Record<"admin" | "finance" | "viewer", {
        canEditTemplates: boolean;
        canChangeBranding: boolean;
        canShareInvestorLinks: boolean;
        canAccessDashboard: boolean;
        canViewOverview: boolean;
      }> = {
        admin: {
          canEditTemplates: true,
          canChangeBranding: true,
          canShareInvestorLinks: true,
          canAccessDashboard: true,
          canViewOverview: true,
        },
        finance: {
          canEditTemplates: false,
          canChangeBranding: false,
          canShareInvestorLinks: true,
          canAccessDashboard: true,
          canViewOverview: true,
        },
        viewer: {
          canEditTemplates: false,
          canChangeBranding: false,
          canShareInvestorLinks: false,
          canAccessDashboard: true,
          canViewOverview: true,
        },
      };

      const permissions = rolePermissions[inviteForm.role];

      // Get auth token for API call
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Call API to create team member and send invitation
      const response = await fetch(`/api/companies/${companyId}/team-members`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token && { "Authorization": `Bearer ${token}` }),
        },
        body: JSON.stringify({
          email: inviteForm.email,
          role: inviteForm.role,
          canEditTemplates: permissions.canEditTemplates,
          canChangeBranding: permissions.canChangeBranding,
          canShareInvestorLinks: permissions.canShareInvestorLinks,
          canAccessDashboard: permissions.canAccessDashboard,
          canViewOverview: permissions.canViewOverview,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setInviteError(data.error || "Failed to send invitation");
        return;
      }

      // Load team members to refresh the list
      await loadTeamMembers();

      setInviteForm({ email: "", role: "viewer" });
      setInviteModalOpen(false);
      setInviteSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => setInviteSuccess(false), 3000);
      //     ...permissions,
      //   }),
      // });
    } catch (err: any) {
      setInviteError(err?.message || "Failed to invite team member");
    } finally {
      setInviteLoading(false);
    }
  };

  const sections: { id: SettingsSection; label: string }[] = [
    { id: "appearance", label: "Appearance" },
    { id: "templates", label: "Templates" },
    { id: "branding", label: "Branding" },
    { id: "preferences", label: "Preferences" },
    { id: "team-roles", label: "Team & Roles" },
    { id: "data-defaults", label: "Data Defaults" },
  ];

  if (loading) {
    return (
      <AppShell showNav={false}>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-slate-400">Loading settings...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell showNav={false}>
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--text)' }}>Company Settings</h1>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>Control how your company uses Valyxo</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:w-64 flex-shrink-0">
            <nav className="space-y-1 border rounded-lg p-2" style={{ backgroundColor: 'var(--panel-2)', borderColor: 'var(--border)' }}>
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full text-left px-4 py-2.5 rounded-md text-sm font-medium transition-all",
                    activeSection === section.id
                      ? "text-white font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                  style={activeSection === section.id ? { 
                    backgroundColor: 'rgba(43, 116, 255, 0.15)',
                    border: '1px solid #2B74FF',
                    boxShadow: '0 0 0 1px rgba(43, 116, 255, 0.3), 0 0 8px rgba(43, 116, 255, 0.2)'
                  } : {}}
                >
                  {section.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <Card className="rounded-lg p-6 lg:p-8">
              {/* Appearance Section */}
              {activeSection === "appearance" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--text)' }}>Appearance</h2>
                    <p className="text-sm" style={{ color: 'var(--text-2)' }}>Control how the app looks and feels</p>
                  </div>

                  <div className="space-y-6">
                    {/* Theme Toggle */}
                    <div>
                      <Label className="text-sm font-medium mb-3 block">Theme</Label>
                      <div className="flex gap-3">
                        {(["system", "dark", "light"] as const).map((themeOption) => (
                          <button
                            key={themeOption}
                            onClick={() => {
                              setTheme(themeOption);
                              setAppearance({ ...appearance, theme: themeOption });
                            }}
                            className={cn(
                              "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                              theme === themeOption
                                ? "text-white font-semibold"
                                : "bg-panel text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                            style={theme === themeOption ? {
                              borderColor: '#2B74FF',
                              backgroundColor: 'rgba(43, 116, 255, 0.15)',
                              boxShadow: '0 0 0 1px rgba(43, 116, 255, 0.3), 0 0 8px rgba(43, 116, 255, 0.2)'
                            } : { borderColor: 'var(--border)' }}
                          >
                            {themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs mt-2" style={{ color: 'var(--text-2)' }}>
                        Dark mode is the default. Light mode is for readability.
                      </p>
                    </div>

                    {/* Layout Density */}
                    <div>
                      <Label className="text-sm font-medium text-white mb-3 block">Layout Density</Label>
                      <div className="flex gap-3">
                        {(["compact", "comfortable"] as const).map((densityOption) => (
                          <button
                            key={densityOption}
                            onClick={() => {
                              setDensity(densityOption);
                              setAppearance({ ...appearance, layoutDensity: densityOption });
                            }}
                            className={cn(
                              "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                              density === densityOption
                                ? "text-white font-semibold"
                                : "bg-panel text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                            style={density === densityOption ? {
                              borderColor: '#2B74FF',
                              backgroundColor: 'rgba(43, 116, 255, 0.15)',
                              boxShadow: '0 0 0 1px rgba(43, 116, 255, 0.3), 0 0 8px rgba(43, 116, 255, 0.2)'
                            } : { borderColor: 'var(--border)' }}
                          >
                            {densityOption.charAt(0).toUpperCase() + densityOption.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font Size */}
                    <div>
                      <Label className="text-sm font-medium mb-3 block">Font Size</Label>
                      <div className="flex gap-3">
                        {(["small", "default", "large"] as const).map((sizeOption) => (
                          <button
                            key={sizeOption}
                            onClick={() => {
                              setFontSize(sizeOption);
                              setAppearance({ ...appearance, fontSize: sizeOption });
                            }}
                            className={cn(
                              "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                              fontSize === sizeOption
                                ? "text-white font-semibold"
                                : "bg-panel text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                            style={fontSize === sizeOption ? {
                              borderColor: '#2B74FF',
                              backgroundColor: 'rgba(43, 116, 255, 0.15)',
                              boxShadow: '0 0 0 1px rgba(43, 116, 255, 0.3), 0 0 8px rgba(43, 116, 255, 0.2)'
                            } : { borderColor: 'var(--border)' }}
                          >
                            {sizeOption.charAt(0).toUpperCase() + sizeOption.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Templates Section */}
              {activeSection === "templates" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--text)' }}>Templates</h2>
                    <p className="text-sm" style={{ color: 'var(--text-2)' }}>Standardize common workflows and reports</p>
                  </div>

                  <div className="space-y-4">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="border rounded-lg p-4"
                        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--panel-2)' }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium" style={{ color: 'var(--text)' }}>{template.name}</h3>
                              {template.isDefault && (
                                <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400">
                              Tone: {template.tone.charAt(0).toUpperCase() + template.tone.slice(1)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button className="px-3 py-1.5 text-xs border rounded hover:bg-accent transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                              Edit
                            </button>
                            <button className="px-3 py-1.5 text-xs border rounded hover:bg-accent transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                              Duplicate
                            </button>
                          </div>
                        </div>
                        <div className="text-xs text-slate-400 space-y-1">
                          <div>
                            <span className="text-slate-500">Metrics: </span>
                            {template.metrics.join(", ")}
                          </div>
                          <div>
                            <span style={{ opacity: 0.7 }}>Sections: </span>
                            {template.sections.join(", ")}
                          </div>
                        </div>
                      </div>
                    ))}
                    <button className="w-full py-3 border border-dashed rounded-lg hover:bg-accent text-sm transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                      + Create New Template
                    </button>
                  </div>
                </div>
              )}

              {/* Branding Section */}
              {activeSection === "branding" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--text)' }}>Branding</h2>
                    <p className="text-sm" style={{ color: 'var(--text-2)' }}>Control how your company is presented externally</p>
                  </div>

                  <div className="space-y-6">
                    {/* Logo Upload */}
                    <div>
                      <Label className="text-sm font-medium text-white mb-3 block">Company Logo</Label>
                      <div className="flex items-center gap-4">
                        {branding.logoUrl ? (
                          <img
                            src={branding.logoUrl}
                            alt="Company logo"
                            className="w-16 h-16 object-contain border rounded bg-white p-1"
                            style={{ borderColor: 'var(--border)' }}
                            onError={(e) => {
                              // Fallback if image fails to load
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 border border-dashed border-slate-700 rounded flex items-center justify-center bg-slate-800/30">
                            <span className="text-xs text-slate-500">No logo</span>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <input
                            id="logo-upload"
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                            onChange={handleLogoUpload}
                            className="hidden"
                            disabled={uploadingLogo}
                          />
                          <Button
                            variant="outline"
                            disabled={uploadingLogo}
                            type="button"
                            onClick={() => {
                              const input = document.getElementById("logo-upload") as HTMLInputElement;
                              if (input) {
                                input.click();
                              }
                            }}
                          >
                            {uploadingLogo ? "Uploading..." : "Upload"}
                          </Button>
                          {branding.logoUrl && (
                            <Button
                              variant="outline"
                              onClick={handleLogoRemove}
                              disabled={uploadingLogo}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                      {logoError && (
                        <p className="text-xs text-red-400 mt-2">{logoError}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-2">
                        Used in the app header, investor views, shared dashboards, and reports. Max 2MB. PNG, JPG, or SVG.
                      </p>
                    </div>

                    {/* Primary Color */}
                    <div>
                      <Label className="text-sm font-medium mb-3 block">Primary Brand Color</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={branding.primaryColor}
                          onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                          className="w-16 h-10 rounded border cursor-pointer"
                          style={{ borderColor: 'var(--border)' }}
                        />
                        <Input
                          value={branding.primaryColor}
                          onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                          className="w-32"
                          placeholder="#2B74FF"
                        />
                      </div>
                    </div>

                    {/* Header Style */}
                    <div>
                      <Label className="text-sm font-medium text-white mb-3 block">Header Style</Label>
                      <div className="flex gap-3">
                        {(["minimal", "branded"] as const).map((style) => (
                          <button
                            key={style}
                            onClick={() => {
                              setBranding({ ...branding, headerStyle: style });
                              // Auto-save when header style changes
                              handleSaveHeaderStyle(style);
                            }}
                            className={cn(
                              "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                              branding.headerStyle === style
                                ? "text-white font-semibold"
                                : "bg-panel text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                            style={branding.headerStyle === style ? {
                              borderColor: '#2B74FF',
                              backgroundColor: 'rgba(43, 116, 255, 0.15)',
                              boxShadow: '0 0 0 1px rgba(43, 116, 255, 0.3), 0 0 8px rgba(43, 116, 255, 0.2)'
                            } : { borderColor: 'var(--border)' }}
                          >
                            {style.charAt(0).toUpperCase() + style.slice(1)}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        {branding.headerStyle === "minimal" 
                          ? "Minimal: Small logo with company name. Clean and compact." 
                          : "Branded: Larger logo with company name. More prominent branding."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Preferences Section */}
              {activeSection === "preferences" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-1">Preferences</h2>
                    <p className="text-sm text-slate-400">Control how Valyxo behaves day-to-day</p>
                  </div>

                  <div className="space-y-6">
                    {/* Default Dashboard View */}
                    <div>
                      <Label className="text-sm font-medium text-white mb-3 block">Default Dashboard View</Label>
                      <select
                        value={preferences.defaultDashboardView}
                        onChange={(e) => setPreferences({ ...preferences, defaultDashboardView: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--border)', color: 'var(--text)' }}
                      >
                        <option value="overview">Overview</option>
                        <option value="metrics">Metrics</option>
                        <option value="charts">Charts</option>
                      </select>
                    </div>

                    {/* Default Time Range */}
                    <div>
                      <Label className="text-sm font-medium text-white mb-3 block">Default Time Range</Label>
                      <div className="flex gap-3">
                        {(["30d", "90d", "ytd"] as const).map((range) => (
                          <button
                            key={range}
                            onClick={() => setPreferences({ ...preferences, defaultTimeRange: range })}
                            className={cn(
                              "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                              preferences.defaultTimeRange === range
                                ? "text-white font-semibold"
                                : "bg-panel text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                            style={preferences.defaultTimeRange === range ? {
                              borderColor: '#2B74FF',
                              backgroundColor: 'rgba(43, 116, 255, 0.15)',
                              boxShadow: '0 0 0 1px rgba(43, 116, 255, 0.3), 0 0 8px rgba(43, 116, 255, 0.2)'
                            } : { borderColor: 'var(--border)' }}
                          >
                            {range === "ytd" ? "YTD" : range.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Notification Rules */}
                    <div className="space-y-4 border-t pt-6" style={{ borderColor: 'var(--border)' }}>
                      <Label className="text-sm font-medium text-white block">Notification Rules</Label>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs text-slate-400 mb-2 block">Alert when runway is below (months)</Label>
                          <Input
                            type="number"
                            value={preferences.notificationRules.runwayThreshold}
                            onChange={(e) =>
                              setPreferences({
                                ...preferences,
                                notificationRules: {
                                  ...preferences.notificationRules,
                                  runwayThreshold: parseInt(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-32"
                          />
                        </div>
                        <div>
                          <Label className="text-xs mb-2 block" style={{ color: 'var(--text-2)' }}>Alert when burn exceeds ($)</Label>
                          <Input
                            type="number"
                            value={preferences.notificationRules.burnThreshold}
                            onChange={(e) =>
                              setPreferences({
                                ...preferences,
                                notificationRules: {
                                  ...preferences.notificationRules,
                                  burnThreshold: parseInt(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-32"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Currency */}
                    <div>
                      <Label className="text-sm font-medium text-white mb-3 block">Currency</Label>
                      <select
                        value={preferences.currency}
                        onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--border)', color: 'var(--text)' }}
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="NOK">NOK (kr)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>

                    {/* Growth Display Style */}
                    <div>
                      <Label className="text-sm font-medium text-white mb-3 block">Growth Display Style</Label>
                      <div className="flex gap-3">
                        {(["mom", "qoq", "yoy"] as const).map((style) => (
                          <button
                            key={style}
                            onClick={() => setPreferences({ ...preferences, growthDisplayStyle: style })}
                            className={cn(
                              "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                              preferences.growthDisplayStyle === style
                                ? "text-white font-semibold"
                                : "bg-panel text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                            style={preferences.growthDisplayStyle === style ? {
                              borderColor: '#2B74FF',
                              backgroundColor: 'rgba(43, 116, 255, 0.15)',
                              boxShadow: '0 0 0 1px rgba(43, 116, 255, 0.3), 0 0 8px rgba(43, 116, 255, 0.2)'
                            } : { borderColor: 'var(--border)' }}
                          >
                            {style === "mom" ? "MoM" : style === "qoq" ? "QoQ" : "YoY"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Team & Roles Section */}
              {activeSection === "team-roles" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--text)' }}>Team & Roles</h2>
                    <p className="text-sm" style={{ color: 'var(--text-2)' }}>Manage who can do what in your company</p>
                  </div>

                  <div className="space-y-4">
                    <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-900/30">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-white">Owner</h3>
                          <p className="text-xs text-slate-400 mt-1">Full access to all settings and data</p>
                        </div>
                        <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
                          You
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium block">Role Permissions</Label>
                      <div className="text-xs space-y-1 border rounded-lg p-3 overflow-x-auto" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--panel-2)', color: 'var(--text-2)' }}>
                        <div className="grid grid-cols-6 gap-3 mb-2 pb-2 border-b min-w-[600px]" style={{ borderColor: 'var(--border)', opacity: 0.7 }}>
                          <div>Role</div>
                          <div>Edit Templates</div>
                          <div>Change Branding</div>
                          <div>Share Investor Links</div>
                          <div>Dashboard Access</div>
                          <div>Dashboard Overview</div>
                        </div>
                        <div className="grid grid-cols-6 gap-3 min-w-[600px]">
                          <div className="text-white">Owner</div>
                          <div className="text-green-400">✓</div>
                          <div className="text-green-400">✓</div>
                          <div className="text-green-400">✓</div>
                          <div className="text-green-400">✓</div>
                          <div className="text-green-400">✓</div>
                        </div>
                        <div className="grid grid-cols-6 gap-3 min-w-[600px]">
                          <div className="text-white">Admin</div>
                          <div className="text-green-400">✓</div>
                          <div className="text-green-400">✓</div>
                          <div className="text-green-400">✓</div>
                          <div className="text-green-400">✓</div>
                          <div className="text-green-400">✓</div>
                        </div>
                        <div className="grid grid-cols-6 gap-3 min-w-[600px]">
                          <div className="text-white">Finance</div>
                          <div className="text-slate-500">—</div>
                          <div className="text-slate-500">—</div>
                          <div className="text-green-400">✓</div>
                          <div className="text-green-400">✓</div>
                          <div className="text-green-400">✓</div>
                        </div>
                        <div className="grid grid-cols-6 gap-3 min-w-[600px]">
                          <div className="text-white">Viewer</div>
                          <div className="text-slate-500">—</div>
                          <div className="text-slate-500">—</div>
                          <div className="text-slate-500">—</div>
                          <div className="text-green-400">✓</div>
                          <div className="text-green-400">✓</div>
                        </div>
                      </div>
                    </div>

                    {/* Team Members List */}
                    {teamRoles.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium block">Team Members</Label>
                        <div className="space-y-2">
                          {teamRoles.map((member) => {
                            // Check if this is a pending invitation (no name or name is email prefix)
                            const isPending = !member.name || member.name === member.email.split("@")[0];
                            
                            return (
                            <div key={member.id} className="border border-slate-700/50 rounded-lg p-4 bg-slate-900/30 flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="font-medium text-white">{member.name || member.email.split("@")[0]}</div>
                                  {isPending && (
                                    <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/30">
                                      Pending
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-400 mt-1">{member.email}</div>
                                <div className="text-xs text-slate-500 mt-1 capitalize">{member.role}</div>
                              </div>
                              <button
                                onClick={async () => {
                                  if (!companyId) return;
                                  if (!confirm(`Are you sure you want to remove ${member.email}?`)) return;
                                  
                                  try {
                                    const response = await fetch(`/api/companies/${companyId}/team-members?memberId=${member.id}`, {
                                      method: "DELETE",
                                    });
                                    
                                    if (!response.ok) {
                                      const data = await response.json();
                                      alert(data.error || "Failed to remove team member");
                                      return;
                                    }
                                    
                                    // Reload team members
                                    await loadTeamMembers();
                                  } catch (err) {
                                    console.error("Error removing team member:", err);
                                    alert("Failed to remove team member");
                                  }
                                }}
                                className="text-xs text-red-400 hover:text-red-300 transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          );
                          })}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => setInviteModalOpen(true)}
                      className="w-full py-3 border border-dashed rounded-lg hover:bg-accent text-sm transition-colors"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}
                    >
                      + Invite Team Member
                    </button>
                  </div>
                </div>
              )}

              {/* Data Defaults Section */}
              {activeSection === "data-defaults" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-1">Data Defaults</h2>
                    <p className="text-sm text-slate-400">Define how metrics are interpreted and calculated</p>
                  </div>

                  <div className="space-y-6">
                    {/* Revenue Definition */}
                    <div>
                      <Label className="text-sm font-medium mb-3 block">What counts as revenue</Label>
                      <textarea
                        value={dataDefaults.revenueDefinition}
                        onChange={(e) => setDataDefaults({ ...dataDefaults, revenueDefinition: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary"
                        style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--border)', color: 'var(--text)' }}
                        placeholder="Define what should be included in revenue calculations"
                      />
                    </div>

                    {/* Burn Calculation */}
                    <div>
                      <Label className="text-sm font-medium text-white mb-3 block">How burn is calculated</Label>
                      <textarea
                        value={dataDefaults.burnCalculation}
                        onChange={(e) => setDataDefaults({ ...dataDefaults, burnCalculation: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary"
                        style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--border)', color: 'var(--text)' }}
                        placeholder="Define burn rate calculation method"
                      />
                    </div>

                    {/* Include VAT */}
                    <div className="flex items-center justify-between border-t border-slate-700/50 pt-6">
                      <div>
                        <Label className="text-sm font-medium block">Include VAT in calculations</Label>
                        <p className="text-xs text-slate-400 mt-1">Toggle whether VAT is included in financial metrics</p>
                      </div>
                      <button
                        onClick={() => setDataDefaults({ ...dataDefaults, includeVAT: !dataDefaults.includeVAT })}
                        className={cn(
                          "w-11 h-6 rounded-full transition-colors relative",
                          dataDefaults.includeVAT ? "bg-primary" : "bg-muted"
                        )}
                      >
                        <div
                          className={cn(
                            "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform",
                            dataDefaults.includeVAT ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>

                    {/* Timezone */}
                    <div>
                      <Label className="text-sm font-medium mb-3 block">Timezone</Label>
                      <select
                        value={dataDefaults.timezone}
                        onChange={(e) => setDataDefaults({ ...dataDefaults, timezone: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--border)', color: 'var(--text)' }}
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="Europe/London">London (GMT)</option>
                        <option value="Europe/Oslo">Oslo (CET)</option>
                      </select>
                    </div>

                    {/* Headcount Rules */}
                    <div>
                      <Label className="text-sm font-medium text-white mb-3 block">Headcount rules</Label>
                      <textarea
                        value={dataDefaults.headcountRules}
                        onChange={(e) => setDataDefaults({ ...dataDefaults, headcountRules: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary"
                        style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--border)', color: 'var(--text)' }}
                        placeholder="Define what employees count toward headcount metrics"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="mt-8 pt-6 border-t flex justify-end" style={{ borderColor: 'var(--border)' }}>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </Card>

            {/* Danger Zone */}
            {companyId && (
              <Card className="mt-6 border-red-500/30" style={{ backgroundColor: 'var(--panel)', borderColor: 'var(--border)' }}>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Once you delete a company, there is no going back. Please be certain.
                  </p>
                  {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  )}
                  <Button
                    onClick={handleDeleteCompany}
                    disabled={deleting}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {deleting ? "Deleting..." : "Delete Company"}
                  </Button>
                </div>
              </Card>
            )}
          </main>
        </div>
      </div>

      {/* Invite Team Member Modal */}
      {inviteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setInviteModalOpen(false)}
        >
          <div
            className="relative bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setInviteModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-semibold text-white mb-4">Invite Team Member</h3>

            {inviteSuccess && (
              <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-sm text-green-400">
                Invitation sent successfully!
              </div>
            )}

            {inviteError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-sm text-red-400">
                {inviteError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-white mb-2 block">Email</Label>
                <Input
                  type="email"
                  placeholder="team.member@example.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-white mb-2 block">Role</Label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as "admin" | "finance" | "viewer" })}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="viewer">Viewer - Dashboard access only</option>
                  <option value="finance">Finance - Dashboard + Share investor links</option>
                  <option value="admin">Admin - Full access except settings</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <Button
                  onClick={handleInviteTeamMember}
                  disabled={inviteLoading || !inviteForm.email.trim()}
                  className="flex-1 bg-[#2B74FF] hover:bg-[#2563EB] text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inviteLoading ? "Sending..." : "Send Invitation"}
                </Button>
                <Button
                  onClick={() => {
                    setInviteModalOpen(false);
                    setInviteForm({ email: "", role: "viewer" });
                    setInviteError(null);
                  }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// Server component wrapper to ensure Suspense boundary is recognized
// Export as named export for wrapper
export { CompanySettingsContent };
