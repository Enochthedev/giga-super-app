/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'opossum' {
  interface CircuitBreakerOptions {
    timeout?: number;
    errorThresholdPercentage?: number;
    resetTimeout?: number;
    rollingCountTimeout?: number;
    rollingCountBuckets?: number;
    name?: string;
  }

  interface CircuitBreakerStats {
    failures?: number;
    successes?: number;
    fallbacks?: number;
    timeouts?: number;
    fires?: number;
    rejects?: number;
    latencyMean?: number;
    percentiles?: Record<string, number>;
  }

  class CircuitBreaker {
    constructor(action: (...args: any[]) => Promise<any>, options?: CircuitBreakerOptions);

    fire<T>(...args: any[]): Promise<T>;
    fallback(fn: () => void): void;

    on(event: 'open' | 'halfOpen' | 'close' | 'failure', callback: (error?: Error) => void): void;

    get opened(): boolean;
    get halfOpen(): boolean;
    get stats(): CircuitBreakerStats;
  }

  export = CircuitBreaker;
}
