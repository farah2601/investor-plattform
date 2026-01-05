import { z } from "zod";
import { runKpiRefresh } from "./run_kpi_refresh";
import { runInsightsRefresh } from "./run_insights_refresh";
import { runProfileRefresh } from "./run_profile_refresh";

export const ToolNameSchema = z.enum([
  "run_kpi_refresh",
  "run_insights_refresh",
  "run_profile_refresh",
  "run_all",
  "run_all_companies",
]);

export const ToolsRegistry = {
  run_kpi_refresh: {
    name: "run_kpi_refresh",
    description: "Refresh KPI metrics for a company",
    inputSchema: z.object({
      companyId: z.string().uuid(),
    }),
    handler: runKpiRefresh,
  },
  run_insights_refresh: {
    name: "run_insights_refresh",
    description: "Generate AI insights for a company",
    inputSchema: z.object({
      companyId: z.string().uuid(),
    }),
    handler: runInsightsRefresh,
  },
  run_profile_refresh: {
    name: "run_profile_refresh",
    description: "Refresh company profile narrative",
    inputSchema: z.object({
      companyId: z.string().uuid(),
    }),
    handler: runProfileRefresh,
  },
} as const;

export type ToolName = keyof typeof ToolsRegistry;
