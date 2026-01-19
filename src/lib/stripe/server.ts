/**
 * Server-only Stripe client helper
 * 
 * This module must NEVER be imported into client components ("use client").
 * It uses STRIPE_SECRET_KEY which must remain server-side only.
 * 
 * Usage:
 *   import { getStripeClient } from "@/lib/stripe/server";
 *   const stripe = getStripeClient();
 */

import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

/**
 * Get or create Stripe client instance (server-side only)
 * 
 * @throws {Error} If STRIPE_SECRET_KEY is missing
 * @returns {Stripe} Stripe client instance
 */
export function getStripeClient(): Stripe {
  if (stripeInstance) {
    return stripeInstance;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is required but not found in environment variables");
  }

  stripeInstance = new Stripe(secretKey, {
    apiVersion: "2024-06-20" as any,
  });

  return stripeInstance;
}

/**
 * Check if Stripe is configured (does not make API call)
 * 
 * @returns {boolean} True if STRIPE_SECRET_KEY is present
 */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
