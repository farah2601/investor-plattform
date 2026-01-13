import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client for client-side authentication and database operations.
 * 
 * ENVIRONMENT VARIABLES REQUIRED:
 * - NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY: Your Supabase anonymous/public key
 * 
 * SUPABASE AUTH CONFIGURATION CHECKLIST:
 * 1. Site URL: https://www.valyxo.com
 * 2. Redirect URLs (in Supabase Dashboard > Authentication > URL Configuration):
 *    - http://localhost:3000/auth/callback
 *    - https://www.valyxo.com/auth/callback
 * 3. Vercel Environment Variables (must be set in Vercel dashboard):
 *    - NEXT_PUBLIC_SUPABASE_URL
 *    - NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const missing = [];
    if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!supabaseAnonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    
    if (typeof window !== "undefined") {
      // Client-side: log error and create a stub client
      console.error(
        `[Supabase] Missing environment variables: ${missing.join(", ")}. ` +
        `Please set these in your Vercel project settings or .env.local file.`
      );
      // Create a stub client that will fail at runtime but won't break build
      supabaseInstance = createClient("", "");
    } else {
      // Server-side: throw error only when actually used
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}. ` +
        `Please set these in your Vercel project settings or .env.local file.`
      );
    }
  } else {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseInstance;
}

// Lazy initialization using Proxy - only initializes when first property is accessed
// Wrapped in try-catch to handle Vercel build-time evaluation
export const supabase = (() => {
  try {
    return new Proxy({} as SupabaseClient, {
      get(_target, prop) {
        const client = getSupabaseClient();
        const value = client[prop as keyof SupabaseClient];
        // If it's a function, bind it to the client
        if (typeof value === "function") {
          return value.bind(client);
        }
        return value;
      },
    });
  } catch (error) {
    // During build, if env vars are missing, return a stub that will fail gracefully at runtime
    // This allows the build to complete even if env vars aren't set
    if (typeof window === "undefined") {
      // Server-side: return a stub that throws when accessed
      return new Proxy({} as SupabaseClient, {
        get() {
          throw new Error(
            "Supabase client not initialized. Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
          );
        },
      });
    }
    // Client-side: return empty client (will fail at runtime but won't break build)
    return createClient("", "") as SupabaseClient;
  }
})();

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!supabaseUrl && !!supabaseAnonKey;
}