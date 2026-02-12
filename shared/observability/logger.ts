import winston from 'winston';

/**
 * Enhanced structured logging with multiple transports
 */

export interface LogContext {
  traceId?: string;
  spanId?: string;
  userId?: string;
  service: string;
  [key: string]: any;
}

/**
 * Create a logger instance for a service
 */
export const createLogger = (serviceName: string) => {
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: {
      service: serviceName,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || 'unknown',
    },
    transports: [
      // Console transport for all environments
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
            return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`;
          })
        ),
      }),
    ],
  });

  // Add file transport in production
  if (process.env.NODE_ENV === 'production') {
    logger.add(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 10485760, // 10MB
        maxFiles: 5,
      })
    );

    logger.add(
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 10485760, // 10MB
        maxFiles: 5,
      })
    );
  }

  return logger;
};

/**
 * Logger wrapper with context support
 */
export class ContextLogger {
  constructor(
    private logger: winston.Logger,
    private context: LogContext
  ) {}

  /**
   * Add context to logger
   */
  withContext(additionalContext: Partial<LogContext>): ContextLogger {
    return new ContextLogger(this.logger, {
      ...this.context,
      ...additionalContext,
    });
  }

  /**
   * Log info message
   */
  info(message: string, meta?: Record<string, any>): void {
    this.logger.info(message, { ...this.context, ...meta });
  }

  /**
   * Log warning message
   */
  warn(message: string, meta?: Record<string, any>): void {
    this.logger.warn(message, { ...this.context, ...meta });
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, meta?: Record<string, any>): void {
    const errorMeta =
      error instanceof Error
        ? {
            error: {
              message: error.message,
              stack: error.stack,
              name: error.name,
            },
          }
        : { error };

    this.logger.error(message, {
      ...this.context,
      ...errorMeta,
      ...meta,
    });
  }

  /**
   * Log debug message
   */
  debug(message: string, meta?: Record<string, any>): void {
    this.logger.debug(message, { ...this.context, ...meta });
  }

  /**
   * Log HTTP request
   */
  logRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    meta?: Record<string, any>
  ): void {
    this.logger.info('HTTP Request', {
      ...this.context,
      http: {
        method,
        path,
        status_code: statusCode,
        duration_ms: duration,
      },
      ...meta,
    });
  }

  /**
   * Log database query
   */
  logQuery(operation: string, table: string, duration: number, meta?: Record<string, any>): void {
    this.logger.debug('Database Query', {
      ...this.context,
      database: {
        operation,
        table,
        duration_ms: duration,
      },
      ...meta,
    });
  }

  /**
   * Log external service call
   */
  logExternalCall(
    service: string,
    operation: string,
    duration: number,
    success: boolean,
    meta?: Record<string, any>
  ): void {
    const level = success ? 'info' : 'warn';
    this.logger.log(level, 'External Service Call', {
      ...this.context,
      external_service: {
        name: service,
        operation,
        duration_ms: duration,
        success,
      },
      ...meta,
    });
  }

  /**
   * Log business event
   */
  logBusinessEvent(eventType: string, meta?: Record<string, any>): void {
    this.logger.info('Business Event', {
      ...this.context,
      event: {
        type: eventType,
        timestamp: new Date().toISOString(),
      },
      ...meta,
    });
  }

  /**
   * Log security event
   */
  logSecurityEvent(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    meta?: Record<string, any>
  ): void {
    this.logger.warn('Security Event', {
      ...this.context,
      security: {
        event_type: eventType,
        severity,
        timestamp: new Date().toISOString(),
      },
      ...meta,
    });
  }
}

/**
 * Create a context logger
 */
export const createContextLogger = (
  serviceName: string,
  context?: Partial<LogContext>
): ContextLogger => {
  const logger = createLogger(serviceName);
  return new ContextLogger(logger, {
    service: serviceName,
    ...context,
  });
};
