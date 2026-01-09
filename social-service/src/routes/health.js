import express from 'express';
import { getCacheStats } from '../middleware/cache.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Health check endpoint
 * GET /health
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();

  try {
    const supabase = req.app.locals.supabase;

    // Test database connection
    const { data: dbTest, error: dbError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);

    const dbStatus = dbError ? 'unhealthy' : 'healthy';
    const responseTime = Date.now() - startTime;

    // Get cache statistics
    const cacheStats = getCacheStats();

    const healthData = {
      status: dbStatus === 'healthy' ? 'healthy' : 'unhealthy',
      service: 'social-service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      response_time_ms: responseTime,
      environment: process.env.NODE_ENV,
      database: {
        status: dbStatus,
        ...(dbError && { error: dbError.message }),
      },
      cache: {
        status: 'healthy',
        stats: cacheStats,
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
    };

    const statusCode = healthData.status === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      success: healthData.status === 'healthy',
      data: healthData,
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
      },
    });

    // Log health check
    logger.debug('Health check completed', {
      requestId: req.requestId,
      status: healthData.status,
      responseTime,
      dbStatus,
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error('Health check failed', {
      requestId: req.requestId,
      error: error.message,
      responseTime,
    });

    res.status(503).json({
      success: false,
      data: {
        status: 'unhealthy',
        service: 'social-service',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        response_time_ms: responseTime,
        error: error.message,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
      },
    });
  }
});

/**
 * Readiness check endpoint
 * GET /health/ready
 */
router.get('/ready', async (req, res) => {
  try {
    const supabase = req.app.locals.supabase;

    // Test database connection with a simple query
    const { error } = await supabase.from('user_profiles').select('id').limit(1);

    if (error) {
      return res.status(503).json({
        success: false,
        data: {
          ready: false,
          reason: 'Database connection failed',
          error: error.message,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          request_id: req.requestId,
          service: 'social-service',
        },
      });
    }

    res.json({
      success: true,
      data: {
        ready: true,
        service: 'social-service',
        timestamp: new Date().toISOString(),
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
      },
    });
  } catch (error) {
    logger.error('Readiness check failed', {
      requestId: req.requestId,
      error: error.message,
    });

    res.status(503).json({
      success: false,
      data: {
        ready: false,
        reason: 'Service error',
        error: error.message,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
        service: 'social-service',
      },
    });
  }
});

/**
 * Liveness check endpoint
 * GET /health/live
 */
router.get('/live', (req, res) => {
  res.json({
    success: true,
    data: {
      alive: true,
      service: 'social-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    metadata: {
      timestamp: new Date().toISOString(),
      request_id: req.requestId,
      service: 'social-service',
    },
  });
});

export default router;
