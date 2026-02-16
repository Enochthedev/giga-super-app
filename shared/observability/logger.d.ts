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
export declare const createLogger: (serviceName: string) => winston.Logger;
/**
 * Logger wrapper with context support
 */
export declare class ContextLogger {
    private logger;
    private context;
    constructor(logger: winston.Logger, context: LogContext);
    /**
     * Add context to logger
     */
    withContext(additionalContext: Partial<LogContext>): ContextLogger;
    /**
     * Log info message
     */
    info(message: string, meta?: Record<string, any>): void;
    /**
     * Log warning message
     */
    warn(message: string, meta?: Record<string, any>): void;
    /**
     * Log error message
     */
    error(message: string, error?: Error | unknown, meta?: Record<string, any>): void;
    /**
     * Log debug message
     */
    debug(message: string, meta?: Record<string, any>): void;
    /**
     * Log HTTP request
     */
    logRequest(method: string, path: string, statusCode: number, duration: number, meta?: Record<string, any>): void;
    /**
     * Log database query
     */
    logQuery(operation: string, table: string, duration: number, meta?: Record<string, any>): void;
    /**
     * Log external service call
     */
    logExternalCall(service: string, operation: string, duration: number, success: boolean, meta?: Record<string, any>): void;
    /**
     * Log business event
     */
    logBusinessEvent(eventType: string, meta?: Record<string, any>): void;
    /**
     * Log security event
     */
    logSecurityEvent(eventType: string, severity: 'low' | 'medium' | 'high' | 'critical', meta?: Record<string, any>): void;
}
/**
 * Create a context logger
 */
export declare const createContextLogger: (serviceName: string, context?: Partial<LogContext>) => ContextLogger;
//# sourceMappingURL=logger.d.ts.map