/**
 * Currency & processor routing matrix (pure config — no I/O).
 *
 * Pricing currency is a server-side concern derived from the region a
 * transaction belongs to. Once the currency is known, the payment processor is
 * selected by which one is actually able to settle that currency.
 *
 * Routing matrix:
 *   Paystack -> NGN, GHS, KES, ZAR, USD
 *   Stripe   -> EUR, GBP
 */

export type PaymentProcessor = 'paystack' | 'stripe';

export const DEFAULT_CURRENCY = 'NGN';

// Currency -> processor that can settle it. Single source of truth for which
// currencies the platform supports.
const CURRENCY_PROCESSOR: Record<string, PaymentProcessor> = {
  NGN: 'paystack',
  GHS: 'paystack',
  KES: 'paystack',
  ZAR: 'paystack',
  USD: 'paystack',
  EUR: 'stripe',
  GBP: 'stripe',
};

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_PROCESSOR);

/** Whether the platform can settle the given currency through any processor. */
export const isSupportedCurrency = (currency: string): boolean =>
  typeof currency === 'string' && CURRENCY_PROCESSOR[currency.toUpperCase()] !== undefined;

/**
 * Select the processor that can settle the given currency.
 * Throws if the currency is not supported by any processor.
 */
export const selectProcessor = (currency: string): PaymentProcessor => {
  const processor = CURRENCY_PROCESSOR[currency.toUpperCase()];
  if (!processor) {
    throw new Error(`No payment processor configured for currency: ${currency}`);
  }
  return processor;
};
