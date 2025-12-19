import { FastifyRequest, FastifyReply } from "fastify";
import { env } from "../env";

export async function verifySecret(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const secret = request.headers["x-valyxo-secret"];

  if (secret !== env.MCP_SERVER_SECRET) {
    reply.status(401).send({
      error: "Unauthorized",
    });
    return;
  }
}