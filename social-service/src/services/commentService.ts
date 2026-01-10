/**
 * Comment Service
 * Business logic for comment operations
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  CreateCommentRequest,
  UpdateCommentRequest,
  Comment,
  CommentWithUser,
  PaginationParams,
  PaginationMetadata,
} from '../types';
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
  ERROR_CODES,
} from '../utils/errors';
import { buildPagination } from '../utils/database';
import logger from '../utils/logger';
import config from '../config';

export class CommentService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new comment
   */
  async createComment(
    userId: string,
    commentData: CreateCommentRequest,
    requestId: string
  ): Promise<Comment> {
    // Validation
    if (!commentData.content || commentData.content.trim().length === 0) {
      throw new ValidationError('Comment content is required');
    }

    if (commentData.content.length > config.social.maxCommentLength) {
      throw new ValidationError(
        `Comment exceeds maximum length of ${config.social.maxCommentLength} characters`
      );
    }

    // Check if post exists
    const { data: post, error: postError } = await this.supabase
      .from('social_posts')
      .select('id, user_id')
      .eq('id', commentData.post_id)
      .eq('is_active', true)
      .single();

    if (postError || !post) {
      throw new NotFoundError('Post', ERROR_CODES.POST_NOT_FOUND);
    }

    // If replying to a comment, check parent exists
    if (commentData.parent_comment_id) {
      const { data: parentComment, error: parentError } = await this.supabase
        .from('post_comments')
        .select('id, post_id')
        .eq('id', commentData.parent_comment_id)
        .single();

      if (parentError || !parentComment) {
        throw new NotFoundError('Parent comment', ERROR_CODES.COMMENT_NOT_FOUND);
      }

      // Ensure parent comment belongs to the same post
      if (parentComment.post_id !== commentData.post_id) {
        throw new ValidationError(
          'Parent comment does not belong to this post'
        );
      }
    }

    // Create comment
    const { data, error } = await this.supabase
      .from('post_comments')
      .insert({
        post_id: commentData.post_id,
        user_id: userId,
        parent_comment_id: commentData.parent_comment_id || null,
        content: commentData.content.trim(),
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create comment', {
        error: error.message,
        userId,
        requestId,
      });
      throw new ValidationError('Failed to create comment', error);
    }

    // Increment post comment count
    await this.supabase.rpc('increment_post_comments', {
      post_id: commentData.post_id,
    });

    // Increment parent comment reply count if replying
    if (commentData.parent_comment_id) {
      await this.supabase.rpc('increment_comment_replies', {
        comment_id: commentData.parent_comment_id,
      });
    }

    logger.info('Comment created', {
      commentId: data.id,
      postId: commentData.post_id,
      userId,
      requestId,
    });

    return data as Comment;
  }

  /**
   * Get comments for a post
   */
  async getPostComments(
    postId: string,
    currentUserId: string | null,
    pagination: PaginationParams,
    requestId: string
  ): Promise<{ comments: CommentWithUser[]; metadata: PaginationMetadata }> {
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

    // Get top-level comments (no parent)
    const { data, error, count } = await this.supabase
      .from('post_comments')
      .select(
        `
        *,
        user:user_profiles!user_id(id, full_name, avatar_url, username)
      `,
        { count: 'exact' }
      )
      .eq('post_id', postId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to get post comments', {
        error: error.message,
        postId,
        requestId,
      });
      throw new ValidationError('Failed to get comments', error);
    }

    const comments = (data || []) as CommentWithUser[];

    // Add like status for each comment
    if (currentUserId && comments.length > 0) {
      const commentIds = comments.map((c) => c.id);
      const { data: likedComments } = await this.supabase
        .from('comment_likes')
        .select('comment_id')
        .in('comment_id', commentIds)
        .eq('user_id', currentUserId);

      const likedCommentIds = new Set(
        likedComments?.map((l) => l.comment_id) || []
      );
      comments.forEach((comment) => {
        comment.has_liked = likedCommentIds.has(comment.id);
      });
    }

    return {
      comments,
      metadata: {
        page: pagination.page,
        limit: pagination.limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / pagination.limit),
        has_more: offset + comments.length < (count || 0),
      },
    };
  }

  /**
   * Get replies to a comment
   */
  async getCommentReplies(
    commentId: string,
    currentUserId: string | null,
    pagination: PaginationParams,
    requestId: string
  ): Promise<{ replies: CommentWithUser[]; metadata: PaginationMetadata }> {
    // Check if parent comment exists
    const { data: parentComment, error: parentError } = await this.supabase
      .from('post_comments')
      .select('id')
      .eq('id', commentId)
      .single();

    if (parentError || !parentComment) {
      throw new NotFoundError('Comment', ERROR_CODES.COMMENT_NOT_FOUND);
    }

    const { offset, limit } = buildPagination(
      pagination.page,
      pagination.limit
    );

    const { data, error, count } = await this.supabase
      .from('post_comments')
      .select(
        `
        *,
        user:user_profiles!user_id(id, full_name, avatar_url, username)
      `,
        { count: 'exact' }
      )
      .eq('parent_comment_id', commentId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to get comment replies', {
        error: error.message,
        commentId,
        requestId,
      });
      throw new ValidationError('Failed to get replies', error);
    }

    const replies = (data || []) as CommentWithUser[];

    // Add like status for each reply
    if (currentUserId && replies.length > 0) {
      const replyIds = replies.map((r) => r.id);
      const { data: likedReplies } = await this.supabase
        .from('comment_likes')
        .select('comment_id')
        .in('comment_id', replyIds)
        .eq('user_id', currentUserId);

      const likedReplyIds = new Set(
        likedReplies?.map((l) => l.comment_id) || []
      );
      replies.forEach((reply) => {
        reply.has_liked = likedReplyIds.has(reply.id);
      });
    }

    return {
      replies,
      metadata: {
        page: pagination.page,
        limit: pagination.limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / pagination.limit),
        has_more: offset + replies.length < (count || 0),
      },
    };
  }

  /**
   * Update a comment
   */
  async updateComment(
    commentId: string,
    userId: string,
    updates: UpdateCommentRequest,
    requestId: string
  ): Promise<Comment> {
    // Get existing comment
    const { data: existingComment, error: fetchError } = await this.supabase
      .from('post_comments')
      .select('*')
      .eq('id', commentId)
      .single();

    if (fetchError || !existingComment) {
      throw new NotFoundError('Comment', ERROR_CODES.COMMENT_NOT_FOUND);
    }

    // Check ownership
    if (existingComment.user_id !== userId) {
      throw new AuthorizationError(
        'You can only update your own comments',
        ERROR_CODES.ACCESS_DENIED
      );
    }

    // Validate content
    if (!updates.content || updates.content.trim().length === 0) {
      throw new ValidationError('Comment content is required');
    }

    if (updates.content.length > config.social.maxCommentLength) {
      throw new ValidationError(
        `Comment exceeds maximum length of ${config.social.maxCommentLength} characters`
      );
    }

    // Update comment
    const { data, error } = await this.supabase
      .from('post_comments')
      .update({
        content: updates.content.trim(),
        is_edited: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update comment', {
        error: error.message,
        commentId,
        userId,
        requestId,
      });
      throw new ValidationError('Failed to update comment', error);
    }

    logger.info('Comment updated', {
      commentId,
      userId,
      requestId,
    });

    return data as Comment;
  }

  /**
   * Delete a comment
   */
  async deleteComment(
    commentId: string,
    userId: string,
    requestId: string
  ): Promise<void> {
    // Get existing comment
    const { data: existingComment, error: fetchError } = await this.supabase
      .from('post_comments')
      .select('post_id, parent_comment_id, user_id')
      .eq('id', commentId)
      .single();

    if (fetchError || !existingComment) {
      throw new NotFoundError('Comment', ERROR_CODES.COMMENT_NOT_FOUND);
    }

    // Check ownership
    if (existingComment.user_id !== userId) {
      throw new AuthorizationError(
        'You can only delete your own comments',
        ERROR_CODES.ACCESS_DENIED
      );
    }

    // Delete comment (hard delete for now, could be soft delete)
    const { error } = await this.supabase
      .from('post_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      logger.error('Failed to delete comment', {
        error: error.message,
        commentId,
        userId,
        requestId,
      });
      throw new ValidationError('Failed to delete comment', error);
    }

    // Decrement post comment count
    await this.supabase.rpc('decrement_post_comments', {
      post_id: existingComment.post_id,
    });

    // Decrement parent comment reply count if it was a reply
    if (existingComment.parent_comment_id) {
      await this.supabase.rpc('decrement_comment_replies', {
        comment_id: existingComment.parent_comment_id,
      });
    }

    logger.info('Comment deleted', {
      commentId,
      userId,
      requestId,
    });
  }
}
