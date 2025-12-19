import express from 'express';
import { serviceRegistry } from '../services/serviceRegistry.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Basic health check
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
    },
  });
});

// Detailed health check with service status
router.get('/detailed', async (req, res) => {
  try {
    const serviceHealth = await serviceRegistry.checkAllServicesHealth();
    const overallHealth = Object.values(serviceHealth).every(status => status.healthy);

    res.status(overallHealth ? 200 : 503).json({
      success: overallHealth,
      data: {
        status: overallHealth ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        services: serviceHealth,
        memory: {
          used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
          total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
        },
      },
    });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Unable to perform health check',
      },
    });
  }
});

// Readiness probe
router.get('/ready', async (req, res) => {
  try {
    const isReady = await serviceRegistry.isReady();

    if (isReady) {
      res.json({
        success: true,
        data: { status: 'ready' },
      });
    } else {
      res.status(503).json({
        success: false,
        error: {
          code: 'NOT_READY',
          message: 'Service registry not ready',
        },
      });
    }
  } catch (error) {
    logger.error('Readiness check failed', { error: error.message });
    res.status(503).json({
      success: false,
      error: {
        code: 'READINESS_CHECK_FAILED',
        message: 'Unable to perform readiness check',
      },
    });
  }
});

// Liveness probe
router.get('/live', (req, res) => {
  res.json({
    success: true,
    data: { status: 'alive' },
  });
});

export { router as healthRouter };
