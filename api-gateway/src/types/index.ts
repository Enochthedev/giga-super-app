import type { NextFunction, Request, Response } from 'express';

export interface ServiceConfig {
  id: string;
  name: string;
  baseUrl: string;
  healthEndpoint: string;
  platform: 'supabase' | 'railway';
  patterns: string[];
  headers?: Record<string, string>;
  healthy?: boolean;
  lastHealthCheck?: Date | null;
}

export interface UserContext {
  id: string;
  email: string;
  role: string;
  roles: string[];
  claims: Record<string, unknown>;
  raw: unknown;
  authenticatedAt: string;
}

export interface AuthenticatedRequest extends Request {
  id?: string;
  user?: UserContext;
  authToken?: string;
  startTime?: number;
  requestId?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata: {
    timestamp: string;
    request_id?: string;
    version: string;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
}

export interface HealthCheckResult {
  healthy: boolean;
  status?: number;
  responseTime?: string;
  lastCheck: string;
  error?: string;
}

export interface CircuitBreakerStats {
  state: 'open' | 'half-open' | 'closed';
  failures: number;
  successes: number;
  fallbacks: number;
  timeouts: number;
  fires: number;
  rejects: number;
  latencyMean: number;
  percentiles: Record<string, number>;
}

export type AsyncMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

export type ErrorMiddleware = (
  error: Error,
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => void;
