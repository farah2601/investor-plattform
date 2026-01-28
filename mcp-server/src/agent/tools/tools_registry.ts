import { z } from "zod";
import { generateInsights } from "./generate_insights";
import { runAll } from "./run_all";
import { runKpiRefresh } from "./run_kpi_refresh";
import { runInsightsRefresh } from "./run_insights_refresh";
import { runProfileRefresh } from "./run_profile_refresh";
import { getAgentLogs } from "./get_agent_logs";
import { debugLatestSnapshot } from "./debug_latest_snapshot";

// (Valgfritt) map-lookup hvis du bruker det et sted
export const toolsRegistry: Record<string, (input: any) => Promise<any>> = {
  run_all: runAll,
  run_kpi_refresh: runKpiRefresh,
  run_insights_refresh: runInsightsRefresh,
  run_profile_refresh: runProfileRefresh,
  get_agent_logs: getAgentLogs,
  generate_insights: generateInsights,
  debug_latest_snapshot: debugLatestSnapshot,
};

// ✅ DETTE er vanligvis det MCP bruker til å expose tools/routes
export const ToolsRegistry = {
  run_all: {
    name: "run_all",
    description: "Run all refresh tasks for a company",
    inputSchema: z.object({ companyId: z.string().uuid() }),
    handler: runAll,
  },

  run_kpi_refresh: {
    name: "run_kpi_refresh",
    description: "Refresh KPI metrics for a company",
    inputSchema: z.object({ companyId: z.string().uuid() }),
    handler: runKpiRefresh,
  },

  run_insights_refresh: {
    name: "run_insights_refresh",
    description: "Generate insights refresh for a company",
    inputSchema: z.object({ companyId: z.string().uuid() }),
    handler: runInsightsRefresh,
  },

  // ✅ NY: expose generate_insights
  generate_insights: {
    name: "generate_insights",
    description: "Generate deterministic insights based on KPI snapshots",
    inputSchema: z.object({ companyId: z.string().uuid() }),
    handler: generateInsights,
  },

  run_profile_refresh: {
    name: "run_profile_refresh",
    description: "Refresh company profile narrative",
    inputSchema: z.object({ companyId: z.string().uuid() }),
    handler: runProfileRefresh,
  },

  get_agent_logs: {
    name: "get_agent_logs",
    description: "Fetch agent logs for a company",
    inputSchema: z.object({ companyId: z.string().uuid() }),
    handler: getAgentLogs,
  },

  debug_latest_snapshot: {
    name: "debug_latest_snapshot",
    description: "Debug tool to inspect the latest valid KPI snapshot for a company",
    inputSchema: z.object({ companyId: z.string().uuid() }),
    handler: debugLatestSnapshot,
  },
} as const;

export type ToolName = keyof typeof ToolsRegistry;