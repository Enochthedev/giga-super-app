import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

import { CreatePackageRequest, DeliveryPackage, UpdatePackageRequest } from '../types';
import { ServiceError } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Package management service for CRUD operations on delivery packages
 */
export class PackageService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Create a new delivery package
   */
  async createPackage(
    packageData: CreatePackageRequest,
    requestId: string
  ): Promise<DeliveryPackage> {
    try {
      logger.info('Creating new delivery package', {
        request_id: requestId,
        sender: packageData.sender_name,
        recipient: packageData.recipient_name,
      });

      const { data, error } = await this.supabase
        .from('delivery_packages')
        .insert({
          id: uuidv4(),
          sender_id: packageData.sender_id,
          sender_name: packageData.sender_name,
          sender_phone: packageData.sender_phone,
          sender_address: packageData.sender_address,
          sender_lat: packageData.sender_lat,
          sender_lng: packageData.sender_lng,
          recipient_name: packageData.recipient_name,
          recipient_phone: packageData.recipient_phone,
          recipient_address: packageData.recipient_address,
          recipient_lat: packageData.recipient_lat,
          recipient_lng: packageData.recipient_lng,
          package_description: packageData.package_description,
          package_weight: packageData.package_weight,
          package_dimensions: packageData.package_dimensions,
          delivery_fee: packageData.delivery_fee,
          priority: packageData.priority || 'normal',
          delivery_instructions: packageData.delivery_instructions,
          estimated_delivery: packageData.estimated_delivery,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create package', { error: error.message, request_id: requestId });
        throw new ServiceError('Failed to create package', 'DATABASE_ERROR', 500);
      }

      logger.info('Package created successfully', {
        package_id: data.id,
        request_id: requestId,
      });

      return this.mapDatabasePackage(data);
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      logger.error('Unexpected error creating package', { error, request_id: requestId });
      throw new ServiceError('Internal server error', 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  /**
   * Get package by ID
   */
  async getPackageById(packageId: string, requestId: string): Promise<DeliveryPackage> {
    try {
      const { data, error } = await this.supabase
        .from('delivery_packages')
        .select('*')
        .eq('id', packageId)
        .is('deleted_at', null)
        .single();

      if (error || !data) {
        throw new ServiceError('Package not found', 'PACKAGE_NOT_FOUND', 404);
      }

      return this.mapDatabasePackage(data);
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      logger.error('Error fetching package', { error, package_id: packageId, request_id: requestId });
      throw new ServiceError('Internal server error', 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  /**
   * Get packages by sender ID with pagination
   */
  async getPackagesBySender(
    senderId: string,
    page: number = 1,
    limit: number = 20,
    requestId: string
  ): Promise<{ packages: DeliveryPackage[]; total: number }> {
    try {
      const offset = (page - 1) * limit;

      const [packagesResult, countResult] = await Promise.all([
        this.supabase
          .from('delivery_packages')
          .select('*')
          .eq('sender_id', senderId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1),
        this.supabase
          .from('delivery_packages')
          .select('id', { count: 'exact', head: true })
          .eq('sender_id', senderId)
          .is('deleted_at', null),
      ]);

      if (packagesResult.error) {
        logger.error('Failed to fetch packages', {
          error: packagesResult.error.message,
          request_id: requestId,
        });
        throw new ServiceError('Failed to fetch packages', 'DATABASE_ERROR', 500);
      }

      return {
        packages: packagesResult.data.map(this.mapDatabasePackage),
        total: countResult.count || 0,
      };
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      logger.error('Error fetching sender packages', { error, sender_id: senderId, request_id: requestId });
      throw new ServiceError('Internal server error', 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  /**
   * Get packages by status with pagination
   */
  async getPackagesByStatus(
    status: string,
    page: number = 1,
    limit: number = 20,
    requestId: string
  ): Promise<{ packages: DeliveryPackage[]; total: number }> {
    try {
      const offset = (page - 1) * limit;

      const [packagesResult, countResult] = await Promise.all([
        this.supabase
          .from('delivery_packages')
          .select('*')
          .eq('status', status)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1),
        this.supabase
          .from('delivery_packages')
          .select('id', { count: 'exact', head: true })
          .eq('status', status)
          .is('deleted_at', null),
      ]);

      if (packagesResult.error) {
        logger.error('Failed to fetch packages by status', {
          error: packagesResult.error.message,
          request_id: requestId,
        });
        throw new ServiceError('Failed to fetch packages', 'DATABASE_ERROR', 500);
      }

      return {
        packages: packagesResult.data.map(this.mapDatabasePackage),
        total: countResult.count || 0,
      };
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      logger.error('Error fetching packages by status', { error, status, request_id: requestId });
      throw new ServiceError('Internal server error', 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  /**
   * Update package information
   */
  async updatePackage(
    packageId: string,
    updates: UpdatePackageRequest,
    requestId: string
  ): Promise<DeliveryPackage> {
    try {
      // Verify package exists
      await this.getPackageById(packageId, requestId);

      const { data, error } = await this.supabase
        .from('delivery_packages')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', packageId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update package', { error: error.message, request_id: requestId });
        throw new ServiceError('Failed to update package', 'DATABASE_ERROR', 500);
      }

      logger.info('Package updated successfully', {
        package_id: packageId,
        request_id: requestId,
      });

      return this.mapDatabasePackage(data);
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      logger.error('Error updating package', { error, package_id: packageId, request_id: requestId });
      throw new ServiceError('Internal server error', 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  /**
   * Cancel a package
   */
  async cancelPackage(packageId: string, requestId: string): Promise<DeliveryPackage> {
    try {
      const pkg = await this.getPackageById(packageId, requestId);

      // Only allow cancellation if not already delivered or in transit
      if (pkg.status === 'delivered') {
        throw new ServiceError('Cannot cancel delivered package', 'INVALID_PACKAGE_STATUS', 400);
      }

      const { data, error } = await this.supabase
        .from('delivery_packages')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', packageId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to cancel package', { error: error.message, request_id: requestId });
        throw new ServiceError('Failed to cancel package', 'DATABASE_ERROR', 500);
      }

      logger.info('Package cancelled', { package_id: packageId, request_id: requestId });

      return this.mapDatabasePackage(data);
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      logger.error('Error cancelling package', { error, package_id: packageId, request_id: requestId });
      throw new ServiceError('Internal server error', 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  /**
   * Soft delete a package
   */
  async deletePackage(packageId: string, requestId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('delivery_packages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', packageId);

      if (error) {
        logger.error('Failed to delete package', { error: error.message, request_id: requestId });
        throw new ServiceError('Failed to delete package', 'DATABASE_ERROR', 500);
      }

      logger.info('Package deleted', { package_id: packageId, request_id: requestId });
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      logger.error('Error deleting package', { error, package_id: packageId, request_id: requestId });
      throw new ServiceError('Internal server error', 'INTERNAL_SERVER_ERROR', 500);
    }
  }

  /**
   * Map database package to DeliveryPackage type
   */
  private mapDatabasePackage(data: any): DeliveryPackage {
    return {
      id: data.id,
      sender_id: data.sender_id,
      recipient_id: data.recipient_id,
      sender_name: data.sender_name,
      sender_phone: data.sender_phone,
      sender_address: data.sender_address,
      sender_lat: data.sender_lat,
      sender_lng: data.sender_lng,
      recipient_name: data.recipient_name,
      recipient_phone: data.recipient_phone,
      recipient_address: data.recipient_address,
      recipient_lat: data.recipient_lat,
      recipient_lng: data.recipient_lng,
      package_description: data.package_description,
      package_weight: data.package_weight,
      package_dimensions: data.package_dimensions,
      delivery_fee: data.delivery_fee,
      status: data.status,
      priority: data.priority,
      delivery_instructions: data.delivery_instructions,
      estimated_delivery: data.estimated_delivery,
      actual_delivery: data.actual_delivery,
      proof_of_delivery: data.proof_of_delivery,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }
}
