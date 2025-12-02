"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type AdminCompany = {
  id: string;
  name: string;
  industry: string | null;
  created_at: string;
};

type AdminRequest = {
  id: string;
  created_at: string;
  investor_name: string;
  investor_email: string;
  status: string;
  company_name: string | null;
};

type AdminLink = {
  id: string;
  access_token: string;
  expires_at: string;
  request_id: string;
  investor_name: string | null;
};

export default function AdminPage() {
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [links, setLinks] = useState<AdminLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);

    // 1) Hent companies
    const { data: companiesData, error: companiesError } = await supabase
      .from("companies")
      .select("id, name, industry, created_at")
      .order("created_at", { ascending: false });

    if (companiesError) {
      setError(companiesError.message);
      setLoading(false);
      return;
    }

    // 2) Hent access_requests + koble på company-navn
    const { data: requestsData, error: requestsError } = await supabase
      .from("access_requests")
      .select("id, created_at, investor_name, investor_email, status, company_id, companies(name)")
      .order("created_at", { ascending: false });

    if (requestsError) {
      setError(requestsError.message);
      setLoading(false);
      return;
    }

    const mappedRequests: AdminRequest[] =
      (requestsData ?? []).map((r: any) => ({
        id: r.id,
        created_at: r.created_at,
        investor_name: r.investor_name,
        investor_email: r.investor_email,
        status: r.status,
        company_name: r.companies?.name ?? null,
      }));

    // 3) Hent investor_links + koble på investor-navn
    const { data: linksData, error: linksError } = await supabase
      .from("investor_links")
      .select("id, access_token, expires_at, request_id");

    if (linksError) {
      setError(linksError.message);
      setLoading(false);
      return;
    }

    // Lag et oppslag på request_id → investor_name
    const requestMap = new Map<string, string>();
    mappedRequests.forEach((r) => {
      requestMap.set(r.id, r.investor_name);
    });

    const mappedLinks: AdminLink[] =
      (linksData ?? []).map((l: any) => ({
        id: l.id,
        access_token: l.access_token,
        expires_at: l.expires_at,
        request_id: l.request_id,
        investor_name: requestMap.get(l.request_id) ?? null,
      }));

    setCompanies((companiesData as AdminCompany[]) ?? []);
    setRequests(mappedRequests);
    setLinks(mappedLinks);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function formatDate(value: string) {
    try {
      return new Date(value).toLocaleString("nb-NO");
    } catch {
      return value;
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <header className="space-y-2">
          <p className="text-xs tracking-[0.2em] text-slate-500 uppercase">
            Admin
          </p>
          <h1 className="text-3xl font-bold">Adminpanel</h1>
          <p className="text-sm text-slate-400">
            Kun oversikt – ingen redigering ennå. Viser companies, access_requests
            og investor_links direkte fra databasen.
          </p>
        </header>

        {loading && (
          <p className="text-sm text-slate-400">Laster data…</p>
        )}

        {error && (
          <div className="rounded-md border border-red-500/50 bg-red-950/40 p-4 text-sm text-red-100">
            Feil ved henting av data: {error}
          </div>
        )}

        {/* COMPANIES */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Companies</h2>
            <p className="text-xs text-slate-400">
              Antall: {companies.length}
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/80">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-300">
                    Navn
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-300">
                    Bransje
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-300">
                    Opprettet
                  </th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="border-t border-slate-800">
                    <td className="px-4 py-2">{c.name}</td>
                    <td className="px-4 py-2 text-slate-400">
                      {c.industry ?? "–"}
                    </td>
                    <td className="px-4 py-2 text-slate-400">
                      {formatDate(c.created_at)}
                    </td>
                  </tr>
                ))}
                {companies.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-3 text-sm text-slate-500"
                    >
                      Ingen selskaper funnet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ACCESS REQUESTS */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Access requests</h2>
            <p className="text-xs text-slate-400">
              Antall: {requests.length}
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/80">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-300">
                    Investor
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-300">
                    E-post
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-300">
                    Selskap
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-300">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-300">
                    Tidspunkt
                  </th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-t border-slate-800">
                    <td className="px-4 py-2">{r.investor_name}</td>
                    <td className="px-4 py-2 text-slate-400">
                      {r.investor_email}
                    </td>
                    <td className="px-4 py-2 text-slate-400">
                      {r.company_name ?? "–"}
                    </td>
                    <td className="px-4 py-2 text-slate-400">
                      {r.status}
                    </td>
                    <td className="px-4 py-2 text-slate-400">
                      {formatDate(r.created_at)}
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-3 text-sm text-slate-500"
                    >
                      Ingen forespørsler funnet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* INVESTOR LINKS */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Investor links</h2>
            <p className="text-xs text-slate-400">
              Antall: {links.length}
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/80">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-300">
                    Token
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-300">
                    Investor
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-300">
                    Request ID
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-slate-300">
                    Utløper
                  </th>
                </tr>
              </thead>
              <tbody>
                {links.map((l) => (
                  <tr key={l.id} className="border-t border-slate-800">
                    <td className="px-4 py-2 text-slate-300 break-all">
                      {l.access_token}
                    </td>
                    <td className="px-4 py-2 text-slate-400">
                      {l.investor_name ?? "–"}
                    </td>
                    <td className="px-4 py-2 text-slate-400">
                      {l.request_id}
                    </td>
                    <td className="px-4 py-2 text-slate-400">
                      {formatDate(l.expires_at)}
                    </td>
                  </tr>
                ))}
                {links.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-3 text-sm text-slate-500"
                    >
                      Ingen investor-lenker funnet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}