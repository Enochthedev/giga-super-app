import { createClient } from '@supabase/supabase-js';

import { googleMapsService } from './googleMaps';

import config from '@/config';
import {
  DeliveryAssignment,
  DeliveryTracking,
  ERROR_CODES,
  LocationCoordinates,
  TrackDeliveryRequest,
} from '@/types';
import logger from '@/utils/logger';

// Initialize Supabase client
const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

// Import webSocketService with a dynamic import to avoid circular dependency
let webSocketService: any = null;
const getWebSocketService = async () => {
  if (!webSocketService) {
    const { webSocketService: ws } = await import('./websocket');
    webSocketService = ws;
  }
  return webSocketService;
};

interface TrackingOptions {
  limit?: number;
  since?: string;
}

interface DeliveryProgress {
  assignment_id: string;
  current_status: string;
  progress_percentage: number;
  distance_completed_km: number;
  distance_remaining_km: number;
  estimated_arrival_time: string;
  actual_travel_time_minutes: number;
  average_speed_kmh: number;
  last_location: LocationCoordinates;
  last_update: string;
  route_efficiency: number;
}

interface TrackingValidationResult {
  isValid: boolean;
  filteredData?: Partial<TrackDeliveryRequest>;
  reason?: string;
}

class TrackingService {
  private readonly MIN_ACCURACY_METERS = 100; // Minimum GPS accuracy in meters
  private readonly MAX_SPEED_KMH = 120; // Maximum reasonable speed for delivery vehicles
  private readonly MIN_UPDATE_INTERVAL_SECONDS = 10; // Minimum time between updates
  private readonly MAX_TRACKING_AGE_HOURS = 72; // Maximum age for tracking data retention

  /**
   * Update delivery tracking with location and status
   */
  async updateDeliveryTracking(
    trackingData: TrackDeliveryRequest,
    userId: string
  ): Promise<DeliveryTracking> {
    try {
      // Validate and filter tracking data
      const validation = await this.validateTrackingData(trackingData, userId);
      if (!validation.isValid) {
        throw {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: validation.reason || 'Invalid tracking data',
          statusCode: 400,
        };
      }

      const filteredData = validation.filteredData!;

      // Get courier profile
      const courierProfile = await this.getCourierProfile(userId);
      if (!courierProfile) {
        throw {
          code: ERROR_CODES.COURIER_NOT_FOUND,
          message: 'Courier profile not found',
          statusCode: 404,
        };
      }

      // Verify assignment belongs to courier
      const assignment = await this.getDeliveryAssignment(trackingData.assignment_id);
      if (!assignment || assignment.courier_id !== courierProfile.id) {
        throw {
          code: ERROR_CODES.ASSIGNMENT_NOT_FOUND,
          message: 'Delivery assignment not found or not assigned to this courier',
          statusCode: 404,
        };
      }

      // Calculate additional tracking metrics
      const enhancedData = await this.enhanceTrackingData(filteredData, assignment);

      // Insert tracking record
      const { data: trackingRecord, error } = await supabase
        .from('delivery_tracking')
        .insert({
          delivery_assignment_id: trackingData.assignment_id,
          courier_id: courierProfile.id,
          latitude: enhancedData.latitude,
          longitude: enhancedData.longitude,
          accuracy_meters: enhancedData.accuracy_meters,
          speed_kmh: enhancedData.speed_kmh,
          heading_degrees: enhancedData.heading_degrees,
          battery_level: enhancedData.battery_level,
          tracking_source: 'mobile_app',
          distance_from_destination_km: enhancedData.distance_from_destination_km,
          estimated_arrival_minutes: enhancedData.estimated_arrival_minutes,
          device_info: {
            user_agent: enhancedData.device_info?.user_agent,
            platform: enhancedData.device_info?.platform,
          },
          timestamp: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        logger.error('Error inserting tracking record', { error });
        throw {
          code: ERROR_CODES.DATABASE_ERROR,
          message: 'Failed to save tracking data',
          statusCode: 500,
        };
      }

      // Update courier location
      await this.updateCourierLocation(
        courierProfile.id,
        enhancedData.latitude!,
        enhancedData.longitude!
      );

      // Update delivery status if provided
      if (trackingData.status) {
        await this.updateDeliveryStatus(
          trackingData.assignment_id,
          trackingData.status,
          trackingData.notes
        );
      }

      // Broadcast real-time update via WebSocket
      const wsService = await getWebSocketService();
      await wsService.broadcastTrackingUpdate(trackingRecord);

      logger.info('Tracking data updated successfully', {
        assignment_id: trackingData.assignment_id,
        courier_id: courierProfile.id,
        tracking_id: trackingRecord.id,
      });

      return trackingRecord;
    } catch (error: any) {
      logger.error('Error updating delivery tracking', { error: error.message });
      throw error;
    }
  }

  /**
   * Get tracking data for a delivery assignment
   */
  async getTrackingData(
    assignmentId: string,
    userId: string,
    options: TrackingOptions = {}
  ): Promise<DeliveryTracking[]> {
    try {
      // Verify user has access to this assignment
      await this.verifyAssignmentAccess(assignmentId, userId);

      let query = supabase
        .from('delivery_tracking')
        .select(
          `
          *,
          delivery_assignments!inner(
            id,
            assignment_number,
            status,
            recipient_name
          )
        `
        )
        .eq('delivery_assignment_id', assignmentId)
        .eq('is_active_tracking', true)
        .order('timestamp', { ascending: false });

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.since) {
        query = query.gte('timestamp', options.since);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching tracking data', { error });
        throw {
          code: ERROR_CODES.DATABASE_ERROR,
          message: 'Failed to fetch tracking data',
          statusCode: 500,
        };
      }

      return data || [];
    } catch (error: any) {
      logger.error('Error getting tracking data', { error: error.message });
      throw error;
    }
  }

  /**
   * Get delivery progress and ETA information
   */
  async getDeliveryProgress(assignmentId: string, userId: string): Promise<DeliveryProgress> {
    try {
      // Verify user has access to this assignment
      await this.verifyAssignmentAccess(assignmentId, userId);

      // Get assignment details
      const assignment = await this.getDeliveryAssignment(assignmentId);
      if (!assignment) {
        throw {
          code: ERROR_CODES.ASSIGNMENT_NOT_FOUND,
          message: 'Delivery assignment not found',
          statusCode: 404,
        };
      }

      // Get latest tracking data
      const { data: latestTracking, error: trackingError } = await supabase
        .from('delivery_tracking')
        .select('*')
        .eq('delivery_assignment_id', assignmentId)
        .eq('is_active_tracking', true)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (trackingError && trackingError.code !== 'PGRST116') {
        logger.error('Error fetching latest tracking', { error: trackingError });
        throw {
          code: ERROR_CODES.DATABASE_ERROR,
          message: 'Failed to fetch tracking data',
          statusCode: 500,
        };
      }

      // Calculate progress metrics
      const progress = await this.calculateDeliveryProgress(assignment, latestTracking);

      return progress;
    } catch (error: any) {
      logger.error('Error getting delivery progress', { error: error.message });
      throw error;
    }
  }

  /**
   * Cleanup old tracking data
   */
  async cleanupTrackingData(
    assignmentId: string,
    userId: string,
    retentionHours: number
  ): Promise<{ deleted_count: number }> {
    try {
      // Verify user has access to this assignment
      await this.verifyAssignmentAccess(assignmentId, userId);

      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - retentionHours);

      const { data, error } = await supabase
        .from('delivery_tracking')
        .delete()
        .eq('delivery_assignment_id', assignmentId)
        .lt('timestamp', cutoffTime.toISOString())
        .select('id');

      if (error) {
        logger.error('Error cleaning up tracking data', { error });
        throw {
          code: ERROR_CODES.DATABASE_ERROR,
          message: 'Failed to cleanup tracking data',
          statusCode: 500,
        };
      }

      const deletedCount = data?.length || 0;

      logger.info('Tracking data cleanup completed', {
        assignment_id: assignmentId,
        deleted_count: deletedCount,
        retention_hours: retentionHours,
      });

      return { deleted_count: deletedCount };
    } catch (error: any) {
      logger.error('Error cleaning up tracking data', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate and filter tracking data for accuracy and reasonableness
   */
  private async validateTrackingData(
    data: TrackDeliveryRequest,
    userId: string
  ): Promise<TrackingValidationResult> {
    try {
      // Check required fields
      if (!data.latitude || !data.longitude) {
        return {
          isValid: false,
          reason: 'Latitude and longitude are required',
        };
      }

      // Check coordinate bounds
      if (data.latitude < -90 || data.latitude > 90) {
        return {
          isValid: false,
          reason: 'Latitude must be between -90 and 90',
        };
      }

      if (data.longitude < -180 || data.longitude > 180) {
        return {
          isValid: false,
          reason: 'Longitude must be between -180 and 180',
        };
      }

      // Check GPS accuracy
      if (data.accuracy_meters && data.accuracy_meters > this.MIN_ACCURACY_METERS) {
        logger.warn('Low GPS accuracy detected', {
          accuracy: data.accuracy_meters,
          threshold: this.MIN_ACCURACY_METERS,
        });
      }

      // Check speed reasonableness
      if (data.speed_kmh && data.speed_kmh > this.MAX_SPEED_KMH) {
        return {
          isValid: false,
          reason: `Speed ${data.speed_kmh} km/h exceeds maximum allowed ${this.MAX_SPEED_KMH} km/h`,
        };
      }

      // Check for duplicate/too frequent updates
      const recentUpdate = await this.getRecentTrackingUpdate(data.assignment_id, userId);
      if (recentUpdate) {
        const timeDiff = (Date.now() - new Date(recentUpdate.timestamp).getTime()) / 1000;
        if (timeDiff < this.MIN_UPDATE_INTERVAL_SECONDS) {
          return {
            isValid: false,
            reason: `Updates too frequent. Minimum interval is ${this.MIN_UPDATE_INTERVAL_SECONDS} seconds`,
          };
        }
      }

      // Filter and clean data
      const filteredData: Partial<TrackDeliveryRequest> = {
        assignment_id: data.assignment_id,
        latitude: Math.round(data.latitude * 1000000) / 1000000, // 6 decimal places
        longitude: Math.round(data.longitude * 1000000) / 1000000,
        accuracy_meters: data.accuracy_meters ? Math.max(0, data.accuracy_meters) : undefined,
        speed_kmh: data.speed_kmh
          ? Math.max(0, Math.min(data.speed_kmh, this.MAX_SPEED_KMH))
          : undefined,
        heading_degrees: data.heading_degrees ? data.heading_degrees % 360 : undefined,
        battery_level: data.battery_level
          ? Math.max(0, Math.min(data.battery_level, 100))
          : undefined,
        status: data.status,
        notes: data.notes?.substring(0, 1000), // Truncate notes
      };

      return {
        isValid: true,
        filteredData,
      };
    } catch (error: any) {
      logger.error('Error validating tracking data', { error: error.message });
      return {
        isValid: false,
        reason: 'Validation error occurred',
      };
    }
  }

  /**
   * Enhance tracking data with calculated metrics
   */
  private async enhanceTrackingData(
    data: Partial<TrackDeliveryRequest>,
    assignment: DeliveryAssignment
  ): Promise<any> {
    try {
      const enhanced: any = { ...data };

      // Calculate distance from destination
      if (
        data.latitude &&
        data.longitude &&
        assignment.delivery_latitude &&
        assignment.delivery_longitude
      ) {
        const distance = await googleMapsService.calculateDistanceAndDuration(
          { latitude: data.latitude, longitude: data.longitude },
          { latitude: assignment.delivery_latitude, longitude: assignment.delivery_longitude }
        );
        enhanced.distance_from_destination_km = distance.distance_meters / 1000;
        enhanced.estimated_arrival_minutes = Math.round(distance.duration_seconds / 60);
      }

      // Add device info if available
      enhanced.device_info = {
        user_agent: 'mobile_app',
        platform: 'unknown',
      };

      return enhanced;
    } catch (error: any) {
      logger.error('Error enhancing tracking data', { error: error.message });
      return data;
    }
  }

  /**
   * Calculate delivery progress metrics
   */
  private async calculateDeliveryProgress(
    assignment: DeliveryAssignment,
    latestTracking?: any
  ): Promise<DeliveryProgress> {
    try {
      let progressPercentage = 0;
      let distanceCompleted = 0;
      let distanceRemaining = 0;
      let estimatedArrival = new Date();
      let actualTravelTime = 0;
      let averageSpeed = 0;
      let routeEfficiency = 0;

      // Calculate progress based on status
      const statusProgress = {
        pending: 0,
        assigned: 10,
        picked_up: 30,
        in_transit: 60,
        out_for_delivery: 80,
        delivered: 100,
        failed: 0,
        cancelled: 0,
        returned: 0,
      };

      progressPercentage = statusProgress[assignment.status as keyof typeof statusProgress] || 0;

      // If we have tracking data, calculate more accurate metrics
      if (latestTracking && assignment.delivery_latitude && assignment.delivery_longitude) {
        // Calculate remaining distance
        const remainingDistance = await googleMapsService.calculateDistanceAndDuration(
          { latitude: latestTracking.latitude, longitude: latestTracking.longitude },
          { latitude: assignment.delivery_latitude, longitude: assignment.delivery_longitude }
        );
        distanceRemaining = remainingDistance.distance_meters / 1000;

        // Calculate completed distance (estimated total - remaining)
        if (assignment.estimated_distance_km) {
          distanceCompleted = Math.max(0, assignment.estimated_distance_km - distanceRemaining);
          progressPercentage = Math.max(
            progressPercentage,
            (distanceCompleted / assignment.estimated_distance_km) * 100
          );
        }

        // Calculate ETA
        if (latestTracking.speed_kmh && latestTracking.speed_kmh > 0) {
          const etaHours = distanceRemaining / latestTracking.speed_kmh;
          estimatedArrival = new Date(Date.now() + etaHours * 60 * 60 * 1000);
        }

        // Calculate actual travel time
        if (assignment.picked_up_at) {
          actualTravelTime =
            (Date.now() - new Date(assignment.picked_up_at).getTime()) / (1000 * 60);
        }

        // Calculate average speed
        if (actualTravelTime > 0 && distanceCompleted > 0) {
          averageSpeed = (distanceCompleted / actualTravelTime) * 60; // km/h
        }

        // Calculate route efficiency
        if (assignment.estimated_duration_minutes && actualTravelTime > 0) {
          routeEfficiency = Math.min(1, assignment.estimated_duration_minutes / actualTravelTime);
        }
      }

      return {
        assignment_id: assignment.id,
        current_status: assignment.status,
        progress_percentage: Math.min(100, Math.max(0, progressPercentage)),
        distance_completed_km: distanceCompleted,
        distance_remaining_km: distanceRemaining,
        estimated_arrival_time: estimatedArrival.toISOString(),
        actual_travel_time_minutes: actualTravelTime,
        average_speed_kmh: averageSpeed,
        last_location: latestTracking
          ? {
              latitude: latestTracking.latitude,
              longitude: latestTracking.longitude,
            }
          : { latitude: 0, longitude: 0 },
        last_update: latestTracking?.timestamp || new Date().toISOString(),
        route_efficiency: routeEfficiency,
      };
    } catch (error: any) {
      logger.error('Error calculating delivery progress', { error: error.message });
      throw error;
    }
  }

  /**
   * Get courier profile by user ID
   */
  private async getCourierProfile(userId: string): Promise<any> {
    const { data, error } = await supabase
      .from('courier_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching courier profile', { error });
      return null;
    }

    return data;
  }

  /**
   * Get delivery assignment by ID
   */
  private async getDeliveryAssignment(assignmentId: string): Promise<DeliveryAssignment | null> {
    const { data, error } = await supabase
      .from('delivery_assignments')
      .select('*')
      .eq('id', assignmentId)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching delivery assignment', { error });
      return null;
    }

    return data;
  }

  /**
   * Update courier location
   */
  private async updateCourierLocation(
    courierId: string,
    latitude: number,
    longitude: number
  ): Promise<void> {
    const { error } = await supabase
      .from('courier_profiles')
      .update({
        current_latitude: latitude,
        current_longitude: longitude,
        last_location_update: new Date().toISOString(),
      })
      .eq('id', courierId);

    if (error) {
      logger.error('Error updating courier location', { error });
    }
  }

  /**
   * Update delivery status
   */
  private async updateDeliveryStatus(
    assignmentId: string,
    status: string,
    notes?: string
  ): Promise<void> {
    const updateData: any = { status };

    // Set timestamp fields based on status
    const now = new Date().toISOString();
    switch (status) {
      case 'picked_up':
        updateData.picked_up_at = now;
        break;
      case 'delivered':
        updateData.delivered_at = now;
        break;
      case 'failed':
        updateData.failed_at = now;
        break;
      case 'cancelled':
        updateData.cancelled_at = now;
        if (notes) updateData.cancellation_reason = notes;
        break;
    }

    if (notes) {
      updateData.courier_notes = notes;
    }

    const { error } = await supabase
      .from('delivery_assignments')
      .update(updateData)
      .eq('id', assignmentId);

    if (error) {
      logger.error('Error updating delivery status', { error });
    } else {
      // Broadcast status update via WebSocket
      const wsService = await getWebSocketService();
      await wsService.broadcastStatusUpdate(assignmentId, status, updateData);
    }
  }

  /**
   * Get recent tracking update to prevent duplicates
   */
  private async getRecentTrackingUpdate(assignmentId: string, userId: string): Promise<any> {
    const courierProfile = await this.getCourierProfile(userId);
    if (!courierProfile) return null;

    const { data, error } = await supabase
      .from('delivery_tracking')
      .select('timestamp')
      .eq('delivery_assignment_id', assignmentId)
      .eq('courier_id', courierProfile.id)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      return null;
    }

    return data;
  }

  /**
   * Verify user has access to assignment
   */
  private async verifyAssignmentAccess(assignmentId: string, userId: string): Promise<void> {
    // Check if user is the courier
    const courierProfile = await this.getCourierProfile(userId);
    if (courierProfile) {
      const assignment = await this.getDeliveryAssignment(assignmentId);
      if (assignment && assignment.courier_id === courierProfile.id) {
        return;
      }
    }

    // Check if user is the customer
    const { data: customerAssignment, error } = await supabase
      .from('delivery_assignments')
      .select(
        `
        id,
        ecommerce_orders!inner(
          user_id
        )
      `
      )
      .eq('id', assignmentId)
      .single();

    if (
      !error &&
      customerAssignment?.ecommerce_orders &&
      Array.isArray(customerAssignment.ecommerce_orders) &&
      customerAssignment.ecommerce_orders.length > 0 &&
      customerAssignment.ecommerce_orders[0].user_id === userId
    ) {
      return;
    }

    // Check if user is admin/dispatcher
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role_name')
      .eq('user_id', userId)
      .in('role_name', ['ADMIN', 'DISPATCHER'])
      .single();

    if (!roleError && userRole) {
      return;
    }

    throw {
      code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
      message: 'Access denied to this delivery assignment',
      statusCode: 403,
    };
  }

  /**
   * Verify if assignment is still active
   */
  private async verifyAssignmentActive(assignmentId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('delivery_assignments')
        .select('status')
        .eq('id', assignmentId)
        .is('deleted_at', null)
        .single();

      if (error) {
        return false;
      }

      const activeStatuses = ['assigned', 'picked_up', 'in_transit', 'out_for_delivery'];
      return activeStatuses.includes(data.status);
    } catch (error: any) {
      logger.error('Error verifying assignment active status', { error: error.message });
      return false;
    }
  }
}

export const trackingService = new TrackingService();
