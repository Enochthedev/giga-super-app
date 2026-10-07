/**
 * Sentry error tracking.
 *
 * Reports crashes AND failed responses (5xx, 429). A failure that is handled or
 * passed through from an upstream never throws, so crash-only reporting stays
 * silent while users are locked out. Disabled unless SENTRY_ENABLED=true and
 * SENTRY_DSN are set.
 */
import * as Sentry from '@sentry/node';
import type { ErrorRequestHandler, RequestHandler } from 'express';

const enabled = process.env.SENTRY_ENABLED === 'true' && !!process.env.SENTRY_DSN;

/** Call once, before the app starts handling requests. */
export const initSentry = (serviceName: string): void => {
  if (!enabled) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    serverName: serviceName,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
    initialScope: { tags: { service: serviceName } },
  });
};

/** Collapse ids so one failing route groups into one Sentry issue. */
const normalizePath = (url: string): string =>
  url
    .split('?')[0]
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d+(?=\/|$)/g, '/:n');

/** Mount early: reports every 5xx/429 response once it is sent. */
export const sentryFailedResponses: RequestHandler = (req, res, next) => {
  if (!enabled) return next();
  res.on('finish', () => {
    const status = res.statusCode;
    if ((status < 500 && status !== 429) || res.locals.sentryReported) return;
    const path = normalizePath(req.originalUrl);
    Sentry.withScope(scope => {
      scope.setLevel(status >= 500 ? 'error' : 'warning');
      scope.setTags({ status_code: String(status), method: req.method, path });
      scope.setExtras({ url: req.originalUrl, requestId: req.headers['x-request-id'] });
      scope.setFingerprint([req.method, path, String(status)]);
      Sentry.captureMessage(`${req.method} ${path} -> ${status}`);
    });
  });
  next();
};

/** Mount after the routes, before the app's own error handler. */
export const sentryErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (enabled) {
    Sentry.captureException(err);
    res.locals.sentryReported = true;
  }
  next(err);
};

/** For failures outside a request (queue jobs, sockets, timers). */
export const captureError = (error: unknown, context?: Record<string, unknown>): void => {
  if (enabled) Sentry.captureException(error, { extra: context });
};
