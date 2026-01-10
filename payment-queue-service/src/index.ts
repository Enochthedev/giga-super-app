import compression from 'compression';
import cors from 'cors';
import express, { Application } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { config } from './config/index';
import { errorHandler } from './middleware/errorHandler';
import healthRoutes from './routes/health';
import metricsRoutes from './routes/metrics';
import v1Routes from './routes/v1';
import { testConnection } from './utils/database';
import logger from './utils/logger';

// Import workers to initialize all queues
import './queues/workers';

const app: Application = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('user-agent'),
    });
  });
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// Routes
app.use('/health', healthRoutes);
app.use('/metrics', metricsRoutes);
app.use('/api/v1', v1Routes);

// Root route
app.get('/', (req, res) => {
  res.json({
    service: 'Giga Payment Queue Service',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      metrics: '/metrics',
      api: '/api/v1',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      statusCode: 404,
    },
  });
});

// Error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.warn('Database connection failed, but server will start anyway');
    }

    app.listen(config.port, () => {
      logger.info(`Payment Queue Service started`, {
        port: config.port,
        env: config.nodeEnv,
        nodeVersion: process.version,
      });
    });
  } catch (error: any) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown`);

  // Close all workers
  const { closeAllWorkers } = await import('./queues/workers');
  await closeAllWorkers();

  // Close all queues
  const { closePaymentQueue } = await import('./queues/payment.queue');
  const { closeWebhookQueue } = await import('./queues/webhook.queue');
  const { closeRefundQueue } = await import('./queues/refund.queue');
  const { closeSettlementQueue } = await import('./queues/settlement.queue');
  const { closeNotificationQueue } = await import('./queues/notification.queue');

  await Promise.all([
    closePaymentQueue(),
    closeWebhookQueue(),
    closeRefundQueue(),
    closeSettlementQueue(),
    closeNotificationQueue(),
  ]);

  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', error => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

startServer();

export default app;
