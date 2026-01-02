"use client";

import { useMemo, useState, FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";
import Link from "next/link";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Company = {
  id: string;
  name: string;
  industry: string | null;
  growth_status: string | null; // up | warning | down | null
  runway_months: number | null;
};

type CompaniesListProps = {
  initialCompanies: Company[];
};

function growthText(status: string | null) {
  // midlertidig mapping (bytt til ekte tall når du har growth i DB)
  if (status === "up") return "+20%";
  if (status === "warning") return "+5%";
  if (status === "down") return "-5%";
  return "—";
}

function statusDotClass(status: string | null) {
  if (status === "warning") return "bg-amber-400/80";
  if (status === "down") return "bg-rose-400/80";
  return "bg-emerald-400/80";
}

function updatedText(status: string | null) {
  // placeholder (erstatt med updated_at senere)
  if (status === "up") return "6 hours ago";
  if (status === "warning") return "3 days ago";
  if (status === "down") return "1 day ago";
  return "Never";
}

export function CompaniesList({ initialCompanies }: CompaniesListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string>("all");
  const [selectedSort, setSelectedSort] = useState<string>("recent");

  const [openForCompany, setOpenForCompany] = useState<Company | null>(null);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });

  const industries = useMemo(() => {
    const set = new Set<string>();
    initialCompanies.forEach((c) => c.industry && set.add(c.industry));
    return Array.from(set).sort();
  }, [initialCompanies]);

  const filteredCompanies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = initialCompanies.filter((company) => {
      const matchesSearch =
        !q ||
        company.name.toLowerCase().includes(q) ||
        (company.industry ?? "").toLowerCase().includes(q);

      const matchesIndustry =
        selectedIndustry === "all" ||
        (company.industry && company.industry === selectedIndustry);

      return matchesSearch && matchesIndustry;
    });

    const sorted = [...base];
    if (selectedSort === "alpha") sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (selectedSort === "runway")
      sorted.sort((a, b) => (b.runway_months ?? -1) - (a.runway_months ?? -1));
    if (selectedSort === "growth")
      sorted.sort((a, b) => growthText(b.growth_status).localeCompare(growthText(a.growth_status)));

    return sorted;
  }, [initialCompanies, searchQuery, selectedIndustry, selectedSort]);

  function openModal(company: Company) {
    setOpenForCompany(company);
    setFeedback(null);
    setForm({ name: "", email: "", company: "", message: "" });
  }

  function closeModal() {
    setOpenForCompany(null);
    setFeedback(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!openForCompany) return;

    setSending(true);
    setFeedback(null);

    const { error } = await supabase.from("access_requests").insert([
      {
        company_id: openForCompany.id,
        investor_name: form.name,
        investor_email: form.email,
        investor_company: form.company || null,
        message: form.message || null,
        status: "pending",
      },
    ]);

    setSending(false);

    if (error) setFeedback("Something went wrong: " + error.message);
    else {
      setFeedback("Request sent ✅");
      setForm({ name: "", email: "", company: "", message: "" });
    }
  }

  return (
    <>
      {/* Controls Row (EXACT Lovable behavior) */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            type="text"
            placeholder="Search company or industry…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-white/[0.04] border border-white/[0.10] rounded-lg text-sm text-white placeholder:text-white/40 focus-visible:ring-1 focus-visible:ring-[var(--valyxo)]/50 focus-visible:border-[var(--valyxo)]/50"
          />
        </div>

        {/* Industry */}
        <div className="relative">
          <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
            <SelectTrigger className="h-10 px-4 bg-white/[0.04] border border-white/[0.10] rounded-lg text-sm min-w-[160px] justify-between text-white [&[data-placeholder]]:text-white/60 [&[data-placeholder]]:opacity-100 [&_*[data-slot=select-value]]:text-white">
              <SelectValue placeholder="All industries" />
            </SelectTrigger>
            <SelectContent className="bg-slate-950 border border-white/[0.10]">
              <SelectItem value="all" className="text-white focus:text-white focus:bg-white/10">All industries</SelectItem>
              {industries.map((ind) => (
                <SelectItem key={ind} value={ind} className="text-white focus:text-white focus:bg-white/10">
                  {ind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort */}
        <div className="relative">
          <Select value={selectedSort} onValueChange={setSelectedSort}>
            <SelectTrigger className="h-10 px-4 bg-white/[0.04] border border-white/[0.10] rounded-lg text-sm min-w-[180px] justify-between text-white [&[data-placeholder]]:text-white/60 [&[data-placeholder]]:opacity-100 [&_*[data-slot=select-value]]:text-white">
              <SelectValue placeholder="Most recent update" />
            </SelectTrigger>
            <SelectContent className="bg-slate-950 border border-white/[0.10]">
              <SelectItem value="recent" className="text-white focus:text-white focus:bg-white/10">Most recent update</SelectItem>
              <SelectItem value="runway" className="text-white focus:text-white focus:bg-white/10">Runway (high to low)</SelectItem>
              <SelectItem value="growth" className="text-white focus:text-white focus:bg-white/10">Growth (high to low)</SelectItem>
              <SelectItem value="alpha" className="text-white focus:text-white focus:bg-white/10">Alphabetical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table (grid-cols-12 EXACT like Lovable) */}
      <div className="border border-white/[0.10] rounded-xl overflow-hidden bg-white/[0.03]">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-white/[0.03] border-b border-white/[0.10] text-xs font-medium text-white/50 uppercase tracking-wider">
          <div className="col-span-4">Company</div>
          <div className="col-span-2 text-right">Runway</div>
          <div className="col-span-2 text-right">Growth</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Action</div>
        </div>

        {/* Body */}
        <div className="divide-y divide-white/[0.08]">
          {filteredCompanies.map((company) => {
            const runway = company.runway_months == null ? "—" : `${company.runway_months} mo`;
            const growth = growthText(company.growth_status);
            const hasAccess = false; // TODO: koble til ekte access senere

            return (
              <div
                key={company.id}
                className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-white/[0.03] transition-colors"
              >
                {/* Company */}
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-9 h-9 bg-[var(--valyxo)]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-[var(--valyxo)] font-semibold text-sm">
                      {company.name?.[0]?.toUpperCase() ?? "C"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">{company.name}</p>
                    <p className="text-xs text-white/40">{company.industry ?? "—"}</p>
                  </div>
                </div>

                {/* Runway */}
                <div className="col-span-2 text-right">
                  <span className="text-sm font-mono text-white">{runway}</span>
                </div>

                {/* Growth */}
                <div className="col-span-2 text-right">
                  <span
                    className={cn(
                      "text-sm font-mono",
                      growth.startsWith("+") ? "text-emerald-400" : "text-white"
                    )}
                  >
                    {growth}
                  </span>
                </div>

                {/* Status */}
                <div className="col-span-2 flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", statusDotClass(company.growth_status))} />
                  <span className="text-xs text-white/40 hidden lg:inline">
                    {updatedText(company.growth_status)}
                  </span>
                </div>

                {/* Action */}
                <div className="col-span-2 flex justify-end">
                  {hasAccess ? (
                    <Link href="/investor">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[var(--valyxo)] hover:text-[var(--valyxo)] hover:bg-[var(--valyxo)]/10"
                      >
                        Open
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-white/60 border-white/[0.14] bg-transparent hover:bg-slate-950 hover:border-slate-950 hover:text-white"
                      onClick={() => openModal(company)}
                    >
                      Request access
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredCompanies.length === 0 && (
          <div className="px-6 py-12 text-center">
            <p className="text-white/60">No companies found</p>
            <p className="text-sm text-white/40 mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between text-xs text-white/40">
        <span>{filteredCompanies.length} companies</span>
      </div>

      {/* Modal */}
      {openForCompany && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-slate-950 border border-white/[0.10] rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-2 text-white">
              Request access — {openForCompany.name}
            </h2>
            <p className="text-sm text-white/45 mb-4">
              Fill in your details and the company can grant you access.
            </p>

            <form className="space-y-3" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium mb-1 text-white/80">Name</label>
                <Input
                  className="bg-white/[0.04] border-white/[0.10] text-white"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-white/80">Email</label>
                <Input
                  type="email"
                  className="bg-white/[0.04] border-white/[0.10] text-white"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-white/80">
                  Company (optional)
                </label>
                <Input
                  className="bg-white/[0.04] border-white/[0.10] text-white"
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-white/80">
                  Message (optional)
                </label>
                <textarea
                  className="w-full rounded-md border border-white/[0.10] bg-white/[0.04] px-3 py-2 text-sm text-white"
                  rows={3}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                />
              </div>

              {feedback && <p className="text-sm mt-1 text-emerald-400">{feedback}</p>}

              <div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/[0.12] text-slate-950 hover:text-slate-950 bg-white hover:bg-white/90"
                  onClick={closeModal}
                  disabled={sending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[var(--valyxo)] hover:opacity-90 text-white"
                  disabled={sending}
                >
                  {sending ? "Sending..." : "Send request"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
