import { Express } from 'express';
import {
  createDatabaseChecker,
  createExternalServiceChecker,
  createHealthCheck,
  createMemoryChecker,
  initializeSentry,
  metricsMiddleware,
  setupSentryErrorHandler,
  setupSentryMiddleware,
  tracingMiddleware,
} from '../../../shared/observability';
import { serviceRegistry } from '../services/serviceRegistry';
import { config } from './index';

const SERVICE_NAME = 'api-gateway';
const VERSION = '2.1.1';

/**
 * Initialize observability for API Gateway
 */
export const initializeObservability = (app: Express): void => {
  // 1. Initialize Sentry for error tracking
  initializeSentry({
    dsn: process.env.SENTRY_DSN || '',
    environment: config.nodeEnv,
    serviceName: SERVICE_NAME,
    release: `${SERVICE_NAME}@${VERSION}`,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
    enabled: process.env.SENTRY_ENABLED === 'true',
  });

  // 2. Setup Sentry middleware (must be first)
  setupSentryMiddleware(app);

  // 3. Add distributed tracing
  app.use(tracingMiddleware(SERVICE_NAME));

  // 4. Add Prometheus metrics collection
  app.use(metricsMiddleware(SERVICE_NAME));
};

/**
 * Setup Sentry error handler (must be after all routes)
 */
export const setupObservabilityErrorHandler = (app: Express): void => {
  setupSentryErrorHandler(app);
};

/**
 * Create health check endpoints
 */
export const setupHealthChecks = (app: Express): void => {
  const healthCheckers = [
    // Check Supabase connection
    createDatabaseChecker(async () => {
      try {
        // Simple ping to Supabase
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
          headers: {
            apikey: process.env.SUPABASE_ANON_KEY || '',
          },
        });
        return response.ok;
      } catch {
        return false;
      }
    }, 'supabase'),

    // Check downstream services
    createExternalServiceChecker('social-service', async () => {
      return serviceRegistry.isServiceHealthy('social');
    }),

    createExternalServiceChecker('admin-service', async () => {
      return serviceRegistry.isServiceHealthy('admin');
    }),

    createExternalServiceChecker('search-service', async () => {
      return serviceRegistry.isServiceHealthy('search');
    }),

    // Memory check
    createMemoryChecker(90),
  ];

  const healthCheck = createHealthCheck(SERVICE_NAME, VERSION, healthCheckers);

  // Kubernetes/Railway health endpoints
  app.get('/health/live', healthCheck.liveness);
  app.get('/health/ready', healthCheck.readiness);
  app.get('/health', healthCheck.health);

  // Prometheus metrics endpoint
  app.get('/metrics', healthCheck.metrics);
};
