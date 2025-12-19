import Fastify from "fastify";
import { toolsRoutes } from "./routes/tools";
import { env } from "./env";

async function start() {
  const app = Fastify({ logger: true });

  // Health check (Railway elsker denne)
  app.get("/health", async () => ({ ok: true }));

  // Tool routes
  await app.register(toolsRoutes, { prefix: "/tools" });

  // 🚨 VIKTIG: Railway PORT
  const port = Number(process.env.PORT) || 3001;

  await app.listen({
    port,
    host: "0.0.0.0",
  });

  app.log.info(`🚀 MCP server running on port ${port}`);
}

start().catch((err) => {
  console.error("❌ MCP server failed to start", err);
  process.exit(1);
});