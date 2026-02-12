import { Application } from 'express';
import {
  createDatabaseChecker,
  createHealthCheck,
  createMemoryChecker,
  initializeSentry,
  metricsMiddleware,
  setupSentryErrorHandler,
  setupSentryMiddleware,
  tracingMiddleware,
} from '../../../shared/observability';
import { supabase } from '../utils/database';

const SERVICE_NAME = 'admin-service';
const VERSION = '2.2.0';

/**
 * Initialize observability for Admin Service
 */
export const initializeObservability = (app: Application): void => {
  // 1. Initialize Sentry for error tracking
  initializeSentry({
    dsn: process.env.SENTRY_DSN || '',
    environment: process.env.NODE_ENV || 'development',
    serviceName: SERVICE_NAME,
    release: `${SERVICE_NAME}@${VERSION}`,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
    enabled: process.env.SENTRY_ENABLED === 'true',
  });

  // 2. Setup Sentry middleware (must be first)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setupSentryMiddleware(app as any);

  // 3. Add distributed tracing
  app.use(tracingMiddleware(SERVICE_NAME));

  // 4. Add Prometheus metrics collection
  app.use(metricsMiddleware(SERVICE_NAME));
};

/**
 * Setup Sentry error handler (must be after all routes)
 */
export const setupObservabilityErrorHandler = (app: Application): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setupSentryErrorHandler(app as any);
};

/**
 * Create health check endpoints
 */
export const setupHealthChecks = (app: Application): void => {
  const healthCheckers = [
    // Check Supabase connection
    createDatabaseChecker(async () => {
      try {
        const { error } = await supabase.from('user_profiles').select('id').limit(1);
        return !error;
      } catch {
        return false;
      }
    }, 'supabase'),

    // Memory check
    createMemoryChecker(90),
  ];

  const healthCheck = createHealthCheck(SERVICE_NAME, VERSION, healthCheckers);

  // Kubernetes/Railway health endpoints
  app.get('/health/live', healthCheck.liveness);
  app.get('/health/ready', healthCheck.readiness);

  // Prometheus metrics endpoint
  app.get('/metrics', healthCheck.metrics);
};
