// mcp-server/src/routes/tools.ts
import { FastifyInstance } from "fastify";
import { verifySecret } from "../auth/verify";
import { runAgent } from "../agent/orchestrator";
import { runAll } from "../agent/tools/run_all";
import { runAllCompanies } from "../agent/tools/run_all_companies";

export async function toolsRoutes(app: FastifyInstance) {
  // 🔐 Auth på alle /tools/*
  app.addHook("preHandler", verifySecret);

  app.post("/run_kpi_refresh", async (request) => {
    return await runAgent({
      tool: "run_kpi_refresh",
      input: request.body,
    });
  });

  app.post("/run_insights_refresh", async (request) => {
    return await runAgent({
      tool: "run_insights_refresh",
      input: request.body,
    });
  });

  app.post("/run_profile_refresh", async (request) => {
    return await runAgent({
      tool: "run_profile_refresh",
      input: request.body,
    });
  });

  app.post("/run_sheets_kpi_refresh", async (request) => {
    return await runAgent({
      tool: "run_sheets_kpi_refresh",
      input: request.body,
    });
  });

  app.post("/get_agent_logs", async (request) => {
    return await runAgent({
      tool: "get_agent_logs",
      input: request.body,
    });
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
}