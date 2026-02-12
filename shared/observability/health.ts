import { Request, Response } from 'express';
import { getMetrics, getMetricsContentType } from './metrics';

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
export const createHealthCheck = (
  serviceName: string,
  version: string,
  checkers: HealthChecker[] = []
) => {
  const startTime = Date.now();

  /**
   * Liveness probe - Is the service running?
   */
  const liveness = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      status: 'healthy',
      service: serviceName,
      timestamp: new Date().toISOString(),
    });
  };

  /**
   * Readiness probe - Is the service ready to accept traffic?
   */
  const readiness = async (req: Request, res: Response): Promise<void> => {
    const checks: HealthCheckResult['checks'] = {};
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    // Run all health checks
    for (const checker of checkers) {
      try {
        const result = await checker.check();
        checks[checker.name] = result;

        if (result.status === 'fail') {
          overallStatus = 'unhealthy';
        } else if (result.status === 'warn' && overallStatus === 'healthy') {
          overallStatus = 'degraded';
        }
      } catch (error) {
        checks[checker.name] = {
          status: 'fail',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
        overallStatus = 'unhealthy';
      }
    }

    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: serviceName,
      version,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      checks,
    };

    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
    res.status(statusCode).json(result);
  };

  /**
   * Detailed health check with all information
   */
  const health = async (req: Request, res: Response): Promise<void> => {
    const checks: HealthCheckResult['checks'] = {};
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    // Run all health checks
    for (const checker of checkers) {
      try {
        const result = await checker.check();
        checks[checker.name] = result;

        if (result.status === 'fail') {
          overallStatus = 'unhealthy';
        } else if (result.status === 'warn' && overallStatus === 'healthy') {
          overallStatus = 'degraded';
        }
      } catch (error) {
        checks[checker.name] = {
          status: 'fail',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
        overallStatus = 'unhealthy';
      }
    }

    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: serviceName,
      version,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      checks,
    };

    res.status(200).json(result);
  };

  /**
   * Metrics endpoint for Prometheus
   */
  const metrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const metricsData = await getMetrics();
      res.set('Content-Type', getMetricsContentType());
      res.send(metricsData);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to collect metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  return {
    liveness,
    readiness,
    health,
    metrics,
  };
};

/**
 * Common health checkers
 */

/**
 * Database health checker
 */
export const createDatabaseChecker = (
  checkFn: () => Promise<boolean>,
  name = 'database'
): HealthChecker => ({
  name,
  check: async () => {
    const start = Date.now();
    try {
      const isHealthy = await checkFn();
      const responseTime = Date.now() - start;

      return {
        status: isHealthy ? 'pass' : 'fail',
        message: isHealthy ? 'Database connection healthy' : 'Database connection failed',
        responseTime,
      };
    } catch (error) {
      return {
        status: 'fail',
        message: error instanceof Error ? error.message : 'Database check failed',
        responseTime: Date.now() - start,
      };
    }
  },
});

/**
 * External service health checker
 */
export const createExternalServiceChecker = (
  serviceName: string,
  checkFn: () => Promise<boolean>
): HealthChecker => ({
  name: serviceName,
  check: async () => {
    const start = Date.now();
    try {
      const isHealthy = await checkFn();
      const responseTime = Date.now() - start;

      return {
        status: isHealthy ? 'pass' : 'fail',
        message: isHealthy ? `${serviceName} is reachable` : `${serviceName} is unreachable`,
        responseTime,
      };
    } catch (error) {
      return {
        status: 'fail',
        message: error instanceof Error ? error.message : `${serviceName} check failed`,
        responseTime: Date.now() - start,
      };
    }
  },
});

/**
 * Memory health checker
 */
export const createMemoryChecker = (thresholdPercent = 90): HealthChecker => ({
  name: 'memory',
  check: async () => {
    const usage = process.memoryUsage();
    const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;

    return {
      status: heapUsedPercent < thresholdPercent ? 'pass' : 'warn',
      message: `Heap usage: ${heapUsedPercent.toFixed(2)}%`,
      responseTime: 0,
    };
  },
});
