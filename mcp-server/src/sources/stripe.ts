/**
 * Stripe KPI Source for MCP
 * 
 * Fetches and calculates KPIs from Stripe Connect accounts.
 * This is the ONLY place that fetches Stripe data - Next.js is just a gateway.
 */

import { supabase } from "../db/supabase";
import { decryptText, maskToken } from "../utils/crypto";
import Stripe from "stripe";

type KpiKey = 
  | "mrr" 
  | "arr" 
  | "mrr_growth_mom" 
  | "churn" 
  | "net_revenue" 
  | "net_revenue_booked" 
  | "failed_payment_rate" 
  | "refund_rate" 
  | "burn_rate" 
  | "cash_balance" 
  | "customers" 
  | "runway_months";

/**
 * Get Stripe credentials for a company
 */
async function getStripeCredentials(companyId: string): Promise<{
  accessToken: string;
  accountId: string | null;
  mode: "test" | "live";
} | null> {
  const { data: integration, error } = await supabase
    .from("integrations")
    .select("status, secret_encrypted, stripe_account_id")
    .eq("company_id", companyId)
    .eq("provider", "stripe")
    .maybeSingle();

  if (error) {
    console.error(`[getStripeCredentials] DB error for company ${companyId}:`, error.message);
    return null;
  }

  if (!integration || integration.status !== "connected" || !integration.secret_encrypted) {
    console.log(`[getStripeCredentials] Stripe not connected for company ${companyId}`);
    return null;
  }

  try {
    const decryptedToken = decryptText(integration.secret_encrypted);
    const masked = maskToken(decryptedToken);
    console.log(`[getStripeCredentials] Decrypted token for company ${companyId}: ${masked}`);

    // Determine mode from token prefix
    const mode: "test" | "live" = decryptedToken.startsWith("sk_test_") || decryptedToken.startsWith("sk_live_")
      ? (decryptedToken.startsWith("sk_live_") ? "live" : "test")
      : "live"; // OAuth tokens are typically live

    return {
      accessToken: decryptedToken,
      accountId: integration.stripe_account_id || null,
      mode,
    };
  } catch (decryptError: any) {
    // Check if it's an ENCRYPTION_KEY missing error
    if (decryptError.message?.includes("ENCRYPTION_KEY")) {
      console.error(`[getStripeCredentials] ENCRYPTION_KEY missing in MCP environment. Cannot decrypt Stripe token for company ${companyId}.`);
      throw new Error("ENCRYPTION_KEY is required in MCP environment to decrypt Stripe tokens. Please set ENCRYPTION_KEY in Railway environment variables.");
    }
    console.error(`[getStripeCredentials] Failed to decrypt token for company ${companyId}:`, decryptError.message);
    return null;
  }
}

/**
 * Detect if account uses Stripe Billing (subscriptions)
 */
async function detectBillingMethod(
  stripe: Stripe,
  periodStart: number,
  periodEnd: number,
  requestOptions?: any
): Promise<"billing" | "payments"> {
  try {
    // Try to fetch active subscriptions
    const subscriptions = await stripe.subscriptions.list(
      {
        status: "active",
        limit: 10,
      },
      requestOptions
    );

    if (subscriptions.data.length > 0) {
      return "billing";
    }

    // Also check for subscriptions created in period
    const recentSubs = await stripe.subscriptions.list(
      {
        created: { gte: periodStart, lt: periodEnd },
        limit: 10,
      },
      requestOptions
    );

    if (recentSubs.data.length > 0) {
      return "billing";
    }

    return "payments";
  } catch (err) {
    console.warn("[detectBillingMethod] Error detecting billing method, defaulting to payments:", err instanceof Error ? err.message : "Unknown");
    return "payments";
  }
}

/**
 * Calculate MRR from active subscriptions (billing mode)
 */
async function calculateMRRFromSubscriptions(
  stripe: Stripe,
  periodEnd: number,
  requestOptions?: any
): Promise<number> {
  let mrr = 0;

  try {
    // Get all active subscriptions
    const subscriptions = await stripe.subscriptions.list(
      {
        status: "active",
        limit: 100,
      },
      requestOptions
    );

    // Paginate
    let allSubs = [...subscriptions.data];
    let hasMore = subscriptions.has_more;
    let lastSubId = subscriptions.data[subscriptions.data.length - 1]?.id;

    while (hasMore && lastSubId) {
      const nextPage = await stripe.subscriptions.list(
        {
          status: "active",
          starting_after: lastSubId,
          limit: 100,
        },
        requestOptions
      );
      allSubs.push(...nextPage.data);
      hasMore = nextPage.has_more;
      lastSubId = nextPage.data[nextPage.data.length - 1]?.id;
    }

    // Calculate MRR from subscription items
    for (const sub of allSubs) {
      if (!sub.items?.data) continue;

      for (const item of sub.items.data) {
        if (!item.price) continue;

        const amount = item.price.unit_amount || 0; // In cents
        const interval = item.price.recurring?.interval;
        const intervalCount = item.price.recurring?.interval_count || 1;

        if (interval === "month") {
          // Monthly: amount / intervalCount
          mrr += (amount / intervalCount) / 100; // Convert to dollars
        } else if (interval === "year") {
          // Yearly: amount / 12
          mrr += (amount / 12) / 100;
        } else if (interval === "week") {
          // Weekly: amount * 4.345 / intervalCount (approximate)
          mrr += ((amount * 4.345) / intervalCount) / 100;
        } else if (interval === "day") {
          // Daily: amount * 30 / intervalCount
          mrr += ((amount * 30) / intervalCount) / 100;
        }
      }
    }

    return mrr;
  } catch (err) {
    console.error("[calculateMRRFromSubscriptions] Error:", err instanceof Error ? err.message : "Unknown");
    return 0;
  }
}

/**
 * Net revenue based on when funds become available (available_on), not when charge was created.
 * Uses Balance Transactions so "incoming" counts as arrived (settled).
 */
async function calculateNetRevenueByAvailableOn(
  stripe: Stripe,
  periodStart: number,
  periodEnd: number,
  requestOptions?: any
): Promise<{ netRevenue: number; totalCharges: number; totalRefunds: number }> {
  let totalCharges = 0;
  let totalRefunds = 0;
  // List by created with wide window (settlement often T+2–T+7), then filter by available_on
  const createdFrom = periodStart - 14 * 24 * 3600;
  const createdTo = periodEnd + 24 * 3600;

  let allTx: Stripe.BalanceTransaction[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const list = await stripe.balanceTransactions.list(
      {
        created: { gte: createdFrom, lt: createdTo },
        limit: 100,
        ...(startingAfter && { starting_after: startingAfter }),
      },
      requestOptions
    );
    allTx = allTx.concat(list.data);
    hasMore = list.has_more;
    startingAfter = list.data[list.data.length - 1]?.id;
    if (!list.data.length || !hasMore) break;
  }

  for (const tx of allTx) {
    const availableOn = tx.available_on;
    if (availableOn == null || availableOn < periodStart || availableOn >= periodEnd) continue;
    if (tx.type === "charge") {
      totalCharges += tx.amount;
    } else if (tx.type === "refund") {
      totalRefunds += Math.abs(tx.amount);
    }
  }

  const netRevenue = (totalCharges - totalRefunds) / 100;
  return { netRevenue, totalCharges, totalRefunds };
}

/**
 * Net revenue by created date (loggført) – charges/refunds when they were logged, includes pending.
 */
async function calculateNetRevenueByCreated(
  stripe: Stripe,
  periodStart: number,
  periodEnd: number,
  requestOptions?: any
): Promise<number> {
  let totalCharges = 0;
  let totalRefunds = 0;

  const charges = await stripe.charges.list(
    { created: { gte: periodStart, lt: periodEnd }, limit: 100 },
    requestOptions
  );
  let allCharges = [...charges.data];
  let hasMore = charges.has_more;
  let lastId = charges.data[charges.data.length - 1]?.id;
  while (hasMore && lastId) {
    const next = await stripe.charges.list(
      { created: { gte: periodStart, lt: periodEnd }, starting_after: lastId, limit: 100 },
      requestOptions
    );
    allCharges = allCharges.concat(next.data);
    hasMore = next.has_more;
    lastId = next.data[next.data.length - 1]?.id;
  }
  for (const c of allCharges) {
    // Booked: include succeeded and pending (loggført when created)
    if (c.status === "succeeded" || c.status === "pending") totalCharges += c.amount;
  }

  const refunds = await stripe.refunds.list(
    { created: { gte: periodStart, lt: periodEnd }, limit: 100 },
    requestOptions
  );
  let allRefunds = [...refunds.data];
  hasMore = refunds.has_more;
  lastId = refunds.data[refunds.data.length - 1]?.id;
  while (hasMore && lastId) {
    const next = await stripe.refunds.list(
      { created: { gte: periodStart, lt: periodEnd }, starting_after: lastId, limit: 100 },
      requestOptions
    );
    allRefunds = allRefunds.concat(next.data);
    hasMore = next.has_more;
    lastId = next.data[next.data.length - 1]?.id;
  }
  for (const r of allRefunds) {
    totalRefunds += Math.abs(r.amount);
  }

  return (totalCharges - totalRefunds) / 100;
}

/**
 * Calculate net revenue from charges and refunds (by created date – legacy).
 * Prefer calculateNetRevenueByAvailableOn for "incoming as arrived".
 */
async function calculateNetRevenue(
  stripe: Stripe,
  periodStart: number,
  periodEnd: number,
  requestOptions?: any
): Promise<{ netRevenue: number; totalCharges: number; totalRefunds: number }> {
  return calculateNetRevenueByAvailableOn(stripe, periodStart, periodEnd, requestOptions);
}

/**
 * Calculate failed payment rate
 */
async function calculateFailedPaymentRate(
  stripe: Stripe,
  periodStart: number,
  periodEnd: number,
  requestOptions?: any
): Promise<number | null> {
  let failedAttempts = 0;
  let totalAttempts = 0;

  try {
    // Use payment intents for more accurate failed payment tracking
    const paymentIntents = await stripe.paymentIntents.list(
      {
        created: { gte: periodStart, lt: periodEnd },
        limit: 100,
      },
      requestOptions
    );

    let allIntents = [...paymentIntents.data];
    let hasMore = paymentIntents.has_more;
    let lastIntentId = paymentIntents.data[paymentIntents.data.length - 1]?.id;

    while (hasMore && lastIntentId) {
      const nextPage = await stripe.paymentIntents.list(
        {
          created: { gte: periodStart, lt: periodEnd },
          starting_after: lastIntentId,
          limit: 100,
        },
        requestOptions
      );
      allIntents.push(...nextPage.data);
      hasMore = nextPage.has_more;
      lastIntentId = nextPage.data[nextPage.data.length - 1]?.id;
    }

    for (const intent of allIntents) {
      totalAttempts++;
      if (intent.status === "requires_payment_method" || intent.status === "canceled") {
        failedAttempts++;
      }
    }

    if (totalAttempts === 0) return null;

    return (failedAttempts / totalAttempts) * 100;
  } catch (err) {
    console.warn("[calculateFailedPaymentRate] Error:", err instanceof Error ? err.message : "Unknown");
    return null;
  }
}

/**
 * Count unique customers
 */
async function countCustomers(
  stripe: Stripe,
  method: "billing" | "payments",
  periodStart: number,
  periodEnd: number,
  requestOptions?: any
): Promise<number | null> {
  try {
    if (method === "billing") {
      // Count unique customers with active subscriptions
      const subscriptions = await stripe.subscriptions.list(
        {
          status: "active",
          limit: 100,
        },
        requestOptions
      );

      const uniqueCustomers = new Set<string>();
      for (const sub of subscriptions.data) {
        if (sub.customer && typeof sub.customer === "string") {
          uniqueCustomers.add(sub.customer);
        } else if (sub.customer && typeof sub.customer === "object" && "id" in sub.customer) {
          uniqueCustomers.add(sub.customer.id as string);
        }
      }

      return uniqueCustomers.size > 0 ? uniqueCustomers.size : null;
    } else {
      // Count unique paying customers from charges
      const charges = await stripe.charges.list(
        {
          created: { gte: periodStart, lt: periodEnd },
          limit: 100,
        },
        requestOptions
      );

      // Filter to only paid charges
      const paidCharges = charges.data.filter(c => c.paid && c.status === "succeeded");

      const uniqueCustomers = new Set<string>();
      for (const charge of paidCharges) {
        if (charge.customer && typeof charge.customer === "string") {
          uniqueCustomers.add(charge.customer);
        } else if (charge.customer && typeof charge.customer === "object" && "id" in charge.customer) {
          uniqueCustomers.add(charge.customer.id as string);
        }
      }

      return uniqueCustomers.size > 0 ? uniqueCustomers.size : null;
    }
  } catch (err) {
    console.warn("[countCustomers] Error:", err instanceof Error ? err.message : "Unknown");
    return null;
  }
}

/**
 * Load Stripe KPIs for a company
 */
export async function loadStripeKpisForCompany(
  companyId: string,
  periodDates?: string[]
): Promise<Array<{
  source: "stripe";
  period_date: string;
  kpis: Partial<Record<KpiKey, number | null>>;
  meta: {
    stripe_account_id?: string;
    mode: "test" | "live";
    method: "billing" | "payments";
    range?: { from: string; to: string };
    notes?: string[];
  };
}>> {
  // Get Stripe credentials
  const credentials = await getStripeCredentials(companyId);
  if (!credentials) {
    return [];
  }

  const { accessToken, accountId, mode } = credentials;

  // Initialize Stripe client
  // OAuth access tokens from Connect are used directly as apiKey
  const isOAuthToken = !accessToken.startsWith("sk_");
  let stripe: Stripe;

  try {
    stripe = new Stripe(accessToken, {
      apiVersion: "2024-06-20" as any,
    });
  } catch (err) {
    console.error(`[loadStripeKpisForCompany] Failed to initialize Stripe for company ${companyId}:`, err instanceof Error ? err.message : "Unknown");
    return [];
  }

  // Request options for Connect accounts (only if using platform secret + accountId)
  const requestOptions = accountId && !isOAuthToken
    ? { stripeAccount: accountId }
    : undefined;

  // Determine periods to process
  const periods = periodDates || [];
  if (periods.length === 0) {
    // Default: current month
    const now = new Date();
    const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
    periods.push(currentMonth);
  }

  const results: Array<{
    source: "stripe";
    period_date: string;
    kpis: Partial<Record<KpiKey, number | null>>;
    meta: any;
  }> = [];

  // Detect billing method once (assume consistent across periods)
  let detectedMethod: "billing" | "payments" | null = null;

  for (const periodDate of periods) {
    const period = new Date(periodDate + "T00:00:00Z");
    const periodStart = Math.floor(period.getTime() / 1000);
    const periodEnd = Math.floor(new Date(period.getUTCFullYear(), period.getUTCMonth() + 1, 1).getTime() / 1000);

    // Detect method on first period
    if (detectedMethod === null) {
      detectedMethod = await detectBillingMethod(stripe, periodStart, periodEnd, requestOptions);
    }

    const kpis: Partial<Record<KpiKey, number | null>> = {};
    const notes: string[] = [];

    try {
      if (detectedMethod === "billing") {
        // Billing mode: calculate MRR, ARR, etc.
        const mrr = await calculateMRRFromSubscriptions(stripe, periodEnd, requestOptions);
        if (mrr > 0) {
          kpis.mrr = mrr;
          kpis.arr = mrr * 12; // Run-rate ARR
        }

        // Customers from subscriptions
        const customers = await countCustomers(stripe, "billing", periodStart, periodEnd, requestOptions);
        if (customers !== null) {
          kpis.customers = customers;
        }

        // Churn: try to calculate from cancellations (MVP: set null if too complex)
        kpis.churn = null; // TODO: Calculate from cancellations if needed
      } else {
        // Payments mode: no MRR/ARR
        notes.push("No subscriptions detected; MRR/ARR left null");
      }

      // Common metrics for both modes
      const { netRevenue, totalCharges, totalRefunds } = await calculateNetRevenue(
        stripe,
        periodStart,
        periodEnd,
        requestOptions
      );

      kpis.net_revenue = netRevenue;

      // Net revenue (loggført) – by created date, includes pending
      const netRevenueBooked = await calculateNetRevenueByCreated(stripe, periodStart, periodEnd, requestOptions);
      kpis.net_revenue_booked = netRevenueBooked;

      // Refund rate
      if (totalCharges > 0) {
        kpis.refund_rate = (totalRefunds / totalCharges) * 100;
      }

      // Failed payment rate
      const failedRate = await calculateFailedPaymentRate(stripe, periodStart, periodEnd, requestOptions);
      if (failedRate !== null) {
        kpis.failed_payment_rate = failedRate;
      }

      // Customers (if not already set from billing)
      if (detectedMethod === "payments") {
        const customers = await countCustomers(stripe, "payments", periodStart, periodEnd, requestOptions);
        if (customers !== null) {
          kpis.customers = customers;
        }
      }

      results.push({
        source: "stripe",
        period_date: periodDate,
        kpis,
        meta: {
          stripe_account_id: accountId || undefined,
          mode,
          method: detectedMethod,
          range: {
            from: new Date(periodStart * 1000).toISOString(),
            to: new Date(periodEnd * 1000).toISOString(),
          },
          notes: notes.length > 0 ? notes : undefined,
        },
      });
    } catch (err) {
      console.error(`[loadStripeKpisForCompany] Error processing period ${periodDate}:`, err instanceof Error ? err.message : "Unknown");
      // Continue with other periods
    }
  }

  // Log summary (safe - no tokens, no raw data)
  console.log(`[loadStripeKpisForCompany] Processed ${results.length} periods for company ${companyId}:`, {
    mode,
    method: detectedMethod,
    periodsCount: results.length,
  });

  return results;
}
