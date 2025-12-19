// src/routes/tools.ts
import { FastifyInstance } from "fastify";
import { verifySecret } from "../auth/verify";
import { runAgent } from "../agent/orchestrator";

export async function toolsRoutes(app: FastifyInstance) {
  // 🔐 Auth på alle /tools/*
  app.addHook("preHandler", verifySecret);

  // POST /tools/run_kpi_refresh
  app.post("/run_kpi_refresh", async (request) => {
    return await runAgent({
      tool: "run_kpi_refresh",
      input: request.body,
    });
  });

  // POST /tools/run_profile_refresh
  app.post("/run_profile_refresh", async (request) => {
    return await runAgent({
      tool: "run_profile_refresh",
      input: request.body,
    });
  });

  // POST /tools/generate_insights
  app.post("/generate_insights", async (request) => {
    const result = await runAgent({
      tool: "generate_insights",
      input: request.body,
    });
    return result;
    });
}