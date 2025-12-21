import Fastify from "fastify";
import { toolsRoutes } from "./routes/tools";
import { env } from "./env";

async function start() {
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({ ok: true }));

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