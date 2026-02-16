"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearMetrics = exports.getMetricsContentType = exports.getMetrics = exports.trackExternalService = exports.trackDatabaseQuery = exports.metricsMiddleware = exports.activeConnections = exports.businessEvents = exports.cacheMisses = exports.cacheHits = exports.externalServiceErrors = exports.externalServiceDuration = exports.databaseConnectionPool = exports.databaseQueryTotal = exports.databaseQueryDuration = exports.httpRequestErrors = exports.httpRequestTotal = exports.httpRequestDuration = void 0;
const prom_client_1 = require("prom-client");
/**
 * Prometheus metrics for monitoring service health and performance
 */
// Enable default metrics (CPU, memory, event loop, etc.)
(0, prom_client_1.collectDefaultMetrics)({ prefix: 'giga_' });
// HTTP request metrics
exports.httpRequestDuration = new prom_client_1.Histogram({
    name: 'giga_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code', 'service'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
});
exports.httpRequestTotal = new prom_client_1.Counter({
    name: 'giga_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code', 'service'],
});
exports.httpRequestErrors = new prom_client_1.Counter({
    name: 'giga_http_request_errors_total',
    help: 'Total number of HTTP request errors',
    labelNames: ['method', 'route', 'status_code', 'error_type', 'service'],
});
// Database metrics
exports.databaseQueryDuration = new prom_client_1.Histogram({
    name: 'giga_database_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['operation', 'table', 'service'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
});
exports.databaseQueryTotal = new prom_client_1.Counter({
    name: 'giga_database_queries_total',
    help: 'Total number of database queries',
    labelNames: ['operation', 'table', 'status', 'service'],
});
exports.databaseConnectionPool = new prom_client_1.Gauge({
    name: 'giga_database_connection_pool',
    help: 'Database connection pool status',
    labelNames: ['status', 'service'],
});
// External service metrics
exports.externalServiceDuration = new prom_client_1.Histogram({
    name: 'giga_external_service_duration_seconds',
    help: 'Duration of external service calls in seconds',
    labelNames: ['service_name', 'operation', 'status', 'service'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30],
});
exports.externalServiceErrors = new prom_client_1.Counter({
    name: 'giga_external_service_errors_total',
    help: 'Total number of external service errors',
    labelNames: ['service_name', 'operation', 'error_type', 'service'],
});
// Cache metrics
exports.cacheHits = new prom_client_1.Counter({
    name: 'giga_cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['cache_name', 'service'],
});
exports.cacheMisses = new prom_client_1.Counter({
    name: 'giga_cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['cache_name', 'service'],
});
// Business metrics
exports.businessEvents = new prom_client_1.Counter({
    name: 'giga_business_events_total',
    help: 'Total number of business events',
    labelNames: ['event_type', 'status', 'service'],
});
// Active connections
exports.activeConnections = new prom_client_1.Gauge({
    name: 'giga_active_connections',
    help: 'Number of active connections',
    labelNames: ['service'],
});
/**
 * Middleware to collect HTTP metrics
 */
const metricsMiddleware = (serviceName) => {
    return (req, res, next) => {
        const start = Date.now();
        // Increment active connections
        exports.activeConnections.inc({ service: serviceName });
        // Track response
        res.on('finish', () => {
            const duration = (Date.now() - start) / 1000;
            const route = req.route?.path || req.path || 'unknown';
            const statusCode = res.statusCode.toString();
            // Record metrics
            exports.httpRequestDuration.observe({ method: req.method, route, status_code: statusCode, service: serviceName }, duration);
            exports.httpRequestTotal.inc({
                method: req.method,
                route,
                status_code: statusCode,
                service: serviceName,
            });
            // Track errors
            if (res.statusCode >= 400) {
                const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
                exports.httpRequestErrors.inc({
                    method: req.method,
                    route,
                    status_code: statusCode,
                    error_type: errorType,
                    service: serviceName,
                });
            }
            // Decrement active connections
            exports.activeConnections.dec({ service: serviceName });
        });
        next();
    };
};
exports.metricsMiddleware = metricsMiddleware;
/**
 * Database query metrics wrapper
 */
const trackDatabaseQuery = async (operation, table, serviceName, queryFn) => {
    const start = Date.now();
    try {
        const result = await queryFn();
        const duration = (Date.now() - start) / 1000;
        exports.databaseQueryDuration.observe({ operation, table, service: serviceName }, duration);
        exports.databaseQueryTotal.inc({ operation, table, status: 'success', service: serviceName });
        return result;
    }
    catch (error) {
        const duration = (Date.now() - start) / 1000;
        exports.databaseQueryDuration.observe({ operation, table, service: serviceName }, duration);
        exports.databaseQueryTotal.inc({ operation, table, status: 'error', service: serviceName });
        throw error;
    }
};
exports.trackDatabaseQuery = trackDatabaseQuery;
/**
 * External service call metrics wrapper
 */
const trackExternalService = async (serviceName, operation, currentService, callFn) => {
    const start = Date.now();
    try {
        const result = await callFn();
        const duration = (Date.now() - start) / 1000;
        exports.externalServiceDuration.observe({ service_name: serviceName, operation, status: 'success', service: currentService }, duration);
        return result;
    }
    catch (error) {
        const duration = (Date.now() - start) / 1000;
        const errorType = error instanceof Error ? error.name : 'unknown';
        exports.externalServiceDuration.observe({ service_name: serviceName, operation, status: 'error', service: currentService }, duration);
        exports.externalServiceErrors.inc({
            service_name: serviceName,
            operation,
            error_type: errorType,
            service: currentService,
        });
        throw error;
    }
};
exports.trackExternalService = trackExternalService;
/**
 * Get metrics endpoint handler
 */
const getMetrics = async () => {
    return prom_client_1.register.metrics();
};
exports.getMetrics = getMetrics;
/**
 * Get metrics content type
 */
const getMetricsContentType = () => {
    return prom_client_1.register.contentType;
};
exports.getMetricsContentType = getMetricsContentType;
/**
 * Clear all metrics (useful for testing)
 */
const clearMetrics = () => {
    prom_client_1.register.clear();
};
exports.clearMetrics = clearMetrics;
//# sourceMappingURL=metrics.js.map