import { NextFunction, Request, Response } from 'express';
import { Counter, Gauge, Histogram, collectDefaultMetrics, register } from 'prom-client';

/**
 * Prometheus metrics for monitoring service health and performance
 */

// Enable default metrics (CPU, memory, event loop, etc.)
collectDefaultMetrics({ prefix: 'giga_' });

// HTTP request metrics
export const httpRequestDuration = new Histogram({
  name: 'giga_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'service'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
});

export const httpRequestTotal = new Counter({
  name: 'giga_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'service'],
});

export const httpRequestErrors = new Counter({
  name: 'giga_http_request_errors_total',
  help: 'Total number of HTTP request errors',
  labelNames: ['method', 'route', 'status_code', 'error_type', 'service'],
});

// Database metrics
export const databaseQueryDuration = new Histogram({
  name: 'giga_database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table', 'service'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
});

export const databaseQueryTotal = new Counter({
  name: 'giga_database_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table', 'status', 'service'],
});

export const databaseConnectionPool = new Gauge({
  name: 'giga_database_connection_pool',
  help: 'Database connection pool status',
  labelNames: ['status', 'service'],
});

// External service metrics
export const externalServiceDuration = new Histogram({
  name: 'giga_external_service_duration_seconds',
  help: 'Duration of external service calls in seconds',
  labelNames: ['service_name', 'operation', 'status', 'service'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30],
});

export const externalServiceErrors = new Counter({
  name: 'giga_external_service_errors_total',
  help: 'Total number of external service errors',
  labelNames: ['service_name', 'operation', 'error_type', 'service'],
});

// Cache metrics
export const cacheHits = new Counter({
  name: 'giga_cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_name', 'service'],
});

export const cacheMisses = new Counter({
  name: 'giga_cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_name', 'service'],
});

// Business metrics
export const businessEvents = new Counter({
  name: 'giga_business_events_total',
  help: 'Total number of business events',
  labelNames: ['event_type', 'status', 'service'],
});

// Active connections
export const activeConnections = new Gauge({
  name: 'giga_active_connections',
  help: 'Number of active connections',
  labelNames: ['service'],
});

/**
 * Middleware to collect HTTP metrics
 */
export const metricsMiddleware = (serviceName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    // Increment active connections
    activeConnections.inc({ service: serviceName });

    // Track response
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const route = req.route?.path || req.path || 'unknown';
      const statusCode = res.statusCode.toString();

      // Record metrics
      httpRequestDuration.observe(
        { method: req.method, route, status_code: statusCode, service: serviceName },
        duration
      );

      httpRequestTotal.inc({
        method: req.method,
        route,
        status_code: statusCode,
        service: serviceName,
      });

      // Track errors
      if (res.statusCode >= 400) {
        const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
        httpRequestErrors.inc({
          method: req.method,
          route,
          status_code: statusCode,
          error_type: errorType,
          service: serviceName,
        });
      }

      // Decrement active connections
      activeConnections.dec({ service: serviceName });
    });

    next();
  };
};

/**
 * Database query metrics wrapper
 */
export const trackDatabaseQuery = async <T>(
  operation: string,
  table: string,
  serviceName: string,
  queryFn: () => Promise<T>
): Promise<T> => {
  const start = Date.now();

  try {
    const result = await queryFn();
    const duration = (Date.now() - start) / 1000;

    databaseQueryDuration.observe({ operation, table, service: serviceName }, duration);
    databaseQueryTotal.inc({ operation, table, status: 'success', service: serviceName });

    return result;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;

    databaseQueryDuration.observe({ operation, table, service: serviceName }, duration);
    databaseQueryTotal.inc({ operation, table, status: 'error', service: serviceName });

    throw error;
  }
};

/**
 * External service call metrics wrapper
 */
export const trackExternalService = async <T>(
  serviceName: string,
  operation: string,
  currentService: string,
  callFn: () => Promise<T>
): Promise<T> => {
  const start = Date.now();

  try {
    const result = await callFn();
    const duration = (Date.now() - start) / 1000;

    externalServiceDuration.observe(
      { service_name: serviceName, operation, status: 'success', service: currentService },
      duration
    );

    return result;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    const errorType = error instanceof Error ? error.name : 'unknown';

    externalServiceDuration.observe(
      { service_name: serviceName, operation, status: 'error', service: currentService },
      duration
    );

    externalServiceErrors.inc({
      service_name: serviceName,
      operation,
      error_type: errorType,
      service: currentService,
    });

    throw error;
  }
};

/**
 * Get metrics endpoint handler
 */
export const getMetrics = async (): Promise<string> => {
  return register.metrics();
};

/**
 * Get metrics content type
 */
export const getMetricsContentType = (): string => {
  return register.contentType;
};

/**
 * Clear all metrics (useful for testing)
 */
export const clearMetrics = (): void => {
  register.clear();
};
