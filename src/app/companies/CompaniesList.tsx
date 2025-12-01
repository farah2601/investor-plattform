"use client";

import { useMemo, useState, FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";

import { Input } from "../../components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "../../components/ui/button";

type Company = {
  id: string;
  name: string;
  industry: string | null;
  growth_status: string | null;
  runway_months: number | null;
};

type CompaniesListProps = {
  initialCompanies: Company[];
};

function getGrowthEmoji(status: string | null) {
  if (status === "up") return "📈 Growing";
  if (status === "warning") return "⚠️ Flat";
  if (status === "down") return "🟥 Declining";
  return "❓ Ukjent";
}

function getRunwayClasses(runway: number | null) {
  if (runway == null) return "bg-slate-800 text-slate-200";
  if (runway > 6) return "bg-emerald-900/40 text-emerald-200";
  if (runway >= 3) return "bg-amber-900/40 text-amber-200";
  return "bg-red-900/40 text-red-200";
}

function getRunwayLabel(runway: number | null) {
  if (runway == null) return "Ukjent";
  if (runway > 6) return `${runway} mnd – trygg`;
  if (runway >= 3) return `${runway} mnd – overvåk`;
  return `${runway} mnd – kritisk`;
}

export function CompaniesList({ initialCompanies }: CompaniesListProps) {
  const companies = initialCompanies;

  const [search, setSearch] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string>("all");

  const [openForCompany, setOpenForCompany] = useState<Company | null>(null);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });

  // unike bransjer
  const industries = useMemo(() => {
    const set = new Set<string>();
    companies.forEach((c) => {
      if (c.industry) set.add(c.industry);
    });
    return Array.from(set).sort();
  }, [companies]);

  // filtrering
  const filtered = useMemo(() => {
    const term = search.toLowerCase();

    return companies.filter((c) => {
      const name = c.name.toLowerCase();
      const industry = (c.industry ?? "").toLowerCase();

      const matchesSearch =
        !term || name.includes(term) || industry.includes(term);

      const matchesIndustry =
        selectedIndustry === "all" ||
        (c.industry && c.industry === selectedIndustry);

      return matchesSearch && matchesIndustry;
    });
  }, [companies, search, selectedIndustry]);

  function openModal(company: Company) {
    setOpenForCompany(company);
    setFeedback(null);
    setForm({
      name: "",
      email: "",
      company: "",
      message: "",
    });
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

    const { data, error } = await supabase.from("access_requests").insert([
      {
        company_id: openForCompany.id,
        investor_name: form.name,
        investor_email: form.email,
        investor_company: form.company || null,
        message: form.message || null,
        status: "pending",
      },
    ]);

    console.log("insert result", { data, error });

    setSending(false);

    if (error) {
      setFeedback("Noe gikk galt: " + error.message);
    } else {
      setFeedback("Forespørsel sendt ✅");
      setForm({
        name: "",
        email: "",
        company: "",
        message: "",
      });
    }
  }

  return (
    <>
      {/* Søk + filter */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <Input
          className="flex-1 bg-slate-950 border-slate-800 text-slate-50 placeholder:text-slate-500"
          type="text"
          placeholder="Søk etter selskap eller bransje..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Select
          value={selectedIndustry}
          onValueChange={(val) => setSelectedIndustry(val)}
        >
          <SelectTrigger className="w-full md:w-48 bg-slate-950 border-slate-800 text-slate-50">
            <SelectValue placeholder="Alle bransjer" />
          </SelectTrigger>
          <SelectContent className="bg-slate-950 border-slate-800 text-slate-50">
            <SelectItem value="all">Alle bransjer</SelectItem>
            {industries.map((ind) => (
              <SelectItem key={ind} value={ind}>
                {ind}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Liste med selskaper */}
      <div className="space-y-4">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="rounded-2xl border border-slate-800 bg-slate-950/60 px-5 py-4 shadow-sm hover:bg-slate-900/80 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold text-slate-50">
                  {c.name}
                </p>
                {c.industry && (
                  <Badge
                    variant="outline"
                    className="border-slate-700 bg-slate-900 text-slate-100"
                  >
                    {c.industry}
                  </Badge>
                )}
              </div>

              <Button
                size="sm"
                variant="outline"
                className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                onClick={() => openModal(c)}
              >
                Be om tilgang
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Runway:</span>
                <span
                  className={
                    "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium " +
                    getRunwayClasses(c.runway_months)
                  }
                >
                  {getRunwayLabel(c.runway_months)}
                </span>
              </div>

              <div>
                <span className="text-slate-400 mr-1">Status:</span>
                <span>{getGrowthEmoji(c.growth_status)}</span>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-sm text-slate-500">
            Ingen selskaper matcher søket.
          </p>
        )}
      </div>

      {/* Popup-skjema */}
      {openForCompany && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-2 text-slate-50">
              Be om tilgang – {openForCompany.name}
            </h2>
            <p className="text-sm text-slate-400 mb-4">
              Fyll inn kontaktinfoen din, så kan selskapet gi deg tilgang til
              sitt KPI-dashboard.
            </p>

            <form className="space-y-3" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-200">
                  Navn
                </label>
                <Input
                  className="bg-slate-950 border-slate-800 text-slate-50"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-slate-200">
                  E-post
                </label>
                <Input
                  type="email"
                  className="bg-slate-950 border-slate-800 text-slate-50"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-slate-200">
                  Selskap (valgfritt)
                </label>
                <Input
                  className="bg-slate-950 border-slate-800 text-slate-50"
                  value={form.company}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, company: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-slate-200">
                  Melding (valgfritt)
                </label>
                <textarea
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-50"
                  rows={3}
                  value={form.message}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, message: e.target.value }))
                  }
                />
              </div>

              {feedback && (
                <p className="text-sm mt-1 text-emerald-400">
                  {feedback}
                </p>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-700 text-slate-100"
                  onClick={closeModal}
                  disabled={sending}
                >
                  Avbryt
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white"
                  disabled={sending}
                >
                  {sending ? "Sender..." : "Send forespørsel"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}