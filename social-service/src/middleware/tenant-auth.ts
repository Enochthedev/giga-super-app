import { NextFunction, Request, Response } from 'express';

// Extended Request interface with tenant context
export interface TenantRequest extends Request {
  tenant?: {
    id: string;
    name: string;
    plan: 'trial' | 'basic' | 'premium' | 'enterprise';
    features: string[];
    quotas: {
      posts_per_month: number;
      storage_mb: number;
    };
  };
}

/**
 * SaaS Builder Pattern: Tenant Context Middleware
 *
 * This middleware extracts tenant information from JWT claims
 * and adds it to the request context. In a production SaaS app,
 * this would be handled by a Lambda authorizer.
 */
export const tenantAuthMiddleware = (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    // In production, this would come from Lambda authorizer
    // For demo, we'll extract from headers (simulating API Gateway)
    const tenantId = req.headers['x-tenant-id'] as string;
    const tenantName = req.headers['x-tenant-name'] as string;
    const tenantPlan = req.headers['x-tenant-plan'] as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_CONTEXT',
          message: 'Tenant context is required for this operation',
        },
      });
    }

    // Set tenant context (in production, this comes from JWT claims)
    req.tenant = {
      id: tenantId,
      name: tenantName || 'Unknown Tenant',
      plan: (tenantPlan as any) || 'trial',
      features: getTenantFeatures(tenantPlan as any),
      quotas: getTenantQuotas(tenantPlan as any),
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'TENANT_AUTH_ERROR',
        message: 'Failed to authenticate tenant context',
      },
    });
  }
};

/**
 * Get features available for a tenant plan
 */
function getTenantFeatures(plan: string): string[] {
  const featureMap = {
    trial: ['basic_posts', 'comments'],
    basic: ['basic_posts', 'comments', 'likes'],
    premium: ['basic_posts', 'comments', 'likes', 'media_posts', 'analytics'],
    enterprise: [
      'basic_posts',
      'comments',
      'likes',
      'media_posts',
      'analytics',
      'custom_branding',
      'api_access',
    ],
  };

  return featureMap[plan as keyof typeof featureMap] || featureMap.trial;
}

/**
 * Get quotas for a tenant plan
 */
function getTenantQuotas(plan: string): { posts_per_month: number; storage_mb: number } {
  const quotaMap = {
    trial: { posts_per_month: 10, storage_mb: 100 },
    basic: { posts_per_month: 100, storage_mb: 1000 },
    premium: { posts_per_month: 1000, storage_mb: 10000 },
    enterprise: { posts_per_month: -1, storage_mb: -1 }, // unlimited
  };

  return quotaMap[plan as keyof typeof quotaMap] || quotaMap.trial;
}

/**
 * Check if tenant has access to a specific feature
 */
export const requireFeature = (feature: string) => {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    if (!req.tenant?.features.includes(feature)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FEATURE_NOT_AVAILABLE',
          message: `Feature '${feature}' is not available on your current plan`,
          details: {
            current_plan: req.tenant?.plan,
            required_feature: feature,
            upgrade_url: `/billing/upgrade?feature=${feature}`,
          },
        },
      });
    }
    next();
  };
};

/**
 * Check quota usage before allowing operation
 */
export const checkQuota = (quotaType: 'posts_per_month' | 'storage_mb') => {
  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.tenant) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_TENANT_CONTEXT',
            message: 'Tenant context required for quota check',
          },
        });
      }

      const quota = req.tenant.quotas[quotaType];

      // Unlimited quota (enterprise plan)
      if (quota === -1) {
        return next();
      }

      // TODO: In production, check actual usage from database
      // For demo, we'll simulate quota check
      const currentUsage = await getCurrentUsage(req.tenant.id, quotaType);

      if (currentUsage >= quota) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'QUOTA_EXCEEDED',
            message: `You have exceeded your ${quotaType} quota`,
            details: {
              quota,
              current_usage: currentUsage,
              upgrade_url: '/billing/upgrade',
            },
          },
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'QUOTA_CHECK_ERROR',
          message: 'Failed to check quota',
        },
      });
    }
  };
};

/**
 * Simulate getting current usage (in production, query from database)
 */
async function getCurrentUsage(tenantId: string, quotaType: string): Promise<number> {
  // In production, this would query your database:
  // SELECT COUNT(*) FROM social_posts WHERE tenant_id = ? AND created_at >= start_of_month

  // For demo, return a simulated value
  return Math.floor(Math.random() * 50);
}
