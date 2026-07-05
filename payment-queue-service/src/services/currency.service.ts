import { DEFAULT_CURRENCY, isSupportedCurrency } from '../config/currency';
import supabase from '../utils/database';
import logger from '../utils/logger';

// Re-export the pure routing matrix so callers can import everything
// currency-related from one place.
export {
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  isSupportedCurrency,
  selectProcessor,
} from '../config/currency';
export type { PaymentProcessor } from '../config/currency';

// Cache resolved region currencies for the lifetime of the process. Region ->
// currency mappings change rarely, and resolution can require walking several
// parent rows.
const currencyCache = new Map<string, string>();

interface RegionRow {
  id: string;
  currency: string | null;
  parent_region_id: string | null;
}

/**
 * Resolve the pricing currency for a region by walking up the
 * nipost_regions hierarchy (city -> state -> country -> continent) and
 * returning the first non-null currency. Falls back to DEFAULT_CURRENCY.
 *
 * Prefers branchId (most specific) and falls back to stateId.
 */
export const resolveRegionCurrency = async (
  branchId?: string,
  stateId?: string
): Promise<string> => {
  const startId = branchId || stateId;
  if (!startId) {
    return DEFAULT_CURRENCY;
  }

  const cached = currencyCache.get(startId);
  if (cached) {
    return cached;
  }

  try {
    let currentId: string | null = startId;
    const visited = new Set<string>();

    // Bound the walk to avoid loops on malformed parent chains.
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);

      const { data, error } = await supabase
        .from('nipost_regions')
        .select('id, currency, parent_region_id')
        .eq('id', currentId)
        .maybeSingle<RegionRow>();

      if (error) {
        logger.error('Failed to resolve region currency', {
          regionId: currentId,
          error: error.message,
        });
        break;
      }

      if (!data) {
        break;
      }

      if (data.currency) {
        const resolved = data.currency.toUpperCase();
        currencyCache.set(startId, resolved);
        return resolved;
      }

      currentId = data.parent_region_id;
    }
  } catch (error: any) {
    logger.error('Error resolving region currency', {
      regionId: startId,
      error: error.message,
    });
  }

  // No currency found in the hierarchy — use the platform default.
  currencyCache.set(startId, DEFAULT_CURRENCY);
  return DEFAULT_CURRENCY;
};

/** Clear the region-currency cache (e.g. after region data changes). */
export const clearCurrencyCache = (): void => {
  currencyCache.clear();
};

// Map an edge-style moduleType to the table holding the priced entity's currency.
const ENTITY_CURRENCY_TABLE: Record<string, string> = {
  hotel_booking: 'hotel_bookings',
  ecommerce_order: 'ecommerce_orders',
  taxi_ride: 'rides',
};

/**
 * Resolve the pricing currency for a transaction from the entity being paid for
 * (the booking/order/ride carries its own currency, stamped from the region at
 * creation). Falls back to DEFAULT_CURRENCY for modules with no such entity
 * (e.g. ad_campaign) or when the row/currency is missing/unsupported.
 */
export const resolveEntityCurrency = async (
  moduleType: string,
  referenceId: string
): Promise<string> => {
  const table = ENTITY_CURRENCY_TABLE[moduleType];
  if (!table) {
    return DEFAULT_CURRENCY;
  }

  const { data, error } = await supabase
    .from(table)
    .select('currency')
    .eq('id', referenceId)
    .maybeSingle<{ currency: string | null }>();

  if (error || !data || !data.currency) {
    return DEFAULT_CURRENCY;
  }

  const currency = data.currency.toUpperCase();
  return isSupportedCurrency(currency) ? currency : DEFAULT_CURRENCY;
};
