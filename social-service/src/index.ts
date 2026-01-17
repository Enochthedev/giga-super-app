import { createServer } from 'http';

import { createClient } from '@supabase/supabase-js';
import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application, NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { swaggerSpec } from './config/swagger';
import { tenantAuthMiddleware } from './middleware/tenant-auth';
import commentsRouter from './routes/comments';
import connectionsRouter from './routes/connections';
import feedRouter from './routes/feed';
import healthRouter from './routes/health';
import likesRouter from './routes/likes';
import postsRouter from './routes/posts';
import storiesRouter from './routes/stories';
import tenantPostsRouter from './routes/tenant-posts';
import { logger } from './utils/logger';

dotenv.config();

const app: Application = express();
const PORT = parseInt(process.env.PORT ?? process.env.SOCIAL_SERVICE_PORT ?? '3001', 10);

logger.info('Service initializing', {
  supabaseConfigured: !!process.env.SUPABASE_URL,
  port: PORT,
  environment: process.env.NODE_ENV ?? 'development',
});

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  {
    db: { schema: 'public' },
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { 'X-Client-Info': 'social-service@1.0.0' } },
  }
);
app.locals.supabase = supabase;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);

// CORS
app.use(
  cors({
    origin:
      process.env.NODE_ENV === 'production'
        ? ([process.env.API_GATEWAY_URL, process.env.FRONTEND_URL].filter(Boolean) as string[])
        : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Client-Version'],
  })
);

// Rate limiting
app.use(
  rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '100', 10),
    message: {
      success: false,
      error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' },
    },
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging and user context
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.requestId =
    (req.headers['x-request-id'] as string) ??
    `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  const userId = req.headers['x-user-id'] as string;
  if (userId) {
    req.user = {
      id: userId,
      email: (req.headers['x-user-email'] as string) ?? '',
      role: (req.headers['x-user-role'] as string) ?? 'user',
    };
  }

  logger.info('Request', { requestId: req.requestId, method: req.method, url: req.url, userId });
  next();
});

// Swagger UI
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Social Service API',
  })
);

app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Routes
app.use('/health', healthRouter);
app.use('/api/v1/posts', postsRouter);
app.use('/api/v1/posts/:postId/comments', commentsRouter);
app.use('/api/v1/posts/:postId/like', likesRouter);
app.use('/api/v1/posts/:postId/likes', likesRouter);
app.use('/api/v1/feed', feedRouter);
app.use('/api/v1/stories', storiesRouter);
app.use('/api/v1/connections', connectionsRouter);
app.use('/api/v1/tenant', tenantAuthMiddleware, tenantPostsRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: 'ENDPOINT_NOT_FOUND', message: 'Endpoint not found' },
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', {
    requestId: req.requestId,
    error: err.message,
    stack: err.stack,
  });
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
  });
});

// Start server
const server = createServer(app);

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use`);
  } else {
    logger.error('Server error', { error: error.message, code: error.code });
  }
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  const address = server.address();
  logger.info('Social service started and listening', {
    port: PORT,
    address: address,
    swagger: `http://localhost:${PORT}/api-docs`,
    env: process.env.NODE_ENV,
  });
});

// Graceful shutdown
const shutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', err => {
  logger.error('Uncaught exception', { error: err.message });
  process.exit(1);
});
process.on('unhandledRejection', reason => {
  logger.error('Unhandled rejection', { reason: String(reason) });
});

export default app;
