import { Request, Response, Router } from 'express';

import { getAuthStats } from '../middleware/auth.js';
import { serviceRegistry } from '../services/serviceRegistry.js';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Basic health check
 *     description: Returns the health status of the API Gateway
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     service:
 *                       type: string
 */
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

/**
 * @openapi
 * /health/ready:
 *   get:
 *     summary: Readiness check
 *     description: Checks if the service registry is initialized
 *     responses:
 *       200:
 *         description: Service is ready
 *       503:
 *         description: Service is not ready
 */
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

/**
 * @openapi
 * /health/live:
 *   get:
 *     summary: Liveness check
 *     description: Simple check to see if the process is alive
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get('/live', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'alive',
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * @openapi
 * /health/detailed:
 *   get:
 *     summary: Detailed health check
 *     description: Checks health of all downstream services
 *     responses:
 *       200:
 *         description: Detailed health status
 */
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

/**
 * @openapi
 * /health/stats:
 *   get:
 *     summary: Service statistics
 *     description: Returns statistics about registered services
 *     responses:
 *       200:
 *         description: Service statistics
 */
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
