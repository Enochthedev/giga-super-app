/**
 * Post Service
 * Business logic for post operations
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  CreatePostRequest,
  UpdatePostRequest,
  Post,
  PostWithUser,
  PaginationParams,
  PaginationMetadata,
} from '../types';
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
  ERROR_CODES,
  assertExists,
  assertAccess,
} from '../utils/errors';
import { executeQuery, buildPagination } from '../utils/database';
import logger from '../utils/logger';
import config from '../config';

export class PostService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new post
   */
  async createPost(
    userId: string,
    postData: CreatePostRequest,
    requestId: string
  ): Promise<Post> {
    // Validation
    if (!postData.content || postData.content.trim().length === 0) {
      throw new ValidationError('Content is required');
    }

    if (postData.content.length > config.social.maxContentLength) {
      throw new ValidationError(
        `Content exceeds maximum length of ${config.social.maxContentLength} characters`,
        { maxLength: config.social.maxContentLength }
      );
    }

    if (
      postData.media_urls &&
      postData.media_urls.length > config.social.maxMediaUploads
    ) {
      throw new ValidationError(
        `Cannot upload more than ${config.social.maxMediaUploads} media files`,
        { maxUploads: config.social.maxMediaUploads }
      );
    }

    // Set defaults
    const postType = postData.post_type || 'post';
    const visibility = postData.visibility || 'public';

    // Calculate expiration for stories
    let expiresAt = null;
    if (postType === 'story') {
      const expirationDate = new Date();
      expirationDate.setHours(
        expirationDate.getHours() + config.social.storyExpirationHours
      );
      expiresAt = expirationDate.toISOString();
    }

    const { data, error } = await this.supabase
      .from('social_posts')
      .insert({
        user_id: userId,
        content: postData.content.trim(),
        media_urls: postData.media_urls || [],
        post_type: postType,
        visibility,
        allowed_viewers: postData.allowed_viewers || [],
        location: postData.location || null,
        feeling_activity: postData.feeling_activity || null,
        tagged_users: postData.tagged_users || [],
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create post', {
        error: error.message,
        userId,
        requestId,
      });
      throw new ValidationError('Failed to create post', error);
    }

    logger.info('Post created', {
      postId: data.id,
      userId,
      postType,
      requestId,
    });

    return data as Post;
  }

  /**
   * Get a post by ID with user details
   */
  async getPostById(
    postId: string,
    currentUserId: string | null,
    requestId: string
  ): Promise<PostWithUser> {
    const { data, error } = await this.supabase
      .from('social_posts')
      .select(
        `
        *,
        user:user_profiles!user_id(id, full_name, avatar_url, username)
      `
      )
      .eq('id', postId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new NotFoundError('Post', ERROR_CODES.POST_NOT_FOUND);
    }

    const post = data as PostWithUser;

    // Check access permissions
    await this.checkPostAccess(post, currentUserId, requestId);

    // Check if current user has liked the post
    if (currentUserId) {
      const { data: likeData } = await this.supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', currentUserId)
        .single();

      post.has_liked = !!likeData;
    }

    // If it's a shared post, fetch the original post
    if (post.shared_post_id) {
      try {
        const sharedPost = await this.getPostById(
          post.shared_post_id,
          currentUserId,
          requestId
        );
        post.shared_post = sharedPost;
      } catch (error) {
        // Original post may have been deleted
        logger.warn('Shared post not found', {
          sharedPostId: post.shared_post_id,
          requestId,
        });
      }
    }

    return post;
  }

  /**
   * Get posts by user ID
   */
  async getUserPosts(
    userId: string,
    currentUserId: string | null,
    pagination: PaginationParams,
    requestId: string
  ): Promise<{ posts: PostWithUser[]; metadata: PaginationMetadata }> {
    const { offset, limit } = buildPagination(
      pagination.page,
      pagination.limit
    );

    // Build visibility filter
    let query = this.supabase
      .from('social_posts')
      .select(
        `
        *,
        user:user_profiles!user_id(id, full_name, avatar_url, username)
      `,
        { count: 'exact' }
      )
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply visibility filter
    if (currentUserId !== userId) {
      query = query.or(
        `visibility.eq.public,visibility.eq.friends,allowed_viewers.cs.{${currentUserId}}`
      );
    }

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to get user posts', {
        error: error.message,
        userId,
        requestId,
      });
      throw new ValidationError('Failed to get posts', error);
    }

    const posts = (data || []) as PostWithUser[];

    // Add like status for each post
    if (currentUserId && posts.length > 0) {
      const postIds = posts.map((p) => p.id);
      const { data: likedPosts } = await this.supabase
        .from('post_likes')
        .select('post_id')
        .in('post_id', postIds)
        .eq('user_id', currentUserId);

      const likedPostIds = new Set(likedPosts?.map((l) => l.post_id) || []);
      posts.forEach((post) => {
        post.has_liked = likedPostIds.has(post.id);
      });
    }

    return {
      posts,
      metadata: {
        page: pagination.page,
        limit: pagination.limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / pagination.limit),
        has_more: offset + posts.length < (count || 0),
      },
    };
  }

  /**
   * Update a post
   */
  async updatePost(
    postId: string,
    userId: string,
    updates: UpdatePostRequest,
    requestId: string
  ): Promise<Post> {
    // Get existing post
    const { data: existingPost, error: fetchError } = await this.supabase
      .from('social_posts')
      .select('*')
      .eq('id', postId)
      .eq('is_active', true)
      .single();

    if (fetchError || !existingPost) {
      throw new NotFoundError('Post', ERROR_CODES.POST_NOT_FOUND);
    }

    // Check ownership
    if (existingPost.user_id !== userId) {
      throw new AuthorizationError(
        'You can only update your own posts',
        ERROR_CODES.ACCESS_DENIED
      );
    }

    // Validate updates
    if (updates.content && updates.content.length > config.social.maxContentLength) {
      throw new ValidationError(
        `Content exceeds maximum length of ${config.social.maxContentLength} characters`
      );
    }

    if (
      updates.media_urls &&
      updates.media_urls.length > config.social.maxMediaUploads
    ) {
      throw new ValidationError(
        `Cannot upload more than ${config.social.maxMediaUploads} media files`
      );
    }

    // Prepare update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.content !== undefined) {
      updateData.content = updates.content.trim();
    }
    if (updates.media_urls !== undefined) {
      updateData.media_urls = updates.media_urls;
    }
    if (updates.visibility !== undefined) {
      updateData.visibility = updates.visibility;
    }
    if (updates.allowed_viewers !== undefined) {
      updateData.allowed_viewers = updates.allowed_viewers;
    }
    if (updates.location !== undefined) {
      updateData.location = updates.location;
    }
    if (updates.feeling_activity !== undefined) {
      updateData.feeling_activity = updates.feeling_activity;
    }
    if (updates.tagged_users !== undefined) {
      updateData.tagged_users = updates.tagged_users;
    }

    const { data, error } = await this.supabase
      .from('social_posts')
      .update(updateData)
      .eq('id', postId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update post', {
        error: error.message,
        postId,
        userId,
        requestId,
      });
      throw new ValidationError('Failed to update post', error);
    }

    logger.info('Post updated', {
      postId,
      userId,
      requestId,
    });

    return data as Post;
  }

  /**
   * Delete a post (soft delete)
   */
  async deletePost(
    postId: string,
    userId: string,
    requestId: string
  ): Promise<void> {
    // Get existing post
    const { data: existingPost, error: fetchError } = await this.supabase
      .from('social_posts')
      .select('*')
      .eq('id', postId)
      .eq('is_active', true)
      .single();

    if (fetchError || !existingPost) {
      throw new NotFoundError('Post', ERROR_CODES.POST_NOT_FOUND);
    }

    // Check ownership
    if (existingPost.user_id !== userId) {
      throw new AuthorizationError(
        'You can only delete your own posts',
        ERROR_CODES.ACCESS_DENIED
      );
    }

    // Soft delete
    const { error } = await this.supabase
      .from('social_posts')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId);

    if (error) {
      logger.error('Failed to delete post', {
        error: error.message,
        postId,
        userId,
        requestId,
      });
      throw new ValidationError('Failed to delete post', error);
    }

    logger.info('Post deleted', {
      postId,
      userId,
      requestId,
    });
  }

  /**
   * Increment view count for a post
   */
  async incrementViewCount(
    postId: string,
    requestId: string
  ): Promise<void> {
    const { error } = await this.supabase.rpc('increment_post_views', {
      post_id: postId,
    });

    if (error) {
      logger.warn('Failed to increment view count', {
        error: error.message,
        postId,
        requestId,
      });
      // Don't throw error - view count increment is not critical
    }
  }

  /**
   * Check if user has access to view a post
   */
  private async checkPostAccess(
    post: Post,
    currentUserId: string | null,
    requestId: string
  ): Promise<void> {
    // Public posts are accessible to everyone
    if (post.visibility === 'public') {
      return;
    }

    // Owner can always access their own posts
    if (currentUserId === post.user_id) {
      return;
    }

    // Must be authenticated for non-public posts
    if (!currentUserId) {
      throw new AuthorizationError(
        'This content is private',
        ERROR_CODES.PRIVATE_CONTENT
      );
    }

    // Check custom viewers list
    if (
      post.visibility === 'custom' &&
      post.allowed_viewers.includes(currentUserId)
    ) {
      return;
    }

    // Check friends list for friends-only posts
    if (post.visibility === 'friends') {
      const { data: connection } = await this.supabase
        .from('user_connections')
        .select('id')
        .eq('user_id', post.user_id)
        .eq('connected_user_id', currentUserId)
        .eq('status', 'accepted')
        .single();

      if (connection) {
        return;
      }
    }

    // Access denied
    throw new AuthorizationError(
      'You do not have permission to view this post',
      ERROR_CODES.ACCESS_DENIED
    );
  }
}
