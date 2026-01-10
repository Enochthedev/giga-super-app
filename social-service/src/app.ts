/**
 * Social Service Application
 * Main Express application setup
 */

import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import config, { validateConfig } from './config';
import { requestIdMiddleware } from './middleware/requestId';
import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './utils/errors';
import logger from './utils/logger';

// Import routes
import healthRoutes from './routes/health';
import postRoutes from './routes/posts';
import commentRoutes from './routes/comments';
import likeRoutes from './routes/likes';
import feedRoutes from './routes/feed';
import storyRoutes from './routes/stories';
import shareRoutes from './routes/shares';
import connectionRoutes from './routes/connections';
import reportRoutes from './routes/reports';

/**
 * Create and configure Express application
 */
export function createApp(): Application {
  // Validate configuration
  validateConfig();

  const app = express();

  // Initialize Supabase client
  const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Store Supabase client in app locals
  app.locals.supabase = supabase;

  // Security middleware
  app.use(helmet());
  app.use(
    cors({
      origin: config.nodeEnv === 'production' ? false : '*',
      credentials: true,
    })
  );

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request ID middleware
  app.use(requestIdMiddleware);

  // Rate limiting
  app.use(generalLimiter);

  // Request logging
  app.use((req, res, next) => {
    logger.info('Incoming request', {
      method: req.method,
      path: req.path,
      requestId: (req as any).requestId,
      ip: req.ip,
    });
    next();
  });

  // Health check routes (no versioning)
  app.use('/health', healthRoutes);

  // API routes (v1)
  const API_PREFIX = '/api/v1';
  app.use(`${API_PREFIX}/posts`, postRoutes);
  app.use(`${API_PREFIX}/comments`, commentRoutes);
  app.use(`${API_PREFIX}/likes`, likeRoutes);
  app.use(`${API_PREFIX}/feed`, feedRoutes);
  app.use(`${API_PREFIX}/stories`, storyRoutes);
  app.use(`${API_PREFIX}/shares`, shareRoutes);
  app.use(`${API_PREFIX}/connections`, connectionRoutes);
  app.use(`${API_PREFIX}/reports`, reportRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'ENDPOINT_NOT_FOUND',
        message: `Cannot ${req.method} ${req.url}`,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: (req as any).requestId || 'unknown',
        version: 'v1',
      },
    });
  });

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Start the server
 */
export function startServer(): void {
  const app = createApp();

  const server = app.listen(config.port, () => {
    logger.info('Social service started', {
      port: config.port,
      nodeEnv: config.nodeEnv,
      version: 'v1',
    });
  });

  // Graceful shutdown
  const gracefulShutdown = (signal: string) => {
    logger.info(`${signal} received, starting graceful shutdown`);

    server.close(() => {
      logger.info('HTTP server closed');
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

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', {
      reason,
      promise,
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });
}

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}
