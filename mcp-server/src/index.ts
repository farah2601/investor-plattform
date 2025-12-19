import Fastify from "fastify";
import { toolsRoutes } from "./routes/tools";

async function start() {
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({ ok: true }));

  await app.register(toolsRoutes, { prefix: "/tools" });

  // ✅ Railway/Vercel-style: bruk PORT fra env, fallback lokalt
  const port = Number(process.env.PORT ?? 3001);

  await app.listen({ port, host: "0.0.0.0" });

  app.log.info(`🚀 MCP server running on 0.0.0.0:${port}`);
}

start().catch((err) => {
  console.error("❌ MCP server failed to start", err);
  process.exit(1);
});