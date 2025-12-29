"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySecret = verifySecret;
const env_1 = require("../env");
async function verifySecret(request, reply) {
    const secret = request.headers["x-valyxo-secret"];
    if (secret !== env_1.env.MCP_SERVER_SECRET) {
        reply.status(401).send({
            error: "Unauthorized",
        });
        return;
    }
}
