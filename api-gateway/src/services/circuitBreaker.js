/**
 * Circuit Breaker implementation for service resilience
 */

export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds

    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
    this.requestCount = 0;

    // Statistics
    this.stats = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      stateChanges: [],
    };
  }

  async execute(operation) {
    this.stats.totalRequests++;
    this.requestCount++;

    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
        this.recordStateChange('HALF_OPEN');
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.stats.totalSuccesses++;
    this.successCount++;

    if (this.state === 'HALF_OPEN') {
      // Reset circuit breaker after successful request in half-open state
      this.reset();
    } else {
      // Reset failure count on success
      this.failureCount = 0;
    }
  }

  onFailure() {
    this.stats.totalFailures++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.trip();
    }
  }

  trip() {
    this.state = 'OPEN';
    this.recordStateChange('OPEN');
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.recordStateChange('CLOSED');
  }

  shouldAttemptReset() {
    return this.lastFailureTime && Date.now() - this.lastFailureTime >= this.recoveryTimeout;
  }

  recordStateChange(newState) {
    this.stats.stateChanges.push({
      state: newState,
      timestamp: new Date().toISOString(),
      failureCount: this.failureCount,
      successCount: this.successCount,
    });

    // Keep only last 10 state changes
    if (this.stats.stateChanges.length > 10) {
      this.stats.stateChanges.shift();
    }
  }

  getState() {
    return this.state;
  }

  getStats() {
    return {
      ...this.stats,
      currentState: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      failureRate:
        this.stats.totalRequests > 0
          ? (this.stats.totalFailures / this.stats.totalRequests) * 100
          : 0,
    };
  }

  isHealthy() {
    return this.state === 'CLOSED' || this.state === 'HALF_OPEN';
  }
}

/**
 * Circuit Breaker Manager for multiple services
 */
export class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
  }

  getBreaker(serviceId, options = {}) {
    if (!this.breakers.has(serviceId)) {
      this.breakers.set(serviceId, new CircuitBreaker(options));
    }
    return this.breakers.get(serviceId);
  }

  async executeWithBreaker(serviceId, operation, options = {}) {
    const breaker = this.getBreaker(serviceId, options);
    return breaker.execute(operation);
  }

  getAllStats() {
    const stats = {};
    for (const [serviceId, breaker] of this.breakers) {
      stats[serviceId] = breaker.getStats();
    }
    return stats;
  }

  getHealthyServices() {
    const healthy = [];
    for (const [serviceId, breaker] of this.breakers) {
      if (breaker.isHealthy()) {
        healthy.push(serviceId);
      }
    }
    return healthy;
  }

  getUnhealthyServices() {
    const unhealthy = [];
    for (const [serviceId, breaker] of this.breakers) {
      if (!breaker.isHealthy()) {
        unhealthy.push(serviceId);
      }
    }
    return unhealthy;
  }
}

export const circuitBreakerManager = new CircuitBreakerManager();
