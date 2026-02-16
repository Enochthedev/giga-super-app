import { NextFunction, Request, Response } from 'express';
import { Counter, Gauge, Histogram } from 'prom-client';
export declare const httpRequestDuration: Histogram<"service" | "method" | "route" | "status_code">;
export declare const httpRequestTotal: Counter<"service" | "method" | "route" | "status_code">;
export declare const httpRequestErrors: Counter<"service" | "method" | "route" | "status_code" | "error_type">;
export declare const databaseQueryDuration: Histogram<"service" | "operation" | "table">;
export declare const databaseQueryTotal: Counter<"service" | "operation" | "table" | "status">;
export declare const databaseConnectionPool: Gauge<"service" | "status">;
export declare const externalServiceDuration: Histogram<"service" | "operation" | "status" | "service_name">;
export declare const externalServiceErrors: Counter<"service" | "error_type" | "operation" | "service_name">;
export declare const cacheHits: Counter<"service" | "cache_name">;
export declare const cacheMisses: Counter<"service" | "cache_name">;
export declare const businessEvents: Counter<"service" | "status" | "event_type">;
export declare const activeConnections: Gauge<"service">;
/**
 * Middleware to collect HTTP metrics
 */
export declare const metricsMiddleware: (serviceName: string) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Database query metrics wrapper
 */
export declare const trackDatabaseQuery: <T>(operation: string, table: string, serviceName: string, queryFn: () => Promise<T>) => Promise<T>;
/**
 * External service call metrics wrapper
 */
export declare const trackExternalService: <T>(serviceName: string, operation: string, currentService: string, callFn: () => Promise<T>) => Promise<T>;
/**
 * Get metrics endpoint handler
 */
export declare const getMetrics: () => Promise<string>;
/**
 * Get metrics content type
 */
export declare const getMetricsContentType: () => string;
/**
 * Clear all metrics (useful for testing)
 */
export declare const clearMetrics: () => void;
//# sourceMappingURL=metrics.d.ts.map