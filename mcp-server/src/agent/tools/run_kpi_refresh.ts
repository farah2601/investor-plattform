import { z } from "zod";

const InputSchema = z.object({
  companyId: z.string().uuid(),
});

export async function runKpiRefresh(input: unknown) {
  const parsed = InputSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid input for run_kpi_refresh");
  }

  const { companyId } = parsed.data;

  // 🧠 Her kommer ekte KPI-jobb senere
  const result = {
    refreshedAt: new Date().toISOString(),
    kpis: {
      revenue: 123,
      mrr: 45,
      churn: 0.02,
    },
  };

  return {
    ok: true,
    companyId,
    result,
  };
}