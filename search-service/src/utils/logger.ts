/**
 * Logging utilities for Search Service
 */

import winston from 'winston';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(logColors);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.errors({ stack: true }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
      info =>
        `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
    )
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: 'logs/search-service-error.log',
      level: 'error',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),
    new winston.transports.File({
      filename: 'logs/search-service-combined.log',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),
  ],
});

// Create structured logger for search operations
export class SearchLogger {
  private requestId: string;
  private userId?: string;

  constructor(requestId: string, userId?: string) {
    this.requestId = requestId;
    this.userId = userId;
  }

  private formatMessage(message: string, meta?: any): string {
    const logData = {
      requestId: this.requestId,
      userId: this.userId,
      message,
      ...meta,
    };
    return JSON.stringify(logData);
  }

  info(message: string, meta?: any): void {
    logger.info(this.formatMessage(message, meta));
  }

  error(message: string, error?: Error, meta?: any): void {
    logger.error(
      this.formatMessage(message, {
        error: error?.message,
        stack: error?.stack,
        ...meta,
      })
    );
  }

  warn(message: string, meta?: any): void {
    logger.warn(this.formatMessage(message, meta));
  }

  debug(message: string, meta?: any): void {
    logger.debug(this.formatMessage(message, meta));
  }

  http(message: string, meta?: any): void {
    logger.http(this.formatMessage(message, meta));
  }

  // Log search query
  logSearchQuery(query: any, category: string, executionTime: number): void {
    this.info('Search query executed', {
      query: query.q,
      category,
      page: query.page,
      limit: query.limit,
      executionTime,
      filters: query.filters,
    });
  }

  // Log search results
  logSearchResults(totalResults: number, cached: boolean, executionTime: number): void {
    this.info('Search results returned', {
      totalResults,
      cached,
      executionTime,
    });
  }

  // Log cache operations
  logCacheOperation(
    operation: 'hit' | 'miss' | 'set' | 'invalidate',
    key?: string,
    meta?: any
  ): void {
    this.debug(`Cache ${operation}`, {
      key,
      ...meta,
    });
  }

  // Log database operations
  logDatabaseOperation(
    operation: string,
    table: string,
    executionTime: number,
    error?: Error
  ): void {
    if (error) {
      this.error(`Database ${operation} failed`, error, {
        table,
        executionTime,
      });
    } else {
      this.debug(`Database ${operation} completed`, {
        table,
        executionTime,
      });
    }
  }

  // Log API errors
  logApiError(endpoint: string, statusCode: number, error: Error, meta?: any): void {
    this.error(`API error on ${endpoint}`, error, {
      statusCode,
      endpoint,
      ...meta,
    });
  }

  // Log performance metrics
  logPerformanceMetrics(metrics: {
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    memoryUsage?: number;
    cacheHitRate?: number;
  }): void {
    this.http('Performance metrics', metrics);
  }

  // Log security events
  logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high', meta?: any): void {
    this.warn(`Security event: ${event}`, {
      severity,
      timestamp: new Date().toISOString(),
      ...meta,
    });
  }
}

// Middleware to add request ID and user context to logs
export const createRequestLogger = (requestId: string, userId?: string): SearchLogger => {
  return new SearchLogger(requestId, userId);
};

// Performance monitoring
export class PerformanceMonitor {
  private startTime: number;
  private logger: SearchLogger;

  constructor(logger: SearchLogger) {
    this.logger = logger;
    this.startTime = Date.now();
  }

  end(operation: string, meta?: any): number {
    const executionTime = Date.now() - this.startTime;
    this.logger.debug(`${operation} completed`, {
      executionTime,
      ...meta,
    });
    return executionTime;
  }

  static start(logger: SearchLogger): PerformanceMonitor {
    return new PerformanceMonitor(logger);
  }
}

// Error tracking
export class ErrorTracker {
  private static errors: Map<string, number> = new Map();

  static track(error: Error, context?: string): void {
    const key = `${error.name}:${context || 'unknown'}`;
    const count = this.errors.get(key) || 0;
    this.errors.set(key, count + 1);

    logger.error('Error tracked', {
      error: error.message,
      context,
      count: count + 1,
      stack: error.stack,
    });
  }

  static getStats(): Record<string, number> {
    return Object.fromEntries(this.errors);
  }

  static reset(): void {
    this.errors.clear();
  }
}

// Health check logging
export const logHealthCheck = (
  service: string,
  status: 'healthy' | 'unhealthy',
  details?: any
): void => {
  const level = status === 'healthy' ? 'info' : 'error';
  logger[level](`Health check: ${service}`, {
    status,
    timestamp: new Date().toISOString(),
    ...details,
  });
};

export default logger;
