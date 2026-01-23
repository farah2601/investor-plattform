/**
 * Crypto utilities for MCP
 * 
 * Handles decryption of encrypted tokens (e.g., Stripe access tokens from integrations table)
 * Uses same AES-256-GCM algorithm as Next.js
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Reads ENCRYPTION_KEY from env and returns a 32-byte Buffer.
 * 
 * ENCRYPTION_KEY must be base64-encoded 32 bytes (44 chars).
 */
function getKey32(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;

  if (!raw) {
    throw new Error("ENCRYPTION_KEY is missing in environment variables");
  }

  const key = Buffer.from(raw, "base64");

  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must decode to 32 bytes, got ${key.length}`
    );
  }

  return key;
}

/**
 * Decrypt text produced by encryptText() (from Next.js)
 * 
 * Input format: base64(iv).base64(authTag).base64(ciphertext)
 */
export function decryptText(encrypted: string): string {
  const key = getKey32();

  const parts = encrypted.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted payload format");
  }

  const iv = Buffer.from(parts[0], "base64");
  const authTag = Buffer.from(parts[1], "base64");
  const ciphertext = Buffer.from(parts[2], "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Mask token for safe logging (shows only prefix and suffix)
 */
export function maskToken(token: string): string {
  if (!token || token.length < 8) {
    return "****";
  }
  const prefix = token.substring(0, 4);
  const suffix = token.substring(token.length - 4);
  return `${prefix}...${suffix}`;
}
