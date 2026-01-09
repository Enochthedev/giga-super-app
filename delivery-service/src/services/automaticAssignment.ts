import { database } from '@/utils/database';
import logger from '@/utils/logger';
import { SupabaseClient } from '@supabase/supabase-js';
import { DeliveryAssignmentService } from './deliveryAssignment';

export interface AutoAssignmentRule {
  id: string;
  name: string;
  conditions: {
    orderStatus?: string[];
    orderValue?: { min?: number; max?: number };
    priority?: number[];
    location?: {
      latitude: number;
      longitude: number;
      radiusKm: number;
    };
    timeWindow?: {
      startHour: number;
      endHour: number;
    };
  };
  assignmentCriteria: {
    maxRadiusKm?: number;
    minRating?: number;
    requiredVehicleType?: string;
    maxAssignments?: number;
  };
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface AutoAssignmentResult {
  success: boolean;
  assignmentId?: string;
  reason?: string;
  error?: string;
  courierFound?: boolean;
  ruleApplied?: string;
}

/**
 * Automatic delivery assignment service for shipped ecommerce orders
 */
export class AutomaticAssignmentService {
  private supabase: SupabaseClient;
  private deliveryService: DeliveryAssignmentService;

  constructor() {
    this.supabase = database.getClient();
    this.deliveryService = new DeliveryAssignmentService(this.supabase);
  }

  /**
   * Process automatic assignment for a shipped order
   */
  async processOrderShipped(orderId: string, requestId: string): Promise<AutoAssignmentResult> {
    logger.info('Processing automatic assignment for shipped order', {
      requestId,
      orderId,
    });

    try {
      // Get order details
      const { data: order, error: orderError } = await this.supabase
        .from('ecommerce_orders')
        .select(
          `
          *,
          shipping_address:addresses!ecommerce_orders_shipping_address_id_fkey(*)
        `
        )
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        return {
          success: false,
          error: 'Order not found',
          reason: 'ORDER_NOT_FOUND',
        };
      }

      // Check if order already has an assignment
      const { data: existingAssignment } = await this.supabase
        .from('delivery_assignments')
        .select('id, status')
        .eq('order_id', orderId)
        .not('status', 'in', '(delivered,failed,cancelled)')
        .is('deleted_at', null)
        .single();

      if (existingAssignment) {
        return {
          success: false,
          reason: 'ASSIGNMENT_EXISTS',
          assignmentId: existingAssignment.id,
        };
      }

      // Get applicable auto-assignment rules
      const applicableRules = await this.getApplicableRules(order, requestId);

      if (applicableRules.length === 0) {
        return {
          success: false,
          reason: 'NO_APPLICABLE_RULES',
        };
      }

      // Try to assign using the highest priority rule
      for (const rule of applicableRules) {
        try {
          const result = await this.attemptAssignmentWithRule(order, rule, requestId);
          if (result.success) {
            return result;
          }
        } catch (error) {
          logger.warn('Rule-based assignment failed, trying next rule', {
            requestId,
            orderId,
            ruleId: rule.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // If all rules failed, try default assignment
      return await this.attemptDefaultAssignment(order, requestId);
    } catch (error) {
      logger.error('Automatic assignment processing failed', {
        requestId,
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        reason: 'PROCESSING_ERROR',
      };
    }
  }

  /**
   * Get auto-assignment rules applicable to an order
   */
  private async getApplicableRules(order: any, requestId: string): Promise<AutoAssignmentRule[]> {
    // For now, return a default rule. In a real implementation, this would
    // fetch rules from a database table and filter based on order conditions
    const defaultRule: AutoAssignmentRule = {
      id: 'default-auto-assignment',
      name: 'Default Auto Assignment',
      conditions: {
        orderStatus: ['shipped'],
      },
      assignmentCriteria: {
        maxRadiusKm: 25,
        minRating: 3.0,
        maxAssignments: 5,
      },
      isActive: true,
      priority: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    logger.debug('Found applicable auto-assignment rules', {
      requestId,
      orderId: order.id,
      rulesCount: 1,
    });

    return [defaultRule];
  }

  /**
   * Attempt assignment using a specific rule
   */
  private async attemptAssignmentWithRule(
    order: any,
    rule: AutoAssignmentRule,
    requestId: string
  ): Promise<AutoAssignmentResult> {
    logger.debug('Attempting assignment with rule', {
      requestId,
      orderId: order.id,
      ruleId: rule.id,
      ruleName: rule.name,
    });

    // Extract delivery location from order
    const deliveryLocation = this.extractDeliveryLocation(order);
    if (!deliveryLocation) {
      return {
        success: false,
        reason: 'INVALID_DELIVERY_LOCATION',
        ruleApplied: rule.id,
      };
    }

    // Create assignment request
    const assignmentRequest = {
      orderId: order.id,
      pickupLocation: {
        latitude: order.pickup_latitude || 6.5244, // Default Lagos coordinates
        longitude: order.pickup_longitude || 3.3792,
      },
      deliveryLocation,
      packageWeightKg: order.total_weight_kg,
      packageDimensions: order.package_dimensions,
      specialInstructions: order.delivery_instructions,
      recipientName: order.recipient_name || order.shipping_address?.full_name || 'Customer',
      recipientPhone: order.recipient_phone || order.shipping_address?.phone || '',
      senderName: order.sender_name,
      senderPhone: order.sender_phone,
      priority: this.calculateOrderPriority(order),
      deliveryScheduledAt: order.delivery_scheduled_at,
      deliveryFee: order.delivery_fee || 0,
      courierCommission: this.calculateCourierCommission(order),
    };

    try {
      const assignment = await this.deliveryService.assignDelivery(assignmentRequest, requestId);

      logger.info('Automatic assignment successful', {
        requestId,
        orderId: order.id,
        assignmentId: assignment.id,
        ruleApplied: rule.id,
      });

      return {
        success: true,
        assignmentId: assignment.id,
        courierFound: true,
        ruleApplied: rule.id,
      };
    } catch (error) {
      logger.warn('Assignment failed with rule', {
        requestId,
        orderId: order.id,
        ruleId: rule.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        reason: 'ASSIGNMENT_FAILED',
        ruleApplied: rule.id,
        courierFound: false,
      };
    }
  }

  /**
   * Attempt default assignment when rules fail
   */
  private async attemptDefaultAssignment(
    order: any,
    requestId: string
  ): Promise<AutoAssignmentResult> {
    logger.debug('Attempting default assignment', {
      requestId,
      orderId: order.id,
    });

    const deliveryLocation = this.extractDeliveryLocation(order);
    if (!deliveryLocation) {
      return {
        success: false,
        reason: 'INVALID_DELIVERY_LOCATION',
      };
    }

    // Use more relaxed criteria for default assignment
    const assignmentRequest = {
      orderId: order.id,
      pickupLocation: {
        latitude: order.pickup_latitude || 6.5244,
        longitude: order.pickup_longitude || 3.3792,
      },
      deliveryLocation,
      packageWeightKg: order.total_weight_kg,
      recipientName: order.recipient_name || order.shipping_address?.full_name || 'Customer',
      recipientPhone: order.recipient_phone || order.shipping_address?.phone || '',
      priority: 3, // Medium priority for default
      deliveryFee: order.delivery_fee || 0,
      courierCommission: this.calculateCourierCommission(order),
    };

    try {
      // Try with extended radius and lower rating requirements
      const criteria = {
        location: deliveryLocation,
        maxRadiusKm: 50, // Extended radius
        minRating: 2.0, // Lower rating requirement
      };

      const availableCouriers = await this.deliveryService.findAvailableCouriers(
        criteria,
        requestId
      );

      if (availableCouriers.length === 0) {
        return {
          success: false,
          reason: 'NO_COURIERS_AVAILABLE',
          courierFound: false,
        };
      }

      const assignment = await this.deliveryService.assignDelivery(assignmentRequest, requestId);

      logger.info('Default assignment successful', {
        requestId,
        orderId: order.id,
        assignmentId: assignment.id,
      });

      return {
        success: true,
        assignmentId: assignment.id,
        courierFound: true,
        reason: 'DEFAULT_ASSIGNMENT',
      };
    } catch (error) {
      logger.error('Default assignment failed', {
        requestId,
        orderId: order.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        reason: 'DEFAULT_ASSIGNMENT_FAILED',
        courierFound: false,
      };
    }
  }

  /**
   * Extract delivery location from order
   */
  private extractDeliveryLocation(order: any): { latitude: number; longitude: number } | null {
    // Try to get coordinates from shipping address
    if (order.shipping_address?.latitude && order.shipping_address?.longitude) {
      return {
        latitude: order.shipping_address.latitude,
        longitude: order.shipping_address.longitude,
      };
    }

    // Try to get coordinates from order directly
    if (order.delivery_latitude && order.delivery_longitude) {
      return {
        latitude: order.delivery_latitude,
        longitude: order.delivery_longitude,
      };
    }

    // If no coordinates, we would need to geocode the address
    // For now, return null to indicate invalid location
    logger.warn('No delivery coordinates found for order', {
      orderId: order.id,
      hasShippingAddress: !!order.shipping_address,
      hasDirectCoordinates: !!(order.delivery_latitude && order.delivery_longitude),
    });

    return null;
  }

  /**
   * Calculate order priority based on order properties
   */
  private calculateOrderPriority(order: any): number {
    let priority = 3; // Default medium priority

    // High value orders get higher priority
    if (order.total_amount > 50000) {
      priority = 1; // Urgent
    } else if (order.total_amount > 20000) {
      priority = 2; // High
    }

    // Express orders get higher priority
    if (order.delivery_type === 'express') {
      priority = Math.min(priority, 2);
    }

    // Same-day delivery gets highest priority
    if (order.delivery_type === 'same_day') {
      priority = 1;
    }

    return priority;
  }

  /**
   * Calculate courier commission based on order value and delivery fee
   */
  private calculateCourierCommission(order: any): number {
    const deliveryFee = order.delivery_fee || 0;
    const baseCommission = deliveryFee * 0.7; // 70% of delivery fee

    // Minimum commission
    const minCommission = 500; // 500 NGN minimum

    // Maximum commission
    const maxCommission = 5000; // 5000 NGN maximum

    return Math.max(minCommission, Math.min(maxCommission, baseCommission));
  }

  /**
   * Set up database triggers for automatic assignment
   */
  async setupDatabaseTriggers(): Promise<void> {
    logger.info('Setting up automatic assignment database triggers');

    // This would typically create database triggers or event listeners
    // For now, we'll just log the setup
    // In a real implementation, this might:
    // 1. Create triggers on ecommerce_orders table for status changes
    // 2. Set up event listeners for order updates
    // 3. Configure webhook endpoints for order notifications

    logger.info('Automatic assignment triggers setup completed');
  }

  /**
   * Process batch of orders for automatic assignment
   */
  async processBatchAssignment(
    orderIds: string[],
    requestId: string
  ): Promise<AutoAssignmentResult[]> {
    logger.info('Processing batch automatic assignment', {
      requestId,
      orderCount: orderIds.length,
    });

    const results: AutoAssignmentResult[] = [];

    for (const orderId of orderIds) {
      try {
        const result = await this.processOrderShipped(orderId, `${requestId}-${orderId}`);
        results.push(result);
      } catch (error) {
        logger.error('Batch assignment failed for order', {
          requestId,
          orderId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          reason: 'BATCH_PROCESSING_ERROR',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    logger.info('Batch assignment completed', {
      requestId,
      totalOrders: orderIds.length,
      successfulAssignments: successCount,
      failedAssignments: orderIds.length - successCount,
    });

    return results;
  }
}

// Export singleton instance
export default new AutomaticAssignmentService();
