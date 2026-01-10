/**
 * Rate Limiting Middleware
 * Protects endpoints from abuse
 */

import rateLimit from 'express-rate-limit';
import config from '../config';
import logger from '../utils/logger';
import { RateLimitError } from '../utils/errors';

/**
 * General rate limiter for all endpoints
 */
export const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      requestId: req.requestId,
    });

    const error = new RateLimitError();
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId || 'unknown',
        version: 'v1',
      },
    });
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path.startsWith('/health');
  },
});

/**
 * Stricter rate limiter for write operations (POST, PUT, DELETE)
 */
export const writeLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: Math.floor(config.rateLimit.maxRequests / 2), // Half of general limit
  message: 'Too many write requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Write rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      requestId: req.requestId,
    });

    const error = new RateLimitError(
      'Too many write requests, please slow down'
    );
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId || 'unknown',
        version: 'v1',
      },
    });
  },
});

/**
 * Very strict rate limiter for sensitive operations
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 minutes
  message: 'Too many attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Strict rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      requestId: req.requestId,
    });

    const error = new RateLimitError(
      'Too many attempts, please try again later'
    );
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        request_id: req.requestId || 'unknown',
        version: 'v1',
      },
    });
  },
});

/**
 * Rate limiter for login/auth endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});
