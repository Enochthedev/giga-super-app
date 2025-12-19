import express from 'express';
import { circuitBreakerManager } from '../services/circuitBreaker.js';
import { serviceRegistry } from '../services/serviceRegistry.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Admin middleware - require admin role
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Admin access required',
      },
    });
  }
  next();
};

// Service registry status
router.get('/services', requireAdmin, async (req, res) => {
  try {
    const stats = await serviceRegistry.getServiceStats();

    res.json({
      success: true,
      data: stats,
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.id,
        version: '1.0.0',
      },
    });
  } catch (error) {
    logger.error('Failed to get service stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVICE_STATS_ERROR',
        message: 'Failed to retrieve service statistics',
      },
    });
  }
});

// Circuit breaker status
router.get('/circuit-breakers', requireAdmin, (req, res) => {
  try {
    const stats = circuitBreakerManager.getAllStats();

    res.json({
      success: true,
      data: {
        circuitBreakers: stats,
        healthyServices: circuitBreakerManager.getHealthyServices(),
        unhealthyServices: circuitBreakerManager.getUnhealthyServices(),
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.id,
        version: '1.0.0',
      },
    });
  } catch (error) {
    logger.error('Failed to get circuit breaker stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'CIRCUIT_BREAKER_STATS_ERROR',
        message: 'Failed to retrieve circuit breaker statistics',
      },
    });
  }
});

// Reset circuit breaker
router.post('/circuit-breakers/:serviceId/reset', requireAdmin, (req, res) => {
  try {
    const { serviceId } = req.params;
    const breaker = circuitBreakerManager.getBreaker(serviceId);

    breaker.reset();

    logger.info('Circuit breaker reset', {
      serviceId,
      adminUser: req.user.id,
      requestId: req.id,
    });

    res.json({
      success: true,
      data: {
        serviceId,
        state: breaker.getState(),
        message: 'Circuit breaker reset successfully',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.id,
        version: '1.0.0',
      },
    });
  } catch (error) {
    logger.error('Failed to reset circuit breaker', {
      serviceId: req.params.serviceId,
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'CIRCUIT_BREAKER_RESET_ERROR',
        message: 'Failed to reset circuit breaker',
      },
    });
  }
});

// Gateway metrics
router.get('/metrics', requireAdmin, (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();

    res.json({
      success: true,
      data: {
        uptime: process.uptime(),
        memory: {
          rss: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
          heapTotal: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
          heapUsed: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
          external: Math.round((memoryUsage.external / 1024 / 1024) * 100) / 100,
        },
        cpu: {
          usage: process.cpuUsage(),
        },
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        },
        services: {
          total: serviceRegistry.getServiceCount(),
          healthy: serviceRegistry.getHealthyServices().length,
          unhealthy: serviceRegistry.getUnhealthyServices().length,
        },
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.id,
        version: '1.0.0',
      },
    });
  } catch (error) {
    logger.error('Failed to get gateway metrics', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'METRICS_ERROR',
        message: 'Failed to retrieve gateway metrics',
      },
    });
  }
});

export { router as adminRouter };
// Cache management endpoints
router.get('/cache/stats', requireAdmin, (req, res) => {
  try {
    const stats = cacheUtils.getStats();

    res.json({
      success: true,
      data: stats,
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.id,
        version: '1.0.0',
      },
    });
  } catch (error) {
    logger.error('Failed to get cache stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'CACHE_STATS_ERROR',
        message: 'Failed to retrieve cache statistics',
      },
    });
  }
});

// Clear cache by pattern
router.delete('/cache/pattern/:pattern', requireAdmin, (req, res) => {
  try {
    const { pattern } = req.params;
    const keysCleared = cacheUtils.clearPattern(pattern);

    logger.info('Cache pattern cleared', {
      pattern,
      keysCleared,
      adminUser: req.user.id,
      requestId: req.id,
    });

    res.json({
      success: true,
      data: {
        pattern,
        keysCleared,
        message: `Cleared ${keysCleared} cache entries matching pattern: ${pattern}`,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.id,
        version: '1.0.0',
      },
    });
  } catch (error) {
    logger.error('Failed to clear cache pattern', {
      pattern: req.params.pattern,
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'CACHE_CLEAR_ERROR',
        message: 'Failed to clear cache pattern',
      },
    });
  }
});

// Clear all cache
router.delete('/cache/all', requireAdmin, (req, res) => {
  try {
    const keysCleared = cacheUtils.clearAll();

    logger.info('All cache cleared', {
      keysCleared,
      adminUser: req.user.id,
      requestId: req.id,
    });

    res.json({
      success: true,
      data: {
        keysCleared,
        message: `Cleared all ${keysCleared} cache entries`,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.id,
        version: '1.0.0',
      },
    });
  } catch (error) {
    logger.error('Failed to clear all cache', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'CACHE_CLEAR_ALL_ERROR',
        message: 'Failed to clear all cache',
      },
    });
  }
});
