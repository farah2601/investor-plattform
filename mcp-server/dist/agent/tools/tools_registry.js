"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolsRegistry = exports.ToolNameSchema = void 0;
const zod_1 = require("zod");
const run_kpi_refresh_1 = require("./run_kpi_refresh");
const run_insights_refresh_1 = require("./run_insights_refresh");
const run_profile_refresh_1 = require("./run_profile_refresh");
exports.ToolNameSchema = zod_1.z.enum([
    "run_kpi_refresh",
    "run_insights_refresh",
    "run_profile_refresh",
    "run_all",
    "run_all_companies",
]);
exports.ToolsRegistry = {
    run_kpi_refresh: {
        name: "run_kpi_refresh",
        description: "Refresh KPI metrics for a company",
        inputSchema: zod_1.z.object({
            companyId: zod_1.z.string().uuid(),
        }),
        handler: run_kpi_refresh_1.runKpiRefresh,
    },
    run_insights_refresh: {
        name: "run_insights_refresh",
        description: "Generate AI insights for a company",
        inputSchema: zod_1.z.object({
            companyId: zod_1.z.string().uuid(),
        }),
        handler: run_insights_refresh_1.runInsightsRefresh,
    },
    run_profile_refresh: {
        name: "run_profile_refresh",
        description: "Refresh company profile narrative",
        inputSchema: zod_1.z.object({
            companyId: zod_1.z.string().uuid(),
        }),
        handler: run_profile_refresh_1.runProfileRefresh,
    },
};
