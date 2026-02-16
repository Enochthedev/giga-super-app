"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContextLogger = exports.ContextLogger = exports.createLogger = void 0;
const winston_1 = __importDefault(require("winston"));
/**
 * Create a logger instance for a service
 */
const createLogger = (serviceName) => {
    const logger = winston_1.default.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
        defaultMeta: {
            service: serviceName,
            environment: process.env.NODE_ENV || 'development',
            version: process.env.npm_package_version || 'unknown',
        },
        transports: [
            // Console transport for all environments
            new winston_1.default.transports.Console({
                format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.printf(({ timestamp, level, message, service, ...meta }) => {
                    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                    return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`;
                })),
            }),
        ],
    });
    // Add file transport in production
    if (process.env.NODE_ENV === 'production') {
        logger.add(new winston_1.default.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 10485760, // 10MB
            maxFiles: 5,
        }));
        logger.add(new winston_1.default.transports.File({
            filename: 'logs/combined.log',
            maxsize: 10485760, // 10MB
            maxFiles: 5,
        }));
    }
    return logger;
};
exports.createLogger = createLogger;
/**
 * Logger wrapper with context support
 */
class ContextLogger {
    logger;
    context;
    constructor(logger, context) {
        this.logger = logger;
        this.context = context;
    }
    /**
     * Add context to logger
     */
    withContext(additionalContext) {
        return new ContextLogger(this.logger, {
            ...this.context,
            ...additionalContext,
        });
    }
    /**
     * Log info message
     */
    info(message, meta) {
        this.logger.info(message, { ...this.context, ...meta });
    }
    /**
     * Log warning message
     */
    warn(message, meta) {
        this.logger.warn(message, { ...this.context, ...meta });
    }
    /**
     * Log error message
     */
    error(message, error, meta) {
        const errorMeta = error instanceof Error
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
    debug(message, meta) {
        this.logger.debug(message, { ...this.context, ...meta });
    }
    /**
     * Log HTTP request
     */
    logRequest(method, path, statusCode, duration, meta) {
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
    logQuery(operation, table, duration, meta) {
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
    logExternalCall(service, operation, duration, success, meta) {
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
    logBusinessEvent(eventType, meta) {
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
    logSecurityEvent(eventType, severity, meta) {
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
exports.ContextLogger = ContextLogger;
/**
 * Create a context logger
 */
const createContextLogger = (serviceName, context) => {
    const logger = (0, exports.createLogger)(serviceName);
    return new ContextLogger(logger, {
        service: serviceName,
        ...context,
    });
};
exports.createContextLogger = createContextLogger;
//# sourceMappingURL=logger.js.map