// Shared currency + payment-processor routing for edge functions.
//
// Pricing currency is determined by the region of the listing/service being
// sold and is stored on the priced entity (see migration
// 20260619000300_add_entity_pricing_currency). The processor is then selected
// by which one can actually settle that currency.
//
//   Paystack -> NGN, GHS, KES, ZAR, USD
//   Stripe   -> EUR, GBP

export type PaymentProcessor = 'paystack' | 'stripe';

export const DEFAULT_CURRENCY = 'NGN';

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

export function isSupportedCurrency(currency: string): boolean {
  return typeof currency === 'string' && CURRENCY_PROCESSOR[currency.toUpperCase()] !== undefined;
}

export function selectProcessor(currency: string): PaymentProcessor {
  const processor = CURRENCY_PROCESSOR[currency.toUpperCase()];
  if (!processor) {
    throw new Error(`No payment processor configured for currency: ${currency}`);
  }
  return processor;
}

// Map a moduleType (as used by Initialize-payment) to the table + column that
// holds the priced entity's currency.
const ENTITY_CURRENCY_SOURCE: Record<string, { table: string; column: string }> = {
  hotel_booking: { table: 'hotel_bookings', column: 'currency' },
  ecommerce_order: { table: 'ecommerce_orders', column: 'currency' },
  taxi_ride: { table: 'rides', column: 'currency' },
};

/**
 * Resolve the pricing currency for a transaction from the entity it pays for.
 * Falls back to DEFAULT_CURRENCY when the module has no currency-bearing entity
 * (e.g. ad_campaign) or the row/column is missing.
 */
export async function resolveEntityCurrency(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  moduleType: string,
  referenceId: string
): Promise<string> {
  const source = ENTITY_CURRENCY_SOURCE[moduleType];
  if (!source) {
    return DEFAULT_CURRENCY;
  }

  const { data, error } = await supabase
    .from(source.table)
    .select(source.column)
    .eq('id', referenceId)
    .maybeSingle();

  if (error || !data || !data[source.column]) {
    return DEFAULT_CURRENCY;
  }

  const currency = String(data[source.column]).toUpperCase();
  return isSupportedCurrency(currency) ? currency : DEFAULT_CURRENCY;
}

/**
 * Resolve a region's currency by walking up the nipost_regions hierarchy
 * (city -> state -> country -> continent) to the first non-null currency.
 * Used by write-paths to stamp a listing's currency from its owner's region.
 */
export async function resolveRegionCurrency(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  regionId: string | null | undefined
): Promise<string> {
  if (!regionId) {
    return DEFAULT_CURRENCY;
  }

  let currentId: string | null = regionId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);

    const { data, error }: {
      data: { currency: string | null; parent_region_id: string | null } | null;
      error: unknown;
    } = await supabase
      .from('nipost_regions')
      .select('currency, parent_region_id')
      .eq('id', currentId)
      .maybeSingle();

    if (error || !data) {
      break;
    }
    if (data.currency) {
      const currency = String(data.currency).toUpperCase();
      return isSupportedCurrency(currency) ? currency : DEFAULT_CURRENCY;
    }
    currentId = data.parent_region_id;
  }

  return DEFAULT_CURRENCY;
}
