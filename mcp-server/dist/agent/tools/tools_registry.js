"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolsRegistry = exports.ToolNameSchema = void 0;
const zod_1 = require("zod");
const run_kpi_refresh_1 = require("./run_kpi_refresh");
exports.ToolNameSchema = zod_1.z.enum(["run_kpi_refresh"]);
exports.ToolsRegistry = {
    run_kpi_refresh: {
        name: "run_kpi_refresh",
        description: "Refresh KPI metrics for a company",
        inputSchema: zod_1.z.object({
            companyId: zod_1.z.string().uuid(),
        }),
        handler: run_kpi_refresh_1.runKpiRefresh,
    },
};
