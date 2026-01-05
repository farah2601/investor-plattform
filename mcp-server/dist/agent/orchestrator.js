"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAgent = runAgent;
// src/agent/orchestrator.ts
const zod_1 = require("zod");
const logger_1 = require("../logging/logger");
const run_kpi_refresh_1 = require("./tools/run_kpi_refresh");
const run_profile_refresh_1 = require("./tools/run_profile_refresh");
const run_insights_refresh_1 = require("./tools/run_insights_refresh");
const get_agent_logs_1 = require("./tools/get_agent_logs");
const run_all_1 = require("./tools/run_all");
const Uuid = zod_1.z.string().uuid();
function isObject(x) {
    return typeof x === "object" && x !== null;
}
function requireCompanyId(input) {
    if (!isObject(input))
        throw new Error("Missing companyId");
    const raw = input.companyId;
    // hvis du bruker zod Uuid, bruk den du allerede har:
    const parsed = Uuid.safeParse(raw);
    if (!parsed.success)
        throw new Error("Missing companyId");
    return { companyId: parsed.data };
}
async function runAgent(params) {
    const { tool, input } = params;
    // ✅ alltid parse til riktig shape for tools
    const { companyId } = requireCompanyId(input);
    try {
        // ✅ START
        await (0, logger_1.logAgentEvent)(companyId, tool, "start", "Agent task started", {});
        let result;
        switch (tool) {
            case "run_kpi_refresh": {
                result = await (0, run_kpi_refresh_1.runKpiRefresh)({ companyId });
                break;
            }
            case "run_insights_refresh": {
                result = await (0, run_insights_refresh_1.runInsightsRefresh)({ companyId });
                break;
            }
            case "run_profile_refresh": {
                result = await (0, run_profile_refresh_1.runProfileRefresh)({ companyId });
                break;
            }
            case "get_agent_logs": {
                result = await (0, get_agent_logs_1.getAgentLogs)({ companyId });
                break;
            }
            case "run_all": {
                if (!companyId)
                    throw new Error("Missing companyId");
                result = await (0, run_all_1.runAll)(companyId);
                break;
            }
            default: {
                throw new Error(`Unknown agent tool: ${tool}`);
            }
        }
        // ✅ SUCCESS
        await (0, logger_1.logAgentEvent)(companyId, tool, "success", "Agent task completed", {
            result,
        });
        return result;
    }
    catch (error) {
        // ✅ FAIL
        await (0, logger_1.logAgentEvent)(companyId, tool, "fail", error?.message ?? "Agent failed", {
            error: { message: error?.message, name: error?.name },
        });
        throw error;
    }
}
