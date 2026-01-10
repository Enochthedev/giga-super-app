/**
 * Share Service
 * Business logic for sharing posts
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  CreateShareRequest,
  Share,
  Post,
} from '../types';
import {
  NotFoundError,
  ValidationError,
  ERROR_CODES,
} from '../utils/errors';
import logger from '../utils/logger';
import config from '../config';

export class ShareService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Share a post (repost, quote, or send)
   */
  async sharePost(
    userId: string,
    shareData: CreateShareRequest,
    requestId: string
  ): Promise<{ share: Share; shared_post?: Post }> {
    // Check if original post exists
    const { data: originalPost, error: postError } = await this.supabase
      .from('social_posts')
      .select('*')
      .eq('id', shareData.post_id)
      .eq('is_active', true)
      .single();

    if (postError || !originalPost) {
      throw new NotFoundError('Post', ERROR_CODES.POST_NOT_FOUND);
    }

    let sharedPostId: string | null = null;

    // Handle different share types
    if (shareData.share_type === 'repost' || shareData.share_type === 'quote') {
      // Create a new post that references the original
      const content =
        shareData.share_type === 'quote' && shareData.content
          ? shareData.content.trim()
          : '';

      if (
        shareData.share_type === 'quote' &&
        content.length > config.social.maxContentLength
      ) {
        throw new ValidationError(
          `Content exceeds maximum length of ${config.social.maxContentLength} characters`
        );
      }

      const { data: newPost, error: createError } = await this.supabase
        .from('social_posts')
        .insert({
          user_id: userId,
          content:
            shareData.share_type === 'repost'
              ? originalPost.content
              : content,
          shared_post_id: shareData.post_id,
          visibility: shareData.visibility || 'public',
          post_type: 'post',
        })
        .select()
        .single();

      if (createError) {
        logger.error('Failed to create shared post', {
          error: createError.message,
          userId,
          postId: shareData.post_id,
          requestId,
        });
        throw new ValidationError('Failed to share post', createError);
      }

      sharedPostId = newPost.id;
    } else if (shareData.share_type === 'send') {
      // Send to specific users (could integrate with messaging service)
      if (
        !shareData.recipient_ids ||
        shareData.recipient_ids.length === 0
      ) {
        throw new ValidationError(
          'Recipient IDs are required when sending a post'
        );
      }

      // In a real implementation, this would create messages to recipients
      // For now, we'll just log it
      logger.info('Post sent to users', {
        postId: shareData.post_id,
        recipientIds: shareData.recipient_ids,
        userId,
        requestId,
      });
    }

    // Create share record
    const { data: share, error: shareError } = await this.supabase
      .from('post_shares')
      .insert({
        user_id: userId,
        post_id: shareData.post_id,
        share_type: shareData.share_type,
      })
      .select()
      .single();

    if (shareError) {
      logger.error('Failed to create share record', {
        error: shareError.message,
        userId,
        postId: shareData.post_id,
        requestId,
      });
      throw new ValidationError('Failed to record share', shareError);
    }

    // Increment share count on original post
    await this.supabase.rpc('increment_post_shares', {
      post_id: shareData.post_id,
    });

    logger.info('Post shared', {
      shareId: share.id,
      postId: shareData.post_id,
      shareType: shareData.share_type,
      userId,
      requestId,
    });

    const result: { share: Share; shared_post?: Post } = {
      share: share as Share,
    };

    // Include the shared post if it was created
    if (sharedPostId) {
      const { data: sharedPost } = await this.supabase
        .from('social_posts')
        .select('*')
        .eq('id', sharedPostId)
        .single();

      if (sharedPost) {
        result.shared_post = sharedPost as Post;
      }
    }

    return result;
  }

  /**
   * Get users who shared a post
   */
  async getPostSharers(
    postId: string,
    requestId: string
  ): Promise<any[]> {
    // Check if post exists
    const { data: post, error: postError } = await this.supabase
      .from('social_posts')
      .select('id')
      .eq('id', postId)
      .eq('is_active', true)
      .single();

    if (postError || !post) {
      throw new NotFoundError('Post', ERROR_CODES.POST_NOT_FOUND);
    }

    const { data, error } = await this.supabase
      .from('post_shares')
      .select(
        `
        *,
        user:user_profiles!user_id(id, full_name, avatar_url, username)
      `
      )
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to get post sharers', {
        error: error.message,
        postId,
        requestId,
      });
      throw new ValidationError('Failed to get sharers', error);
    }

    return data || [];
  }

  /**
   * Delete a share
   */
  async deleteShare(
    shareId: string,
    userId: string,
    requestId: string
  ): Promise<void> {
    // Get share and verify ownership
    const { data: share, error: fetchError } = await this.supabase
      .from('post_shares')
      .select('user_id, post_id')
      .eq('id', shareId)
      .single();

    if (fetchError || !share) {
      throw new NotFoundError('Share not found');
    }

    if (share.user_id !== userId) {
      throw new ValidationError('You can only delete your own shares');
    }

    // Delete share
    const { error } = await this.supabase
      .from('post_shares')
      .delete()
      .eq('id', shareId);

    if (error) {
      logger.error('Failed to delete share', {
        error: error.message,
        shareId,
        userId,
        requestId,
      });
      throw new ValidationError('Failed to delete share', error);
    }

    // Decrement share count
    await this.supabase.rpc('decrement_post_shares', {
      post_id: share.post_id,
    });

    logger.info('Share deleted', {
      shareId,
      userId,
      requestId,
    });
  }
}
