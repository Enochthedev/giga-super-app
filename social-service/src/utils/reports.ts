import { SupabaseClient } from '@supabase/supabase-js';

export type ReportTargetType = 'post' | 'comment' | 'user';

export type CreateReportResult =
  | { status: 'created' | 'duplicate'; reportId?: string }
  | { status: 'not_found' }
  | { status: 'self' };

/** Who authored the target (or, for a user report, the user). null = not found. */
const resolveTargetUser = async (
  supabase: SupabaseClient,
  targetType: ReportTargetType,
  targetId: string
): Promise<string | null> => {
  const lookup =
    targetType === 'post'
      ? supabase.from('social_posts').select('user_id').eq('id', targetId).is('deleted_at', null)
      : targetType === 'comment'
        ? supabase.from('post_comments').select('user_id').eq('id', targetId).is('deleted_at', null)
        : supabase.from('user_profiles').select('user_id:id').eq('id', targetId);

  const { data, error } = await lookup.maybeSingle();
  if (error) throw error;
  return (data as { user_id: string } | null)?.user_id ?? null;
};

/**
 * Record a report for admin review (admin-service /api/admin/reports).
 * Reporting the same target twice is a no-op, not an error.
 */
export const createReport = async (
  supabase: SupabaseClient,
  input: {
    reporterId: string;
    targetType: ReportTargetType;
    targetId: string;
    reason: string;
    description?: string;
  }
): Promise<CreateReportResult> => {
  const targetUserId = await resolveTargetUser(supabase, input.targetType, input.targetId);
  if (!targetUserId) return { status: 'not_found' };
  if (input.targetType === 'user' && targetUserId === input.reporterId) return { status: 'self' };

  const { data, error } = await supabase
    .from('content_reports')
    .insert({
      reporter_id: input.reporterId,
      target_type: input.targetType,
      target_id: input.targetId,
      target_user_id: targetUserId,
      reason: input.reason,
      description: input.description ?? null,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') return { status: 'duplicate' };
    throw error;
  }

  return { status: 'created', reportId: data.id };
};
