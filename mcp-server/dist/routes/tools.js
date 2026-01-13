"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolsRoutes = toolsRoutes;
const verify_1 = require("../auth/verify");
const orchestrator_1 = require("../agent/orchestrator");
const run_all_1 = require("../agent/tools/run_all");
const run_all_companies_1 = require("../agent/tools/run_all_companies");
async function toolsRoutes(app) {
    app.addHook("preHandler", verify_1.verifySecret);
    app.post("/run_kpi_refresh", async (request) => {
        return await (0, orchestrator_1.runAgent)({ tool: "run_kpi_refresh", input: request.body });
    });
    app.post("/run_insights_refresh", async (request) => {
        return await (0, orchestrator_1.runAgent)({ tool: "run_insights_refresh", input: request.body });
    });
    app.post("/run_profile_refresh", async (request) => {
        return await (0, orchestrator_1.runAgent)({ tool: "run_profile_refresh", input: request.body });
    });
    // ✅ NY: deterministic insights tool
    app.post("/generate_insights", async (request) => {
        return await (0, orchestrator_1.runAgent)({ tool: "generate_insights", input: request.body });
    });
    app.post("/run_all", async (request, reply) => {
        const body = request.body;
        const companyId = body?.companyId;
        if (!companyId) {
            return reply.status(400).send({ ok: false, error: "Missing companyId" });
        }
        const result = await (0, run_all_1.runAll)(companyId);
        return reply.send(result);
    });
    app.post("/run_all_companies", async (request) => {
        return await (0, run_all_companies_1.runAllCompanies)(request.body);
    });
}
