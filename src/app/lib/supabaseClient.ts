import { createClient } from "@supabase/supabase-js";

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [];
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseAnonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  
  if (typeof window !== "undefined") {
    // Client-side: log error
    console.error(
      `[Supabase] Missing environment variables: ${missing.join(", ")}. ` +
      `Please set these in your Vercel project settings or .env.local file.`
    );
  } else {
    // Server-side: throw error
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
      `Please set these in your Vercel project settings or .env.local file.`
    );
  }
}

export const supabase = createClient(
  supabaseUrl || "",
  supabaseAnonKey || ""
);

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  return !!supabaseUrl && !!supabaseAnonKey;
}