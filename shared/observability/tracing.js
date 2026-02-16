"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.traceOperation = exports.createSpan = exports.Span = exports.logWithTrace = exports.createTraceHeaders = exports.getTraceContext = exports.tracingMiddleware = void 0;
const uuid_1 = require("uuid");
/**
 * Middleware to add trace context to requests
 */
const tracingMiddleware = (serviceName) => {
    return (req, res, next) => {
        // Get or create trace ID
        const traceId = req.headers['x-trace-id'] || (0, uuid_1.v4)();
        const parentSpanId = req.headers['x-span-id'];
        const spanId = (0, uuid_1.v4)();
        // Store trace context in request
        req.traceContext = {
            traceId,
            spanId,
            parentSpanId,
            serviceName,
            timestamp: new Date().toISOString(),
        };
        // Add trace headers to response
        res.setHeader('X-Trace-Id', traceId);
        res.setHeader('X-Span-Id', spanId);
        // Add trace ID to response locals for logging
        res.locals.traceId = traceId;
        res.locals.spanId = spanId;
        next();
    };
};
exports.tracingMiddleware = tracingMiddleware;
/**
 * Get trace context from request
 */
const getTraceContext = (req) => {
    return req.traceContext;
};
exports.getTraceContext = getTraceContext;
/**
 * Create headers for downstream service calls
 */
const createTraceHeaders = (req) => {
    const context = (0, exports.getTraceContext)(req);
    if (!context) {
        return {};
    }
    return {
        'X-Trace-Id': context.traceId,
        'X-Span-Id': (0, uuid_1.v4)(), // New span for downstream call
        'X-Parent-Span-Id': context.spanId,
    };
};
exports.createTraceHeaders = createTraceHeaders;
/**
 * Log with trace context
 */
const logWithTrace = (req, level, message, metadata) => {
    const context = (0, exports.getTraceContext)(req);
    const logData = {
        level,
        message,
        ...metadata,
        trace: context,
        timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(logData));
};
exports.logWithTrace = logWithTrace;
/**
 * Create a span for tracking operation duration
 */
class Span {
    name;
    traceContext;
    metadata;
    startTime;
    endTime;
    constructor(name, traceContext, metadata) {
        this.name = name;
        this.traceContext = traceContext;
        this.metadata = metadata;
        this.startTime = Date.now();
    }
    /**
     * End the span and return duration
     */
    end() {
        this.endTime = Date.now();
        return this.duration();
    }
    /**
     * Get span duration in milliseconds
     */
    duration() {
        const end = this.endTime || Date.now();
        return end - this.startTime;
    }
    /**
     * Add metadata to span
     */
    addMetadata(key, value) {
        if (!this.metadata) {
            this.metadata = {};
        }
        this.metadata[key] = value;
    }
    /**
     * Convert span to log format
     */
    toLog() {
        return {
            span_name: this.name,
            duration_ms: this.duration(),
            trace_id: this.traceContext.traceId,
            span_id: this.traceContext.spanId,
            parent_span_id: this.traceContext.parentSpanId,
            service: this.traceContext.serviceName,
            metadata: this.metadata,
            timestamp: this.traceContext.timestamp,
        };
    }
}
exports.Span = Span;
/**
 * Create a new span
 */
const createSpan = (name, req, metadata) => {
    const context = (0, exports.getTraceContext)(req);
    if (!context) {
        return null;
    }
    return new Span(name, context, metadata);
};
exports.createSpan = createSpan;
/**
 * Trace an async operation
 */
const traceOperation = async (name, req, operation, metadata) => {
    const span = (0, exports.createSpan)(name, req, metadata);
    try {
        const result = await operation();
        if (span) {
            span.addMetadata('status', 'success');
            span.end();
            console.log(JSON.stringify({ type: 'span', ...span.toLog() }));
        }
        return result;
    }
    catch (error) {
        if (span) {
            span.addMetadata('status', 'error');
            span.addMetadata('error', error instanceof Error ? error.message : 'unknown');
            span.end();
            console.log(JSON.stringify({ type: 'span', ...span.toLog() }));
        }
        throw error;
    }
};
exports.traceOperation = traceOperation;
//# sourceMappingURL=tracing.js.map