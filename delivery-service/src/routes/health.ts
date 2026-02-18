import { Request, Response, Router } from 'express';

import { database } from '../utils/database';
import logger from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Basic health check
 *     description: Returns service health status and basic information
 *     security: []
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               data:
 *                 status: healthy
 *                 timestamp: "2026-02-18T10:00:00.000Z"
 *                 service: delivery-service
 *                 version: "1.0.0"
 *                 uptime: 3600
 *                 environment: production
 *               metadata:
 *                 timestamp: "2026-02-18T10:00:00.000Z"
 *                 request_id: health-check
 *                 version: "1.0.0"
 */
router.get('/health', async (_req: Request, res: Response) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'delivery-service',
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env['NODE_ENV'] || 'development',
  };

  logger.debug('Health check requested', healthStatus);

  res.status(200).json({
    success: true,
    data: healthStatus,
    metadata: {
      timestamp: new Date().toISOString(),
      request_id: 'health-check',
      version: '1.0.0',
    },
  });
});

/**
 * @swagger
 * /ready:
 *   get:
 *     tags: [Health]
 *     summary: Readiness check
 *     description: Checks if the service is ready to accept traffic (database connectivity)
 *     security: []
 *     responses:
 *       200:
 *         description: Service is ready
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 status: ready
 *                 timestamp: "2026-02-18T10:00:00.000Z"
 *                 service: delivery-service
 *                 version: "1.0.0"
 *                 checks:
 *                   database: true
 *               metadata:
 *                 timestamp: "2026-02-18T10:00:00.000Z"
 *                 request_id: readiness-check
 *                 version: "1.0.0"
 *       503:
 *         description: Service is not ready
 *         content:
 *           application/json:
 *             example:
 *               success: false
 *               data:
 *                 status: "not ready"
 *                 checks:
 *                   database: false
 *                 errors:
 *                   - "Database connection failed"
 */
router.get('/ready', async (_req: Request, res: Response) => {
  const checks = {
    database: false,
  };

  const errors: string[] = [];

  try {
    checks.database = await database.testConnection();
    if (!checks.database) {
      errors.push('Database connection failed');
    }
  } catch (error) {
    checks.database = false;
    errors.push(`Database error: ${(error as Error).message}`);
  }

  const allHealthy = Object.values(checks).every(check => check === true);
  const status = allHealthy ? 'ready' : 'not ready';
  const statusCode = allHealthy ? 200 : 503;

  const readinessStatus = {
    status,
    timestamp: new Date().toISOString(),
    service: 'delivery-service',
    version: '1.0.0',
    checks,
    ...(errors.length > 0 && { errors }),
  };

  logger.info('Readiness check completed', {
    status,
    checks,
    errors,
  });

  res.status(statusCode).json({
    success: allHealthy,
    data: readinessStatus,
    metadata: {
      timestamp: new Date().toISOString(),
      request_id: 'readiness-check',
      version: '1.0.0',
    },
  });
});

/**
 * @swagger
 * /live:
 *   get:
 *     tags: [Health]
 *     summary: Liveness check
 *     description: Checks if the service process is alive with memory and CPU metrics
 *     security: []
 *     responses:
 *       200:
 *         description: Service is alive
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 status: alive
 *                 timestamp: "2026-02-18T10:00:00.000Z"
 *                 service: delivery-service
 *                 version: "1.0.0"
 *                 uptime: 3600
 *                 memory:
 *                   rss: 128
 *                   heapTotal: 64
 *                   heapUsed: 32
 *                   external: 8
 *                 cpu:
 *                   user: 1000000
 *                   system: 500000
 *               metadata:
 *                 timestamp: "2026-02-18T10:00:00.000Z"
 *                 request_id: liveness-check
 *                 version: "1.0.0"
 */
router.get('/live', async (_req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  const livenessStatus = {
    status: 'alive',
    timestamp: new Date().toISOString(),
    service: 'delivery-service',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      external: Math.round(memoryUsage.external / 1024 / 1024), // MB
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system,
    },
  };

  res.status(200).json({
    success: true,
    data: livenessStatus,
    metadata: {
      timestamp: new Date().toISOString(),
      request_id: 'liveness-check',
      version: '1.0.0',
    },
  });
});

/**
 * @swagger
 * /metrics:
 *   get:
 *     tags: [Health]
 *     summary: System metrics
 *     description: Returns detailed system metrics including memory, CPU, and Node.js information
 *     security: []
 *     responses:
 *       200:
 *         description: Metrics retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 timestamp: "2026-02-18T10:00:00.000Z"
 *                 service: delivery-service
 *                 version: "1.0.0"
 *                 uptime: 3600
 *                 environment: production
 *                 node:
 *                   version: "v20.10.0"
 *                   platform: linux
 *                   arch: x64
 *                 memory:
 *                   rss: 134217728
 *                   heapTotal: 67108864
 *                   heapUsed: 33554432
 *                   external: 8388608
 *                   arrayBuffers: 1048576
 *                 cpu:
 *                   user: 1000000
 *                   system: 500000
 *               metadata:
 *                 timestamp: "2026-02-18T10:00:00.000Z"
 *                 request_id: metrics-check
 *                 version: "1.0.0"
 */
router.get('/metrics', async (_req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  const metrics = {
    timestamp: new Date().toISOString(),
    service: 'delivery-service',
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env['NODE_ENV'] || 'development',
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    memory: {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers,
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system,
    },
  };

  logger.debug('Metrics requested', { metrics });

  res.status(200).json({
    success: true,
    data: metrics,
    metadata: {
      timestamp: new Date().toISOString(),
      request_id: 'metrics-check',
      version: '1.0.0',
    },
  });
});

export default router;
