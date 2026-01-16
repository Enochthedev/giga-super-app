import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

import { CourierProfile, CreateCourierRequest, UpdateCourierRequest } from '../types';
import { ServiceError } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Courier management service for onboarding and profile management
 */
export class CourierService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Create a new courier profile (onboarding)
   */
  async createCourier(
    courierData: CreateCourierRequest,
    requestId: string
  ): Promise<CourierProfile> {
    try {
      logger.info('Creating new courier profile', {
        request_id: requestId,
        user_id: courierData.user_id,
        name: `${courierData.first_name} ${courierData.last_name}`,
      });

      // Check if courier already exists for this user
      const { data: existing } = await this.supabase
        .from('courier_profiles')
        .select('id')
        .eq('user_id', courierData.user_id)
        .single();

      if (existing) {
        throw new ServiceError('Courier profile already exists for this user', 'COURIER_ALREADY_EXISTS', 409);
      }

      // Generate courier code
      const courierCode = `CG${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

      const { data, error } = await this.supabase
        .from('courier_profiles')
        .insert({
          id: uuidv4(),
          user_id: courierData.user_id,
          courier_code: courierCode,
          first_name: courierData.first_name,
          last_name: courierData.last_name,
          phone_number: courierData.phone_number,
          email: courierData.email,
          vehicle_type: courierData.vehicle_type,
          vehicle_registration: courierData.vehicle_registration,
          vehicle_capacity_kg: courierData.vehicle_capacity_kg || 50,
          max_delivery_radius_km: courierData.max_delivery_radius_km || 20,
          license_number: courierData.license_number,
          license_expiry: courierData.license_expiry,
          verification_documents: courierData.verification_documents,
          verification_status: 'pending',
          availability_status: 'offline',
          is_online: false,
          is_available: false,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create courier', { error: error.message, request_id: requestId });
        throw new ServiceError('Failed to create courier', 'DATABASE_ERROR', 500);
      }

      logger.info('Courier created successfully', {
        courier_id: data.id,
        courier_code: courierCode,
        request_id: requestId,
      });

      return this.mapDatabaseCourier(data);
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      logger.error('Unexpected error creating courier', { error, request_id: requestId });
      throw new ServiceError('Internal server error', 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  /**
   * Get courier by ID
   */
  async getCourierById(courierId: string, requestId: string): Promise<CourierProfile> {
    try {
      const { data, error } = await this.supabase
        .from('courier_profiles')
        .select('*')
        .eq('id', courierId)
        .single();

      if (error || !data) {
        throw new ServiceError('Courier not found', 'COURIER_NOT_FOUND', 404);
      }

      return this.mapDatabaseCourier(data);
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      logger.error('Error fetching courier', { error, courier_id: courierId, request_id: requestId });
      throw new ServiceError('Internal server error', 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  /**
   * Get courier by user ID
   */
  async getCourierByUserId(userId: string, requestId: string): Promise<CourierProfile> {
    try {
      const { data, error } = await this.supabase
        .from('courier_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        throw new ServiceError('Courier profile not found for this user', 'COURIER_NOT_FOUND', 404);
      }

      return this.mapDatabaseCourier(data);
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      logger.error('Error fetching courier by user ID', { error, user_id: userId, request_id: requestId });
      throw new ServiceError('Internal server error', 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  /**
   * Get all couriers with optional filtering and pagination
   */
  async getCouriers(
    filters: {
      verification_status?: string;
      availability_status?: string;
      is_online?: boolean;
      vehicle_type?: string;
    } = {},
    page: number = 1,
    limit: number = 20,
    requestId: string
  ): Promise<{ couriers: CourierProfile[]; total: number }> {
    try {
      const offset = (page - 1) * limit;

      let query = this.supabase
        .from('courier_profiles')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.verification_status) {
        query = query.eq('verification_status', filters.verification_status);
      }
      if (filters.availability_status) {
        query = query.eq('availability_status', filters.availability_status);
      }
      if (filters.is_online !== undefined) {
        query = query.eq('is_online', filters.is_online);
      }
      if (filters.vehicle_type) {
        query = query.eq('vehicle_type', filters.vehicle_type);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Failed to fetch couriers', { error: error.message, request_id: requestId });
        throw new ServiceError('Failed to fetch couriers', 'DATABASE_ERROR', 500);
      }

      return {
        couriers: (data || []).map(this.mapDatabaseCourier),
        total: count || 0,
      };
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      logger.error('Error fetching couriers', { error, request_id: requestId });
      throw new ServiceError('Internal server error', 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  /**
   * Update courier profile
   */
  async updateCourier(
    courierId: string,
    updates: UpdateCourierRequest,
    requestId: string
  ): Promise<CourierProfile> {
    try {
      // Verify courier exists
      await this.getCourierById(courierId, requestId);

      const { data, error } = await this.supabase
        .from('courier_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', courierId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update courier', { error: error.message, request_id: requestId });
        throw new ServiceError('Failed to update courier', 'DATABASE_ERROR', 500);
      }

      logger.info('Courier updated successfully', {
        courier_id: courierId,
        request_id: requestId,
      });

      return this.mapDatabaseCourier(data);
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      logger.error('Error updating courier', { error, courier_id: courierId, request_id: requestId });
      throw new ServiceError('Internal server error', 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  /**
   * Update courier location
   */
  async updateCourierLocation(
    courierId: string,
    latitude: number,
    longitude: number,
    requestId: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('courier_profiles')
        .update({
          current_lat: latitude,
          current_lng: longitude,
          last_location_update: new Date().toISOString(),
        })
        .eq('id', courierId);

      if (error) {
        logger.error('Failed to update courier location', { error: error.message, request_id: requestId });
        throw new ServiceError('Failed to update location', 'DATABASE_ERROR', 500);
      }

      logger.debug('Courier location updated', {
        courier_id: courierId,
        request_id: requestId,
      });
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      logger.error('Error updating courier location', { error, courier_id: courierId, request_id: requestId });
      throw new ServiceError('Internal server error', 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  /**
   * Update courier availability status
   */
  async updateAvailabilityStatus(
    courierId: string,
    status: 'available' | 'busy' | 'offline' | 'on_break',
    requestId: string
  ): Promise<CourierProfile> {
    try {
      const updates: any = {
        availability_status: status,
        updated_at: new Date().toISOString(),
      };

      // Update related flags
      if (status === 'offline') {
        updates.is_online = false;
        updates.is_available = false;
      } else if (status === 'available') {
        updates.is_online = true;
        updates.is_available = true;
      } else {
        updates.is_online = true;
        updates.is_available = false;
      }

      const { data, error } = await this.supabase
        .from('courier_profiles')
        .update(updates)
        .eq('id', courierId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update availability', { error: error.message, request_id: requestId });
        throw new ServiceError('Failed to update availability', 'DATABASE_ERROR', 500);
      }

      logger.info('Courier availability updated', {
        courier_id: courierId,
        status,
        request_id: requestId,
      });

      return this.mapDatabaseCourier(data);
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      logger.error('Error updating availability', { error, courier_id: courierId, request_id: requestId });
      throw new ServiceError('Internal server error', 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  /**
   * Update courier verification status (admin only)
   */
  async updateVerificationStatus(
    courierId: string,
    status: 'pending' | 'verified' | 'rejected' | 'suspended',
    requestId: string
  ): Promise<CourierProfile> {
    try {
      const updates: any = {
        verification_status: status,
        updated_at: new Date().toISOString(),
      };

      // If suspended, make them unavailable
      if (status === 'suspended') {
        updates.is_active = false;
        updates.is_available = false;
        updates.availability_status = 'offline';
      } else if (status === 'verified') {
        updates.is_active = true;
      }

      const { data, error } = await this.supabase
        .from('courier_profiles')
        .update(updates)
        .eq('id', courierId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update verification status', { error: error.message, request_id: requestId });
        throw new ServiceError('Failed to update verification status', 'DATABASE_ERROR', 500);
      }

      logger.info('Courier verification status updated', {
        courier_id: courierId,
        status,
        request_id: requestId,
      });

      return this.mapDatabaseCourier(data);
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      logger.error('Error updating verification status', { error, courier_id: courierId, request_id: requestId });
      throw new ServiceError('Internal server error', 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  /**
   * Get courier statistics
   */
  async getCourierStats(courierId: string, requestId: string): Promise<any> {
    try {
      const courier = await this.getCourierById(courierId, requestId);

      return {
        courier_id: courier.id,
        courier_code: courier.courier_code,
        performance_metrics: courier.performance_metrics,
        verification_status: courier.verification_status,
        availability_status: courier.availability_status,
        current_load_kg: courier.current_location ?
          (await this.getCurrentLoad(courierId)) : 0,
        active_deliveries: await this.getActiveDeliveryCount(courierId),
      };
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      logger.error('Error fetching courier stats', { error, courier_id: courierId, request_id: requestId });
      throw new ServiceError('Internal server error', 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  /**
   * Get current load for courier (helper method)
   */
  private async getCurrentLoad(courierId: string): Promise<number> {
    const { data } = await this.supabase
      .from('courier_profiles')
      .select('current_load_kg')
      .eq('id', courierId)
      .single();

    return data?.current_load_kg || 0;
  }

  /**
   * Get active delivery count (helper method)
   */
  private async getActiveDeliveryCount(courierId: string): Promise<number> {
    const { count } = await this.supabase
      .from('delivery_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('courier_id', courierId)
      .in('status', ['assigned', 'courier_en_route_pickup', 'arrived_at_pickup', 'picked_up', 'in_transit', 'out_for_delivery']);

    return count || 0;
  }

  /**
   * Map database courier to CourierProfile type
   */
  private mapDatabaseCourier(data: any): CourierProfile {
    return {
      id: data.id,
      user_id: data.user_id,
      courier_code: data.courier_code,
      first_name: data.first_name,
      last_name: data.last_name,
      phone_number: data.phone_number,
      email: data.email,
      verification_status: data.verification_status,
      availability_status: data.availability_status,
      is_online: data.is_online,
      current_location: data.current_lat && data.current_lng ? {
        latitude: data.current_lat,
        longitude: data.current_lng,
        updated_at: data.last_location_update,
      } : undefined,
      vehicle_info: {
        type: data.vehicle_type,
        registration: data.vehicle_registration,
        capacity_kg: data.vehicle_capacity_kg,
        max_delivery_radius_km: data.max_delivery_radius_km,
      },
      performance_metrics: {
        total_deliveries: data.total_deliveries || 0,
        completed_deliveries: data.completed_deliveries || 0,
        failed_deliveries: data.failed_deliveries || 0,
        average_rating: data.rating || 5.0,
        completion_rate: data.completed_deliveries && data.total_deliveries
          ? (data.completed_deliveries / data.total_deliveries) * 100
          : 100,
        on_time_delivery_rate: data.on_time_delivery_rate || 100,
        average_delivery_time_minutes: data.average_delivery_time_minutes || 0,
        total_earnings: data.total_earnings || 0,
      },
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }
}
