import Fastify from "fastify";
import { toolsRoutes } from "./routes/tools";
import { env } from "./env";

async function start() {
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({ ok: true }));

  await app.register(toolsRoutes, { prefix: "/tools" });

  await app.listen({ port: 3001, host: "0.0.0.0" });

  app.log.info("🚀 MCP server running on http://localhost:3001");
}

start().catch((err) => {
  console.error("❌ MCP server failed to start", err);
  process.exit(1);
});