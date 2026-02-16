import { NextFunction, Request, Response } from 'express';
/**
 * Distributed tracing utilities for tracking requests across services
 */
export interface TraceContext {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    serviceName: string;
    timestamp: string;
}
/**
 * Middleware to add trace context to requests
 */
export declare const tracingMiddleware: (serviceName: string) => (req: Request, res: Response, next: NextFunction) => void;
/**
 * Get trace context from request
 */
export declare const getTraceContext: (req: Request) => TraceContext | undefined;
/**
 * Create headers for downstream service calls
 */
export declare const createTraceHeaders: (req: Request) => Record<string, string>;
/**
 * Log with trace context
 */
export declare const logWithTrace: (req: Request, level: "info" | "warn" | "error", message: string, metadata?: Record<string, any>) => void;
/**
 * Create a span for tracking operation duration
 */
export declare class Span {
    name: string;
    traceContext: TraceContext;
    metadata?: Record<string, any> | undefined;
    private startTime;
    private endTime?;
    constructor(name: string, traceContext: TraceContext, metadata?: Record<string, any> | undefined);
    /**
     * End the span and return duration
     */
    end(): number;
    /**
     * Get span duration in milliseconds
     */
    duration(): number;
    /**
     * Add metadata to span
     */
    addMetadata(key: string, value: any): void;
    /**
     * Convert span to log format
     */
    toLog(): Record<string, any>;
}
/**
 * Create a new span
 */
export declare const createSpan: (name: string, req: Request, metadata?: Record<string, any>) => Span | null;
/**
 * Trace an async operation
 */
export declare const traceOperation: <T>(name: string, req: Request, operation: () => Promise<T>, metadata?: Record<string, any>) => Promise<T>;
//# sourceMappingURL=tracing.d.ts.map