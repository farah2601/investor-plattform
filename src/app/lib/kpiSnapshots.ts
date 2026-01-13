import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type KPISnapshotRow = {
  period_date: string; // YYYY-MM-01
  kpis: Record<string, number | null>;
};

export async function getSnapshots(companyId: string): Promise<KPISnapshotRow[]> {
  const { data, error } = await supabaseAdmin
    .from("kpi_snapshots")
    .select("period_date, kpis")
    .eq("company_id", companyId)
    .order("period_date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as KPISnapshotRow[];
}

export async function getLatestSnapshot(companyId: string) {
  const snapshots = await getSnapshots(companyId);
  if (!snapshots.length) return null;
  const latest = snapshots[snapshots.length - 1];
  return {
    latest,
    latestKpis: (latest.kpis ?? {}) as Record<string, number | null>,
    snapshots,
  };
}