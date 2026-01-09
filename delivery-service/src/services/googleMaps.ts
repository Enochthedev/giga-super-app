import config from '../config';
import { Address, GoogleMapsRoute } from '../types';
import { cache } from '../utils/cache';
import logger from '../utils/logger';

class GoogleMapsService {
  private static instance: GoogleMapsService;
  private apiKey: string;

  private constructor() {
    this.apiKey = config.googleMaps.apiKey;
    if (!this.apiKey) {
      logger.warn('Google Maps API key not configured');
    }
    logger.info('Google Maps service initialized');
  }

  public static getInstance(): GoogleMapsService {
    if (!GoogleMapsService.instance) {
      GoogleMapsService.instance = new GoogleMapsService();
    }
    return GoogleMapsService.instance;
  }

  /**
   * Optimize route for multiple waypoints
   * This is a simplified implementation for the route optimization task
   */
  public async optimizeRoute(
    startLocation: { latitude: number; longitude: number },
    waypoints: Address[],
    endLocation?: { latitude: number; longitude: number }
  ): Promise<{
    optimized_sequence: number[];
    total_distance_km: number;
    total_duration_minutes: number;
    routes: GoogleMapsRoute[];
  }> {
    const cacheKey = `route_optimization:${startLocation.latitude},${startLocation.longitude}:${waypoints.length}`;

    // Check cache first
    const cached = cache.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // For now, implement a simple nearest neighbor optimization
      // In a real implementation, this would use Google Maps Directions API
      const optimizedSequence = this.nearestNeighborOptimization(startLocation, waypoints);

      // Calculate approximate metrics
      const totalDistance = this.calculateTotalDistance(
        startLocation,
        waypoints,
        optimizedSequence
      );
      const totalDuration = Math.round((totalDistance / 40) * 60); // Assume 40 km/h average speed

      const result = {
        optimized_sequence: optimizedSequence,
        total_distance_km: totalDistance,
        total_duration_minutes: totalDuration,
        routes: [], // Would contain detailed route information in real implementation
      };

      // Cache for 1 hour
      cache.set(cacheKey, result, 3600);

      logger.info('Route optimization completed', {
        waypoints_count: waypoints.length,
        total_distance_km: result.total_distance_km.toFixed(2),
        total_duration_minutes: result.total_duration_minutes,
      });

      return result;
    } catch (error) {
      logger.error('Route optimization failed', {
        waypoints_count: waypoints.length,
        error: error instanceof Error ? error.message : error,
      });
      throw new Error('Failed to optimize route');
    }
  }

  /**
   * Simple nearest neighbor optimization
   */
  private nearestNeighborOptimization(
    startLocation: { latitude: number; longitude: number },
    waypoints: Address[]
  ): number[] {
    const n = waypoints.length;
    if (n === 0) return [];

    const visited = new Array(n).fill(false);
    const sequence = [];
    let currentLocation = startLocation;

    for (let i = 0; i < n; i++) {
      let nearestDistance = Infinity;
      let nearestIndex = -1;

      for (let j = 0; j < n; j++) {
        if (!visited[j]) {
          const distance = this.calculateDistance(currentLocation, {
            latitude: waypoints[j].latitude!,
            longitude: waypoints[j].longitude!,
          });

          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = j;
          }
        }
      }

      if (nearestIndex !== -1) {
        sequence.push(nearestIndex);
        visited[nearestIndex] = true;
        currentLocation = {
          latitude: waypoints[nearestIndex].latitude!,
          longitude: waypoints[nearestIndex].longitude!,
        };
      }
    }

    return sequence;
  }

  /**
   * Calculate total distance for a route
   */
  private calculateTotalDistance(
    startLocation: { latitude: number; longitude: number },
    waypoints: Address[],
    sequence: number[]
  ): number {
    let totalDistance = 0;
    let currentLocation = startLocation;

    for (const index of sequence) {
      const waypoint = waypoints[index];
      const distance = this.calculateDistance(currentLocation, {
        latitude: waypoint.latitude!,
        longitude: waypoint.longitude!,
      });
      totalDistance += distance;
      currentLocation = {
        latitude: waypoint.latitude!,
        longitude: waypoint.longitude!,
      };
    }

    return totalDistance;
  }

  /**
   * Calculate distance and estimated duration between two points
   * Public method for external use
   */
  public async calculateDistanceAndDuration(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): Promise<{
    distance_meters: number;
    duration_seconds: number;
  }> {
    const distanceKm = this.calculateDistance(point1, point2);
    const distanceMeters = distanceKm * 1000;
    const durationSeconds = Math.round((distanceKm / 40) * 3600); // Assume 40 km/h average speed

    return {
      distance_meters: distanceMeters,
      duration_seconds: durationSeconds,
    };
  }

  /**
   * Calculate haversine distance between two points
   */
  public calculateDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);
    const lat1 = this.toRadians(point1.latitude);
    const lat2 = this.toRadians(point2.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

// Export singleton instance
export const googleMapsService = GoogleMapsService.getInstance();
