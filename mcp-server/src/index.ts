import Fastify from "fastify";
import { toolsRoutes } from "./routes/tools";
import "dotenv/config";

async function start() {
  const app = Fastify({ logger: true });

  // ✅ Global error handler (må være før routes)
 app.setErrorHandler((err: any, req, reply) => {
  app.log.error(err);
  reply.status(500).send({
    ok: false,
    error: err?.message || "Unknown server error",
  });
});

  // ✅ Health check (Railway + debugging)
  app.get("/health", async () => ({ ok: true }));

  // ✅ MCP tools routes
  await app.register(toolsRoutes, { prefix: "/tools" });

  const port = Number(process.env.PORT) || 3001;
  const host = "0.0.0.0";

  await app.listen({ port, host });

  app.log.info(`🚀 MCP server running on ${host}:${port}`);
}

start().catch((err) => {
  console.error("❌ MCP server failed to start", err);
  process.exit(1);
});