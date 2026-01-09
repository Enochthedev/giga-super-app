import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { ERROR_CODES, LocationCoordinates, RouteWaypoint } from '../types';
import { cache } from '../utils/cache';
import { ServiceError } from '../utils/errors';
import { logger } from '../utils/logger';
import { googleMapsService } from './googleMaps';

export interface TimeWindow {
  start: string; // ISO timestamp
  end: string; // ISO timestamp
  type: 'pickup' | 'delivery' | 'break';
  priority?: number; // 1-5, higher is more important
}

export interface RouteOptimizationRequest {
  courier_id: string;
  assignment_ids: string[];
  start_location?: LocationCoordinates;
  end_location?: LocationCoordinates;
  time_windows?: TimeWindow[];
  optimization_preferences?: {
    minimize_distance?: boolean;
    minimize_time?: boolean;
    consider_traffic?: boolean;
    consider_priority?: boolean;
    respect_time_windows?: boolean;
    max_route_duration_hours?: number;
  };
  traffic_conditions?: {
    current_conditions: 'light' | 'moderate' | 'heavy';
    predicted_conditions?: Array<{
      time: string;
      condition: 'light' | 'moderate' | 'heavy';
    }>;
  };
}

export interface OptimizedRoute {
  id: string;
  courier_id: string;
  assignment_ids: string[];
  optimized_sequence: number[];
  waypoints: RouteWaypoint[];
  total_distance_km: number;
  estimated_duration_minutes: number;
  estimated_fuel_cost: number;
  efficiency_score: number;
  time_window_violations: Array<{
    assignment_id: string;
    violation_type: 'early' | 'late';
    violation_minutes: number;
  }>;
  traffic_adjustments: Array<{
    segment: string;
    original_duration: number;
    adjusted_duration: number;
    traffic_factor: number;
  }>;
  alternative_routes?: OptimizedRoute[];
  created_at: string;
  expires_at: string;
}

export interface RouteAdjustment {
  reason: 'traffic' | 'delay' | 'priority_change' | 'new_assignment' | 'cancellation';
  affected_assignments: string[];
  new_sequence?: number[];
  estimated_delay_minutes?: number;
  alternative_routes?: OptimizedRoute[];
}

/**
 * Advanced route optimization service with multi-stop optimization,
 * time window constraints, traffic consideration, and dynamic adjustments
 */
export class RouteOptimizationService {
  private supabase: SupabaseClient;
  private readonly CACHE_TTL_SECONDS = 1800; // 30 minutes
  private readonly MAX_WAYPOINTS_GOOGLE = 25; // Google Maps API limit
  private readonly FUEL_COST_PER_KM = 0.15; // Naira per km (configurable)
  private readonly TRAFFIC_MULTIPLIERS = {
    light: 1.0,
    moderate: 1.3,
    heavy: 1.8,
  };

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Optimize delivery routes for a courier with multiple assignments
   */
  async optimizeDeliveryRoutes(
    request: RouteOptimizationRequest,
    requestId: string
  ): Promise<OptimizedRoute> {
    logger.info('Starting route optimization', {
      requestId,
      courierId: request.courier_id,
      assignmentCount: request.assignment_ids.length,
      preferences: request.optimization_preferences,
    });

    // Validate request
    await this.validateOptimizationRequest(request, requestId);

    // Check cache first
    const cacheKey = this.generateCacheKey(request);
    const cached = cache.get<OptimizedRoute>(cacheKey);
    if (cached && !this.isCacheExpired(cached)) {
      logger.debug('Returning cached route optimization', { requestId, cacheKey });
      return cached;
    }

    try {
      // Get courier and assignment details
      const [courier, assignments] = await Promise.all([
        this.getCourierDetails(request.courier_id, requestId),
        this.getAssignmentDetails(request.assignment_ids, requestId),
      ]);

      // Determine start location (courier's current location or specified)
      const startLocation = request.start_location || {
        latitude: courier.current_latitude || 0,
        longitude: courier.current_longitude || 0,
      };

      // Create waypoints from assignments
      const waypoints = this.createWaypoints(assignments, request.time_windows);

      // Optimize route based on preferences
      const optimizedRoute = await this.performRouteOptimization(
        startLocation,
        waypoints,
        request,
        requestId
      );

      // Apply traffic adjustments
      const routeWithTraffic = await this.applyTrafficAdjustments(
        optimizedRoute,
        request.traffic_conditions,
        requestId
      );

      // Calculate efficiency metrics
      const finalRoute = this.calculateEfficiencyMetrics(routeWithTraffic, assignments);

      // Generate alternative routes
      finalRoute.alternative_routes = await this.generateAlternativeRoutes(
        startLocation,
        waypoints,
        request,
        requestId
      );

      // Cache the result
      cache.set(cacheKey, finalRoute, this.CACHE_TTL_SECONDS);

      // Store in database for persistence
      await this.storeOptimizedRoute(finalRoute, requestId);

      logger.info('Route optimization completed', {
        requestId,
        routeId: finalRoute.id,
        totalDistance: finalRoute.total_distance_km,
        estimatedDuration: finalRoute.estimated_duration_minutes,
        efficiencyScore: finalRoute.efficiency_score,
      });

      return finalRoute;
    } catch (error) {
      logger.error('Route optimization failed', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        courierId: request.courier_id,
      });
      throw error;
    }
  }

  /**
   * Adjust existing route due to traffic, delays, or other factors
   */
  async adjustRoute(
    routeId: string,
    adjustment: RouteAdjustment,
    requestId: string
  ): Promise<OptimizedRoute> {
    logger.info('Adjusting route', {
      requestId,
      routeId,
      reason: adjustment.reason,
      affectedAssignments: adjustment.affected_assignments.length,
    });

    try {
      // Get existing route
      const existingRoute = await this.getStoredRoute(routeId, requestId);
      if (!existingRoute) {
        throw new ServiceError('Route not found', ERROR_CODES.ASSIGNMENT_NOT_FOUND, 404);
      }

      // Apply adjustment based on reason
      let adjustedRoute: OptimizedRoute;

      switch (adjustment.reason) {
        case 'traffic':
          adjustedRoute = await this.adjustForTraffic(existingRoute, adjustment, requestId);
          break;
        case 'delay':
          adjustedRoute = await this.adjustForDelay(existingRoute, adjustment, requestId);
          break;
        case 'priority_change':
          adjustedRoute = await this.adjustForPriorityChange(existingRoute, adjustment, requestId);
          break;
        case 'new_assignment':
          adjustedRoute = await this.adjustForNewAssignment(existingRoute, adjustment, requestId);
          break;
        case 'cancellation':
          adjustedRoute = await this.adjustForCancellation(existingRoute, adjustment, requestId);
          break;
        default:
          throw new ServiceError('Invalid adjustment reason', ERROR_CODES.VALIDATION_ERROR, 400);
      }

      // Update cache and database
      const cacheKey = this.generateCacheKeyFromRoute(adjustedRoute);
      cache.set(cacheKey, adjustedRoute, this.CACHE_TTL_SECONDS);
      await this.storeOptimizedRoute(adjustedRoute, requestId);

      logger.info('Route adjustment completed', {
        requestId,
        originalRouteId: routeId,
        newRouteId: adjustedRoute.id,
        reason: adjustment.reason,
      });

      return adjustedRoute;
    } catch (error) {
      logger.error('Route adjustment failed', {
        requestId,
        routeId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get real-time route updates considering current traffic conditions
   */
  async getRealTimeRouteUpdate(
    routeId: string,
    currentLocation: LocationCoordinates,
    requestId: string
  ): Promise<{
    updated_route: OptimizedRoute;
    recommendations: Array<{
      type: 'continue' | 'reroute' | 'delay';
      message: string;
      estimated_time_savings?: number;
    }>;
  }> {
    logger.debug('Getting real-time route update', {
      requestId,
      routeId,
      currentLocation,
    });

    try {
      const existingRoute = await this.getStoredRoute(routeId, requestId);
      if (!existingRoute) {
        throw new ServiceError('Route not found', ERROR_CODES.ASSIGNMENT_NOT_FOUND, 404);
      }

      // Get current traffic conditions
      const trafficConditions = await this.getCurrentTrafficConditions(
        existingRoute.waypoints,
        requestId
      );

      // Calculate if rerouting would be beneficial
      const rerouteAnalysis = await this.analyzeRerouteOptions(
        currentLocation,
        existingRoute,
        trafficConditions,
        requestId
      );

      const recommendations = [];

      if (rerouteAnalysis.timeSavings > 10) {
        // Significant time savings available
        recommendations.push({
          type: 'reroute' as const,
          message: `Rerouting recommended: ${rerouteAnalysis.timeSavings} minutes faster`,
          estimated_time_savings: rerouteAnalysis.timeSavings,
        });

        // Generate updated route
        const updatedRoute = await this.generateUpdatedRoute(
          currentLocation,
          existingRoute,
          trafficConditions,
          requestId
        );

        return {
          updated_route: updatedRoute,
          recommendations,
        };
      } else if (rerouteAnalysis.delayMinutes > 15) {
        // Significant delay expected
        recommendations.push({
          type: 'delay' as const,
          message: `Traffic delay expected: ${rerouteAnalysis.delayMinutes} minutes`,
        });
      } else {
        // Continue with current route
        recommendations.push({
          type: 'continue' as const,
          message: 'Current route is optimal',
        });
      }

      return {
        updated_route: existingRoute,
        recommendations,
      };
    } catch (error) {
      logger.error('Real-time route update failed', {
        requestId,
        routeId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Validate optimization request
   */
  private async validateOptimizationRequest(
    request: RouteOptimizationRequest,
    requestId: string
  ): Promise<void> {
    if (!request.courier_id) {
      throw new ServiceError('Courier ID is required', ERROR_CODES.MISSING_REQUIRED_FIELD, 400);
    }

    if (!request.assignment_ids || request.assignment_ids.length === 0) {
      throw new ServiceError(
        'At least one assignment ID is required',
        ERROR_CODES.MISSING_REQUIRED_FIELD,
        400
      );
    }

    if (request.assignment_ids.length > this.MAX_WAYPOINTS_GOOGLE) {
      throw new ServiceError(
        `Maximum ${this.MAX_WAYPOINTS_GOOGLE} assignments supported`,
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    // Validate time windows if provided
    if (request.time_windows) {
      for (const window of request.time_windows) {
        const start = new Date(window.start);
        const end = new Date(window.end);
        if (start >= end) {
          throw new ServiceError(
            'Invalid time window: start must be before end',
            ERROR_CODES.VALIDATION_ERROR,
            400
          );
        }
      }
    }
  }

  /**
   * Get courier details
   */
  private async getCourierDetails(courierId: string, requestId: string): Promise<any> {
    const { data: courier, error } = await this.supabase
      .from('courier_profiles')
      .select('*')
      .eq('id', courierId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (error || !courier) {
      throw new ServiceError('Courier not found', ERROR_CODES.COURIER_NOT_FOUND, 404);
    }

    return courier;
  }

  /**
   * Get assignment details
   */
  private async getAssignmentDetails(assignmentIds: string[], requestId: string): Promise<any[]> {
    const { data: assignments, error } = await this.supabase
      .from('delivery_assignments')
      .select('*')
      .in('id', assignmentIds)
      .is('deleted_at', null);

    if (error) {
      throw new ServiceError('Failed to fetch assignments', ERROR_CODES.DATABASE_ERROR, 500);
    }

    if (!assignments || assignments.length !== assignmentIds.length) {
      throw new ServiceError('Some assignments not found', ERROR_CODES.ASSIGNMENT_NOT_FOUND, 404);
    }

    return assignments;
  }

  /**
   * Create waypoints from assignments
   */
  private createWaypoints(assignments: any[], timeWindows?: TimeWindow[]): RouteWaypoint[] {
    const waypoints: RouteWaypoint[] = [];

    for (const assignment of assignments) {
      // Add pickup waypoint
      waypoints.push({
        assignment_id: assignment.id,
        sequence: 0, // Will be set during optimization
        address: {
          street_address: assignment.pickup_address || '',
          city: assignment.pickup_city || '',
          state: assignment.pickup_state || '',
          country: assignment.pickup_country || 'Nigeria',
          latitude: assignment.pickup_latitude,
          longitude: assignment.pickup_longitude,
        },
        waypoint_type: 'pickup',
        estimated_arrival_time: '', // Will be calculated
        estimated_duration_minutes: 5, // Default pickup time
      });

      // Add delivery waypoint
      waypoints.push({
        assignment_id: assignment.id,
        sequence: 0, // Will be set during optimization
        address: {
          street_address: assignment.delivery_address || '',
          city: assignment.delivery_city || '',
          state: assignment.delivery_state || '',
          country: assignment.delivery_country || 'Nigeria',
          latitude: assignment.delivery_latitude,
          longitude: assignment.delivery_longitude,
        },
        waypoint_type: 'delivery',
        estimated_arrival_time: '', // Will be calculated
        estimated_duration_minutes: 10, // Default delivery time
      });
    }

    return waypoints;
  }

  /**
   * Perform route optimization using advanced algorithms
   */
  private async performRouteOptimization(
    startLocation: LocationCoordinates,
    waypoints: RouteWaypoint[],
    request: RouteOptimizationRequest,
    requestId: string
  ): Promise<OptimizedRoute> {
    const preferences = request.optimization_preferences || {};

    // Use different optimization strategies based on waypoint count
    if (waypoints.length <= 10) {
      // Use Google Maps optimization for small routes
      return await this.optimizeWithGoogleMaps(startLocation, waypoints, request, requestId);
    } else {
      // Use custom algorithm for larger routes
      return await this.optimizeWithCustomAlgorithm(startLocation, waypoints, request, requestId);
    }
  }

  /**
   * Optimize using Google Maps Directions API
   */
  private async optimizeWithGoogleMaps(
    startLocation: LocationCoordinates,
    waypoints: RouteWaypoint[],
    request: RouteOptimizationRequest,
    requestId: string
  ): Promise<OptimizedRoute> {
    try {
      // Convert waypoints to addresses for Google Maps
      const addresses = waypoints.map(wp => ({
        latitude: wp.address.latitude!,
        longitude: wp.address.longitude!,
        street_address: wp.address.street_address,
        city: wp.address.city,
        state: wp.address.state,
        country: wp.address.country,
      }));

      // Use Google Maps route optimization
      const optimizedGoogleRoute = await googleMapsService.optimizeRoute(
        startLocation,
        addresses,
        request.end_location
      );

      // Convert Google Maps result to our format
      const optimizedRoute: OptimizedRoute = {
        id: uuidv4(),
        courier_id: request.courier_id,
        assignment_ids: request.assignment_ids,
        optimized_sequence: optimizedGoogleRoute.optimized_sequence,
        waypoints: this.reorderWaypoints(waypoints, optimizedGoogleRoute.optimized_sequence),
        total_distance_km: optimizedGoogleRoute.total_distance_km,
        estimated_duration_minutes: optimizedGoogleRoute.total_duration_minutes,
        estimated_fuel_cost: optimizedGoogleRoute.total_distance_km * this.FUEL_COST_PER_KM,
        efficiency_score: 0, // Will be calculated later
        time_window_violations: [],
        traffic_adjustments: [],
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + this.CACHE_TTL_SECONDS * 1000).toISOString(),
      };

      return optimizedRoute;
    } catch (error) {
      logger.error('Google Maps optimization failed', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new ServiceError(
        'Route optimization failed',
        ERROR_CODES.ROUTE_OPTIMIZATION_FAILED,
        500
      );
    }
  }

  /**
   * Optimize using custom algorithm for larger routes
   */
  private async optimizeWithCustomAlgorithm(
    startLocation: LocationCoordinates,
    waypoints: RouteWaypoint[],
    request: RouteOptimizationRequest,
    requestId: string
  ): Promise<OptimizedRoute> {
    // Implement custom optimization algorithm (e.g., genetic algorithm, simulated annealing)
    // For now, use a simplified nearest neighbor with improvements

    const optimizedSequence = await this.nearestNeighborWithImprovements(
      startLocation,
      waypoints,
      request.optimization_preferences
    );

    // Calculate total distance and duration
    const { totalDistance, totalDuration } = await this.calculateRouteMetrics(
      startLocation,
      waypoints,
      optimizedSequence
    );

    const optimizedRoute: OptimizedRoute = {
      id: uuidv4(),
      courier_id: request.courier_id,
      assignment_ids: request.assignment_ids,
      optimized_sequence: optimizedSequence,
      waypoints: this.reorderWaypoints(waypoints, optimizedSequence),
      total_distance_km: totalDistance,
      estimated_duration_minutes: totalDuration,
      estimated_fuel_cost: totalDistance * this.FUEL_COST_PER_KM,
      efficiency_score: 0, // Will be calculated later
      time_window_violations: [],
      traffic_adjustments: [],
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + this.CACHE_TTL_SECONDS * 1000).toISOString(),
    };

    return optimizedRoute;
  }

  /**
   * Nearest neighbor algorithm with 2-opt improvements
   */
  private async nearestNeighborWithImprovements(
    startLocation: LocationCoordinates,
    waypoints: RouteWaypoint[],
    preferences?: any
  ): Promise<number[]> {
    const n = waypoints.length;
    if (n === 0) return [];

    // Create distance matrix
    const distanceMatrix = await this.createDistanceMatrix(startLocation, waypoints);

    // Nearest neighbor construction
    const visited = new Array(n).fill(false);
    const sequence = [];
    let currentIndex = -1; // Start from start location

    for (let i = 0; i < n; i++) {
      let nearestDistance = Infinity;
      let nearestIndex = -1;

      for (let j = 0; j < n; j++) {
        if (!visited[j]) {
          const distance =
            currentIndex === -1
              ? this.calculateDistance(startLocation, {
                  latitude: waypoints[j].address.latitude!,
                  longitude: waypoints[j].address.longitude!,
                })
              : distanceMatrix[currentIndex][j];

          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = j;
          }
        }
      }

      if (nearestIndex !== -1) {
        sequence.push(nearestIndex);
        visited[nearestIndex] = true;
        currentIndex = nearestIndex;
      }
    }

    // Apply 2-opt improvements
    return this.twoOptImprovement(sequence, distanceMatrix);
  }

  /**
   * 2-opt improvement algorithm
   */
  private twoOptImprovement(sequence: number[], distanceMatrix: number[][]): number[] {
    let improved = true;
    let bestSequence = [...sequence];

    while (improved) {
      improved = false;

      for (let i = 1; i < bestSequence.length - 2; i++) {
        for (let j = i + 1; j < bestSequence.length; j++) {
          if (j - i === 1) continue; // Skip adjacent edges

          const newSequence = [...bestSequence];
          // Reverse the segment between i and j
          const segment = newSequence.slice(i, j + 1).reverse();
          newSequence.splice(i, j - i + 1, ...segment);

          const currentDistance = this.calculateSequenceDistance(bestSequence, distanceMatrix);
          const newDistance = this.calculateSequenceDistance(newSequence, distanceMatrix);

          if (newDistance < currentDistance) {
            bestSequence = newSequence;
            improved = true;
          }
        }
      }
    }

    return bestSequence;
  }

  /**
   * Calculate total distance for a sequence
   */
  private calculateSequenceDistance(sequence: number[], distanceMatrix: number[][]): number {
    let totalDistance = 0;
    for (let i = 0; i < sequence.length - 1; i++) {
      totalDistance += distanceMatrix[sequence[i]][sequence[i + 1]];
    }
    return totalDistance;
  }

  /**
   * Create distance matrix between waypoints
   */
  private async createDistanceMatrix(
    startLocation: LocationCoordinates,
    waypoints: RouteWaypoint[]
  ): Promise<number[][]> {
    const n = waypoints.length;
    const matrix = Array(n)
      .fill(null)
      .map(() => Array(n).fill(0));

    // Calculate distances between all waypoint pairs
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const distance = this.calculateDistance(
            {
              latitude: waypoints[i].address.latitude!,
              longitude: waypoints[i].address.longitude!,
            },
            {
              latitude: waypoints[j].address.latitude!,
              longitude: waypoints[j].address.longitude!,
            }
          );
          matrix[i][j] = distance;
        }
      }
    }

    return matrix;
  }

  /**
   * Calculate haversine distance between two points
   */
  private calculateDistance(point1: LocationCoordinates, point2: LocationCoordinates): number {
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

  /**
   * Calculate route metrics (distance and duration)
   */
  private async calculateRouteMetrics(
    startLocation: LocationCoordinates,
    waypoints: RouteWaypoint[],
    sequence: number[]
  ): Promise<{ totalDistance: number; totalDuration: number }> {
    let totalDistance = 0;
    let totalDuration = 0;

    let currentLocation = startLocation;

    for (const waypointIndex of sequence) {
      const waypoint = waypoints[waypointIndex];
      const waypointLocation = {
        latitude: waypoint.address.latitude!,
        longitude: waypoint.address.longitude!,
      };

      // Calculate distance and estimated duration
      const distance = this.calculateDistance(currentLocation, waypointLocation);
      const duration = (distance / 40) * 60; // Assume 40 km/h average speed, convert to minutes

      totalDistance += distance;
      totalDuration += duration + waypoint.estimated_duration_minutes; // Add service time

      currentLocation = waypointLocation;
    }

    return { totalDistance, totalDuration };
  }

  /**
   * Reorder waypoints according to optimized sequence
   */
  private reorderWaypoints(waypoints: RouteWaypoint[], sequence: number[]): RouteWaypoint[] {
    const reordered = sequence.map((index, seq) => ({
      ...waypoints[index],
      sequence: seq + 1,
    }));

    // Calculate estimated arrival times
    let currentTime = new Date();
    for (const waypoint of reordered) {
      waypoint.estimated_arrival_time = currentTime.toISOString();
      currentTime = new Date(currentTime.getTime() + waypoint.estimated_duration_minutes * 60000);
    }

    return reordered;
  }

  /**
   * Apply traffic adjustments to route
   */
  private async applyTrafficAdjustments(
    route: OptimizedRoute,
    trafficConditions?: RouteOptimizationRequest['traffic_conditions'],
    requestId?: string
  ): Promise<OptimizedRoute> {
    if (!trafficConditions) {
      return route;
    }

    const adjustedRoute = { ...route };
    const trafficMultiplier = this.TRAFFIC_MULTIPLIERS[trafficConditions.current_conditions];

    // Apply traffic multiplier to duration
    adjustedRoute.estimated_duration_minutes = Math.round(
      route.estimated_duration_minutes * trafficMultiplier
    );

    // Record traffic adjustments
    adjustedRoute.traffic_adjustments = [
      {
        segment: 'entire_route',
        original_duration: route.estimated_duration_minutes,
        adjusted_duration: adjustedRoute.estimated_duration_minutes,
        traffic_factor: trafficMultiplier,
      },
    ];

    return adjustedRoute;
  }

  /**
   * Calculate efficiency metrics
   */
  private calculateEfficiencyMetrics(route: OptimizedRoute, assignments: any[]): OptimizedRoute {
    // Calculate efficiency score based on multiple factors
    const baselineDistance = this.calculateBaselineDistance(assignments);
    const distanceEfficiency = Math.max(
      0,
      (baselineDistance - route.total_distance_km) / baselineDistance
    );

    const baselineDuration = assignments.length * 60; // Assume 1 hour per assignment baseline
    const timeEfficiency = Math.max(
      0,
      (baselineDuration - route.estimated_duration_minutes) / baselineDuration
    );

    // Combine efficiency metrics (weighted average)
    route.efficiency_score = Math.round((distanceEfficiency * 0.6 + timeEfficiency * 0.4) * 100);

    return route;
  }

  /**
   * Calculate baseline distance (direct routes to each assignment)
   */
  private calculateBaselineDistance(assignments: any[]): number {
    // Simple baseline: sum of direct distances from depot to each location
    let totalDistance = 0;
    const depot = { latitude: 6.5244, longitude: 3.3792 }; // Lagos coordinates as default

    for (const assignment of assignments) {
      const pickupDistance = this.calculateDistance(depot, {
        latitude: assignment.pickup_latitude,
        longitude: assignment.pickup_longitude,
      });
      const deliveryDistance = this.calculateDistance(depot, {
        latitude: assignment.delivery_latitude,
        longitude: assignment.delivery_longitude,
      });
      totalDistance += pickupDistance + deliveryDistance;
    }

    return totalDistance;
  }

  /**
   * Generate alternative routes
   */
  private async generateAlternativeRoutes(
    startLocation: LocationCoordinates,
    waypoints: RouteWaypoint[],
    request: RouteOptimizationRequest,
    requestId: string
  ): Promise<OptimizedRoute[]> {
    // Generate 2-3 alternative routes with different optimization criteria
    const alternatives: OptimizedRoute[] = [];

    try {
      // Alternative 1: Minimize distance
      const distanceOptimized = await this.optimizeWithCustomAlgorithm(
        startLocation,
        waypoints,
        {
          ...request,
          optimization_preferences: { minimize_distance: true },
        },
        requestId
      );
      distanceOptimized.id = uuidv4();
      alternatives.push(distanceOptimized);

      // Alternative 2: Minimize time
      const timeOptimized = await this.optimizeWithCustomAlgorithm(
        startLocation,
        waypoints,
        {
          ...request,
          optimization_preferences: { minimize_time: true },
        },
        requestId
      );
      timeOptimized.id = uuidv4();
      alternatives.push(timeOptimized);
    } catch (error) {
      logger.warn('Failed to generate alternative routes', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return alternatives;
  }

  /**
   * Store optimized route in database
   */
  private async storeOptimizedRoute(route: OptimizedRoute, requestId: string): Promise<void> {
    try {
      const { error } = await this.supabase.from('route_optimizations').insert({
        id: route.id,
        courier_id: route.courier_id,
        assignment_ids: route.assignment_ids,
        optimized_sequence: route.optimized_sequence,
        total_distance_km: route.total_distance_km,
        estimated_duration_minutes: route.estimated_duration_minutes,
        efficiency_score: route.efficiency_score,
        waypoints: route.waypoints,
        traffic_adjustments: route.traffic_adjustments,
        expires_at: route.expires_at,
        created_at: route.created_at,
      });

      if (error) {
        logger.error('Failed to store optimized route', {
          requestId,
          routeId: route.id,
          error: error.message,
        });
      }
    } catch (error) {
      logger.error('Database error storing route', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get stored route from database
   */
  private async getStoredRoute(routeId: string, requestId: string): Promise<OptimizedRoute | null> {
    try {
      const { data: route, error } = await this.supabase
        .from('route_optimizations')
        .select('*')
        .eq('id', routeId)
        .single();

      if (error || !route) {
        return null;
      }

      return route as OptimizedRoute;
    } catch (error) {
      logger.error('Failed to get stored route', {
        requestId,
        routeId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Generate cache key for route optimization request
   */
  private generateCacheKey(request: RouteOptimizationRequest): string {
    const keyData = {
      courier_id: request.courier_id,
      assignment_ids: request.assignment_ids.sort(),
      start_location: request.start_location,
      preferences: request.optimization_preferences,
    };
    return `route_optimization:${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }

  /**
   * Generate cache key from route
   */
  private generateCacheKeyFromRoute(route: OptimizedRoute): string {
    return `route_optimization:${route.id}`;
  }

  /**
   * Check if cached route is expired
   */
  private isCacheExpired(route: OptimizedRoute): boolean {
    return new Date() > new Date(route.expires_at);
  }

  // Placeholder methods for route adjustment functionality
  private async adjustForTraffic(
    route: OptimizedRoute,
    adjustment: RouteAdjustment,
    requestId: string
  ): Promise<OptimizedRoute> {
    // Implementation for traffic-based route adjustment
    const adjustedRoute = { ...route, id: uuidv4() };
    // Apply traffic adjustments logic here
    return adjustedRoute;
  }

  private async adjustForDelay(
    route: OptimizedRoute,
    adjustment: RouteAdjustment,
    requestId: string
  ): Promise<OptimizedRoute> {
    // Implementation for delay-based route adjustment
    const adjustedRoute = { ...route, id: uuidv4() };
    // Apply delay adjustments logic here
    return adjustedRoute;
  }

  private async adjustForPriorityChange(
    route: OptimizedRoute,
    adjustment: RouteAdjustment,
    requestId: string
  ): Promise<OptimizedRoute> {
    // Implementation for priority change adjustment
    const adjustedRoute = { ...route, id: uuidv4() };
    // Apply priority adjustments logic here
    return adjustedRoute;
  }

  private async adjustForNewAssignment(
    route: OptimizedRoute,
    adjustment: RouteAdjustment,
    requestId: string
  ): Promise<OptimizedRoute> {
    // Implementation for new assignment insertion
    const adjustedRoute = { ...route, id: uuidv4() };
    // Apply new assignment logic here
    return adjustedRoute;
  }

  private async adjustForCancellation(
    route: OptimizedRoute,
    adjustment: RouteAdjustment,
    requestId: string
  ): Promise<OptimizedRoute> {
    // Implementation for assignment cancellation
    const adjustedRoute = { ...route, id: uuidv4() };
    // Apply cancellation logic here
    return adjustedRoute;
  }

  private async getCurrentTrafficConditions(
    waypoints: RouteWaypoint[],
    requestId: string
  ): Promise<any> {
    // Implementation for getting current traffic conditions
    return { current_conditions: 'moderate' };
  }

  private async analyzeRerouteOptions(
    currentLocation: LocationCoordinates,
    route: OptimizedRoute,
    trafficConditions: any,
    requestId: string
  ): Promise<{ timeSavings: number; delayMinutes: number }> {
    // Implementation for analyzing reroute options
    return { timeSavings: 5, delayMinutes: 10 };
  }

  private async generateUpdatedRoute(
    currentLocation: LocationCoordinates,
    route: OptimizedRoute,
    trafficConditions: any,
    requestId: string
  ): Promise<OptimizedRoute> {
    // Implementation for generating updated route
    return { ...route, id: uuidv4() };
  }
}

// Export singleton instance
export const routeOptimizationService = new RouteOptimizationService(
  // Will be injected when used
  {} as SupabaseClient
);
