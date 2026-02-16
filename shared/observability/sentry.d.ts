import * as Sentry from '@sentry/node';
import { Express } from 'express';
interface SentryConfig {
    dsn: string;
    environment: string;
    serviceName: string;
    release?: string;
    tracesSampleRate?: number;
    profilesSampleRate?: number;
    enabled?: boolean;
}
/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export declare const initializeSentry: (config: SentryConfig) => void;
/**
 * Setup Sentry middleware for Express apps
 */
export declare const setupSentryMiddleware: (app: Express) => void;
/**
 * Setup Sentry error handler (must be after all routes)
 */
export declare const setupSentryErrorHandler: (app: Express) => void;
/**
 * Capture exception manually
 */
export declare const captureException: (error: Error, context?: Record<string, any>) => void;
/**
 * Capture message manually
 */
export declare const captureMessage: (message: string, level?: Sentry.SeverityLevel, context?: Record<string, any>) => void;
/**
 * Add breadcrumb for debugging
 */
export declare const addBreadcrumb: (breadcrumb: Sentry.Breadcrumb) => void;
/**
 * Set user context
 */
export declare const setUser: (user: {
    id: string;
    email?: string;
    username?: string;
}) => void;
/**
 * Set custom context
 */
export declare const setContext: (name: string, context: Record<string, any>) => void;
/**
 * Start a transaction for performance monitoring
 */
export declare const startTransaction: (name: string, op: string) => Sentry.Transaction;
/**
 * Flush pending events (useful for serverless/shutdown)
 */
export declare const flush: (timeout?: number) => Promise<boolean>;
export { Sentry };
//# sourceMappingURL=sentry.d.ts.map