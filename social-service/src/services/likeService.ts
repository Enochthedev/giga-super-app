/**
 * Like Service
 * Business logic for like/reaction operations
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  CreateLikeRequest,
  Like,
  LikeWithUser,
  ReactionType,
  PaginationParams,
  PaginationMetadata,
} from '../types';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  ERROR_CODES,
} from '../utils/errors';
import { buildPagination } from '../utils/database';
import logger from '../utils/logger';

export class LikeService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Like or unlike a post
   */
  async togglePostLike(
    postId: string,
    userId: string,
    likeData: CreateLikeRequest,
    requestId: string
  ): Promise<{ action: 'liked' | 'unliked'; like?: Like }> {
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

    // Check if user has already liked the post
    const { data: existingLike, error: checkError } = await this.supabase
      .from('post_likes')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    // If already liked, unlike it
    if (existingLike) {
      const { error: deleteError } = await this.supabase
        .from('post_likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) {
        logger.error('Failed to unlike post', {
          error: deleteError.message,
          postId,
          userId,
          requestId,
        });
        throw new ValidationError('Failed to unlike post', deleteError);
      }

      // Decrement like count
      await this.supabase.rpc('decrement_post_likes', { post_id: postId });

      logger.info('Post unliked', {
        postId,
        userId,
        requestId,
      });

      return { action: 'unliked' };
    }

    // Create new like
    const reactionType = likeData.reaction_type || 'like';

    const { data, error } = await this.supabase
      .from('post_likes')
      .insert({
        post_id: postId,
        user_id: userId,
        reaction_type: reactionType,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to like post', {
        error: error.message,
        postId,
        userId,
        requestId,
      });
      throw new ValidationError('Failed to like post', error);
    }

    // Increment like count
    await this.supabase.rpc('increment_post_likes', { post_id: postId });

    logger.info('Post liked', {
      postId,
      userId,
      reactionType,
      requestId,
    });

    return { action: 'liked', like: data as Like };
  }

  /**
   * Like or unlike a comment
   */
  async toggleCommentLike(
    commentId: string,
    userId: string,
    likeData: CreateLikeRequest,
    requestId: string
  ): Promise<{ action: 'liked' | 'unliked'; like?: Like }> {
    // Check if comment exists
    const { data: comment, error: commentError } = await this.supabase
      .from('post_comments')
      .select('id')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      throw new NotFoundError('Comment', ERROR_CODES.COMMENT_NOT_FOUND);
    }

    // Check if user has already liked the comment
    const { data: existingLike } = await this.supabase
      .from('comment_likes')
      .select('*')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .single();

    // If already liked, unlike it
    if (existingLike) {
      const { error: deleteError } = await this.supabase
        .from('comment_likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) {
        logger.error('Failed to unlike comment', {
          error: deleteError.message,
          commentId,
          userId,
          requestId,
        });
        throw new ValidationError('Failed to unlike comment', deleteError);
      }

      // Decrement like count
      await this.supabase.rpc('decrement_comment_likes', {
        comment_id: commentId,
      });

      logger.info('Comment unliked', {
        commentId,
        userId,
        requestId,
      });

      return { action: 'unliked' };
    }

    // Create new like
    const reactionType = likeData.reaction_type || 'like';

    const { data, error } = await this.supabase
      .from('comment_likes')
      .insert({
        comment_id: commentId,
        user_id: userId,
        reaction_type: reactionType,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to like comment', {
        error: error.message,
        commentId,
        userId,
        requestId,
      });
      throw new ValidationError('Failed to like comment', error);
    }

    // Increment like count
    await this.supabase.rpc('increment_comment_likes', {
      comment_id: commentId,
    });

    logger.info('Comment liked', {
      commentId,
      userId,
      reactionType,
      requestId,
    });

    return { action: 'liked', like: data as Like };
  }

  /**
   * Get users who liked a post
   */
  async getPostLikers(
    postId: string,
    pagination: PaginationParams,
    requestId: string
  ): Promise<{ likes: LikeWithUser[]; metadata: PaginationMetadata }> {
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

    const { offset, limit } = buildPagination(
      pagination.page,
      pagination.limit
    );

    const { data, error, count } = await this.supabase
      .from('post_likes')
      .select(
        `
        *,
        user:user_profiles!user_id(id, full_name, avatar_url, username)
      `,
        { count: 'exact' }
      )
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to get post likers', {
        error: error.message,
        postId,
        requestId,
      });
      throw new ValidationError('Failed to get likers', error);
    }

    const likes = (data || []) as LikeWithUser[];

    return {
      likes,
      metadata: {
        page: pagination.page,
        limit: pagination.limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / pagination.limit),
        has_more: offset + likes.length < (count || 0),
      },
    };
  }

  /**
   * Get users who liked a comment
   */
  async getCommentLikers(
    commentId: string,
    pagination: PaginationParams,
    requestId: string
  ): Promise<{ likes: LikeWithUser[]; metadata: PaginationMetadata }> {
    // Check if comment exists
    const { data: comment, error: commentError } = await this.supabase
      .from('post_comments')
      .select('id')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      throw new NotFoundError('Comment', ERROR_CODES.COMMENT_NOT_FOUND);
    }

    const { offset, limit } = buildPagination(
      pagination.page,
      pagination.limit
    );

    const { data, error, count } = await this.supabase
      .from('comment_likes')
      .select(
        `
        *,
        user:user_profiles!user_id(id, full_name, avatar_url, username)
      `,
        { count: 'exact' }
      )
      .eq('comment_id', commentId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to get comment likers', {
        error: error.message,
        commentId,
        requestId,
      });
      throw new ValidationError('Failed to get likers', error);
    }

    const likes = (data || []) as LikeWithUser[];

    return {
      likes,
      metadata: {
        page: pagination.page,
        limit: pagination.limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / pagination.limit),
        has_more: offset + likes.length < (count || 0),
      },
    };
  }

  /**
   * Get reaction breakdown for a post
   */
  async getPostReactionBreakdown(
    postId: string,
    requestId: string
  ): Promise<Record<ReactionType, number>> {
    const { data, error } = await this.supabase
      .from('post_likes')
      .select('reaction_type')
      .eq('post_id', postId);

    if (error) {
      logger.error('Failed to get reaction breakdown', {
        error: error.message,
        postId,
        requestId,
      });
      throw new ValidationError('Failed to get reaction breakdown', error);
    }

    // Count reactions by type
    const breakdown: Record<ReactionType, number> = {
      like: 0,
      love: 0,
      haha: 0,
      wow: 0,
      sad: 0,
      angry: 0,
    };

    data?.forEach((like: any) => {
      const reactionType = like.reaction_type as ReactionType;
      breakdown[reactionType] = (breakdown[reactionType] || 0) + 1;
    });

    return breakdown;
  }
}
