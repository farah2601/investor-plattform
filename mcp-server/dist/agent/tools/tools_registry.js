"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolsRegistry = exports.toolsRegistry = void 0;
const zod_1 = require("zod");
const generate_insights_1 = require("./generate_insights");
const run_all_1 = require("./run_all");
const run_kpi_refresh_1 = require("./run_kpi_refresh");
const run_insights_refresh_1 = require("./run_insights_refresh");
const run_profile_refresh_1 = require("./run_profile_refresh");
const get_agent_logs_1 = require("./get_agent_logs");
// (Valgfritt) map-lookup hvis du bruker det et sted
exports.toolsRegistry = {
    run_all: run_all_1.runAll,
    run_kpi_refresh: run_kpi_refresh_1.runKpiRefresh,
    run_insights_refresh: run_insights_refresh_1.runInsightsRefresh,
    run_profile_refresh: run_profile_refresh_1.runProfileRefresh,
    get_agent_logs: get_agent_logs_1.getAgentLogs,
    generate_insights: generate_insights_1.generateInsights,
};
// ✅ DETTE er vanligvis det MCP bruker til å expose tools/routes
exports.ToolsRegistry = {
    run_all: {
        name: "run_all",
        description: "Run all refresh tasks for a company",
        inputSchema: zod_1.z.object({ companyId: zod_1.z.string().uuid() }),
        handler: run_all_1.runAll,
    },
    run_kpi_refresh: {
        name: "run_kpi_refresh",
        description: "Refresh KPI metrics for a company",
        inputSchema: zod_1.z.object({ companyId: zod_1.z.string().uuid() }),
        handler: run_kpi_refresh_1.runKpiRefresh,
    },
    run_insights_refresh: {
        name: "run_insights_refresh",
        description: "Generate insights refresh for a company",
        inputSchema: zod_1.z.object({ companyId: zod_1.z.string().uuid() }),
        handler: run_insights_refresh_1.runInsightsRefresh,
    },
    // ✅ NY: expose generate_insights
    generate_insights: {
        name: "generate_insights",
        description: "Generate deterministic insights based on KPI snapshots",
        inputSchema: zod_1.z.object({ companyId: zod_1.z.string().uuid() }),
        handler: generate_insights_1.generateInsights,
    },
    run_profile_refresh: {
        name: "run_profile_refresh",
        description: "Refresh company profile narrative",
        inputSchema: zod_1.z.object({ companyId: zod_1.z.string().uuid() }),
        handler: run_profile_refresh_1.runProfileRefresh,
    },
    get_agent_logs: {
        name: "get_agent_logs",
        description: "Fetch agent logs for a company",
        inputSchema: zod_1.z.object({ companyId: zod_1.z.string().uuid() }),
        handler: get_agent_logs_1.getAgentLogs,
    },
};
