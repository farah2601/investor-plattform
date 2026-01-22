/**
 * KPI Snapshot Pipeline
 * 
 * This module handles merging Stripe + Google Sheets + manual sources
 * into monthly KPI snapshots stored in public.kpi_snapshots.kpis (JSONB).
 * 
 * Schema: Each KPI has {value, source, updated_at}
 * - value: number | null
 * - source: "stripe" | "sheet" | "manual" | "computed"
 * - updated_at: string | null (ISO timestamp)
 */

export type KpiSource = "stripe" | "sheet" | "manual" | "computed";

export type KpiValue = {
  value: number | null;
  source: KpiSource;
  updated_at: string | null;
};

export type KpiSnapshotKpis = {
  mrr: KpiValue;
  arr: KpiValue;
  mrr_growth_mom: KpiValue;
  churn: KpiValue;
  net_revenue: KpiValue;
  failed_payment_rate: KpiValue;
  refund_rate: KpiValue;
  burn_rate: KpiValue;
  cash_balance: KpiValue;
  customers: KpiValue;
  runway_months: KpiValue;
};

/**
 * Array of all KPI keys for iteration
 */
export const KPI_KEYS: Array<keyof KpiSnapshotKpis> = [
  "mrr",
  "arr",
  "mrr_growth_mom",
  "churn",
  "net_revenue",
  "failed_payment_rate",
  "refund_rate",
  "burn_rate",
  "cash_balance",
  "customers",
  "runway_months",
];

/**
 * Create a KpiValue object
 */
export function createKpiValue(
  value: number | null,
  source: KpiSource,
  updated_at: string | null = null
): KpiValue {
  return {
    value,
    source,
    updated_at: updated_at || (value !== null ? new Date().toISOString() : null),
  };
}

/**
 * Load Stripe-derived metrics for a given month
 * 
 * Fetches actual Stripe data for the specified period and calculates:
 * - mrr: Monthly Recurring Revenue (from subscription invoices)
 * - churn: MRR churn proxy (from cancellations)
 * - net_revenue: Payments - refunds - failed (from charges/refunds)
 * - failed_payment_rate: Failed payment attempts / total attempts
 * - refund_rate: Refunds / total revenue
 * 
 * @param companyId - Company UUID
 * @param periodDate - Period date in YYYY-MM-01 format
 * @param accessTokenOrSecret - Decrypted Stripe access token (OAuth) or secret key (manual)
 * @param accountId - Optional Stripe account ID (acct_...) for Connect accounts
 * @returns KpiValue objects with source="stripe"
 */
export async function loadStripeMetrics(
  companyId: string,
  periodDate: string,
  accessTokenOrSecret: string,
  accountId?: string | null
): Promise<{
  mrr: KpiValue;
  churn: KpiValue;
  net_revenue: KpiValue;
  failed_payment_rate: KpiValue;
  refund_rate: KpiValue;
  customers?: KpiValue; // Optional
}> {
  const now = new Date().toISOString();
  
  // Parse period: YYYY-MM-01 -> periodStart and periodEnd (UTC)
  const period = new Date(periodDate + "T00:00:00Z");
  const periodStart = Math.floor(period.getTime() / 1000); // Unix timestamp
  const periodEnd = Math.floor(new Date(period.getUTCFullYear(), period.getUTCMonth() + 1, 1).getTime() / 1000);
  
  // Initialize Stripe client
  // If accessTokenOrSecret starts with "sk_" it's a secret key, otherwise it's an OAuth access token
  const isOAuthToken = !accessTokenOrSecret.startsWith("sk_");
  
  let stripe: import("stripe").Stripe;
  try {
    if (isOAuthToken) {
      // OAuth access token: use as apiKey directly
      stripe = new (await import("stripe")).default(accessTokenOrSecret, {
        apiVersion: "2024-06-20" as any,
      });
    } else {
      // Platform secret key: use with stripeAccount if accountId provided
      stripe = new (await import("stripe")).default(accessTokenOrSecret, {
        apiVersion: "2024-06-20" as any,
      });
    }
  } catch (err) {
    console.error("[loadStripeMetrics] Failed to initialize Stripe client:", err instanceof Error ? err.message : "Unknown error");
    // Return nulls on error
    return {
      mrr: createKpiValue(null, "stripe"),
      churn: createKpiValue(null, "stripe"),
      net_revenue: createKpiValue(null, "stripe"),
      failed_payment_rate: createKpiValue(null, "stripe"),
      refund_rate: createKpiValue(null, "stripe"),
      customers: createKpiValue(null, "stripe"),
    };
  }

  // Request options for Connect accounts
  const requestOptions = accountId && !isOAuthToken
    ? { stripeAccount: accountId }
    : undefined;

  try {
    // 1) Net Revenue: Sum of successful charges minus refunds for the period
    // Strategy: Use charges API (simpler than balance transactions)
    let netRevenue = 0;
    let totalCharges = 0;
    let totalRefunds = 0;
    
    // Fetch charges (paid=true) created in period
    const charges = await stripe.charges.list(
      {
        created: { gte: periodStart, lt: periodEnd },
        limit: 100, // Stripe default pagination
      },
      requestOptions
    );
    
    // Paginate through all charges
    let allCharges = [...charges.data];
    let hasMore = charges.has_more;
    let lastChargeId = charges.data[charges.data.length - 1]?.id;
    
    while (hasMore && lastChargeId) {
      const nextPage = await stripe.charges.list(
        {
          created: { gte: periodStart, lt: periodEnd },
          starting_after: lastChargeId,
          limit: 100,
        },
        requestOptions
      );
      allCharges.push(...nextPage.data);
      hasMore = nextPage.has_more;
      lastChargeId = nextPage.data[nextPage.data.length - 1]?.id;
    }
    
    // Sum successful charges (paid=true, status=succeeded)
    for (const charge of allCharges) {
      if (charge.paid && charge.status === "succeeded") {
        totalCharges += charge.amount; // Amount is in cents
      }
    }
    
    // Fetch refunds created in period
    const refunds = await stripe.refunds.list(
      {
        created: { gte: periodStart, lt: periodEnd },
        limit: 100,
      },
      requestOptions
    );
    
    // Paginate refunds
    let allRefunds = [...refunds.data];
    hasMore = refunds.has_more;
    let lastRefundId = refunds.data[refunds.data.length - 1]?.id;
    
    while (hasMore && lastRefundId) {
      const nextPage = await stripe.refunds.list(
        {
          created: { gte: periodStart, lt: periodEnd },
          starting_after: lastRefundId,
          limit: 100,
        },
        requestOptions
      );
      allRefunds.push(...nextPage.data);
      hasMore = nextPage.has_more;
      lastRefundId = nextPage.data[nextPage.data.length - 1]?.id;
    }
    
    // Sum refund amounts (amount is in cents, already negative in refunds API)
    for (const refund of allRefunds) {
      totalRefunds += Math.abs(refund.amount); // Refund amount is positive in refunds API
    }
    
    // Net revenue = charges - refunds (convert cents to dollars, round to 2 decimals)
    netRevenue = totalCharges > 0 || totalRefunds > 0
      ? Math.round((totalCharges - totalRefunds) / 100 * 100) / 100
      : 0;
    
    // Refund rate = refunds / total charges (as percentage)
    const refundRate = totalCharges > 0
      ? Math.round((totalRefunds / totalCharges) * 100 * 10) / 10 // Round to 1 decimal
      : null;
    
    // 2) Failed Payment Rate: Use invoices to detect failed payment attempts
    let failedAttempts = 0;
    let totalAttempts = 0;
    
    const invoices = await stripe.invoices.list(
      {
        created: { gte: periodStart, lt: periodEnd },
        limit: 100,
      },
      requestOptions
    );
    
    // Paginate invoices
    let allInvoices = [...invoices.data];
    hasMore = invoices.has_more;
    let lastInvoiceId = invoices.data[invoices.data.length - 1]?.id;
    
    while (hasMore && lastInvoiceId) {
      const nextPage = await stripe.invoices.list(
        {
          created: { gte: periodStart, lt: periodEnd },
          starting_after: lastInvoiceId,
          limit: 100,
        },
        requestOptions
      );
      allInvoices.push(...nextPage.data);
      hasMore = nextPage.has_more;
      lastInvoiceId = nextPage.data[nextPage.data.length - 1]?.id;
    }
    
    // Count failed payment attempts
    for (const invoice of allInvoices) {
      if (invoice.collection_method === "charge_automatically") {
        totalAttempts++;
        // Check if invoice is unpaid and has attempts
        const isUnpaid = invoice.status === "open" || invoice.status === "uncollectible";
        const hasAttempts = (invoice.attempt_count || 0) > 0;
        if (isUnpaid && hasAttempts) {
          failedAttempts++;
        } else if (invoice.status === "uncollectible") {
          failedAttempts++;
        }
      }
    }
    
    // Failed payment rate as percentage
    const failedPaymentRate = totalAttempts > 0
      ? Math.round((failedAttempts / totalAttempts) * 100 * 10) / 10 // Round to 1 decimal
      : null;
    
    // 3) MRR: Compute from subscription invoices paid in the period
    // Strategy: Sum invoice line items where type="subscription" and normalize to monthly
    let mrr = 0;
    
    // Filter invoices that are paid and have line items
    const paidInvoices = allInvoices.filter(
      inv => inv.status === "paid" && inv.lines?.data?.length > 0
    );
    
    for (const invoice of paidInvoices) {
      if (!invoice.lines?.data) continue;
      
      for (const line of invoice.lines.data) {
        // Use type assertion to access properties that may exist but aren't in strict types
        const lineAny = line as any;
        
        // Only count subscription line items (not one-time charges)
        // Check if line has a price with recurring interval (subscription indicator)
        if (lineAny.price && lineAny.price.recurring) {
          const amount = line.amount || 0; // Amount in cents
          const period = lineAny.period;
          
          if (period && period.start && period.end) {
            // Normalize to monthly: if period is 1 month, use as-is; if annual, divide by 12
            const periodDays = (period.end - period.start) / (24 * 60 * 60);
            const monthlyAmount = periodDays <= 31
              ? amount / 100 // Already monthly, convert cents to dollars
              : (amount / 100) * (30 / periodDays); // Normalize to monthly
            
            mrr += monthlyAmount;
          } else if (lineAny.price.recurring.interval) {
            // Use price recurring interval to normalize
            const interval = lineAny.price.recurring.interval;
            if (interval === "month") {
              mrr += amount / 100;
            } else if (interval === "year") {
              mrr += (amount / 100) / 12;
            } else {
              // Other intervals - assume monthly for now
              mrr += amount / 100;
            }
          } else {
            // Fallback: assume monthly if period not available
            mrr += amount / 100;
          }
        }
      }
    }
    
    // Round MRR to 2 decimals
    mrr = mrr > 0 ? Math.round(mrr * 100) / 100 : 0;
    
    // 4) Churn: MRR churn proxy from canceled subscriptions in the period
    // Strategy: Find subscriptions canceled in period and sum their MRR
    let churnedMrr = 0;
    
    const subscriptions = await stripe.subscriptions.list(
      {
        status: "canceled",
        limit: 100,
      },
      requestOptions
    );
    
    // Filter subscriptions canceled in this period
    const canceledInPeriod = subscriptions.data.filter(sub => {
      if (!sub.canceled_at) return false;
      return sub.canceled_at >= periodStart && sub.canceled_at < periodEnd;
    });
    
    // Sum MRR of canceled subscriptions (use current_period_end to estimate MRR)
    // Note: This is a proxy - actual churn calculation would need previous month MRR
    for (const sub of canceledInPeriod) {
      // Estimate MRR from subscription items
      if (sub.items?.data) {
        for (const item of sub.items.data) {
          if (item.price) {
            const amount = item.price.unit_amount || 0; // In cents
            const interval = item.price.recurring?.interval || "month";
            
            if (interval === "month") {
              churnedMrr += amount / 100;
            } else if (interval === "year") {
              churnedMrr += (amount / 100) / 12;
            }
          }
        }
      }
    }
    
    // Churn rate: churned MRR / previous month MRR (we'll need to pass this in)
    // For now, return null if we can't compute reliably
    // Note: Actual churn calculation requires previous month MRR, which should be passed separately
    const churn = null; // Will be computed in sync route using previous month MRR
    
    // 5) Customers: Count active subscriptions at period end (optional)
    let customers: number | null = null;
    try {
      const activeSubs = await stripe.subscriptions.list(
        {
          status: "active",
          limit: 100,
        },
        requestOptions
      );
      
      // Count unique customers with active subscriptions
      const uniqueCustomers = new Set<string>();
      for (const sub of activeSubs.data) {
        if (sub.customer && typeof sub.customer === "string") {
          uniqueCustomers.add(sub.customer);
        } else if (sub.customer && typeof sub.customer === "object" && "id" in sub.customer) {
          uniqueCustomers.add(sub.customer.id as string);
        }
      }
      
      customers = uniqueCustomers.size > 0 ? uniqueCustomers.size : null;
    } catch (err) {
      // Soft fail for customers - it's optional
      console.warn("[loadStripeMetrics] Failed to fetch customer count:", err instanceof Error ? err.message : "Unknown error");
    }
    
    // Log summary (safe - no secrets, only counts)
    console.log("[loadStripeMetrics] Fetched metrics for period", periodDate, {
      companyId,
      chargesCount: allCharges.length,
      refundsCount: allRefunds.length,
      invoicesCount: allInvoices.length,
      subscriptionsCount: canceledInPeriod.length,
      hasAccountId: !!accountId,
    });
    
    return {
      mrr: createKpiValue(mrr > 0 ? mrr : null, "stripe", now),
      churn: createKpiValue(churn, "stripe", churn !== null ? now : null),
      net_revenue: createKpiValue(netRevenue > 0 ? netRevenue : null, "stripe", netRevenue > 0 ? now : null),
      failed_payment_rate: createKpiValue(failedPaymentRate, "stripe", failedPaymentRate !== null ? now : null),
      refund_rate: createKpiValue(refundRate, "stripe", refundRate !== null ? now : null),
      customers: createKpiValue(customers, "stripe", customers !== null ? now : null),
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[loadStripeMetrics] Stripe API error:", {
      companyId,
      periodDate,
      error: errorMessage,
      hasAccountId: !!accountId,
    });
    
    // Return nulls on error (don't crash)
    return {
      mrr: createKpiValue(null, "stripe"),
      churn: createKpiValue(null, "stripe"),
      net_revenue: createKpiValue(null, "stripe"),
      failed_payment_rate: createKpiValue(null, "stripe"),
      refund_rate: createKpiValue(null, "stripe"),
      customers: createKpiValue(null, "stripe"),
    };
  }
}

/**
 * Load Google Sheets-derived metrics for a given month
 * 
 * TODO (Step 3): Implement actual Google Sheets API calls to fetch:
 * - burn_rate: Monthly cash burn
 * - cash_balance: Current cash balance
 * - customers: Total customer count
 * 
 * For now, accepts optional values from request body OR returns nulls.
 */
export async function loadSheetsMetrics(
  companyId: string,
  periodDate: string,
  manualValues?: {
    burn_rate?: number | null;
    cash_balance?: number | null;
    customers?: number | null;
  }
): Promise<{
  burn_rate: KpiValue;
  cash_balance: KpiValue;
  customers: KpiValue;
}> {
  // TODO (Step 3): Implement Google Sheets API integration
  // 1. Get Google Sheets integration from integrations table
  // 2. Fetch sheet data for the period
  // 3. Extract burn_rate, cash_balance, customers
  // 4. Return populated KpiValue objects

  // For now, use manual values if provided, otherwise return nulls
  return {
    burn_rate: createKpiValue(
      manualValues?.burn_rate ?? null,
      manualValues?.burn_rate !== null && manualValues?.burn_rate !== undefined ? "manual" : "sheet"
    ),
    cash_balance: createKpiValue(
      manualValues?.cash_balance ?? null,
      manualValues?.cash_balance !== null && manualValues?.cash_balance !== undefined ? "manual" : "sheet"
    ),
    customers: createKpiValue(
      manualValues?.customers ?? null,
      manualValues?.customers !== null && manualValues?.customers !== undefined ? "manual" : "sheet"
    ),
  };
}

/**
 * Compute derived metrics from base metrics
 * 
 * - arr: mrr * 12 (run-rate ARR)
 * - mrr_growth_mom: Month-over-month MRR growth (requires previous month's MRR)
 * - runway_months: cash_balance / burn_rate (with guardrails)
 */
export async function computeDerivedMetrics(
  stripeMetrics: {
    mrr: KpiValue;
  },
  sheetsMetrics: {
    burn_rate: KpiValue;
    cash_balance: KpiValue;
  },
  previousMonthMrr: number | null = null
): Promise<{
  arr: KpiValue;
  mrr_growth_mom: KpiValue;
  runway_months: KpiValue;
}> {
  const now = new Date().toISOString();

  // ARR = MRR * 12 (run-rate)
  const mrrValue = stripeMetrics.mrr.value;
  const arrValue = mrrValue !== null ? mrrValue * 12 : null;
  const arr: KpiValue = createKpiValue(arrValue, "computed", arrValue !== null ? now : null);

  // MRR Growth MoM = ((current_mrr - previous_mrr) / previous_mrr) * 100
  // If mrr == null OR prevMrr == null OR prevMrr <= 0 => value = null
  // Else compute percentage and round to 1 decimal
  let mrrGrowthValue: number | null = null;
  if (mrrValue !== null && previousMonthMrr !== null && previousMonthMrr > 0) {
    mrrGrowthValue = ((mrrValue - previousMonthMrr) / previousMonthMrr) * 100;
    // Round to 1 decimal place
    mrrGrowthValue = Math.round(mrrGrowthValue * 10) / 10;
  }
  const mrr_growth_mom: KpiValue = createKpiValue(
    mrrGrowthValue,
    "computed",
    mrrGrowthValue !== null ? now : null
  );

  // Runway months = cash_balance / burn_rate
  // If cash_balance == null OR burn_rate == null OR burn_rate <= 0 => null
  // Else cash_balance / burn_rate, rounded to 1 decimal
  const cashValue = sheetsMetrics.cash_balance.value;
  const burnValue = sheetsMetrics.burn_rate.value;
  let runwayValue: number | null = null;
  if (cashValue !== null && burnValue !== null && burnValue > 0) {
    runwayValue = cashValue / burnValue;
    // Round to 1 decimal place
    runwayValue = Math.round(runwayValue * 10) / 10;
  }
  const runway_months: KpiValue = createKpiValue(
    runwayValue,
    "computed",
    runwayValue !== null ? now : null
  );

  return {
    arr,
    mrr_growth_mom,
    runway_months,
  };
}

/**
 * Build complete KPI snapshot object
 */
export async function buildKpiSnapshot(
  companyId: string,
  periodDate: string,
  manualValues?: {
    burn_rate?: number | null;
    cash_balance?: number | null;
    customers?: number | null;
  },
  previousMonthMrr: number | null = null
): Promise<KpiSnapshotKpis> {
  // Load Stripe metrics (placeholder - requires credentials)
  // Note: This function is deprecated. Stripe sync is now handled by MCP server via /api/agent/run-all
  // For now, return nulls
  const stripeMetrics = {
    mrr: createKpiValue(null, "stripe"),
    churn: createKpiValue(null, "stripe"),
    net_revenue: createKpiValue(null, "stripe"),
    failed_payment_rate: createKpiValue(null, "stripe"),
    refund_rate: createKpiValue(null, "stripe"),
  };

  // Load Sheets metrics (placeholder for now, accepts manual values)
  const sheetsMetrics = await loadSheetsMetrics(companyId, periodDate, manualValues);

  // Compute derived metrics
  const computedMetrics = await computeDerivedMetrics(
    stripeMetrics,
    sheetsMetrics,
    previousMonthMrr
  );

  // Combine all metrics
  return {
    mrr: stripeMetrics.mrr,
    arr: computedMetrics.arr,
    mrr_growth_mom: computedMetrics.mrr_growth_mom,
    churn: stripeMetrics.churn,
    net_revenue: stripeMetrics.net_revenue,
    failed_payment_rate: stripeMetrics.failed_payment_rate,
    refund_rate: stripeMetrics.refund_rate,
    burn_rate: sheetsMetrics.burn_rate,
    cash_balance: sheetsMetrics.cash_balance,
    customers: sheetsMetrics.customers,
    runway_months: computedMetrics.runway_months,
  };
}

/**
 * Extract source from KPI (handles both old flat format and new nested format)
 */
export function extractKpiSource(kpi: unknown): KpiSource | null {
  if (kpi === null || kpi === undefined) {
    return null;
  }

  // New format: {value, source, updated_at}
  if (typeof kpi === "object" && kpi !== null && "source" in kpi) {
    const kpiValue = kpi as { source: unknown };
    if (typeof kpiValue.source === "string") {
      return kpiValue.source as KpiSource;
    }
  }

  // Old format: no source info
  return null;
}

/**
 * Extract numeric value from KPI (handles both old flat format and new nested format)
 * 
 * Backwards compatibility: if kpi is a number, return it directly
 * New format: if kpi is {value, source, updated_at}, return value
 */
export function extractKpiValue(kpi: unknown): number | null {
  if (kpi === null || kpi === undefined) {
    return null;
  }

  // New format: {value, source, updated_at}
  if (typeof kpi === "object" && kpi !== null && "value" in kpi) {
    const kpiValue = kpi as { value: unknown };
    if (typeof kpiValue.value === "number") {
      return kpiValue.value;
    }
    if (kpiValue.value === null) {
      return null;
    }
    // Try to convert to number
    const num = Number(kpiValue.value);
    return isNaN(num) ? null : num;
  }

  // Old format: direct number
  if (typeof kpi === "number") {
    return kpi;
  }

  // Try to convert to number
  const num = Number(kpi);
  return isNaN(num) ? null : num;
}

/**
 * Merge Stripe KPI values into existing snapshot KPIs with safe merge rules
 * 
 * Rules:
 * - If existing KPI is from "sheet" or "manual" with non-null value -> keep it (Stripe cannot overwrite)
 * - If existing KPI is from "stripe" with non-null value -> overwrite with latest Stripe (latest wins)
 * - If existing KPI value is null -> allow Stripe to fill it
 * - If new Stripe value is null -> do NOT overwrite an existing non-null value
 * - Always set updated_at for fields we set from Stripe
 */
export function mergeKpis(
  existingKpis: KpiSnapshotKpis | null,
  newKpis: Partial<KpiSnapshotKpis>,
  updatedAtIso: string
): KpiSnapshotKpis {
  const now = updatedAtIso || new Date().toISOString();
  
  // Start with defaults
  const result: Partial<KpiSnapshotKpis> = {};
  
  // Initialize with existing KPIs if they exist
  if (existingKpis) {
    for (const key of KPI_KEYS) {
      result[key] = { ...existingKpis[key] };
    }
  } else {
    // No existing KPIs - initialize with defaults
    for (const key of KPI_KEYS) {
      result[key] = createKpiValue(null, "computed");
    }
  }
  
  // Merge new Stripe KPIs with merge rules
  for (const key of KPI_KEYS) {
    const newKpi = newKpis[key];
    const existingKpi = result[key];
    
    if (!newKpi) {
      // No new value for this KPI - keep existing
      continue;
    }
    
    const newValue = newKpi.value;
    const existingValue = existingKpi?.value ?? null;
    const existingSource = existingKpi?.source ?? null;
    
    // Apply merge rules
    if (newValue !== null) {
      // New Stripe value is non-null
      if (existingValue === null) {
        // Existing is null - always take new Stripe value
        result[key] = { ...newKpi, updated_at: now };
      } else if (existingSource === "stripe") {
        // Existing is Stripe - overwrite (latest wins)
        result[key] = { ...newKpi, updated_at: now };
      } else if (existingSource === "sheet" || existingSource === "manual") {
        // Existing is sheet/manual - keep existing (Stripe cannot overwrite)
        // Do nothing, keep existing
      } else {
        // Unknown source or computed - allow Stripe to overwrite
        result[key] = { ...newKpi, updated_at: now };
      }
    } else {
      // New Stripe value is null - do NOT overwrite existing non-null
      if (existingValue === null) {
        // Both are null - update source/timestamp
        result[key] = { ...newKpi, updated_at: now };
      }
      // Otherwise keep existing
    }
  }
  
  return result as KpiSnapshotKpis;
}

/**
 * Merge sheet values into existing snapshot KPIs with safe merge rules
 * 
 * Rules:
 * - If existing KPI is from "stripe" or "manual" with non-null value -> keep it
 * - If existing KPI value is null -> allow sheet to fill it (even if existing source differs)
 * - If existing KPI is "sheet" -> overwrite with new sheet value (latest wins)
 * - If sheet value is null -> do NOT overwrite an existing non-null value
 * - Always set updated_at for fields we set from sheet
 */
export function mergeSheetValuesIntoKpis(
  existingKpis: any,
  sheetValues: Record<string, number | null>,
  updatedAtIso: string
): KpiSnapshotKpis {
  const now = updatedAtIso || new Date().toISOString();
  
  // Initialize result with all KPIs
  const result: Partial<KpiSnapshotKpis> = {};

  // Process each KPI key (all keys from KpiSnapshotKpis type)
  const allKpiKeys: Array<keyof KpiSnapshotKpis> = [
    "mrr", "arr", "mrr_growth_mom", "churn", "net_revenue",
    "failed_payment_rate", "refund_rate", "burn_rate", "cash_balance",
    "customers", "runway_months",
  ];
  
  for (const kpiKey of allKpiKeys) {
    const existingKpi = existingKpis?.[kpiKey];
    const existingValue = extractKpiValue(existingKpi);
    const existingSource = extractKpiSource(existingKpi);
    const sheetValue = sheetValues[kpiKey] ?? null;

    // Apply merge rules
    let finalValue: number | null = null;
    let finalSource: KpiSource = "sheet";
    let finalUpdatedAt: string | null = null;

    if (existingValue !== null) {
      // Existing value exists
      if (existingSource === "stripe" || existingSource === "manual") {
        // Preserve Stripe/manual values
        finalValue = existingValue;
        finalSource = existingSource;
        // Keep existing updated_at if available
        if (existingKpi && typeof existingKpi === "object" && "updated_at" in existingKpi) {
          finalUpdatedAt = existingKpi.updated_at as string | null;
        }
      } else if (existingSource === "sheet") {
        // Overwrite sheet values (latest wins)
        finalValue = sheetValue;
        finalSource = "sheet";
        finalUpdatedAt = sheetValue !== null ? now : null;
      } else {
        // Old format or unknown source - treat as sheet if sheet value exists
        if (sheetValue !== null) {
          finalValue = sheetValue;
          finalSource = "sheet";
          finalUpdatedAt = now;
        } else {
          // Keep existing value
          finalValue = existingValue;
          finalSource = existingSource || "sheet";
        }
      }
    } else {
      // Existing value is null - allow sheet to fill it
      finalValue = sheetValue;
      finalSource = "sheet";
      finalUpdatedAt = sheetValue !== null ? now : null;
    }

    result[kpiKey] = createKpiValue(finalValue, finalSource, finalUpdatedAt);
  }

  return result as KpiSnapshotKpis;
}
