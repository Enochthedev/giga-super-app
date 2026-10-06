/**
 * Account deactivation ("delete account")
 *
 * Accounts are never hard-deleted. Deactivation soft-deletes the profile
 * (deleted_at / is_active=false) AND bans the auth user in Supabase Auth, which
 * is what actually stops new logins and token refreshes. Access tokens issued
 * before the ban stay cryptographically valid until they expire, so the auth
 * middleware also rejects requests from deactivated profiles.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { config } from '../config/index.js';

import { logger } from './logger.js';

// Supabase Auth has no "permanent" ban; ~100 years is the conventional stand-in.
const PERMANENT_BAN = '876000h';

let adminClient: SupabaseClient | null = null;

const getAdminClient = (): SupabaseClient => {
  if (!adminClient) {
    adminClient = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
};

/**
 * True when the user's profile has been soft-deleted or deactivated.
 * A missing profile is NOT treated as deactivated (signup creates it async).
 * Fails open on lookup errors so a DB blip doesn't lock everyone out — the
 * Supabase Auth ban remains the hard gate on login.
 */
export const isAccountDeactivated = async (userId: string): Promise<boolean> => {
  const { data, error } = await getAdminClient()
    .from('user_profiles')
    .select('is_active, deleted_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    logger.warn('Account status lookup failed; allowing request', {
      userId,
      error: error.message,
    });
    return false;
  }

  return !!data && (data.deleted_at !== null || data.is_active === false);
};

/**
 * Open commitments that must be finished before a user may delete their own
 * account (active ride, paid order in progress, upcoming stay, live delivery…).
 * Backed by public.account_deletion_blockers(); empty array = OK to delete.
 */
export const getDeletionBlockers = async (userId: string): Promise<string[]> => {
  const { data, error } = await getAdminClient().rpc('account_deletion_blockers', {
    p_user_id: userId,
  });
  if (error) throw new Error(`Failed to check deletion blockers: ${error.message}`);
  return (data as string[] | null) ?? [];
};

/**
 * Soft-delete the profile and ban the auth user.
 * The ban runs first: if it fails nothing is changed, so we never end up with a
 * "deleted" profile that can still log in.
 */
export const deactivateAccount = async (
  userId: string,
  opts: { deletedBy: string; reason: string }
): Promise<{ deleted_at: string }> => {
  const client = getAdminClient();

  const { error: banError } = await client.auth.admin.updateUserById(userId, {
    ban_duration: PERMANENT_BAN,
  });
  if (banError) throw new Error(`Failed to ban auth user: ${banError.message}`);

  const deletedAt = new Date().toISOString();
  const { error: profileError } = await client
    .from('user_profiles')
    .update({
      deleted_at: deletedAt,
      deleted_by: opts.deletedBy,
      deletion_reason: opts.reason,
      is_active: false,
      updated_at: deletedAt,
    })
    .eq('id', userId);

  if (profileError) {
    // Login is already blocked by the ban; the profile update can be retried.
    logger.error('Auth user banned but profile soft-delete failed', {
      userId,
      error: profileError.message,
    });
    throw new Error(`Failed to soft-delete profile: ${profileError.message}`);
  }

  return { deleted_at: deletedAt };
};
