/**
 * Centralized MCP configuration helper
 * Prioritizes Railway URL and ignores localhost/127.0.0.1 unless no other option
 */

/**
 * Get MCP base URL with priority:
 * 1) MCP_URL
 * 2) MCP_SERVER_URL (but ignore localhost/127.0.0.1 unless no other option)
 * 3) RAILWAY_BASE_URL
 * 4) NEXT_PUBLIC_MCP_SERVER_URL
 * 
 * Returns URL without trailing slash
 */
export function getMcpBaseUrl(): string {
  // Priority 1: MCP_URL
  if (process.env.MCP_URL) {
    return process.env.MCP_URL.replace(/\/$/, "");
  }

  // Priority 2: MCP_SERVER_URL (but skip localhost/127.0.0.1 if other options exist)
  const mcpServerUrl = process.env.MCP_SERVER_URL;
  if (mcpServerUrl) {
    const isLocalhost = mcpServerUrl.includes("localhost") || mcpServerUrl.includes("127.0.0.1");
    
    // Check if we have Railway or other non-localhost options
    const hasRailway = !!process.env.RAILWAY_BASE_URL;
    const hasPublic = !!process.env.NEXT_PUBLIC_MCP_SERVER_URL;
    
    // Only use localhost MCP_SERVER_URL if no other options exist
    if (isLocalhost && (hasRailway || hasPublic)) {
      // Skip this, try next options
    } else {
      return mcpServerUrl.replace(/\/$/, "");
    }
  }

  // Priority 3: RAILWAY_BASE_URL
  if (process.env.RAILWAY_BASE_URL) {
    return process.env.RAILWAY_BASE_URL.replace(/\/$/, "");
  }

  // Priority 4: NEXT_PUBLIC_MCP_SERVER_URL
  if (process.env.NEXT_PUBLIC_MCP_SERVER_URL) {
    return process.env.NEXT_PUBLIC_MCP_SERVER_URL.replace(/\/$/, "");
  }

  // Fallback: use MCP_SERVER_URL even if localhost (last resort)
  if (mcpServerUrl) {
    return mcpServerUrl.replace(/\/$/, "");
  }

  throw new Error("MCP base URL not found in environment variables (checked MCP_URL, MCP_SERVER_URL, RAILWAY_BASE_URL, NEXT_PUBLIC_MCP_SERVER_URL)");
}

/**
 * Get MCP secret with priority:
 * 1) MCP_SECRET
 * 2) MCP_SERVER_SECRET
 * 3) VALYXO_SECRET
 */
export function getMcpSecret(): string {
  const secret = process.env.MCP_SECRET || process.env.MCP_SERVER_SECRET || process.env.VALYXO_SECRET;
  
  if (!secret) {
    throw new Error("MCP secret not found in environment variables (checked MCP_SECRET, MCP_SERVER_SECRET, VALYXO_SECRET)");
  }
  
  return secret;
}
