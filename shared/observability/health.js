"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMemoryChecker = exports.createExternalServiceChecker = exports.createDatabaseChecker = exports.createHealthCheck = void 0;
const metrics_1 = require("./metrics");
/**
 * Create health check endpoints
 */
const createHealthCheck = (serviceName, version, checkers = []) => {
    const startTime = Date.now();
    /**
     * Liveness probe - Is the service running?
     */
    const liveness = async (req, res) => {
        res.status(200).json({
            status: 'healthy',
            service: serviceName,
            timestamp: new Date().toISOString(),
        });
    };
    /**
     * Readiness probe - Is the service ready to accept traffic?
     */
    const readiness = async (req, res) => {
        const checks = {};
        let overallStatus = 'healthy';
        // Run all health checks
        for (const checker of checkers) {
            try {
                const result = await checker.check();
                checks[checker.name] = result;
                if (result.status === 'fail') {
                    overallStatus = 'unhealthy';
                }
                else if (result.status === 'warn' && overallStatus === 'healthy') {
                    overallStatus = 'degraded';
                }
            }
            catch (error) {
                checks[checker.name] = {
                    status: 'fail',
                    message: error instanceof Error ? error.message : 'Unknown error',
                };
                overallStatus = 'unhealthy';
            }
        }
        const result = {
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
    const health = async (req, res) => {
        const checks = {};
        let overallStatus = 'healthy';
        // Run all health checks
        for (const checker of checkers) {
            try {
                const result = await checker.check();
                checks[checker.name] = result;
                if (result.status === 'fail') {
                    overallStatus = 'unhealthy';
                }
                else if (result.status === 'warn' && overallStatus === 'healthy') {
                    overallStatus = 'degraded';
                }
            }
            catch (error) {
                checks[checker.name] = {
                    status: 'fail',
                    message: error instanceof Error ? error.message : 'Unknown error',
                };
                overallStatus = 'unhealthy';
            }
        }
        const result = {
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
    const metrics = async (req, res) => {
        try {
            const metricsData = await (0, metrics_1.getMetrics)();
            res.set('Content-Type', (0, metrics_1.getMetricsContentType)());
            res.send(metricsData);
        }
        catch (error) {
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
exports.createHealthCheck = createHealthCheck;
/**
 * Common health checkers
 */
/**
 * Database health checker
 */
const createDatabaseChecker = (checkFn, name = 'database') => ({
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
        }
        catch (error) {
            return {
                status: 'fail',
                message: error instanceof Error ? error.message : 'Database check failed',
                responseTime: Date.now() - start,
            };
        }
    },
});
exports.createDatabaseChecker = createDatabaseChecker;
/**
 * External service health checker
 */
const createExternalServiceChecker = (serviceName, checkFn) => ({
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
        }
        catch (error) {
            return {
                status: 'fail',
                message: error instanceof Error ? error.message : `${serviceName} check failed`,
                responseTime: Date.now() - start,
            };
        }
    },
});
exports.createExternalServiceChecker = createExternalServiceChecker;
/**
 * Memory health checker
 */
const createMemoryChecker = (thresholdPercent = 90) => ({
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
exports.createMemoryChecker = createMemoryChecker;
//# sourceMappingURL=health.js.map