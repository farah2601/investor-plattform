// src/agent/orchestrator.ts
import { z } from "zod";

import { logAgentEvent } from "../logging/logger";
import { runKpiRefresh } from "./tools/run_kpi_refresh";
import { runProfileRefresh } from "./tools/run_profile_refresh"; // hvis filen heter run_Profile_Refresh.ts: endre importen
import { generateInsights } from "./tools/generate_insights";

const Uuid = z.string().uuid();

export type AgentTool =
  | "run_kpi_refresh"
  | "run_profile_refresh"
  | "generate_insights";

export async function runAgent(params: { tool: AgentTool; input: unknown }) {
  const { tool, input } = params;

  // ✅ companyId blir null hvis input mangler companyId eller den ikke er UUID
  let companyId: string | null = null;

  if (typeof input === "object" && input !== null && "companyId" in input) {
    const raw = (input as any).companyId;
    const parsed = Uuid.safeParse(raw);
    companyId = parsed.success ? parsed.data : null;
  }

  // ✅ Logging må alltid ha en "company_id" som er string (UUID i DB).
  // Hvis vi ikke har en UUID, logger vi som "system".
  const logCompanyId = companyId ?? "system";

  try {
    // ✅ START – kun her
    await logAgentEvent(logCompanyId, tool, "start", "Agent task started", {});

    let result: any;

    switch (tool) {
      case "run_kpi_refresh": {
        result = await runKpiRefresh(input);
        break;
      }

      case "run_profile_refresh": {
        result = await runProfileRefresh(input);
        break;
      }

      case "generate_insights": {
        result = await generateInsights(input);
        break;
      }

      default: {
        throw new Error(`Unknown agent tool: ${tool}`);
      }
    }

    // ✅ SUCCESS – kun her
    await logAgentEvent(logCompanyId, tool, "success", "Agent task completed", {
      result,
    });

    return result;
  } catch (error: any) {
    // ✅ FAIL – kun her
    await logAgentEvent(logCompanyId, tool, "fail", error?.message ?? "Agent failed", {
      error: {
        message: error?.message,
        name: error?.name,
      },
    });

    throw error;
  }
}