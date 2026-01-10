import { SupabaseClient } from '@supabase/supabase-js';

/**
 * SaaS Builder Pattern: Tenant-Scoped Database Operations
 *
 * This utility ensures all database operations are automatically
 * scoped to the current tenant, preventing cross-tenant data access.
 */
export class TenantDatabase {
  constructor(
    private supabase: SupabaseClient,
    private tenantId: string
  ) {}

  /**
   * Create a tenant-scoped primary key
   * Format: ${tenantId}#${entityType}#${id}
   */
  private createTenantKey(entityType: string, id: string): string {
    return `${this.tenantId}#${entityType}#${id}`;
  }

  /**
   * Extract entity ID from tenant-scoped key
   */
  private extractEntityId(tenantKey: string): string {
    const parts = tenantKey.split('#');
    return parts[parts.length - 1];
  }

  /**
   * Get tenant-scoped posts with automatic tenant filtering
   */
  async getPosts(
    options: {
      limit?: number;
      offset?: number;
      visibility?: 'public' | 'private' | 'friends';
      userId?: string;
    } = {}
  ) {
    const { limit = 20, offset = 0, visibility, userId } = options;

    let query = this.supabase
      .from('social_posts_with_profiles')
      .select(
        `
        id,
        content,
        media_urls,
        visibility,
        created_at,
        user_id,
        tenant_id,
        first_name,
        last_name,
        avatar_url
      `
      )
      .eq('tenant_id', this.tenantId) // ✅ Tenant isolation
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (visibility) {
      query = query.eq('visibility', visibility);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get posts: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a new post with automatic tenant scoping
   */
  async createPost(data: {
    userId: string;
    content: string;
    mediaUrls?: string[];
    visibility?: 'public' | 'private' | 'friends';
  }) {
    // Use the database function to create the post
    const { data: posts, error } = await this.supabase.rpc('create_social_post', {
      p_user_id: data.userId,
      p_content: data.content,
      p_media_urls: data.mediaUrls || [],
      p_visibility: data.visibility || 'public',
      p_tenant_id: this.tenantId,
    });

    if (error) {
      throw new Error(`Failed to create post: ${error.message}`);
    }

    const post = posts?.[0];
    if (!post) {
      throw new Error('Failed to create post');
    }

    // Track usage for billing (SaaS Builder pattern)
    await this.trackUsage('post_created', {
      post_id: post.id,
      user_id: data.userId,
    });

    return post;
  }

  /**
   * Get a specific post with tenant validation
   */
  async getPost(postId: string) {
    const { data: post, error } = await this.supabase
      .from('social_posts_with_profiles')
      .select('*')
      .eq('id', postId)
      .eq('tenant_id', this.tenantId) // ✅ Tenant validation
      .is('deleted_at', null)
      .single();

    if (error || !post) {
      return null;
    }

    return post;
  }

  /**
   * Get comments for a post with tenant scoping
   */
  async getComments(postId: string, options: { limit?: number; offset?: number } = {}) {
    const { limit = 20, offset = 0 } = options;

    // First verify the post belongs to this tenant
    const post = await this.getPost(postId);
    if (!post) {
      throw new Error('Post not found or access denied');
    }

    const { data, error } = await this.supabase
      .from('post_comments_with_profiles')
      .select(
        `
        id,
        content,
        created_at,
        user_id,
        tenant_id,
        first_name,
        last_name,
        avatar_url
      `
      )
      .eq('post_id', postId)
      .eq('tenant_id', this.tenantId) // ✅ Tenant isolation
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to get comments: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a comment with tenant scoping
   */
  async createComment(data: { postId: string; userId: string; content: string }) {
    // Verify post exists and belongs to tenant
    const post = await this.getPost(data.postId);
    if (!post) {
      throw new Error('Post not found or access denied');
    }

    // Use the database function to create the comment
    const { data: comments, error } = await this.supabase.rpc('create_post_comment', {
      p_post_id: data.postId,
      p_user_id: data.userId,
      p_content: data.content,
      p_tenant_id: this.tenantId,
    });

    if (error) {
      throw new Error(`Failed to create comment: ${error.message}`);
    }

    const comment = comments?.[0];
    if (!comment) {
      throw new Error('Failed to create comment');
    }

    // Track usage for billing
    await this.trackUsage('comment_created', {
      comment_id: comment.id,
      post_id: data.postId,
      user_id: data.userId,
    });

    return comment;
  }

  /**
   * Like/unlike a post with tenant validation
   */
  async toggleLike(postId: string, userId: string): Promise<{ liked: boolean }> {
    // Verify post exists and belongs to tenant
    const post = await this.getPost(postId);
    if (!post) {
      throw new Error('Post not found or access denied');
    }

    // Use the database function to toggle like
    const { data: result, error } = await this.supabase.rpc('toggle_post_like', {
      p_post_id: postId,
      p_user_id: userId,
      p_tenant_id: this.tenantId,
    });

    if (error) {
      throw new Error(`Failed to toggle like: ${error.message}`);
    }

    const liked = result?.[0]?.liked ?? false;

    if (liked) {
      // Track usage for billing only when liking
      await this.trackUsage('post_liked', {
        post_id: postId,
        user_id: userId,
      });
    }

    return { liked };
  }

  /**
   * Track usage events for billing (SaaS Builder pattern)
   */
  private async trackUsage(eventType: string, metadata: Record<string, any>) {
    try {
      // In production, this would publish to EventBridge or similar
      // For demo, we'll just log it
      console.log(
        JSON.stringify({
          event_type: eventType,
          tenant_id: this.tenantId,
          timestamp: new Date().toISOString(),
          metadata,
        })
      );

      // You could also store in a usage tracking table:
      // await this.supabase.from('usage_events').insert({
      //   tenant_id: this.tenantId,
      //   event_type: eventType,
      //   metadata,
      //   created_at: new Date().toISOString(),
      // });
    } catch (error) {
      // Don't fail the main operation if usage tracking fails
      console.error('Failed to track usage:', error);
    }
  }

  /**
   * Get tenant usage statistics for billing
   */
  async getUsageStats(startDate: Date, endDate: Date) {
    // In production, query usage_events table
    // For demo, return mock data
    return {
      posts_created: Math.floor(Math.random() * 100),
      comments_created: Math.floor(Math.random() * 200),
      likes_given: Math.floor(Math.random() * 500),
      storage_used_mb: Math.floor(Math.random() * 1000),
    };
  }
}

/**
 * Factory function to create tenant-scoped database instance
 */
export function createTenantDatabase(supabase: SupabaseClient, tenantId: string): TenantDatabase {
  return new TenantDatabase(supabase, tenantId);
}
