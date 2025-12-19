import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { routingMiddleware } from './middleware/routing.js';
import { healthRouter } from './routes/health.js';
import { serviceRegistry } from './services/serviceRegistry.js';
import { logger } from './utils/logger.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

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
    origin: process.env.CORS_ORIGIN || '*',
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
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
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

// Request logging and timing
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});
app.use(requestLogger);

// Response standardization and caching
app.use(responseStandardization);
app.use(responseCompression);
app.use(cacheMiddleware);

// Health check routes (no auth required)
app.use('/health', healthRouter);

// Authentication middleware for all other routes
app.use(authMiddleware);

// Admin routes (require authentication and admin role)
app.use('/admin', adminRouter);

// Main routing middleware
app.use(routingMiddleware);

// Error handling
app.use(errorResponseStandardization);
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: 'The requested endpoint was not found.',
    },
    metadata: {
      timestamp: new Date().toISOString(),
      request_id: req.id,
      version: '1.0.0',
    },
  });
});

// Initialize service registry
await serviceRegistry.initialize();

// Start server
app.listen(PORT, () => {
  logger.info(`API Gateway started on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV,
    services: serviceRegistry.getServiceCount(),
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;
