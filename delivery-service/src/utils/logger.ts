import winston from 'winston';

const logLevel = process.env['LOG_LEVEL'] || 'info';
const logFormat = process.env['LOG_FORMAT'] || 'json';

// Custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, service = 'delivery-service', ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      service,
      message,
      ...meta,
    });
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat === 'json' ? structuredFormat : consoleFormat,
  defaultMeta: {
    service: 'delivery-service',
  },
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
});

// Add file transport in production
if (process.env['NODE_ENV'] === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: structuredFormat,
    })
  );

  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: structuredFormat,
    })
  );
}

// Request logging helper
export const logRequest = (req: any, res: any, responseTime?: number) => {
  const logData = {
    method: req.method,
    url: req.url,
    status: res.statusCode,
    user_id: req.user?.id,
    request_id: req.requestId,
    ip: req.ip,
    user_agent: req.get('User-Agent'),
    response_time_ms: responseTime,
  };

  if (res.statusCode >= 400) {
    logger.warn('HTTP request completed with error', logData);
  } else {
    logger.info('HTTP request completed', logData);
  }
};

// Error logging helper
export const logError = (error: Error, context?: Record<string, any>) => {
  logger.error('Application error', {
    error: error.message,
    stack: error.stack,
    ...context,
  });
};

// Audit logging helper
export const logAudit = (
  action: string,
  resource: string,
  resourceId: string,
  userId?: string,
  details?: Record<string, any>
) => {
  logger.info('Audit event', {
    audit: true,
    action,
    resource,
    resource_id: resourceId,
    user_id: userId,
    ...details,
  });
};

export default logger;
