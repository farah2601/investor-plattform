// mcp-server/src/routes/tools.ts
import { FastifyInstance } from "fastify";
import { verifySecret } from "../auth/verify";
import { runAgent } from "../agent/orchestrator";
import { runAll } from "../agent/tools/run_all";

export async function toolsRoutes(app: FastifyInstance) {
  // 🔐 Auth på alle /tools/*
  app.addHook("preHandler", verifySecret);

  app.post("/run_kpi_refresh", async (request) => {
    return await runAgent({
      tool: "run_kpi_refresh",
      input: request.body,
    });
  });

  app.post("/run_profile_refresh", async (request) => {
    return await runAgent({
      tool: "run_profile_refresh",
      input: request.body,
    });
  });

  app.post("/generate_insights", async (request) => {
    return await runAgent({
      tool: "generate_insights",
      input: request.body,
    });
  });

  // ✅ NY: run_all (men ikke "nytt tool" – bare orchestration endpoint)
  app.post("/run_all", async (request, reply) => {
    const body = request.body as any;
    const companyId = body?.companyId as string | undefined;

    if (!companyId) {
      return reply.status(400).send({ ok: false, error: "Missing companyId" });
    }

    const result = await runAll(companyId);
    return reply.send(result);
  });
}