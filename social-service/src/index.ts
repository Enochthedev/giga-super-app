import { createServer } from 'http';

import { createClient } from '@supabase/supabase-js';
import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application, NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

dotenv.config();

// Extended Request interface
interface AuthenticatedRequest extends Request {
  requestId?: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

const app: Application = express();
const PORT = parseInt(process.env.PORT ?? process.env.SOCIAL_SERVICE_PORT ?? '3001', 10);

// Logger utility
const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(
      JSON.stringify({ level: 'info', message, ...meta, timestamp: new Date().toISOString() })
    );
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(
      JSON.stringify({ level: 'warn', message, ...meta, timestamp: new Date().toISOString() })
    );
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    console.error(
      JSON.stringify({ level: 'error', message, ...meta, timestamp: new Date().toISOString() })
    );
  },
};

logger.info('Service initializing', {
  supabaseConfigured: !!process.env.SUPABASE_URL,
  serviceRoleConfigured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  port: PORT,
  environment: process.env.NODE_ENV ?? 'development',
});

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  {
    db: {
      schema: 'public',
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
        ? ([process.env.API_GATEWAY_URL, process.env.FRONTEND_URL].filter(Boolean) as string[])
        : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Client-Version'],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '100', 10),
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
app.use((req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  const requestId =
    (req.headers['x-request-id'] as string) ??
    `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  req.requestId = requestId;

  // Extract user from headers (forwarded by API Gateway)
  const userId = req.headers['x-user-id'] as string;
  const userEmail = req.headers['x-user-email'] as string;
  const userRole = req.headers['x-user-role'] as string;

  if (userId) {
    req.user = {
      id: userId,
      email: userEmail ?? '',
      role: userRole ?? 'user',
    };
  }

  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    userId,
  });

  next();
});

// Health check routes
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'social-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      database: 'connected',
    },
  });
});

app.get('/health/ready', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'ready',
      service: 'social-service',
    },
  });
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'alive',
      timestamp: new Date().toISOString(),
    },
  });
});

// Posts routes
app.get('/api/v1/posts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = '20', offset = '0' } = req.query;

    const { data: posts, error } = await supabase
      .from('social_posts')
      .select(
        `
        id,
        content,
        media_urls,
        visibility,
        created_at,
        user_id,
        user_profiles(first_name, last_name, avatar_url)
      `
      )
      .is('deleted_at', null)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .range(
        parseInt(offset as string, 10),
        parseInt(offset as string, 10) + parseInt(limit as string, 10) - 1
      );

    if (error) throw error;

    res.json({
      success: true,
      data: posts ?? [],
      metadata: {
        timestamp: new Date().toISOString(),
        service: 'social-service',
      },
    });
  } catch (error) {
    logger.error('Get posts error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_POSTS_ERROR',
        message: 'Failed to get posts',
      },
    });
  }
});

app.post('/api/v1/posts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const { content, media_urls, visibility = 'public' } = req.body;

    if (!content) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Content is required',
        },
      });
      return;
    }

    const { data: post, error } = await supabase
      .from('social_posts')
      .insert({
        user_id: req.user.id,
        content,
        media_urls: media_urls ?? [],
        visibility,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: post,
      metadata: {
        timestamp: new Date().toISOString(),
        service: 'social-service',
      },
    });
  } catch (error) {
    logger.error('Create post error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_POST_ERROR',
        message: 'Failed to create post',
      },
    });
  }
});

app.get('/api/v1/posts/:postId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { postId } = req.params;

    const { data: post, error } = await supabase
      .from('social_posts')
      .select(
        `
        *,
        user_profiles(first_name, last_name, avatar_url)
      `
      )
      .eq('id', postId)
      .is('deleted_at', null)
      .single();

    if (error || !post) {
      res.status(404).json({
        success: false,
        error: {
          code: 'POST_NOT_FOUND',
          message: 'Post not found',
        },
      });
      return;
    }

    res.json({
      success: true,
      data: post,
      metadata: {
        timestamp: new Date().toISOString(),
        service: 'social-service',
      },
    });
  } catch (error) {
    logger.error('Get post error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_POST_ERROR',
        message: 'Failed to get post',
      },
    });
  }
});

// Feed route
app.get('/api/v1/feed', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = '20', offset = '0' } = req.query;

    const { data: posts, error } = await supabase
      .from('social_posts')
      .select(
        `
        id,
        content,
        media_urls,
        visibility,
        created_at,
        user_id,
        user_profiles(first_name, last_name, avatar_url),
        post_likes(count),
        post_comments(count)
      `
      )
      .is('deleted_at', null)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .range(
        parseInt(offset as string, 10),
        parseInt(offset as string, 10) + parseInt(limit as string, 10) - 1
      );

    if (error) throw error;

    res.json({
      success: true,
      data: posts ?? [],
      metadata: {
        timestamp: new Date().toISOString(),
        service: 'social-service',
      },
    });
  } catch (error) {
    logger.error('Get feed error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_FEED_ERROR',
        message: 'Failed to get feed',
      },
    });
  }
});

// Comments routes
app.get('/api/v1/posts/:postId/comments', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const { limit = '20', offset = '0' } = req.query;

    const { data: comments, error } = await supabase
      .from('post_comments')
      .select(
        `
        id,
        content,
        created_at,
        user_id,
        user_profiles(first_name, last_name, avatar_url)
      `
      )
      .eq('post_id', postId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .range(
        parseInt(offset as string, 10),
        parseInt(offset as string, 10) + parseInt(limit as string, 10) - 1
      );

    if (error) throw error;

    res.json({
      success: true,
      data: comments ?? [],
      metadata: {
        timestamp: new Date().toISOString(),
        service: 'social-service',
      },
    });
  } catch (error) {
    logger.error('Get comments error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_COMMENTS_ERROR',
        message: 'Failed to get comments',
      },
    });
  }
});

app.post('/api/v1/posts/:postId/comments', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const { postId } = req.params;
    const { content } = req.body;

    if (!content) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Content is required',
        },
      });
      return;
    }

    const { data: comment, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: req.user.id,
        content,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: comment,
      metadata: {
        timestamp: new Date().toISOString(),
        service: 'social-service',
      },
    });
  } catch (error) {
    logger.error('Create comment error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_COMMENT_ERROR',
        message: 'Failed to create comment',
      },
    });
  }
});

// Likes routes
app.post('/api/v1/posts/:postId/like', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const { postId } = req.params;

    const { error } = await supabase.from('post_likes').upsert(
      {
        post_id: postId,
        user_id: req.user.id,
      },
      {
        onConflict: 'post_id,user_id',
      }
    );

    if (error) throw error;

    res.json({
      success: true,
      data: { liked: true },
      metadata: {
        timestamp: new Date().toISOString(),
        service: 'social-service',
      },
    });
  } catch (error) {
    logger.error('Like post error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'LIKE_POST_ERROR',
        message: 'Failed to like post',
      },
    });
  }
});

app.delete('/api/v1/posts/:postId/like', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const { postId } = req.params;

    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({
      success: true,
      data: { liked: false },
      metadata: {
        timestamp: new Date().toISOString(),
        service: 'social-service',
      },
    });
  } catch (error) {
    logger.error('Unlike post error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      success: false,
      error: {
        code: 'UNLIKE_POST_ERROR',
        message: 'Failed to unlike post',
      },
    });
  }
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: 'The requested endpoint was not found.',
    },
  });
});

// Error handler
app.use((error: Error, req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', {
    requestId: req.requestId,
    error: error.message,
    stack: error.stack,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});

// Start server
const server = createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  logger.info('Social service started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV,
    service: 'social-service',
  });
});

// Graceful shutdown
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

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});

export default app;
