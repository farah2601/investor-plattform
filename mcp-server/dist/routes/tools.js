"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolsRoutes = toolsRoutes;
const verify_1 = require("../auth/verify");
const orchestrator_1 = require("../agent/orchestrator");
async function toolsRoutes(app) {
    // 🔐 Auth på alle /tools/*
    app.addHook("preHandler", verify_1.verifySecret);
    // POST /tools/run_kpi_refresh
    app.post("/run_kpi_refresh", async (request) => {
        return await (0, orchestrator_1.runAgent)({
            tool: "run_kpi_refresh",
            input: request.body,
        });
    });
    // POST /tools/run_profile_refresh
    app.post("/run_profile_refresh", async (request) => {
        return await (0, orchestrator_1.runAgent)({
            tool: "run_profile_refresh",
            input: request.body,
        });
    });
    // POST /tools/generate_insights
    app.post("/generate_insights", async (request) => {
        const result = await (0, orchestrator_1.runAgent)({
            tool: "generate_insights",
            input: request.body,
        });
        return result;
    });
}
