import { Response, Router } from 'express';
import { TenantRequest, checkQuota, requireFeature } from '../middleware/tenant-auth';
import { createTenantDatabase } from '../utils/tenant-database';

/**
 * SaaS Builder Pattern: Tenant-Aware Social Posts API
 *
 * This demonstrates how to build multi-tenant APIs with:
 * - Automatic tenant isolation
 * - Feature gating based on subscription plans
 * - Usage quota enforcement
 * - Billing event tracking
 */
const router = Router();

// Logger utility (same as your existing one)
const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(
      JSON.stringify({ level: 'info', message, ...meta, timestamp: new Date().toISOString() })
    );
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    console.error(
      JSON.stringify({ level: 'error', message, ...meta, timestamp: new Date().toISOString() })
    );
  },
};

/**
 * GET /api/v1/tenant/posts
 * Get posts for the current tenant with automatic tenant isolation
 */
router.get('/posts', async (req: TenantRequest, res: Response) => {
  try {
    const { limit = '20', offset = '0', visibility, user_id } = req.query;

    if (!req.tenant) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_CONTEXT',
          message: 'Tenant context is required',
        },
      });
    }

    // Create tenant-scoped database instance
    const tenantDb = createTenantDatabase(req.app.locals.supabase, req.tenant.id);

    // Get posts with automatic tenant filtering
    const posts = await tenantDb.getPosts({
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
      visibility: visibility as any,
      userId: user_id as string,
    });

    res.json({
      success: true,
      data: posts,
      metadata: {
        timestamp: new Date().toISOString(),
        service: 'social-service',
        tenant_id: req.tenant.id,
        tenant_plan: req.tenant.plan,
      },
    });
  } catch (error) {
    logger.error('Get tenant posts error', {
      tenant_id: req.tenant?.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'GET_POSTS_ERROR',
        message: 'Failed to get posts',
      },
    });
  }
});

/**
 * POST /api/v1/tenant/posts
 * Create a new post with feature gating and quota enforcement
 */
router.post(
  '/posts',
  requireFeature('basic_posts'), // ✅ Feature gating
  checkQuota('posts_per_month'), // ✅ Quota enforcement
  async (req: TenantRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required',
          },
        });
      }

      if (!req.tenant) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_TENANT_CONTEXT',
            message: 'Tenant context is required',
          },
        });
      }

      const { content, media_urls, visibility = 'public' } = req.body;

      if (!content) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Content is required',
          },
        });
      }

      // Check if media posts are allowed for this tenant
      if (media_urls && media_urls.length > 0) {
        if (!req.tenant.features.includes('media_posts')) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FEATURE_NOT_AVAILABLE',
              message: 'Media posts are not available on your current plan',
              details: {
                current_plan: req.tenant.plan,
                required_feature: 'media_posts',
                upgrade_url: '/billing/upgrade?feature=media_posts',
              },
            },
          });
        }
      }

      // Create tenant-scoped database instance
      const tenantDb = createTenantDatabase(req.app.locals.supabase, req.tenant.id);

      // Create post with automatic tenant scoping and usage tracking
      const post = await tenantDb.createPost({
        userId: req.user.id,
        content,
        mediaUrls: media_urls,
        visibility,
      });

      logger.info('Post created', {
        tenant_id: req.tenant.id,
        user_id: req.user.id,
        post_id: post.id,
        has_media: !!(media_urls && media_urls.length > 0),
      });

      res.status(201).json({
        success: true,
        data: post,
        metadata: {
          timestamp: new Date().toISOString(),
          service: 'social-service',
          tenant_id: req.tenant.id,
          usage_tracked: true,
        },
      });
    } catch (error) {
      logger.error('Create post error', {
        tenant_id: req.tenant?.id,
        user_id: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_POST_ERROR',
          message: 'Failed to create post',
        },
      });
    }
  }
);

/**
 * GET /api/v1/tenant/posts/:postId
 * Get a specific post with tenant validation
 */
router.get('/posts/:postId', async (req: TenantRequest, res: Response) => {
  try {
    const { postId } = req.params;

    if (!req.tenant) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_CONTEXT',
          message: 'Tenant context is required',
        },
      });
    }

    // Create tenant-scoped database instance
    const tenantDb = createTenantDatabase(req.app.locals.supabase, req.tenant.id);

    // Get post with automatic tenant validation
    const post = await tenantDb.getPost(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'POST_NOT_FOUND',
          message: 'Post not found or access denied',
        },
      });
    }

    res.json({
      success: true,
      data: post,
      metadata: {
        timestamp: new Date().toISOString(),
        service: 'social-service',
        tenant_id: req.tenant.id,
      },
    });
  } catch (error) {
    logger.error('Get post error', {
      tenant_id: req.tenant?.id,
      post_id: req.params.postId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'GET_POST_ERROR',
        message: 'Failed to get post',
      },
    });
  }
});

/**
 * GET /api/v1/tenant/posts/:postId/comments
 * Get comments for a post with tenant isolation
 */
router.get('/posts/:postId/comments', async (req: TenantRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const { limit = '20', offset = '0' } = req.query;

    if (!req.tenant) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_CONTEXT',
          message: 'Tenant context is required',
        },
      });
    }

    // Create tenant-scoped database instance
    const tenantDb = createTenantDatabase(req.app.locals.supabase, req.tenant.id);

    // Get comments with automatic tenant validation
    const comments = await tenantDb.getComments(postId, {
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    });

    res.json({
      success: true,
      data: comments,
      metadata: {
        timestamp: new Date().toISOString(),
        service: 'social-service',
        tenant_id: req.tenant.id,
      },
    });
  } catch (error) {
    logger.error('Get comments error', {
      tenant_id: req.tenant?.id,
      post_id: req.params.postId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'GET_COMMENTS_ERROR',
        message: 'Failed to get comments',
      },
    });
  }
});

/**
 * POST /api/v1/tenant/posts/:postId/comments
 * Create a comment with feature gating
 */
router.post(
  '/posts/:postId/comments',
  requireFeature('comments'), // ✅ Feature gating
  async (req: TenantRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required',
          },
        });
      }

      if (!req.tenant) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_TENANT_CONTEXT',
            message: 'Tenant context is required',
          },
        });
      }

      const { postId } = req.params;
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Content is required',
          },
        });
      }

      // Create tenant-scoped database instance
      const tenantDb = createTenantDatabase(req.app.locals.supabase, req.tenant.id);

      // Create comment with automatic tenant scoping and usage tracking
      const comment = await tenantDb.createComment({
        postId,
        userId: req.user.id,
        content,
      });

      res.status(201).json({
        success: true,
        data: comment,
        metadata: {
          timestamp: new Date().toISOString(),
          service: 'social-service',
          tenant_id: req.tenant.id,
          usage_tracked: true,
        },
      });
    } catch (error) {
      logger.error('Create comment error', {
        tenant_id: req.tenant?.id,
        user_id: req.user?.id,
        post_id: req.params.postId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_COMMENT_ERROR',
          message: 'Failed to create comment',
        },
      });
    }
  }
);

/**
 * POST /api/v1/tenant/posts/:postId/like
 * Like/unlike a post with feature gating
 */
router.post(
  '/posts/:postId/like',
  requireFeature('likes'), // ✅ Feature gating
  async (req: TenantRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required',
          },
        });
      }

      if (!req.tenant) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_TENANT_CONTEXT',
            message: 'Tenant context is required',
          },
        });
      }

      const { postId } = req.params;

      // Create tenant-scoped database instance
      const tenantDb = createTenantDatabase(req.app.locals.supabase, req.tenant.id);

      // Toggle like with automatic tenant validation and usage tracking
      const result = await tenantDb.toggleLike(postId, req.user.id);

      res.json({
        success: true,
        data: result,
        metadata: {
          timestamp: new Date().toISOString(),
          service: 'social-service',
          tenant_id: req.tenant.id,
          usage_tracked: result.liked, // Only track when liking, not unliking
        },
      });
    } catch (error) {
      logger.error('Toggle like error', {
        tenant_id: req.tenant?.id,
        user_id: req.user?.id,
        post_id: req.params.postId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'TOGGLE_LIKE_ERROR',
          message: 'Failed to toggle like',
        },
      });
    }
  }
);

/**
 * GET /api/v1/tenant/usage
 * Get usage statistics for billing (admin/analytics feature)
 */
router.get(
  '/usage',
  requireFeature('analytics'), // ✅ Feature gating for analytics
  async (req: TenantRequest, res: Response) => {
    try {
      if (!req.tenant) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_TENANT_CONTEXT',
            message: 'Tenant context is required',
          },
        });
      }

      const { start_date, end_date } = req.query;

      // Default to current month if no dates provided
      const startDate = start_date
        ? new Date(start_date as string)
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

      const endDate = end_date ? new Date(end_date as string) : new Date();

      // Create tenant-scoped database instance
      const tenantDb = createTenantDatabase(req.app.locals.supabase, req.tenant.id);

      // Get usage statistics
      const usage = await tenantDb.getUsageStats(startDate, endDate);

      res.json({
        success: true,
        data: {
          ...usage,
          period: {
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
          },
          quotas: req.tenant.quotas,
          plan: req.tenant.plan,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          service: 'social-service',
          tenant_id: req.tenant.id,
        },
      });
    } catch (error) {
      logger.error('Get usage error', {
        tenant_id: req.tenant?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'GET_USAGE_ERROR',
          message: 'Failed to get usage statistics',
        },
      });
    }
  }
);

export default router;
