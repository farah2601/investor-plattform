// src/agent/orchestrator.ts
import { z } from "zod";

import { logAgentEvent } from "../logging/logger";
import { runKpiRefresh } from "./tools/run_kpi_refresh";
import { runProfileRefresh } from "./tools/run_profile_refresh";
import { runInsightsRefresh } from "./tools/run_insights_refresh";
import { getAgentLogs } from "./tools/get_agent_logs";
import { runAll } from "./tools/run_all";

const Uuid = z.string().uuid();

export type AgentTool =
  | "run_kpi_refresh"
  | "run_insights_refresh"
  | "run_profile_refresh"
  | "get_agent_logs"
  | "run_all";

type CompanyInput = { companyId: string };

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function requireCompanyId(input: unknown): CompanyInput {
  if (!isObject(input)) throw new Error("Missing companyId");
  const raw = (input as any).companyId;

  // hvis du bruker zod Uuid, bruk den du allerede har:
  const parsed = Uuid.safeParse(raw);
  if (!parsed.success) throw new Error("Missing companyId");

  return { companyId: parsed.data };
}

export async function runAgent(params: { tool: AgentTool; input: unknown }) {
  const { tool, input } = params;

  // ✅ alltid parse til riktig shape for tools
  const { companyId } = requireCompanyId(input);

  try {
    // ✅ START
    await logAgentEvent(companyId, tool, "start", "Agent task started", {});

    let result: any;

    switch (tool) {
      case "run_kpi_refresh": {
        result = await runKpiRefresh({ companyId });
        break;
      }

      case "run_insights_refresh": {
        result = await runInsightsRefresh({ companyId });
        break;
      }

      case "run_profile_refresh": {
        result = await runProfileRefresh({ companyId });
        break;
      }

      case "get_agent_logs": {
        result = await getAgentLogs({ companyId });
        break;
      }

    case "run_all": {
  if (!companyId) throw new Error("Missing companyId");
  result = await runAll(companyId);
  break;
}

      default: {
        throw new Error(`Unknown agent tool: ${tool}`);
      }
    }

    // ✅ SUCCESS
    await logAgentEvent(companyId, tool, "success", "Agent task completed", {
      result,
    });

    return result;
  } catch (error: any) {
    // ✅ FAIL
    await logAgentEvent(
      companyId,
      tool,
      "fail",
      error?.message ?? "Agent failed",
      {
        error: { message: error?.message, name: error?.name },
      }
    );

    throw error;
  }
}