import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Users whose content `userId` must not see: everyone they blocked AND everyone
 * who blocked them (blocking is mutual in effect). Empty for anonymous viewers.
 */
export const getHiddenUserIds = async (
  supabase: SupabaseClient,
  userId: string | undefined
): Promise<string[]> => {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('user_blocks')
    .select('blocker_id, blocked_id')
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

  if (error) throw error;

  return [
    ...new Set((data ?? []).map(b => (b.blocker_id === userId ? b.blocked_id : b.blocker_id))),
  ];
};

/** True if either user has blocked the other. */
export const isBlockedEitherWay = async (
  supabase: SupabaseClient,
  a: string,
  b: string
): Promise<boolean> => {
  if (a === b) return false;

  const { count, error } = await supabase
    .from('user_blocks')
    .select('blocker_id', { count: 'exact', head: true })
    .or(`and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`);

  if (error) throw error;
  return (count ?? 0) > 0;
};

/** Value for PostgREST `.not(column, 'in', ...)`. */
export const inList = (ids: string[]): string => `(${ids.join(',')})`;
