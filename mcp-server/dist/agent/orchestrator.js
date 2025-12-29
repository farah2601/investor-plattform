"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAgent = runAgent;
// src/agent/orchestrator.ts
const zod_1 = require("zod");
const logger_1 = require("../logging/logger");
const run_kpi_refresh_1 = require("./tools/run_kpi_refresh");
const run_profile_refresh_1 = require("./tools/run_profile_refresh"); // hvis filen heter run_Profile_Refresh.ts: endre importen
const generate_insights_1 = require("./tools/generate_insights");
const Uuid = zod_1.z.string().uuid();
async function runAgent(params) {
    const { tool, input } = params;
    // ✅ companyId blir null hvis input mangler companyId eller den ikke er UUID
    let companyId = null;
    if (typeof input === "object" && input !== null && "companyId" in input) {
        const raw = input.companyId;
        const parsed = Uuid.safeParse(raw);
        companyId = parsed.success ? parsed.data : null;
    }
    // ✅ Logging må alltid ha en "company_id" som er string (UUID i DB).
    // Hvis vi ikke har en UUID, logger vi som "system".
    const logCompanyId = companyId ?? "system";
    try {
        // ✅ START – kun her
        await (0, logger_1.logAgentEvent)(logCompanyId, tool, "start", "Agent task started", {});
        let result;
        switch (tool) {
            case "run_kpi_refresh": {
                result = await (0, run_kpi_refresh_1.runKpiRefresh)(input);
                break;
            }
            case "run_profile_refresh": {
                result = await (0, run_profile_refresh_1.runProfileRefresh)(input);
                break;
            }
            case "generate_insights": {
                result = await (0, generate_insights_1.generateInsights)(input);
                break;
            }
            default: {
                throw new Error(`Unknown agent tool: ${tool}`);
            }
        }
        // ✅ SUCCESS – kun her
        await (0, logger_1.logAgentEvent)(logCompanyId, tool, "success", "Agent task completed", {
            result,
        });
        return result;
    }
    catch (error) {
        // ✅ FAIL – kun her
        await (0, logger_1.logAgentEvent)(logCompanyId, tool, "fail", error?.message ?? "Agent failed", {
            error: {
                message: error?.message,
                name: error?.name,
            },
        });
        throw error;
    }
}
