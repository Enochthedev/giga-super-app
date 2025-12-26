import { createClient } from '@supabase/supabase-js';
import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { authMiddleware } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import logger from './utils/logger.js';

// Import route handlers
import commentsRoutes from './routes/comments.js';
import feedRoutes from './routes/feed.js';
import healthRoutes from './routes/health.js';
import likesRoutes from './routes/likes.js';
import postsRoutes from './routes/posts.js';
import sharesRoutes from './routes/shares.js';
import storiesRoutes from './routes/stories.js';

// Load environment variables
dotenv.config();

// Validate environment variables at startup
logger.info('Service initializing', {
  supabaseConfigured: !!process.env.SUPABASE_URL,
  serviceRoleConfigured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  port: process.env.PORT || 3001,
  environment: process.env.NODE_ENV || 'development',
});

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Supabase client with connection pooling
// SECURITY: Using service role key for server-side operations only
// This client has full database access, bypassing RLS
// Use with caution and ensure proper authorization checks in route handlers
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  db: {
    schema: 'public',
    poolSize: parseInt(process.env.DB_POOL_SIZE) || 10,
    ssl: true,
  },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'social-service@1.0.0',
    },
  },
});

// TODO: Consider creating a separate anon-key client for user-scoped operations
// to leverage Row Level Security policies for additional security layer

// Make supabase client available to routes
app.locals.supabase = supabase;

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

// CORS configuration
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? [process.env.API_GATEWAY_URL, process.env.FRONTEND_URL].filter(Boolean)
        : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Client-Version'],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const requestId =
    req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;

  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });

  next();
});

// Health check routes (no auth required)
app.use('/health', healthRoutes);

// Authentication middleware for protected routes
app.use(authMiddleware);

// API routes
app.use('/api/v1/posts', postsRoutes);
app.use('/api/v1/comments', commentsRoutes);
app.use('/api/v1/feed', feedRoutes);
app.use('/api/v1/likes', likesRoutes);
app.use('/api/v1/stories', storiesRoutes);
app.use('/api/v1/shares', sharesRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Graceful shutdown handling
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Social service started successfully`, {
    port: PORT,
    environment: process.env.NODE_ENV,
    service: process.env.SERVICE_NAME,
  });
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  logger.error('Uncaught exception - this is a fatal error', {
    error: error.message,
    stack: error.stack,
  });
  // Uncaught exceptions are true code errors - exit to restart
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection detected', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise,
  });

  // Send to error tracking if configured
  if (process.env.SENTRY_DSN) {
    // Sentry.captureException(reason);
  }

  // Log but don't crash - let health checks detect issues
  // Only uncaughtException should crash the process
  // This prevents cascade failures from async errors
});

export default app;
