/**
 * Log sanitization utilities to prevent secrets from being logged
 * 
 * Provides functions to detect and redact sensitive information
 * before logging to prevent accidental secret leakage.
 */

/**
 * Field names that are likely to contain secrets (case-insensitive matching)
 */
export const SECRET_FIELD_NAMES: readonly string[] = [
  "token",
  "secret",
  "key",
  "password",
  "credential",
  "api_key",
  "access_token",
  "refresh_token",
  "private_key",
  "encryption_key",
  "stripe_key",
  "openai_key",
  "supabase_key",
  "mcp_secret",
  "valyxo_secret",
  "auth_token",
  "bearer",
] as const;

/**
 * Check if a string value looks like a secret
 */
export function isLikelySecret(value: unknown): boolean {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }

  const str = value;

  // Check for common secret prefixes
  if (
    str.startsWith("sk_") ||
    str.startsWith("rk_") ||
    str.startsWith("sb_secret_") ||
    str.startsWith("Bearer ") ||
    str.startsWith("eyJ") // JWT tokens
  ) {
    return true;
  }

  // Check for PEM format
  if (str.includes("-----BEGIN")) {
    return true;
  }

  // Check for base64-like long strings (>= 24 chars, high entropy)
  if (str.length >= 24) {
    // Count alphanumeric and base64-like characters
    const base64LikeChars = /[A-Za-z0-9+/=_-]/g;
    const matches = str.match(base64LikeChars);
    const ratio = matches ? matches.length / str.length : 0;
    
    // If > 90% of characters are base64-like, likely a secret
    if (ratio > 0.9) {
      return true;
    }
  }

  return false;
}

/**
 * Redact a string value, showing only safe metadata
 */
export function redactString(input: string): string {
  const prefix = input.length > 4 ? input.slice(0, 4) : input.slice(0, input.length);
  return `[REDACTED len=${input.length} prefix=${prefix}]`;
}

/**
 * Deep sanitize an object/array for logging
 * Returns a sanitized copy without mutating the original
 */
export function sanitizeForLog<T>(input: T, visited = new WeakSet<object>()): T {
  // Handle null/undefined
  if (input === null || input === undefined) {
    return input;
  }

  // Handle primitives (number, boolean, symbol)
  if (typeof input !== "object") {
    // Check if string looks like a secret
    if (typeof input === "string" && isLikelySecret(input)) {
      return redactString(input) as T;
    }
    return input;
  }

  // Handle arrays
  if (Array.isArray(input)) {
    // Check for circular references
    if (visited.has(input)) {
      return "[CIRCULAR]" as T;
    }
    visited.add(input);
    
    return input.map((item) => sanitizeForLog(item, visited)) as T;
  }

  // Handle plain objects (not class instances)
  // Check if it's a plain object (not a Date, Error, etc.)
  if (Object.getPrototypeOf(input) !== Object.prototype && 
      Object.getPrototypeOf(input) !== null) {
    // It's a class instance or special object, return as-is to avoid breaking
    return input;
  }

  // Check for circular references
  if (visited.has(input)) {
    return "[CIRCULAR]" as T;
  }
  visited.add(input);

  const obj = input as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Check if key matches secret field names
    const isSecretField = SECRET_FIELD_NAMES.some(
      (secretName) => lowerKey.includes(secretName.toLowerCase())
    );

    if (isSecretField) {
      // Redact based on value type
      if (typeof value === "string") {
        sanitized[key] = redactString(value);
      } else if (value !== null && typeof value === "object") {
        sanitized[key] = "[REDACTED object]";
      } else {
        sanitized[key] = "[REDACTED]";
      }
    } else if (typeof value === "string" && isLikelySecret(value)) {
      // Value looks like a secret even if key doesn't match
      sanitized[key] = redactString(value);
    } else {
      // Recursively sanitize nested objects/arrays
      sanitized[key] = sanitizeForLog(value, visited);
    }
  }

  return sanitized as T;
}

/**
 * Demo function showing sanitization examples
 * Returns examples without logging them
 */
export function demoSanitizeExamples(): {
  stripeKeyString: { original: string; sanitized: string };
  nestedObjectWithKey: { original: Record<string, unknown>; sanitized: Record<string, unknown> };
  normalText: { original: string; sanitized: string };
} {
  // Example values - clearly fake/demo (not real secrets)
  const stripeKey = "EXAMPLE_sk_test_NOT_A_REAL_KEY_12345";
  const nestedObject = {
    companyId: "123",
    OPENAI_API_KEY: "EXAMPLE_sk_NOT_A_REAL_KEY_abcdefghijklmnopqrstuvwxyz",
    config: {
      apiUrl: "https://api.example.com",
      secret: "EXAMPLE_NOT_A_REAL_SECRET",
    },
  };
  const normalText = "This is a normal log message";

  return {
    stripeKeyString: {
      original: stripeKey,
      sanitized: sanitizeForLog(stripeKey),
    },
    nestedObjectWithKey: {
      original: nestedObject,
      sanitized: sanitizeForLog(nestedObject),
    },
    normalText: {
      original: normalText,
      sanitized: sanitizeForLog(normalText),
    },
  };
}
