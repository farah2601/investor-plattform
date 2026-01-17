"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import { AppShell } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/use-theme";

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
  role: "owner" | "admin" | "finance" | "viewer";
  canEditTemplates: boolean;
  canChangeBranding: boolean;
  canShareInvestorLinks: boolean;
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

function CompanySettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section") as SettingsSection | null;
  const { theme, setTheme } = useTheme();
  
  const [activeSection, setActiveSection] = useState<SettingsSection>(
    sectionParam || "appearance"
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Settings state
  const [appearance, setAppearance] = useState<AppearanceSettings>({
    theme: theme,
    layoutDensity: "comfortable",
    fontSize: "default",
  });

  // Sync theme from hook to appearance state
  useEffect(() => {
    setAppearance(prev => ({ ...prev, theme }));
  }, [theme]);

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
  const [dataDefaults, setDataDefaults] = useState<DataDefaultsSettings>({
    revenueDefinition: "All recurring revenue including subscriptions",
    burnCalculation: "Total monthly expenses minus revenue",
    includeVAT: false,
    timezone: "UTC",
    headcountRules: "Include all full-time employees",
  });

  // Load company ID
  useEffect(() => {
    async function loadCompanyId() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          router.replace("/login");
          return;
        }

        const { data: companyData } = await supabase
          .from("companies")
          .select("id")
          .eq("owner_id", session.user.id)
          .maybeSingle();

        if (companyData?.id) {
          setCompanyId(companyData.id);
        }
      } catch (err) {
        console.error("Error loading company:", err);
      } finally {
        setLoading(false);
      }
    }

    loadCompanyId();
  }, [router]);

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
      // In a real implementation, save to database
      // For now, just simulate save
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log("Settings saved");
    } catch (err) {
      console.error("Error saving settings:", err);
    } finally {
      setSaving(false);
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
                    "w-full text-left px-4 py-2.5 rounded-md text-sm font-medium transition-colors",
                    activeSection === section.id
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                  style={activeSection === section.id ? { backgroundColor: 'var(--accent)' } : {}}
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
                                ? "bg-primary text-primary-foreground"
                                : "bg-panel text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                            style={{ borderColor: 'var(--border)' }}
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
                        {(["compact", "comfortable"] as const).map((density) => (
                          <button
                            key={density}
                            onClick={() => setAppearance({ ...appearance, layoutDensity: density })}
                            className={cn(
                              "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                              appearance.layoutDensity === density
                                ? "bg-primary text-primary-foreground"
                                : "bg-panel text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            {density.charAt(0).toUpperCase() + density.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font Size */}
                    <div>
                      <Label className="text-sm font-medium mb-3 block">Font Size</Label>
                      <div className="flex gap-3">
                        {(["small", "default", "large"] as const).map((size) => (
                          <button
                            key={size}
                            onClick={() => setAppearance({ ...appearance, fontSize: size })}
                            className={cn(
                              "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                              appearance.fontSize === size
                                ? "bg-primary text-primary-foreground"
                                : "bg-panel text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            {size.charAt(0).toUpperCase() + size.slice(1)}
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
                            className="w-16 h-16 object-contain border rounded"
                            style={{ borderColor: 'var(--border)' }}
                          />
                        ) : (
                          <div className="w-16 h-16 border border-dashed border-slate-700 rounded flex items-center justify-center">
                            <span className="text-xs text-slate-500">No logo</span>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                          >
                            Upload
                          </Button>
                          {branding.logoUrl && (
                            <Button
                              variant="outline"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Used for investor views, shared dashboards, and reports
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
                            onClick={() => setBranding({ ...branding, headerStyle: style })}
                            className={cn(
                              "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                              branding.headerStyle === style
                                ? "bg-primary text-primary-foreground"
                                : "bg-panel text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            {style.charAt(0).toUpperCase() + style.slice(1)}
                          </button>
                        ))}
                      </div>
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
                                ? "bg-primary text-primary-foreground"
                                : "bg-panel text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
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
                                ? "bg-primary text-primary-foreground"
                                : "bg-panel text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
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
                      <div className="text-xs space-y-1 border rounded-lg p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--panel-2)', color: 'var(--text-2)' }}>
                        <div className="grid grid-cols-4 gap-4 mb-2 pb-2 border-b" style={{ borderColor: 'var(--border)', opacity: 0.7 }}>
                          <div>Role</div>
                          <div>Edit Templates</div>
                          <div>Change Branding</div>
                          <div>Share Investor Links</div>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="text-white">Owner</div>
                          <div className="text-green-400">✓</div>
                          <div className="text-green-400">✓</div>
                          <div className="text-green-400">✓</div>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="text-white">Admin</div>
                          <div className="text-green-400">✓</div>
                          <div className="text-green-400">✓</div>
                          <div className="text-green-400">✓</div>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="text-white">Finance</div>
                          <div className="text-slate-500">—</div>
                          <div className="text-slate-500">—</div>
                          <div className="text-green-400">✓</div>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="text-white">Viewer</div>
                          <div className="text-slate-500">—</div>
                          <div className="text-slate-500">—</div>
                          <div className="text-slate-500">—</div>
                        </div>
                      </div>
                    </div>

                    <button className="w-full py-3 border border-dashed rounded-lg hover:bg-accent text-sm transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
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
          </main>
        </div>
      </div>
    </AppShell>
  );
}

export default function CompanySettingsPage() {
  return (
    <Suspense fallback={
      <AppShell showNav={false}>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-slate-400">Loading settings...</p>
        </div>
      </AppShell>
    }>
      <CompanySettingsContent />
    </Suspense>
  );
}
