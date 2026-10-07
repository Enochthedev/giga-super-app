import * as Sentry from '@sentry/node';
import { Express, NextFunction, Request, Response } from 'express';

interface SentryConfig {
  dsn: string;
  environment: string;
  serviceName: string;
  release?: string;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
  enabled?: boolean;
}

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export const initializeSentry = (config: SentryConfig): void => {
  if (!config.enabled || !config.dsn) {
    console.log(`[${config.serviceName}] Sentry disabled or DSN not configured`);
    return;
  }

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    serverName: config.serviceName,
    release:
      config.release || `${config.serviceName}@${process.env.npm_package_version || 'unknown'}`,

    // Performance Monitoring
    tracesSampleRate: config.tracesSampleRate || 0.1, // 10% of transactions

    integrations: [
      // HTTP integration for tracking outgoing requests
      new Sentry.Integrations.Http({ tracing: true }),

      // Express integration (will be added via middleware)
    ],

    // Filter out health check noise
    beforeSend(event, hint) {
      const url = event.request?.url || '';

      // Don't send health check errors
      if (url.includes('/health') || url.includes('/ready') || url.includes('/live')) {
        return null;
      }

      return event;
    },

    // Add custom tags
    initialScope: {
      tags: {
        service: config.serviceName,
        node_version: process.version,
      },
    },
  });

  console.log(`[${config.serviceName}] Sentry initialized successfully`);
};

/**
 * Setup Sentry middleware for Express apps
 */
export const setupSentryMiddleware = (app: Express): void => {
  // Request handler must be the first middleware
  app.use(Sentry.Handlers.requestHandler());

  // TracingHandler creates a trace for every incoming request
  app.use(Sentry.Handlers.tracingHandler());

  app.use(captureFailedResponses);
};

/**
 * Collapse ids in a URL path so one failing route groups into one Sentry issue.
 */
const normalizePath = (url: string): string =>
  (url.split('?')[0] ?? '')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d+(?=\/|$)/g, '/:n');

/**
 * Report failed responses (5xx and 429), not just thrown errors. A failure that
 * is handled or proxied (e.g. Supabase Auth answering signup with 429) never
 * throws, so crash-only reporting stays silent while users are locked out.
 */
export const captureFailedResponses = (req: Request, res: Response, next: NextFunction): void => {
  res.on('finish', () => {
    const status = res.statusCode;
    if ((status < 500 && status !== 429) || res.locals.sentryReported) return;
    const path = normalizePath(req.originalUrl);
    Sentry.withScope(scope => {
      scope.setLevel(status >= 500 ? 'error' : 'warning');
      scope.setTags({ status_code: String(status), method: req.method, path });
      scope.setExtras({ url: req.originalUrl, requestId: req.headers['x-request-id'] });
      scope.setFingerprint([req.method, path, String(status)]);
      Sentry.captureMessage(`${req.method} ${path} -> ${status}`);
    });
  });
  next();
};

/**
 * Setup Sentry error handler (must be after all routes)
 */
export const setupSentryErrorHandler = (app: Express): void => {
  // The exception itself is reported below; don't report its 500 response twice.
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    res.locals.sentryReported = true;
    next(err);
  });

  // Error handler must be before any other error middleware
  app.use(
    Sentry.Handlers.errorHandler({
      shouldHandleError(error) {
        // Capture all errors with status >= 500
        return true;
      },
    })
  );
};

/**
 * Capture exception manually
 */
export const captureException = (error: Error, context?: Record<string, any>): void => {
  Sentry.captureException(error, {
    extra: context,
  });
};

/**
 * Capture message manually
 */
export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
): void => {
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
};

/**
 * Add breadcrumb for debugging
 */
export const addBreadcrumb = (breadcrumb: Sentry.Breadcrumb): void => {
  Sentry.addBreadcrumb(breadcrumb);
};

/**
 * Set user context
 */
export const setUser = (user: { id: string; email?: string; username?: string }): void => {
  Sentry.setUser(user);
};

/**
 * Set custom context
 */
export const setContext = (name: string, context: Record<string, any>): void => {
  Sentry.setContext(name, context);
};

/**
 * Start a transaction for performance monitoring
 */
export const startTransaction = (name: string, op: string): Sentry.Transaction => {
  return Sentry.startTransaction({
    name,
    op,
  });
};

/**
 * Flush pending events (useful for serverless/shutdown)
 */
export const flush = async (timeout = 2000): Promise<boolean> => {
  return Sentry.flush(timeout);
};

export { Sentry };
