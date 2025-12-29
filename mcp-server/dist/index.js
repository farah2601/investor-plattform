"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const tools_1 = require("./routes/tools");
require("dotenv/config");
async function start() {
    const app = (0, fastify_1.default)({ logger: true });
    // ✅ Global error handler (må være før routes)
    app.setErrorHandler((err, req, reply) => {
        app.log.error(err);
        reply.status(500).send({
            ok: false,
            error: err?.message || "Unknown server error",
        });
    });
    // ✅ Health check (Railway + debugging)
    app.get("/health", async () => ({ ok: true }));
    // ✅ MCP tools routes
    await app.register(tools_1.toolsRoutes, { prefix: "/tools" });
    const port = Number(process.env.PORT) || 3001;
    const host = "0.0.0.0";
    await app.listen({ port, host });
    app.log.info(`🚀 MCP server running on ${host}:${port}`);
}
start().catch((err) => {
    console.error("❌ MCP server failed to start", err);
    process.exit(1);
});
