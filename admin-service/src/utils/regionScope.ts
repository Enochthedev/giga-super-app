import { AuthUser } from '../middleware/auth';
import { supabase } from './database';

/**
 * Geo-region scoping (Phase 2).
 *
 * A national-access admin (the "global" admin, e.g. DOP/PMG HQ) sees everything.
 * Any other admin that carries a region tag is restricted to that region and all
 * of its descendants in the nipost_regions tree (so a "London" admin covers
 * London + its districts, nothing else).
 *
 * Backward-compat: an admin without a region tag is treated as global (null),
 * preserving today's behavior until they are tagged via the Phase 4 endpoints.
 * Tagging an admin only ever *tightens* their visibility.
 */

const NO_MATCH = '00000000-0000-0000-0000-000000000000';

/**
 * Returns the set of region ids an admin may see, or `null` for global access.
 */
export async function getAllowedRegionIds(user: AuthUser): Promise<string[] | null> {
  if (user.accessLevel === 'national') return null; // global
  if (!user.regionId) return null; // untagged → unchanged (global) until tagged

  const { data, error } = await supabase.rpc('get_region_descendants', {
    p_region_id: user.regionId,
  });

  if (error) {
    // Fail closed for tagged admins: on error, restrict to just their own region.
    return [user.regionId];
  }

  // rpc returns an array of { get_region_descendants: uuid } or raw uuids depending on driver
  const ids = (data as any[])
    .map(row => (typeof row === 'string' ? row : row.get_region_descendants))
    .filter(Boolean);

  return ids.length ? ids : [user.regionId];
}

/**
 * Apply a region filter to a Supabase query builder for the given admin.
 *
 * @param query   a PostgREST query builder
 * @param allowed result of getAllowedRegionIds (null = global, no filter)
 * @param column  the region column on the queried table (default 'region_id')
 */
export function applyRegionScope<T>(query: T, allowed: string[] | null, column = 'region_id'): T {
  if (allowed === null) return query;
  // Empty allow-list → match nothing (a sentinel keeps the IN clause valid).
  const ids = allowed.length ? allowed : [NO_MATCH];
  return (query as any).in(column, ids);
}

/**
 * Resolve an explicit region_id or region_code to a nipost_regions.id.
 * Returns null when neither is provided or matches.
 */
export async function resolveRegionId(opts: {
  regionId?: string | null;
  regionCode?: string | null;
}): Promise<string | null> {
  if (opts.regionId) {
    const { data } = await supabase
      .from('nipost_regions')
      .select('id')
      .eq('id', opts.regionId)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }
  if (opts.regionCode) {
    const { data } = await supabase
      .from('nipost_regions')
      .select('id')
      .eq('region_code', opts.regionCode)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }
  return null;
}

/**
 * True if `targetRegionId` is within the admin's scope (or the admin is global).
 * Used to gate writes/registration into a region (Phase 3).
 */
export async function isRegionInScope(user: AuthUser, targetRegionId: string | null): Promise<boolean> {
  const allowed = await getAllowedRegionIds(user);
  if (allowed === null) return true; // global
  if (!targetRegionId) return false; // scoped admin must target a concrete region
  return allowed.includes(targetRegionId);
}
