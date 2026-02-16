import { Request, Response } from 'express';
/**
 * Health check utilities for Kubernetes/Railway readiness and liveness probes
 */
export interface HealthCheckResult {
    status: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: string;
    service: string;
    version: string;
    uptime: number;
    checks: {
        [key: string]: {
            status: 'pass' | 'fail' | 'warn';
            message?: string;
            responseTime?: number;
        };
    };
}
export interface HealthChecker {
    name: string;
    check: () => Promise<{
        status: 'pass' | 'fail' | 'warn';
        message?: string;
        responseTime?: number;
    }>;
}
/**
 * Create health check endpoints
 */
export declare const createHealthCheck: (serviceName: string, version: string, checkers?: HealthChecker[]) => {
    liveness: (req: Request, res: Response) => Promise<void>;
    readiness: (req: Request, res: Response) => Promise<void>;
    health: (req: Request, res: Response) => Promise<void>;
    metrics: (req: Request, res: Response) => Promise<void>;
};
/**
 * Common health checkers
 */
/**
 * Database health checker
 */
export declare const createDatabaseChecker: (checkFn: () => Promise<boolean>, name?: string) => HealthChecker;
/**
 * External service health checker
 */
export declare const createExternalServiceChecker: (serviceName: string, checkFn: () => Promise<boolean>) => HealthChecker;
/**
 * Memory health checker
 */
export declare const createMemoryChecker: (thresholdPercent?: number) => HealthChecker;
//# sourceMappingURL=health.d.ts.map