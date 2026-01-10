/**
 * Story Service
 * Business logic for story operations (24-hour expiring content)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  CreateStoryRequest,
  Story,
  StoryWithUser,
  StoryView,
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

export class StoryService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new story
   */
  async createStory(
    userId: string,
    storyData: CreateStoryRequest,
    requestId: string
  ): Promise<Story> {
    // Validation
    if (!storyData.media_url || storyData.media_url.trim().length === 0) {
      throw new ValidationError('Media URL is required for stories');
    }

    const validMediaTypes = ['image', 'video'];
    if (!validMediaTypes.includes(storyData.media_type)) {
      throw new ValidationError('Media type must be either "image" or "video"');
    }

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setHours(
      expiresAt.getHours() + config.social.storyExpirationHours
    );

    // Create story
    const { data, error } = await this.supabase
      .from('stories')
      .insert({
        user_id: userId,
        media_url: storyData.media_url.trim(),
        media_type: storyData.media_type,
        duration: storyData.duration || (storyData.media_type === 'image' ? 5 : 15),
        background_color: storyData.background_color || null,
        text_overlay: storyData.text_overlay || null,
        viewers_list: storyData.viewers_list || [],
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create story', {
        error: error.message,
        userId,
        requestId,
      });
      throw new ValidationError('Failed to create story', error);
    }

    logger.info('Story created', {
      storyId: data.id,
      userId,
      mediaType: storyData.media_type,
      requestId,
    });

    return data as Story;
  }

  /**
   * Get active stories from user's network
   */
  async getNetworkStories(
    userId: string,
    requestId: string
  ): Promise<StoryWithUser[]> {
    // Get user's connections (friends/following)
    const { data: connections } = await this.supabase
      .from('user_connections')
      .select('connected_user_id')
      .eq('user_id', userId)
      .eq('status', 'accepted');

    const connectedUserIds = connections?.map((c) => c.connected_user_id) || [];
    connectedUserIds.push(userId); // Include own stories

    if (connectedUserIds.length === 0) {
      return [];
    }

    // Get active stories (not expired)
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('stories')
      .select(
        `
        *,
        user:user_profiles!user_id(id, full_name, avatar_url, username)
      `
      )
      .in('user_id', connectedUserIds)
      .gt('expires_at', now)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to get network stories', {
        error: error.message,
        userId,
        requestId,
      });
      throw new ValidationError('Failed to get stories', error);
    }

    const stories = (data || []) as StoryWithUser[];

    // Check which stories the user has viewed
    if (stories.length > 0) {
      const storyIds = stories.map((s) => s.id);
      const { data: viewedStories } = await this.supabase
        .from('story_views')
        .select('story_id')
        .in('story_id', storyIds)
        .eq('viewer_id', userId);

      const viewedStoryIds = new Set(
        viewedStories?.map((v) => v.story_id) || []
      );
      stories.forEach((story) => {
        story.has_viewed = viewedStoryIds.has(story.id);
      });
    }

    // Group stories by user
    const groupedStories = this.groupStoriesByUser(stories);

    return groupedStories;
  }

  /**
   * Get a specific story by ID
   */
  async getStoryById(
    storyId: string,
    currentUserId: string,
    requestId: string
  ): Promise<StoryWithUser> {
    const { data, error } = await this.supabase
      .from('stories')
      .select(
        `
        *,
        user:user_profiles!user_id(id, full_name, avatar_url, username)
      `
      )
      .eq('id', storyId)
      .single();

    if (error || !data) {
      throw new NotFoundError('Story', ERROR_CODES.STORY_NOT_FOUND);
    }

    const story = data as StoryWithUser;

    // Check if story has expired
    const now = new Date();
    const expiresAt = new Date(story.expires_at);
    if (now > expiresAt) {
      throw new NotFoundError('Story has expired', ERROR_CODES.STORY_NOT_FOUND);
    }

    // Check access permissions
    if (story.viewers_list.length > 0 && !story.viewers_list.includes(currentUserId)) {
      if (story.user_id !== currentUserId) {
        throw new AuthorizationError(
          'You do not have permission to view this story',
          ERROR_CODES.ACCESS_DENIED
        );
      }
    }

    // Check if user has viewed this story
    const { data: viewData } = await this.supabase
      .from('story_views')
      .select('id')
      .eq('story_id', storyId)
      .eq('viewer_id', currentUserId)
      .single();

    story.has_viewed = !!viewData;

    return story;
  }

  /**
   * Get user's own stories
   */
  async getUserStories(
    userId: string,
    requestId: string
  ): Promise<StoryWithUser[]> {
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('stories')
      .select(
        `
        *,
        user:user_profiles!user_id(id, full_name, avatar_url, username)
      `
      )
      .eq('user_id', userId)
      .gt('expires_at', now)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to get user stories', {
        error: error.message,
        userId,
        requestId,
      });
      throw new ValidationError('Failed to get user stories', error);
    }

    return (data || []) as StoryWithUser[];
  }

  /**
   * Record a story view
   */
  async recordStoryView(
    storyId: string,
    viewerId: string,
    requestId: string
  ): Promise<StoryView> {
    // Check if story exists and is active
    const story = await this.getStoryById(storyId, viewerId, requestId);

    // Check if already viewed
    const { data: existingView } = await this.supabase
      .from('story_views')
      .select('*')
      .eq('story_id', storyId)
      .eq('viewer_id', viewerId)
      .single();

    if (existingView) {
      // Already viewed, return existing view
      return existingView as StoryView;
    }

    // Create new view record
    const { data, error } = await this.supabase
      .from('story_views')
      .insert({
        story_id: storyId,
        viewer_id: viewerId,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to record story view', {
        error: error.message,
        storyId,
        viewerId,
        requestId,
      });
      throw new ValidationError('Failed to record story view', error);
    }

    // Increment view count
    await this.supabase.rpc('increment_story_views', { story_id: storyId });

    logger.info('Story view recorded', {
      storyId,
      viewerId,
      requestId,
    });

    return data as StoryView;
  }

  /**
   * Get viewers of a story
   */
  async getStoryViewers(
    storyId: string,
    userId: string,
    pagination: PaginationParams,
    requestId: string
  ): Promise<{ viewers: any[]; metadata: PaginationMetadata }> {
    // Get story and verify ownership
    const { data: story, error: storyError } = await this.supabase
      .from('stories')
      .select('user_id')
      .eq('id', storyId)
      .single();

    if (storyError || !story) {
      throw new NotFoundError('Story', ERROR_CODES.STORY_NOT_FOUND);
    }

    // Only story owner can see viewers
    if (story.user_id !== userId) {
      throw new AuthorizationError(
        'You can only view your own story viewers',
        ERROR_CODES.ACCESS_DENIED
      );
    }

    const { offset, limit } = buildPagination(
      pagination.page,
      pagination.limit
    );

    const { data, error, count } = await this.supabase
      .from('story_views')
      .select(
        `
        *,
        viewer:user_profiles!viewer_id(id, full_name, avatar_url, username)
      `,
        { count: 'exact' }
      )
      .eq('story_id', storyId)
      .order('viewed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to get story viewers', {
        error: error.message,
        storyId,
        requestId,
      });
      throw new ValidationError('Failed to get story viewers', error);
    }

    return {
      viewers: data || [],
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
   * Delete a story
   */
  async deleteStory(
    storyId: string,
    userId: string,
    requestId: string
  ): Promise<void> {
    // Get story and verify ownership
    const { data: story, error: fetchError } = await this.supabase
      .from('stories')
      .select('user_id')
      .eq('id', storyId)
      .single();

    if (fetchError || !story) {
      throw new NotFoundError('Story', ERROR_CODES.STORY_NOT_FOUND);
    }

    if (story.user_id !== userId) {
      throw new AuthorizationError(
        'You can only delete your own stories',
        ERROR_CODES.ACCESS_DENIED
      );
    }

    // Delete story
    const { error } = await this.supabase
      .from('stories')
      .delete()
      .eq('id', storyId);

    if (error) {
      logger.error('Failed to delete story', {
        error: error.message,
        storyId,
        userId,
        requestId,
      });
      throw new ValidationError('Failed to delete story', error);
    }

    logger.info('Story deleted', {
      storyId,
      userId,
      requestId,
    });
  }

  /**
   * Group stories by user (for carousel display)
   */
  private groupStoriesByUser(stories: StoryWithUser[]): StoryWithUser[] {
    // This returns stories but could be enhanced to group by user
    // For now, return as-is and let frontend handle grouping
    return stories;
  }
}
