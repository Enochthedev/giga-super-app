"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sentry = exports.flush = exports.startTransaction = exports.setContext = exports.setUser = exports.addBreadcrumb = exports.captureMessage = exports.captureException = exports.setupSentryErrorHandler = exports.setupSentryMiddleware = exports.initializeSentry = void 0;
const Sentry = __importStar(require("@sentry/node"));
exports.Sentry = Sentry;
/**
 * Initialize Sentry for error tracking and performance monitoring
 */
const initializeSentry = (config) => {
    if (!config.enabled || !config.dsn) {
        console.log(`[${config.serviceName}] Sentry disabled or DSN not configured`);
        return;
    }
    Sentry.init({
        dsn: config.dsn,
        environment: config.environment,
        serverName: config.serviceName,
        release: config.release || `${config.serviceName}@${process.env.npm_package_version || 'unknown'}`,
        // Performance Monitoring
        tracesSampleRate: config.tracesSampleRate || 0.1, // 10% of transactions
        integrations: [
            // HTTP integration for tracking outgoing requests
            new Sentry.Integrations.Http({ tracing: true }),
            // Express integration (will be added via middleware)
        ],
        // Filter out health check noise
        beforeSend(event, hint) {
            const url = event.request?.url || '';
            // Don't send health check errors
            if (url.includes('/health') || url.includes('/ready') || url.includes('/live')) {
                return null;
            }
            return event;
        },
        // Add custom tags
        initialScope: {
            tags: {
                service: config.serviceName,
                node_version: process.version,
            },
        },
    });
    console.log(`[${config.serviceName}] Sentry initialized successfully`);
};
exports.initializeSentry = initializeSentry;
/**
 * Setup Sentry middleware for Express apps
 */
const setupSentryMiddleware = (app) => {
    // Request handler must be the first middleware
    app.use(Sentry.Handlers.requestHandler());
    // TracingHandler creates a trace for every incoming request
    app.use(Sentry.Handlers.tracingHandler());
};
exports.setupSentryMiddleware = setupSentryMiddleware;
/**
 * Setup Sentry error handler (must be after all routes)
 */
const setupSentryErrorHandler = (app) => {
    // Error handler must be before any other error middleware
    app.use(Sentry.Handlers.errorHandler({
        shouldHandleError(error) {
            // Capture all errors with status >= 500
            return true;
        },
    }));
};
exports.setupSentryErrorHandler = setupSentryErrorHandler;
/**
 * Capture exception manually
 */
const captureException = (error, context) => {
    Sentry.captureException(error, {
        extra: context,
    });
};
exports.captureException = captureException;
/**
 * Capture message manually
 */
const captureMessage = (message, level = 'info', context) => {
    Sentry.captureMessage(message, {
        level,
        extra: context,
    });
};
exports.captureMessage = captureMessage;
/**
 * Add breadcrumb for debugging
 */
const addBreadcrumb = (breadcrumb) => {
    Sentry.addBreadcrumb(breadcrumb);
};
exports.addBreadcrumb = addBreadcrumb;
/**
 * Set user context
 */
const setUser = (user) => {
    Sentry.setUser(user);
};
exports.setUser = setUser;
/**
 * Set custom context
 */
const setContext = (name, context) => {
    Sentry.setContext(name, context);
};
exports.setContext = setContext;
/**
 * Start a transaction for performance monitoring
 */
const startTransaction = (name, op) => {
    return Sentry.startTransaction({
        name,
        op,
    });
};
exports.startTransaction = startTransaction;
/**
 * Flush pending events (useful for serverless/shutdown)
 */
const flush = async (timeout = 2000) => {
    return Sentry.flush(timeout);
};
exports.flush = flush;
//# sourceMappingURL=sentry.js.map