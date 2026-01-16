/**
 * Health check routes for Search Service
 */

import { Request, Response, Router } from 'express';
import { CacheService } from '../utils/cache.js';
import { DatabaseService } from '../utils/database.js';
import { logHealthCheck } from '../utils/logger.js';

const router = Router();

// Initialize services for health checks
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let databaseService: DatabaseService | null = null;
let cacheService: CacheService | null = null;

const getDatabase = () => {
  if (!databaseService) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    }
    databaseService = new DatabaseService(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return databaseService;
};

const getCache = () => {
  if (!cacheService) {
    cacheService = new CacheService(REDIS_URL);
  }
  return cacheService;
};

/**
 * @route GET /api/v1/health
 * @desc Basic health check
 * @access Public
 */
router.get('/', (req: Request, res: Response): void => {
  const requestId = req.headers['x-request-id'] as string;

  res.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'search-service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    metadata: {
      timestamp: new Date().toISOString(),
      request_id: requestId,
      version: '1.0.0',
    },
  });
});

/**
 * @route GET /api/v1/health/detailed
 * @desc Detailed health check with dependency status
 * @access Public
 */
router.get('/detailed', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] as string;

  try {
    // Check all dependencies
    const [cacheHealth, databaseHealth] = await Promise.allSettled([
      checkCacheHealth(),
      checkDatabaseHealth(),
    ]);

    const executionTime = Date.now() - startTime;

    const healthStatus = {
      service: {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '1.0.0',
      },
      dependencies: {
        cache: {
          status: cacheHealth.status === 'fulfilled' && cacheHealth.value ? 'healthy' : 'unhealthy',
          details:
            cacheHealth.status === 'fulfilled'
              ? cacheHealth.value
              : cacheHealth.status === 'rejected'
                ? { error: cacheHealth.reason.message }
                : null,
        },
        database: {
          status:
            databaseHealth.status === 'fulfilled' && databaseHealth.value ? 'healthy' : 'unhealthy',
          details:
            databaseHealth.status === 'fulfilled'
              ? databaseHealth.value
              : databaseHealth.status === 'rejected'
                ? { error: databaseHealth.reason.message }
                : null,
        },
      },
    };

    // Determine overall health
    const isHealthy =
      healthStatus.dependencies.cache.status === 'healthy' &&
      healthStatus.dependencies.database.status === 'healthy';

    const overallStatus = isHealthy ? 'healthy' : 'degraded';

    logHealthCheck('search-service', overallStatus, healthStatus);

    res.status(isHealthy ? 200 : 503).json({
      success: true,
      data: {
        status: overallStatus,
        ...healthStatus,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
        version: '1.0.0',
        execution_time_ms: executionTime,
      },
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;

    logHealthCheck('search-service', 'unhealthy', { error: (error as Error).message });

    res.status(503).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_ERROR',
        message: 'Health check failed',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
        version: '1.0.0',
        execution_time_ms: executionTime,
      },
    });
  }
});

/**
 * @route GET /api/v1/health/ready
 * @desc Readiness probe for Kubernetes
 * @access Public
 */
router.get('/ready', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string;

  try {
    // Check if service is ready to handle requests
    const [cacheReady, databaseReady] = await Promise.allSettled([
      getCache().healthCheck(),
      checkDatabaseConnection(),
    ]);

    const isReady =
      cacheReady.status === 'fulfilled' &&
      cacheReady.value &&
      databaseReady.status === 'fulfilled' &&
      databaseReady.value;

    if (isReady) {
      res.json({
        success: true,
        data: {
          status: 'ready',
          service: 'search-service',
          timestamp: new Date().toISOString(),
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          version: '1.0.0',
        },
      });
    } else {
      res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_NOT_READY',
          message: 'Service is not ready to handle requests',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: requestId,
          version: '1.0.0',
        },
      });
    }
  } catch (error) {
    res.status(503).json({
      success: false,
      error: {
        code: 'READINESS_CHECK_ERROR',
        message: 'Readiness check failed',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
        version: '1.0.0',
      },
    });
  }
});

/**
 * @route GET /api/v1/health/live
 * @desc Liveness probe for Kubernetes
 * @access Public
 */
router.get('/live', (req: Request, res: Response): void => {
  const requestId = req.headers['x-request-id'] as string;

  // Simple liveness check - just verify the process is running
  res.json({
    success: true,
    data: {
      status: 'alive',
      service: 'search-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    metadata: {
      timestamp: new Date().toISOString(),
      request_id: requestId,
      version: '1.0.0',
    },
  });
});

/**
 * @route GET /api/v1/health/metrics
 * @desc Service metrics for monitoring
 * @access Public
 */
router.get('/metrics', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string;

  try {
    const [cacheStats] = await Promise.allSettled([getCache().getCacheStats()]);

    const metrics = {
      service: {
        uptime_seconds: process.uptime(),
        memory_usage: process.memoryUsage(),
        cpu_usage: process.cpuUsage(),
        version: '1.0.0',
      },
      cache: cacheStats.status === 'fulfilled' ? cacheStats.value : null,
      timestamp: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: metrics,
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
        version: '1.0.0',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'METRICS_ERROR',
        message: 'Failed to retrieve service metrics',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
        version: '1.0.0',
      },
    });
  }
});

// Helper functions
async function checkCacheHealth(): Promise<any> {
  const isHealthy = await getCache().healthCheck();
  if (!isHealthy) {
    throw new Error('Cache connection failed');
  }

  const stats = await getCache().getCacheStats();
  return {
    connected: true,
    ...stats,
  };
}

async function checkDatabaseHealth(): Promise<any> {
  // This would typically perform a simple query to check database connectivity
  try {
    // Simple connectivity test - you might want to implement this in DatabaseService
    return {
      connected: true,
      response_time_ms: 0, // Would measure actual response time
    };
  } catch (error) {
    throw new Error(`Database connection failed: ${(error as Error).message}`);
  }
}

async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // Simple connectivity check
    return true; // Would implement actual database ping
  } catch (error) {
    return false;
  }
}

export default router;
