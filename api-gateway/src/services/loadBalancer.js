/**
 * Load Balancer for distributing requests across service instances
 */

export class LoadBalancer {
  constructor(strategy = 'round-robin') {
    this.strategy = strategy;
    this.counters = new Map(); // For round-robin tracking
    this.weights = new Map(); // For weighted round-robin
  }

  /**
   * Select the best instance from available healthy instances
   */
  selectInstance(serviceId, instances) {
    const healthyInstances = instances.filter(instance => instance.healthy);

    if (healthyInstances.length === 0) {
      throw new Error(`No healthy instances available for service: ${serviceId}`);
    }

    if (healthyInstances.length === 1) {
      return healthyInstances[0];
    }

    switch (this.strategy) {
      case 'round-robin':
        return this.roundRobin(serviceId, healthyInstances);
      case 'weighted-round-robin':
        return this.weightedRoundRobin(serviceId, healthyInstances);
      case 'least-connections':
        return this.leastConnections(healthyInstances);
      case 'random':
        return this.random(healthyInstances);
      default:
        return this.roundRobin(serviceId, healthyInstances);
    }
  }

  roundRobin(serviceId, instances) {
    const counter = this.counters.get(serviceId) || 0;
    const selectedIndex = counter % instances.length;
    this.counters.set(serviceId, counter + 1);
    return instances[selectedIndex];
  }

  weightedRoundRobin(serviceId, instances) {
    // Simple weighted implementation - can be enhanced
    const weights = instances.map(
      instance => this.weights.get(instance.id) || instance.weight || 1
    );

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const counter = this.counters.get(serviceId) || 0;

    let weightSum = 0;
    const targetWeight = (counter % totalWeight) + 1;

    for (let i = 0; i < instances.length; i++) {
      weightSum += weights[i];
      if (weightSum >= targetWeight) {
        this.counters.set(serviceId, counter + 1);
        return instances[i];
      }
    }

    // Fallback to first instance
    return instances[0];
  }

  leastConnections(instances) {
    return instances.reduce((least, current) => {
      const leastConnections = least.activeConnections || 0;
      const currentConnections = current.activeConnections || 0;
      return currentConnections < leastConnections ? current : least;
    });
  }

  random(instances) {
    const randomIndex = Math.floor(Math.random() * instances.length);
    return instances[randomIndex];
  }

  /**
   * Update instance metrics for load balancing decisions
   */
  updateInstanceMetrics(instanceId, metrics) {
    // Store metrics for future load balancing decisions
    // This could include response time, active connections, etc.
  }

  /**
   * Set weight for weighted round-robin
   */
  setWeight(instanceId, weight) {
    this.weights.set(instanceId, weight);
  }

  /**
   * Get load balancing statistics
   */
  getStats() {
    return {
      strategy: this.strategy,
      counters: Object.fromEntries(this.counters),
      weights: Object.fromEntries(this.weights),
    };
  }
}

export const loadBalancer = new LoadBalancer();
