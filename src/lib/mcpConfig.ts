/**
 * Shared MCP configuration helper
 * Source of truth: MCP_SERVER_URL and MCP_SERVER_SECRET
 * Supports fallback to MCP_URL and MCP_SECRET for backwards compatibility
 */

export function getMcpConfig() {
  // Support both MCP_SERVER_URL and MCP_URL (fallback for backwards compatibility)
  const url = process.env.MCP_SERVER_URL || process.env.MCP_URL;
  // Support both MCP_SERVER_SECRET and MCP_SECRET (fallback for backwards compatibility)
  const secret = process.env.MCP_SERVER_SECRET || process.env.MCP_SECRET;

  if (!url) {
    throw new Error("MCP_SERVER_URL (or MCP_URL) is missing");
  }
  if (!secret) {
    throw new Error("MCP_SERVER_SECRET (or MCP_SECRET) is missing");
  }

  return { url, secret };
}
