import { Request, Response, Router } from 'express';

import { getAuthStats } from '../middleware/auth.js';
import { serviceRegistry } from '../services/serviceRegistry.js';

const router = Router();

// Basic health check
router.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
    },
  });
});

// Readiness check
router.get('/ready', (_req: Request, res: Response) => {
  const isReady = serviceRegistry.isReady();

  if (!isReady) {
    res.status(503).json({
      success: false,
      error: {
        code: 'NOT_READY',
        message: 'Service registry not initialized',
      },
    });
    return;
  }

  res.json({
    success: true,
    data: {
      status: 'ready',
      services: serviceRegistry.getServiceCount(),
      healthy: serviceRegistry.getHealthyServices().length,
      unhealthy: serviceRegistry.getUnhealthyServices().length,
    },
  });
});

// Liveness check
router.get('/live', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'alive',
      timestamp: new Date().toISOString(),
    },
  });
});

// Detailed health check with all services
router.get('/detailed', async (_req: Request, res: Response) => {
  try {
    const serviceHealth = await serviceRegistry.checkAllServicesHealth();
    const authStats = getAuthStats();

    res.json({
      success: true,
      data: {
        gateway: {
          status: 'healthy',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
        },
        services: serviceHealth,
        auth: authStats,
        circuitBreakers: serviceRegistry.getCircuitBreakerStats(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

// Service statistics
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await serviceRegistry.getServiceStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

export const healthRouter = router;
