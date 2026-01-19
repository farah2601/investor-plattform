/**
 * Client-side authenticated fetch helper
 * Gets Supabase session access token and includes it in Authorization header
 * 
 * Usage:
 *   import { authedFetch } from "@/lib/authedFetch";
 *   const res = await authedFetch("/api/endpoint");
 */

import { supabase } from "@/app/lib/supabaseClient";

export async function authedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // Get current Supabase session
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.access_token) {
    throw new Error("Not authenticated");
  }

  const token = data.session.access_token;

  // Normalize headers to a real Headers instance (safe for all HeadersInit shapes)
  const headers = new Headers(init?.headers);

  // Add Authorization header
  headers.set("Authorization", `Bearer ${token}`);

  // Add Content-Type for requests with body (if not already set)
  const hasBody = init?.body !== undefined && init?.body !== null;
  const hasContentType = headers.has("content-type");

  if (hasBody && !hasContentType) {
    headers.set("Content-Type", "application/json");
  }

  // Call fetch with credentials: "omit" (no cookies)
  return fetch(input, {
    ...init,
    headers,
    credentials: "omit",
  });
}