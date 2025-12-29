import type { FastifyReply, FastifyRequest } from "fastify";

export async function verifySecret(req: FastifyRequest, reply: FastifyReply) {
  const header = req.headers["x-mcp-secret"];
  const received = Array.isArray(header) ? header[0] : header;

  const expected = process.env.MCP_SERVER_SECRET;

  if (!expected) {
    return reply.status(500).send({
      ok: false,
      error: "MCP_SERVER_SECRET missing on server",
    });
  }

  if (!received) {
    return reply.status(401).send({
      ok: false,
      error: "Missing x-mcp-secret header",
    });
  }

  if (received.trim() !== expected.trim()) {
    return reply.status(401).send({
      ok: false,
      error: "Unauthorized MCP request",
    });
  }
}