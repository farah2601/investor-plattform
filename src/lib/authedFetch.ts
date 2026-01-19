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
  input: RequestInfo,
  init?: RequestInit
): Promise<Response> {
  // Get current Supabase session
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.access_token) {
    throw new Error("Not authenticated");
  }

  const token = data.session.access_token;

  // Build headers - preserve existing, add Authorization and Content-Type if needed
  const headers: HeadersInit = {
    ...(init?.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  // Add Content-Type for requests with body
  if (init?.body && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }

  // Call fetch with credentials: "omit" (no cookies)
  return fetch(input, {
    ...init,
    headers,
    credentials: "omit",
  });
}
