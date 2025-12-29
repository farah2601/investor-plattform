"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const tools_1 = require("./routes/tools");
async function start() {
    const app = (0, fastify_1.default)({ logger: true });
    app.get("/health", async () => ({ ok: true }));
    await app.register(tools_1.toolsRoutes, { prefix: "/tools" });
    // ✅ Railway setter PORT automatisk (du kan fortsatt bruke 3001 lokalt)
    const port = Number(process.env.PORT ?? 3001);
    await app.listen({ port, host: "0.0.0.0" });
    app.log.info(`🚀 MCP server running on port ${port}`);
}
start().catch((err) => {
    console.error("❌ MCP server failed to start", err);
    process.exit(1);
});
