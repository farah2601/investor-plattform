// mcp-server/src/routes/tools.ts
import { FastifyInstance } from "fastify";
import { verifySecret } from "../auth/verify";
import { runAgent } from "../agent/orchestrator";
import { runAll } from "../agent/tools/run_all";
import { runAllCompanies } from "../agent/tools/run_all_companies";
import { getAgentLogs } from "../agent/tools/get_agent_logs";

export async function toolsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", verifySecret);

  app.post("/run_kpi_refresh", async (request) => {
    return await runAgent({ tool: "run_kpi_refresh", input: request.body });
  });

  app.post("/run_insights_refresh", async (request) => {
    return await runAgent({ tool: "run_insights_refresh", input: request.body });
  });

  app.post("/run_profile_refresh", async (request) => {
    return await runAgent({ tool: "run_profile_refresh", input: request.body });
  });

  // ✅ NY: deterministic insights tool
  app.post("/generate_insights", async (request) => {
    return await runAgent({ tool: "generate_insights", input: request.body });
  });

  app.post("/run_all", async (request, reply) => {
    const body = request.body as any;
    const companyId = body?.companyId as string | undefined;

    if (!companyId) {
      return reply.status(400).send({ ok: false, error: "Missing companyId" });
    }

    const result = await runAll(companyId);
    return reply.send(result);
  });

  app.post("/run_all_companies", async (request) => {
    return await runAllCompanies(request.body);
  });

  app.post("/get_agent_logs", async (request, reply) => {
    const body = (request.body as any) || {};
    const companyId = body.companyId as string | undefined;
    if (!companyId) {
      return reply.status(400).send({ ok: false, error: "Missing companyId" });
    }
    const result = await getAgentLogs({ companyId });
    return reply.send(result);
  });

  app.post("/metric_inference", async (request) => {
    return await runAgent({ tool: "metric_inference", input: request.body });
  });
}