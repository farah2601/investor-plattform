// lib/agent/kpiEngine.ts

import { supabase } from "../../src/app/lib/supabaseClient";

import type { KpiRecord, KpiSnapshot } from "./index";

// Dette er "rådata" før KPI-beregning.
// Vil bli utvidet når vi lager mock-integrasjoner i 3.2.
export type RawCompanyData = {
  mrr?: number; // Monthly Recurring Revenue
  churnRate?: number; // I prosent (0–1 eller 0–100, vi normaliserer senere hvis ønskelig)
  cac?: number; // Customer Acquisition Cost
  ltv?: number; // Lifetime Value
  cashBurn?: number; // Månedlig burn
  runwayMonths?: number;
  // Kan utvides med flere felt senere
  [key: string]: number | undefined;
};

/**
 * Ren funksjon som mapper rådata → KPI-er.
 * Denne skal være deterministisk og enkel å teste.
 */
export function calculateKpis(raw: RawCompanyData): KpiRecord {
  const mrr = raw.mrr ?? null;
  const arr = mrr != null ? mrr * 12 : null;

  const churnRate = raw.churnRate ?? null;
  const cac = raw.cac ?? null;
  const ltv = raw.ltv ?? null;
  const cashBurn = raw.cashBurn ?? null;

  const runwayMonths =
    raw.runwayMonths ??
    (cashBurn && cashBurn > 0 && mrr != null
      ? Math.round((mrr / cashBurn) * 10) / 10
      : null);

  return {
    mrr,
    arr,
    churnRate,
    cac,
    ltv,
    cashBurn,
    runwayMonths,
  };
}

/**
 * Lagrer et KPI-snapshot i Supabase for et gitt selskap.
 * Bruker kpi_snapshots-tabellen.
 */
export async function saveSnapshot(
  companyId: string,
  kpis: KpiRecord,
  effectiveDate?: string | Date
): Promise<KpiSnapshot> {
  const effectiveDateIso = effectiveDate
    ? new Date(effectiveDate).toISOString()
    : new Date().toISOString();

  const { data, error } = await supabase
    .from("kpi_snapshots")
    .insert({
      company_id: companyId,
      kpis,
      effective_date: effectiveDateIso,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[kpiEngine.saveSnapshot] error", error);
    throw new Error(`Failed to save KPI snapshot: ${error.message}`);
  }

  return {
    companyId: data.company_id,
    kpis: (data.kpis || {}) as KpiRecord,
    effectiveDate: data.effective_date,
    createdAt: data.created_at,
  };
}

/**
 * Henter siste KPI-snapshot for et selskap.
 * Returnerer null hvis ingen finnes.
 */
export async function getLatestKpis(
  companyId: string
): Promise<KpiSnapshot | null> {
  const { data, error } = await supabase
    .from("kpi_snapshots")
    .select("*")
    .eq("company_id", companyId)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // Hvis tabellen er tom / ingen rader → error kan være "No rows"
    // Vi logger, men kaster ikke hard feil første versjon.
    console.error("[kpiEngine.getLatestKpis] error", error);
    return null;
  }

  if (!data) return null;

  return {
    companyId: data.company_id,
    kpis: (data.kpis || {}) as KpiRecord,
    effectiveDate: data.effective_date,
    createdAt: data.created_at,
  };
}

