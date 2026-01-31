/**
 * Exchange rate: convert between USD, NOK, EUR, IDR.
 * Tries Frankfurter API first; falls back to static rates if unavailable.
 */

const SUPPORTED = ["USD", "NOK", "EUR", "IDR"] as const;

/** Approximate rates per 1 USD (fallback when API fails). Updated periodically. */
const FALLBACK_PER_USD: Record<string, number> = {
  USD: 1,
  NOK: 10.7,
  EUR: 0.92,
  IDR: 15750,
};

/**
 * Get exchange rate: 1 unit of fromCurrency = rate units of toCurrency.
 * So multiply amount in fromCurrency by rate to get amount in toCurrency.
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  const from = (fromCurrency || "USD").toUpperCase();
  const to = (toCurrency || "USD").toUpperCase();
  if (from === to) return 1;

  if (!SUPPORTED.includes(from as any) || !SUPPORTED.includes(to as any)) {
    return null;
  }

  try {
    const res = await fetch(
      `https://api.frankfurter.dev/latest?from=${from}&to=${to}`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error("Rate fetch failed");
    const data = await res.json();
    const rate = data?.rates?.[to];
    if (typeof rate === "number" && Number.isFinite(rate)) return rate;
  } catch (_) {
    // use fallback
  }

  const perUsdFrom = FALLBACK_PER_USD[from] ?? 1;
  const perUsdTo = FALLBACK_PER_USD[to] ?? 1;
  if (perUsdFrom === 0) return null;
  return perUsdTo / perUsdFrom;
}
