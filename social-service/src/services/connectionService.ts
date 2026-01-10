/**
 * Connection Service
 * Business logic for user connections (following, friends, blocking)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  FollowRequest,
  BlockRequest,
  Connection,
  ConnectionWithUser,
  Block,
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

export class ConnectionService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Follow a user
   */
  async followUser(
    userId: string,
    followData: FollowRequest,
    requestId: string
  ): Promise<Connection> {
    // Cannot follow yourself
    if (userId === followData.user_id) {
      throw new ValidationError('You cannot follow yourself');
    }

    // Check if target user exists
    const { data: targetUser, error: userError } = await this.supabase
      .from('user_profiles')
      .select('id')
      .eq('id', followData.user_id)
      .single();

    if (userError || !targetUser) {
      throw new NotFoundError('User', ERROR_CODES.USER_NOT_FOUND);
    }

    // Check if already following
    const { data: existing } = await this.supabase
      .from('user_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('connected_user_id', followData.user_id)
      .in('status', ['pending', 'accepted'])
      .single();

    if (existing) {
      throw new ConflictError(
        'You are already following this user',
        ERROR_CODES.ALREADY_FOLLOWING
      );
    }

    // Create connection
    const { data, error } = await this.supabase
      .from('user_connections')
      .insert({
        user_id: userId,
        connected_user_id: followData.user_id,
        status: 'accepted', // Auto-accept for simple following
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to follow user', {
        error: error.message,
        userId,
        targetUserId: followData.user_id,
        requestId,
      });
      throw new ValidationError('Failed to follow user', error);
    }

    logger.info('User followed', {
      userId,
      followedUserId: followData.user_id,
      requestId,
    });

    return data as Connection;
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(
    userId: string,
    targetUserId: string,
    requestId: string
  ): Promise<void> {
    // Get connection
    const { data: connection, error: fetchError } = await this.supabase
      .from('user_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('connected_user_id', targetUserId)
      .single();

    if (fetchError || !connection) {
      throw new NotFoundError('Connection not found');
    }

    // Delete connection
    const { error } = await this.supabase
      .from('user_connections')
      .delete()
      .eq('id', connection.id);

    if (error) {
      logger.error('Failed to unfollow user', {
        error: error.message,
        userId,
        targetUserId,
        requestId,
      });
      throw new ValidationError('Failed to unfollow user', error);
    }

    logger.info('User unfollowed', {
      userId,
      unfollowedUserId: targetUserId,
      requestId,
    });
  }

  /**
   * Get user's followers
   */
  async getFollowers(
    userId: string,
    pagination: PaginationParams,
    requestId: string
  ): Promise<{ connections: ConnectionWithUser[]; metadata: PaginationMetadata }> {
    const { offset, limit } = buildPagination(
      pagination.page,
      pagination.limit
    );

    const { data, error, count } = await this.supabase
      .from('user_connections')
      .select(
        `
        *,
        user:user_profiles!user_id(id, full_name, avatar_url, username)
      `,
        { count: 'exact' }
      )
      .eq('connected_user_id', userId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to get followers', {
        error: error.message,
        userId,
        requestId,
      });
      throw new ValidationError('Failed to get followers', error);
    }

    const connections = (data || []) as ConnectionWithUser[];

    return {
      connections,
      metadata: {
        page: pagination.page,
        limit: pagination.limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / pagination.limit),
        has_more: offset + connections.length < (count || 0),
      },
    };
  }

  /**
   * Get users that the user is following
   */
  async getFollowing(
    userId: string,
    pagination: PaginationParams,
    requestId: string
  ): Promise<{ connections: ConnectionWithUser[]; metadata: PaginationMetadata }> {
    const { offset, limit } = buildPagination(
      pagination.page,
      pagination.limit
    );

    const { data, error, count } = await this.supabase
      .from('user_connections')
      .select(
        `
        *,
        user:user_profiles!connected_user_id(id, full_name, avatar_url, username)
      `,
        { count: 'exact' }
      )
      .eq('user_id', userId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to get following', {
        error: error.message,
        userId,
        requestId,
      });
      throw new ValidationError('Failed to get following', error);
    }

    const connections = (data || []) as ConnectionWithUser[];

    return {
      connections,
      metadata: {
        page: pagination.page,
        limit: pagination.limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / pagination.limit),
        has_more: offset + connections.length < (count || 0),
      },
    };
  }

  /**
   * Check if user is following another user
   */
  async isFollowing(
    userId: string,
    targetUserId: string,
    requestId: string
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('user_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('connected_user_id', targetUserId)
      .eq('status', 'accepted')
      .single();

    return !!data;
  }

  /**
   * Block a user
   */
  async blockUser(
    userId: string,
    blockData: BlockRequest,
    requestId: string
  ): Promise<Block> {
    // Cannot block yourself
    if (userId === blockData.blocked_user_id) {
      throw new ValidationError('You cannot block yourself');
    }

    // Check if target user exists
    const { data: targetUser, error: userError } = await this.supabase
      .from('user_profiles')
      .select('id')
      .eq('id', blockData.blocked_user_id)
      .single();

    if (userError || !targetUser) {
      throw new NotFoundError('User', ERROR_CODES.USER_NOT_FOUND);
    }

    // Check if already blocked
    const { data: existing } = await this.supabase
      .from('blocked_users')
      .select('*')
      .eq('blocker_id', userId)
      .eq('blocked_user_id', blockData.blocked_user_id)
      .single();

    if (existing) {
      throw new ConflictError(
        'You have already blocked this user',
        ERROR_CODES.ALREADY_BLOCKED
      );
    }

    // Remove existing connection if any
    await this.supabase
      .from('user_connections')
      .delete()
      .or(
        `and(user_id.eq.${userId},connected_user_id.eq.${blockData.blocked_user_id}),and(user_id.eq.${blockData.blocked_user_id},connected_user_id.eq.${userId})`
      );

    // Create block
    const { data, error } = await this.supabase
      .from('blocked_users')
      .insert({
        blocker_id: userId,
        blocked_user_id: blockData.blocked_user_id,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to block user', {
        error: error.message,
        userId,
        blockedUserId: blockData.blocked_user_id,
        requestId,
      });
      throw new ValidationError('Failed to block user', error);
    }

    logger.info('User blocked', {
      userId,
      blockedUserId: blockData.blocked_user_id,
      requestId,
    });

    return data as Block;
  }

  /**
   * Unblock a user
   */
  async unblockUser(
    userId: string,
    blockedUserId: string,
    requestId: string
  ): Promise<void> {
    // Get block
    const { data: block, error: fetchError } = await this.supabase
      .from('blocked_users')
      .select('*')
      .eq('blocker_id', userId)
      .eq('blocked_user_id', blockedUserId)
      .single();

    if (fetchError || !block) {
      throw new NotFoundError('Block not found');
    }

    // Delete block
    const { error } = await this.supabase
      .from('blocked_users')
      .delete()
      .eq('id', block.id);

    if (error) {
      logger.error('Failed to unblock user', {
        error: error.message,
        userId,
        blockedUserId,
        requestId,
      });
      throw new ValidationError('Failed to unblock user', error);
    }

    logger.info('User unblocked', {
      userId,
      unblockedUserId: blockedUserId,
      requestId,
    });
  }

  /**
   * Get blocked users
   */
  async getBlockedUsers(
    userId: string,
    pagination: PaginationParams,
    requestId: string
  ): Promise<{ blocks: any[]; metadata: PaginationMetadata }> {
    const { offset, limit } = buildPagination(
      pagination.page,
      pagination.limit
    );

    const { data, error, count } = await this.supabase
      .from('blocked_users')
      .select(
        `
        *,
        blocked_user:user_profiles!blocked_user_id(id, full_name, avatar_url, username)
      `,
        { count: 'exact' }
      )
      .eq('blocker_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to get blocked users', {
        error: error.message,
        userId,
        requestId,
      });
      throw new ValidationError('Failed to get blocked users', error);
    }

    return {
      blocks: data || [],
      metadata: {
        page: pagination.page,
        limit: pagination.limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / pagination.limit),
        has_more: offset + (data?.length || 0) < (count || 0),
      },
    };
  }

  /**
   * Check if user is blocked
   */
  async isBlocked(
    userId: string,
    targetUserId: string,
    requestId: string
  ): Promise<boolean> {
    const { data } = await this.supabase
      .from('blocked_users')
      .select('id')
      .or(
        `and(blocker_id.eq.${userId},blocked_user_id.eq.${targetUserId}),and(blocker_id.eq.${targetUserId},blocked_user_id.eq.${userId})`
      )
      .single();

    return !!data;
  }
}
