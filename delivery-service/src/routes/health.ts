import { database } from '@/utils/database';
import logger from '@/utils/logger';
import { Request, Response, Router } from 'express';

const router = Router();

/**
 * Basic health check endpoint
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
 * Readiness check endpoint
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
 * Liveness check endpoint
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
 * System metrics endpoint
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
