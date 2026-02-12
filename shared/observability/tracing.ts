import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

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
export const tracingMiddleware = (serviceName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Get or create trace ID
    const traceId = (req.headers['x-trace-id'] as string) || uuidv4();
    const parentSpanId = req.headers['x-span-id'] as string;
    const spanId = uuidv4();

    // Store trace context in request
    (req as any).traceContext = {
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

/**
 * Get trace context from request
 */
export const getTraceContext = (req: Request): TraceContext | undefined => {
  return (req as any).traceContext;
};

/**
 * Create headers for downstream service calls
 */
export const createTraceHeaders = (req: Request): Record<string, string> => {
  const context = getTraceContext(req);

  if (!context) {
    return {};
  }

  return {
    'X-Trace-Id': context.traceId,
    'X-Span-Id': uuidv4(), // New span for downstream call
    'X-Parent-Span-Id': context.spanId,
  };
};

/**
 * Log with trace context
 */
export const logWithTrace = (
  req: Request,
  level: 'info' | 'warn' | 'error',
  message: string,
  metadata?: Record<string, any>
): void => {
  const context = getTraceContext(req);

  const logData = {
    level,
    message,
    ...metadata,
    trace: context,
    timestamp: new Date().toISOString(),
  };

  console.log(JSON.stringify(logData));
};

/**
 * Create a span for tracking operation duration
 */
export class Span {
  private startTime: number;
  private endTime?: number;

  constructor(
    public name: string,
    public traceContext: TraceContext,
    public metadata?: Record<string, any>
  ) {
    this.startTime = Date.now();
  }

  /**
   * End the span and return duration
   */
  end(): number {
    this.endTime = Date.now();
    return this.duration();
  }

  /**
   * Get span duration in milliseconds
   */
  duration(): number {
    const end = this.endTime || Date.now();
    return end - this.startTime;
  }

  /**
   * Add metadata to span
   */
  addMetadata(key: string, value: any): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata[key] = value;
  }

  /**
   * Convert span to log format
   */
  toLog(): Record<string, any> {
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

/**
 * Create a new span
 */
export const createSpan = (
  name: string,
  req: Request,
  metadata?: Record<string, any>
): Span | null => {
  const context = getTraceContext(req);

  if (!context) {
    return null;
  }

  return new Span(name, context, metadata);
};

/**
 * Trace an async operation
 */
export const traceOperation = async <T>(
  name: string,
  req: Request,
  operation: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> => {
  const span = createSpan(name, req, metadata);

  try {
    const result = await operation();

    if (span) {
      span.addMetadata('status', 'success');
      span.end();
      console.log(JSON.stringify({ type: 'span', ...span.toLog() }));
    }

    return result;
  } catch (error) {
    if (span) {
      span.addMetadata('status', 'error');
      span.addMetadata('error', error instanceof Error ? error.message : 'unknown');
      span.end();
      console.log(JSON.stringify({ type: 'span', ...span.toLog() }));
    }

    throw error;
  }
};
