/**
 * Feed Service
 * Business logic for feed generation and trending content
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  PostWithUser,
  PaginationParams,
  PaginationMetadata,
  FeedQuery,
  TrendingQuery,
} from '../types';
import { ValidationError } from '../utils/errors';
import { buildPagination } from '../utils/database';
import logger from '../utils/logger';
import config from '../config';

export class FeedService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get personalized feed for user
   */
  async getPersonalizedFeed(
    userId: string,
    query: FeedQuery,
    requestId: string
  ): Promise<{ posts: PostWithUser[]; metadata: PaginationMetadata }> {
    const page = query.page || 1;
    const limit = query.limit || config.pagination.defaultLimit;
    const { offset } = buildPagination(page, limit);

    let queryBuilder = this.supabase
      .from('social_posts')
      .select(
        `
        *,
        user:user_profiles!user_id(id, full_name, avatar_url, username)
      `,
        { count: 'exact' }
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filter based on query
    if (query.filter === 'friends') {
      // Get posts from friends only
      const { data: connections } = await this.supabase
        .from('user_connections')
        .select('connected_user_id')
        .eq('user_id', userId)
        .eq('status', 'accepted');

      const friendIds = connections?.map((c) => c.connected_user_id) || [];

      if (friendIds.length === 0) {
        return {
          posts: [],
          metadata: {
            page,
            limit,
            total: 0,
            total_pages: 0,
            has_more: false,
          },
        };
      }

      queryBuilder = queryBuilder.in('user_id', friendIds);
    } else if (query.filter === 'following') {
      // Get posts from users the current user follows
      const { data: followings } = await this.supabase
        .from('user_connections')
        .select('connected_user_id')
        .eq('user_id', userId)
        .eq('status', 'accepted');

      const followingIds = followings?.map((f) => f.connected_user_id) || [];

      if (followingIds.length === 0) {
        return {
          posts: [],
          metadata: {
            page,
            limit,
            total: 0,
            total_pages: 0,
            has_more: false,
          },
        };
      }

      queryBuilder = queryBuilder.in('user_id', followingIds);
    } else {
      // All posts - filter by visibility
      queryBuilder = queryBuilder.or(
        `visibility.eq.public,user_id.eq.${userId}`
      );
    }

    const { data, error, count } = await queryBuilder;

    if (error) {
      logger.error('Failed to get feed', {
        error: error.message,
        userId,
        requestId,
      });
      throw new ValidationError('Failed to get feed', error);
    }

    const posts = (data || []) as PostWithUser[];

    // Add like status for each post
    if (posts.length > 0) {
      const postIds = posts.map((p) => p.id);
      const { data: likedPosts } = await this.supabase
        .from('post_likes')
        .select('post_id')
        .in('post_id', postIds)
        .eq('user_id', userId);

      const likedPostIds = new Set(likedPosts?.map((l) => l.post_id) || []);
      posts.forEach((post) => {
        post.has_liked = likedPostIds.has(post.id);
      });
    }

    return {
      posts,
      metadata: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
        has_more: offset + posts.length < (count || 0),
      },
    };
  }

  /**
   * Get trending posts
   */
  async getTrendingPosts(
    userId: string | null,
    query: TrendingQuery,
    requestId: string
  ): Promise<{ posts: PostWithUser[]; metadata: PaginationMetadata }> {
    const page = query.page || 1;
    const limit = query.limit || config.pagination.defaultLimit;
    const timeframe = query.timeframe || '24h';

    // Calculate time threshold
    const now = new Date();
    let hoursAgo = 24;
    if (timeframe === '7d') hoursAgo = 168;
    if (timeframe === '30d') hoursAgo = 720;

    const threshold = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

    const { offset } = buildPagination(page, limit);

    // Get trending posts using RPC function
    const { data, error } = await this.supabase.rpc('get_trending_posts', {
      time_threshold: threshold.toISOString(),
      page_offset: offset,
      page_limit: limit,
    });

    if (error) {
      logger.error('Failed to get trending posts', {
        error: error.message,
        timeframe,
        requestId,
      });
      throw new ValidationError('Failed to get trending posts', error);
    }

    const posts = (data || []) as PostWithUser[];

    // Get total count
    const { count } = await this.supabase.rpc('count_trending_posts', {
      time_threshold: threshold.toISOString(),
    });

    // Add like status if user is authenticated
    if (userId && posts.length > 0) {
      const postIds = posts.map((p) => p.id);
      const { data: likedPosts } = await this.supabase
        .from('post_likes')
        .select('post_id')
        .in('post_id', postIds)
        .eq('user_id', userId);

      const likedPostIds = new Set(likedPosts?.map((l) => l.post_id) || []);
      posts.forEach((post) => {
        post.has_liked = likedPostIds.has(post.id);
      });
    }

    return {
      posts,
      metadata: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
        has_more: offset + posts.length < (count || 0),
      },
    };
  }

  /**
   * Get recommended posts based on user interests
   */
  async getRecommendedPosts(
    userId: string,
    pagination: PaginationParams,
    requestId: string
  ): Promise<{ posts: PostWithUser[]; metadata: PaginationMetadata }> {
    const { offset, limit } = buildPagination(
      pagination.page,
      pagination.limit
    );

    // Simple recommendation: posts from users with similar interests
    // In a real implementation, this would use ML or collaborative filtering

    // For now, get popular posts from users not followed
    const { data: following } = await this.supabase
      .from('user_connections')
      .select('connected_user_id')
      .eq('user_id', userId)
      .eq('status', 'accepted');

    const followingIds = following?.map((f) => f.connected_user_id) || [];
    followingIds.push(userId); // Exclude own posts

    const { data, error, count } = await this.supabase
      .from('social_posts')
      .select(
        `
        *,
        user:user_profiles!user_id(id, full_name, avatar_url, username)
      `,
        { count: 'exact' }
      )
      .eq('is_active', true)
      .eq('visibility', 'public')
      .not('user_id', 'in', `(${followingIds.join(',')})`)
      .gte('like_count', 5) // At least 5 likes
      .order('like_count', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to get recommended posts', {
        error: error.message,
        userId,
        requestId,
      });
      throw new ValidationError('Failed to get recommended posts', error);
    }

    const posts = (data || []) as PostWithUser[];

    // Add like status
    if (posts.length > 0) {
      const postIds = posts.map((p) => p.id);
      const { data: likedPosts } = await this.supabase
        .from('post_likes')
        .select('post_id')
        .in('post_id', postIds)
        .eq('user_id', userId);

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
   * Get explore feed (popular public posts)
   */
  async getExploreFeed(
    userId: string | null,
    pagination: PaginationParams,
    requestId: string
  ): Promise<{ posts: PostWithUser[]; metadata: PaginationMetadata }> {
    const { offset, limit } = buildPagination(
      pagination.page,
      pagination.limit
    );

    const { data, error, count } = await this.supabase
      .from('social_posts')
      .select(
        `
        *,
        user:user_profiles!user_id(id, full_name, avatar_url, username)
      `,
        { count: 'exact' }
      )
      .eq('is_active', true)
      .eq('visibility', 'public')
      .order('view_count', { ascending: false })
      .order('like_count', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to get explore feed', {
        error: error.message,
        requestId,
      });
      throw new ValidationError('Failed to get explore feed', error);
    }

    const posts = (data || []) as PostWithUser[];

    // Add like status if user is authenticated
    if (userId && posts.length > 0) {
      const postIds = posts.map((p) => p.id);
      const { data: likedPosts } = await this.supabase
        .from('post_likes')
        .select('post_id')
        .in('post_id', postIds)
        .eq('user_id', userId);

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
}
