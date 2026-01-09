import config from '@/config';
import assignmentRoutes from '@/routes/assignments';
import healthRoutes from '@/routes/health';
import schedulerRoutes from '@/routes/scheduler';
import trackingRoutes from '@/routes/tracking';
import websocketRoutes from '@/routes/websocket';
import { webSocketService } from '@/services/websocket';
import logger from '@/utils/logger';
import { schedulerService } from '@/utils/scheduler';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createServer } from 'http';

// Create Express application
const app = express();
const server = createServer(app);

// Initialize WebSocket server
webSocketService.initialize(server);

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin:
      config.nodeEnv === 'development'
        ? true
        : ['https://giga-platform.com', 'https://api.giga-platform.com'],
    credentials: true,
  })
);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check routes (no authentication required)
app.use('/', healthRoutes);

// API routes
app.use('/api/v1', trackingRoutes);
app.use('/api/v1', assignmentRoutes);
app.use('/api/v1', websocketRoutes);
app.use('/api/v1', schedulerRoutes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      service: 'delivery-service',
      version: '1.0.0',
      description: 'Delivery and logistics service for Giga platform',
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
    },
    metadata: {
      timestamp: new Date().toISOString(),
      request_id: 'root-endpoint',
      version: '1.0.0',
    },
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: 'Route not found',
    },
    metadata: {
      timestamp: new Date().toISOString(),
      request_id: 'not-found',
      version: '1.0.0',
    },
  });
});

// Global error handler
app.use(
  (error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Request error', { error: error.message });

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: config.nodeEnv === 'production' ? 'Internal server error' : error.message,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: 'error',
        version: '1.0.0',
      },
    });
  }
);

// Start server
const httpServer = server.listen(config.port, () => {
  logger.info('Delivery service started', {
    port: config.port,
    environment: config.nodeEnv,
    version: '1.0.0',
    websocket: 'enabled',
    timestamp: new Date().toISOString(),
  });

  // Start scheduled tasks
  schedulerService.start();
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown`);

  // Stop scheduled tasks
  schedulerService.stop();

  httpServer.close(err => {
    if (err) {
      logger.error('Error during server shutdown', { error: err.message });
      process.exit(1);
    }

    logger.info('Server closed successfully');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
