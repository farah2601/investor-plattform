import crypto from "crypto";

/**
 * Crypto config
 */
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;       // Recommended for GCM
const AUTH_TAG_LENGTH = 16; // GCM auth tag length

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
 * Encrypt plaintext using AES-256-GCM
 * 
 * Output format (string):
 *   base64(iv).base64(authTag).base64(ciphertext)
 */
export function encryptText(plaintext: string): string {
  const key = getKey32();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

/**
 * Decrypt text produced by encryptText()
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