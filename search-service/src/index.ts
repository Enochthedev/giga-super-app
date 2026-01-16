/**
 * Search Service - Comprehensive search functionality for the Giga platform
 * Handles search across hotels, products, drivers, posts, and users
 */

import compression from 'compression';
import express, { Application } from 'express';
import helmet from 'helmet';

import { SERVICE_PORTS } from './config/ports.js';

// Import middleware
import {
  corsHeaders,
  errorHandler,
  healthCheck,
  notFoundHandler,
  performanceMonitor,
  requestId,
  requestLogger,
  requestSizeLimit,
  securityHeaders,
  validateContentType,
} from './middleware/index.js';

// Import routes
import driverRoutes from './routes/drivers.js';
import healthRoutes from './routes/health.js';
import hotelRoutes from './routes/hotels.js';
import productRoutes from './routes/products.js';
import searchRoutes from './routes/search.js';
import { CacheService } from './utils/cache.js';
import { logger } from './utils/logger.js';

// Environment configuration
const PORT = SERVICE_PORTS.SEARCH_SERVICE;
const NODE_ENV = process.env.NODE_ENV || 'development';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Initialize Express app
const app: Application = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

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
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// CORS and security headers
app.use(corsHeaders);
app.use(securityHeaders);

// Request processing middleware
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request middleware
app.use(requestId);
app.use(requestLogger);
app.use(performanceMonitor);
app.use(validateContentType);
app.use(requestSizeLimit(1024 * 1024)); // 1MB limit

// Health check middleware (before other routes)
app.use(healthCheck);

// Swagger documentation
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Search Service API Docs',
  })
);

app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API routes
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/search/hotels', hotelRoutes);
app.use('/api/v1/search/products', productRoutes);
app.use('/api/v1/search/drivers', driverRoutes);
app.use('/api/v1/health', healthRoutes);

// Legacy route support (redirect to v1)
app.use('/api/search', (req, res) => {
  res.redirect(301, `/api/v1/search${req.url}`);
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize cache service
const cacheService = new CacheService(REDIS_URL);

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  try {
    // Close cache connection
    await cacheService.close();
    logger.info('Cache connection closed');

    // Close server
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', error as Error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at Promise', { reason, promise });
  process.exit(1);
});

// Start server
const server = app.listen(PORT, () => {
  logger.info('Search Service started successfully', {
    port: PORT,
    environment: NODE_ENV,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Set server timeout
server.timeout = 30000; // 30 seconds

export default app;
