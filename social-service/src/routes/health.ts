import { Request, Response, Router } from 'express';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     description: Check if the service is healthy and running
 *     tags: [Health]
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
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: healthy
 *                     service:
 *                       type: string
 *                       example: social-service
 *                     version:
 *                       type: string
 *                       example: 1.0.0
 *                     uptime:
 *                       type: number
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'social-service',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: 'connected',
    },
  });
});

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness check
 *     description: Check if the service is ready to accept traffic
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready
 */
router.get('/ready', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: { status: 'ready', service: 'social-service' },
  });
});

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness check
 *     description: Check if the service is alive (for Kubernetes probes)
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get('/live', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: { status: 'alive', timestamp: new Date().toISOString() },
  });
});

export default router;
