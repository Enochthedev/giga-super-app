import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

export const requestLogger = (req, res, next) => {
  // Generate unique request ID
  req.id = uuidv4();

  // Start timer
  const startTime = Date.now();

  // Log request
  logger.info('Incoming request', {
    requestId: req.id,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length'),
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function (body) {
    const duration = Date.now() - startTime;

    logger.info('Request completed', {
      requestId: req.id,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      success: body?.success !== false,
    });

    return originalJson.call(this, body);
  };

  // Add request ID to response headers
  res.set('X-Request-ID', req.id);

  next();
};
