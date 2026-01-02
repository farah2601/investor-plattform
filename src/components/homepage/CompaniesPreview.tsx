"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../app/lib/supabaseClient";

type Company = {
  id: string;
  name: string;
  industry: string | null;
  description: string | null;
};

export function CompaniesPreview() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCompanies() {
      try {
        const { data, error } = await supabase
          .from("companies")
          .select("id, name, industry, description")
          .eq("profile_published", true)
          .order("name", { ascending: true })
          .limit(6);

        if (error) {
          console.error("Error loading companies:", error);
          return;
        }

        setCompanies(data || []);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadCompanies();
  }, []);

  if (loading) {
    return (
      <section className="py-20 px-6 sm:px-10 lg:px-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-semibold text-slate-50 mb-2">Public companies</h2>
            <p className="text-slate-400">Discover startups ready for investment</p>
          </div>
          <div className="text-center text-slate-400 text-sm">Loading companies...</div>
        </div>
      </section>
    );
  }

  if (companies.length === 0) {
    return (
      <section className="py-20 px-6 sm:px-10 lg:px-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-semibold text-slate-50 mb-2">Public companies</h2>
            <p className="text-slate-400">Discover startups ready for investment</p>
          </div>
          <div className="text-center text-slate-400 text-sm">
            No public companies available yet.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-6 sm:px-10 lg:px-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-semibold text-slate-50 mb-2">Public companies</h2>
          <p className="text-slate-400">Discover startups ready for investment</p>
        </div>

        {/* Company Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {companies.map((company) => (
            <div
              key={company.id}
              className="group rounded-2xl border border-white/10 bg-slate-900/40 p-6 hover:border-white/20 hover:bg-slate-900/60 transition-all"
            >
              <div className="mb-3">
                <h3 className="text-lg font-semibold text-slate-50 mb-1">{company.name}</h3>
                {company.industry && (
                  <span className="inline-block text-xs text-slate-400 px-2 py-1 rounded-full bg-white/5 border border-white/10">
                    {company.industry}
                  </span>
                )}
              </div>
              {company.description && (
                <p className="text-sm text-slate-400 line-clamp-3 mb-4">
                  {company.description}
                </p>
              )}
              <Link
                href={`/companies/${company.id}`}
                className="text-sm text-[#2B74FF] hover:text-[#2B74FF]/80 transition-colors inline-flex items-center gap-1"
              >
                View profile
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </Link>
            </div>
          ))}
        </div>

        {/* View All Link */}
        <div className="flex justify-end">
          <Link
            href="/companies"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-transparent px-6 py-3 text-sm font-medium text-slate-200 hover:bg-slate-800/30 hover:border-slate-600 transition-colors"
          >
            View all companies
            <span>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

