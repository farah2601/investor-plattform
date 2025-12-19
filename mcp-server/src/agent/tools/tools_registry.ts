import { z } from "zod";
import { runKpiRefresh } from "./run_kpi_refresh";

export const ToolNameSchema = z.enum(["run_kpi_refresh"]);

export const ToolsRegistry = {
  run_kpi_refresh: {
    name: "run_kpi_refresh",
    description: "Refresh KPI metrics for a company",
    inputSchema: z.object({
      companyId: z.string().uuid(),
    }),
    handler: runKpiRefresh,
  },
} as const;

export type ToolName = keyof typeof ToolsRegistry;