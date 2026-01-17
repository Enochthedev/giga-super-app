import compression from 'compression';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { config } from './config/index.js';
import { swaggerSpec } from './config/swagger.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { routingMiddleware } from './middleware/routing.js';
import { supabaseProxy } from './middleware/supabaseProxy.js';
import { docsRouter } from './routes/docs.js';
import { healthRouter } from './routes/health.js';
import { serviceRegistry } from './services/serviceRegistry.js';
import { logger } from './utils/logger.js';

const app = express();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);

// CORS configuration
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Info', 'apikey'],
  })
);

// Compression and parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for Railway deployment
if (config.trustProxy) {
  app.set('trust proxy', 1);
}

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Request logging
app.use(requestLogger);

// Health check routes (no auth required)
app.use('/health', healthRouter);

// API Documentation
const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    urls: [
      { url: '/api-docs.json', name: 'API Gateway' },
      { url: '/docs/social/json', name: 'Social Service' },
      { url: '/docs/admin/json', name: 'Admin Service' },
      { url: '/docs/search/json', name: 'Search Service' },
      { url: '/docs/delivery/json', name: 'Delivery Service' },
      { url: '/docs/payment/json', name: 'Payment Queue Service' },
      { url: '/docs/notifications/json', name: 'Notifications Service' },
      { url: '/docs/taxi/json', name: 'Taxi Realtime Service' },
    ],
  },
  customSiteTitle: 'Giga Platform API Docs',
};

app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));

// Service documentation hub (no auth required)
app.use('/docs', docsRouter);

// Authentication middleware for all other routes
app.use(authMiddleware);

// Supabase proxy middleware (for endpoints not yet migrated to Railway)
app.use(supabaseProxy);

// Main routing middleware
app.use(routingMiddleware);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', notFoundHandler);

// Initialize and start server
const startServer = async () => {
  try {
    // Initialize service registry
    await serviceRegistry.initialize();

    // Start server
    app.listen(config.port, () => {
      logger.info(`API Gateway started on port ${config.port}`, {
        port: config.port,
        environment: config.nodeEnv,
        services: serviceRegistry.getServiceCount(),
      });

      // Log service URLs for debugging (important for Railway deployment)
      logger.info('Service Configuration:', {
        social: config.services.social,
        payment: config.services.payment,
        delivery: config.services.delivery,
        notifications: config.services.notifications,
        admin: config.services.admin,
        taxiRealtime: config.services.taxiRealtime,
        search: config.services.search,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();

export default app;
