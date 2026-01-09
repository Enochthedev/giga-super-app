import { CourierProfile, DeliveryAssignment, LocationCoordinates } from '@/types';
import { ServiceError } from '@/utils/errors';
import logger from '@/utils/logger';
import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

export interface CourierMatchingCriteria {
  location: LocationCoordinates;
  maxRadiusKm?: number;
  packageWeightKg?: number;
  priority?: number;
  requiredVehicleType?: string;
  minRating?: number;
}

export interface CourierScore {
  courier: CourierProfile;
  score: number;
  distanceKm: number;
  currentAssignments: number;
  reasoningFactors: {
    distanceScore: number;
    ratingScore: number;
    experienceScore: number;
    workloadScore: number;
    availabilityScore: number;
    vehicleTypeMatch: boolean;
    priorityBonus: number;
  };
}

export interface AssignmentRequest {
  orderId: string;
  pickupLocation: LocationCoordinates;
  deliveryLocation: LocationCoordinates;
  packageWeightKg?: number;
  packageDimensions?: Record<string, any>;
  specialInstructions?: string;
  pickupInstructions?: string;
  deliveryInstructions?: string;
  recipientName: string;
  recipientPhone: string;
  senderName?: string;
  senderPhone?: string;
  priority?: number;
  deliveryScheduledAt?: string;
  deliveryFee?: number;
  courierCommission?: number;
  specificCourierId?: string; // For manual assignment
}

export interface AssignmentConflictResolution {
  strategy: 'reassign' | 'queue' | 'escalate' | 'reject';
  reason: string;
  alternativeCouriers?: string[];
  estimatedDelayMinutes?: number;
}

/**
 * Intelligent courier matching and delivery assignment service
 */
export class DeliveryAssignmentService {
  private supabase: SupabaseClient;
  private readonly DEFAULT_RADIUS_KM = 25;
  private readonly MAX_RADIUS_KM = 50;
  private readonly MAX_COURIER_ASSIGNMENTS = 5;
  private readonly MIN_COURIER_RATING = 2.0;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Find and score available couriers based on intelligent matching algorithm
   */
  async findAvailableCouriers(
    criteria: CourierMatchingCriteria,
    requestId: string
  ): Promise<CourierScore[]> {
    const {
      location,
      maxRadiusKm = this.DEFAULT_RADIUS_KM,
      packageWeightKg,
      priority = 3,
      requiredVehicleType,
      minRating = this.MIN_COURIER_RATING,
    } = criteria;

    logger.debug('Finding available couriers', {
      requestId,
      location,
      maxRadiusKm,
      packageWeightKg,
      priority,
      requiredVehicleType,
      minRating,
    });

    // Use PostGIS function to find nearby couriers
    const { data: nearbyCouriers, error } = await this.supabase.rpc('find_nearby_couriers', {
      search_lat: location.latitude,
      search_lng: location.longitude,
      radius_km: Math.min(maxRadiusKm, this.MAX_RADIUS_KM),
      limit_count: 50, // Get more candidates for better scoring
    });

    if (error) {
      logger.error('Failed to find nearby couriers', {
        requestId,
        error: error.message,
      });
      throw new ServiceError('Failed to find nearby couriers', 'COURIER_SEARCH_FAILED', 500);
    }

    if (!nearbyCouriers || nearbyCouriers.length === 0) {
      logger.warn('No couriers found in search radius', {
        requestId,
        location,
        maxRadiusKm,
      });
      return [];
    }

    // Filter couriers based on additional criteria
    const eligibleCouriers = [];

    for (const courier of nearbyCouriers) {
      // Check rating requirement
      if (courier.rating < minRating) {
        continue;
      }

      // Check vehicle type requirement
      if (requiredVehicleType && courier.vehicle_type !== requiredVehicleType) {
        continue;
      }

      // Check availability status
      if (courier.availability_status !== 'available' || !courier.is_online) {
        continue;
      }

      // Get current workload
      const { data: activeAssignments } = await this.supabase
        .from('delivery_assignments')
        .select('id')
        .eq('courier_id', courier.courier_id)
        .in('status', ['assigned', 'picked_up', 'in_transit'])
        .is('deleted_at', null);

      const currentAssignments = activeAssignments?.length || 0;

      // Check if courier can take more assignments
      if (currentAssignments >= this.MAX_COURIER_ASSIGNMENTS) {
        continue;
      }

      // Check vehicle capacity if package weight is specified
      if (packageWeightKg && courier.vehicle_capacity_kg) {
        // Get total weight of current assignments
        const { data: currentPackages } = await this.supabase
          .from('delivery_assignments')
          .select('package_weight_kg')
          .eq('courier_id', courier.courier_id)
          .in('status', ['assigned', 'picked_up', 'in_transit'])
          .is('deleted_at', null);

        const currentWeight =
          currentPackages?.reduce((sum, pkg) => sum + (pkg.package_weight_kg || 0), 0) || 0;

        if (currentWeight + packageWeightKg > courier.vehicle_capacity_kg) {
          continue;
        }
      }

      eligibleCouriers.push({
        ...courier,
        currentAssignments,
      });
    }

    if (eligibleCouriers.length === 0) {
      logger.warn('No eligible couriers after filtering', {
        requestId,
        totalFound: nearbyCouriers.length,
        criteria,
      });
      return [];
    }

    // Score and rank couriers
    const scoredCouriers = await this.scoreCouriers(eligibleCouriers, criteria, requestId);

    logger.info('Courier scoring completed', {
      requestId,
      totalCandidates: nearbyCouriers.length,
      eligibleCouriers: eligibleCouriers.length,
      scoredCouriers: scoredCouriers.length,
      topScore: scoredCouriers[0]?.score,
    });

    return scoredCouriers;
  }

  /**
   * Score couriers using intelligent algorithm considering multiple factors
   */
  private async scoreCouriers(
    couriers: any[],
    criteria: CourierMatchingCriteria,
    requestId: string
  ): Promise<CourierScore[]> {
    const { priority = 3 } = criteria;

    const scoredCouriers: CourierScore[] = [];

    // Calculate max values for normalization
    const maxDistance = Math.max(...couriers.map(c => c.distance_km));
    const maxDeliveries = Math.max(...couriers.map(c => c.total_deliveries || 0));

    for (const courier of couriers) {
      // Distance score (40% weight) - closer is better
      const distanceScore =
        maxDistance > 0 ? ((maxDistance - courier.distance_km) / maxDistance) * 40 : 40;

      // Rating score (25% weight) - higher rating is better
      const ratingScore = (courier.rating / 5) * 25;

      // Experience score (20% weight) - more deliveries is better
      const experienceScore =
        maxDeliveries > 0 ? ((courier.total_deliveries || 0) / maxDeliveries) * 20 : 0;

      // Workload score (10% weight) - fewer current assignments is better
      const workloadScore = (1 - courier.currentAssignments / this.MAX_COURIER_ASSIGNMENTS) * 10;

      // Availability score (5% weight) - immediate availability is better
      const availabilityScore = courier.availability_status === 'available' ? 5 : 0;

      // Vehicle type match bonus
      const vehicleTypeMatch = criteria.requiredVehicleType
        ? courier.vehicle_type === criteria.requiredVehicleType
        : true;

      // Priority bonus for high-priority deliveries
      let priorityBonus = 0;
      if (priority === 1 && courier.rating >= 4.5) {
        // Urgent
        priorityBonus = 10;
      } else if (priority === 2 && courier.rating >= 4.0) {
        // High
        priorityBonus = 5;
      } else if (priority <= 2 && courier.rating >= 3.5) {
        // Medium-High
        priorityBonus = 2;
      }

      // Calculate total score
      let totalScore =
        distanceScore +
        ratingScore +
        experienceScore +
        workloadScore +
        availabilityScore +
        priorityBonus;

      // Apply vehicle type penalty if not matching
      if (criteria.requiredVehicleType && !vehicleTypeMatch) {
        totalScore *= 0.7; // 30% penalty
      }

      // Apply capacity bonus for larger vehicles when needed
      if (criteria.packageWeightKg && courier.vehicle_capacity_kg) {
        const capacityUtilization = criteria.packageWeightKg / courier.vehicle_capacity_kg;
        if (capacityUtilization <= 0.8) {
          // Good capacity margin
          totalScore += 3;
        }
      }

      const courierScore: CourierScore = {
        courier: {
          id: courier.courier_id,
          user_id: courier.user_id,
          courier_code: courier.courier_code,
          first_name: courier.first_name,
          last_name: courier.last_name,
          phone_number: courier.phone_number,
          email: courier.email || '',
          verification_status: courier.is_verified ? 'verified' : 'pending',
          availability_status: courier.availability_status,
          is_online: courier.is_online,
          current_location:
            courier.current_latitude && courier.current_longitude
              ? {
                  latitude: courier.current_latitude,
                  longitude: courier.current_longitude,
                  updated_at: courier.last_location_update || new Date().toISOString(),
                }
              : {
                  latitude: 0,
                  longitude: 0,
                  updated_at: new Date().toISOString(),
                },
          vehicle_info: {
            type: courier.vehicle_type,
            registration: courier.vehicle_registration || '',
            capacity_kg: courier.vehicle_capacity_kg || 0,
            max_delivery_radius_km: courier.max_delivery_radius_km || 0,
          },
          performance_metrics: {
            total_deliveries: courier.total_deliveries || 0,
            completed_deliveries: courier.successful_deliveries || 0,
            failed_deliveries: courier.failed_deliveries || 0,
            average_rating: courier.rating,
            completion_rate:
              courier.total_deliveries > 0
                ? (courier.successful_deliveries || 0) / courier.total_deliveries
                : 0,
            on_time_delivery_rate: 0.95, // Default value, would be calculated from data
            average_delivery_time_minutes: courier.average_delivery_time_minutes || 0,
            total_earnings: 0, // Would be calculated from payment data
          },
          created_at: courier.created_at || new Date().toISOString(),
          updated_at: courier.updated_at || new Date().toISOString(),
        },
        score: Math.round(totalScore * 100) / 100,
        distanceKm: courier.distance_km,
        currentAssignments: courier.currentAssignments,
        reasoningFactors: {
          distanceScore: Math.round(distanceScore * 100) / 100,
          ratingScore: Math.round(ratingScore * 100) / 100,
          experienceScore: Math.round(experienceScore * 100) / 100,
          workloadScore: Math.round(workloadScore * 100) / 100,
          availabilityScore,
          vehicleTypeMatch,
          priorityBonus,
        },
      };

      scoredCouriers.push(courierScore);
    }

    // Sort by score (highest first)
    scoredCouriers.sort((a, b) => b.score - a.score);

    return scoredCouriers;
  }

  /**
   * Create a delivery assignment with intelligent courier matching
   */
  async assignDelivery(request: AssignmentRequest, requestId: string): Promise<DeliveryAssignment> {
    logger.info('Processing delivery assignment request', {
      requestId,
      orderId: request.orderId,
      priority: request.priority,
      specificCourier: !!request.specificCourierId,
    });

    // Validate coordinates
    this.validateCoordinates(request.pickupLocation, 'pickup');
    this.validateCoordinates(request.deliveryLocation, 'delivery');

    // Check if order already has an active assignment
    await this.checkExistingAssignment(request.orderId, requestId);

    let selectedCourier: CourierScore | null = null;

    if (request.specificCourierId) {
      // Manual assignment to specific courier
      selectedCourier = await this.validateSpecificCourier(request.specificCourierId, requestId);
    } else {
      // Intelligent courier matching
      const criteria: CourierMatchingCriteria = {
        location: request.pickupLocation,
        packageWeightKg: request.packageWeightKg,
        priority: request.priority,
        requiredVehicleType: undefined, // Could be derived from package requirements
        minRating: this.MIN_COURIER_RATING,
      };

      const availableCouriers = await this.findAvailableCouriers(criteria, requestId);

      if (availableCouriers.length === 0) {
        throw new ServiceError(
          'No available couriers found for this delivery',
          'NO_AVAILABLE_COURIERS',
          404
        );
      }

      selectedCourier = availableCouriers[0] || null; // Best scored courier
    }

    // Create the delivery assignment
    if (!selectedCourier) {
      throw new ServiceError('No courier selected for assignment', 'NO_COURIER_SELECTED', 500);
    }

    const assignment = await this.createAssignment(request, selectedCourier, requestId);

    // Update courier availability if needed
    await this.updateCourierAvailability(selectedCourier.courier.id, requestId);

    // Create automatic assignment trigger for future orders
    await this.setupAutomaticAssignmentTrigger(request.orderId, requestId);

    logger.info('Delivery assignment created successfully', {
      requestId,
      assignmentId: assignment.id,
      orderId: request.orderId,
      courierId: selectedCourier.courier.id,
      courierScore: selectedCourier.score,
    });

    return assignment;
  }

  /**
   * Handle assignment conflicts and provide resolution strategies
   */
  async resolveAssignmentConflict(
    orderId: string,
    conflictReason: string,
    requestId: string
  ): Promise<AssignmentConflictResolution> {
    logger.warn('Resolving assignment conflict', {
      requestId,
      orderId,
      conflictReason,
    });

    // Get order details to determine resolution strategy
    const { data: order } = await this.supabase
      .from('ecommerce_orders')
      .select('priority, delivery_scheduled_at, total_amount')
      .eq('id', orderId)
      .single();

    if (!order) {
      return {
        strategy: 'reject',
        reason: 'Order not found',
      };
    }

    // Determine resolution strategy based on conflict type and order priority
    if (conflictReason === 'NO_AVAILABLE_COURIERS') {
      // Try to find couriers in extended radius
      const extendedCriteria: CourierMatchingCriteria = {
        location: { latitude: 0, longitude: 0 }, // Will be set from order
        maxRadiusKm: this.MAX_RADIUS_KM,
        minRating: 1.0, // Lower rating threshold
      };

      const extendedCouriers = await this.findAvailableCouriers(extendedCriteria, requestId);

      if (extendedCouriers.length > 0) {
        return {
          strategy: 'reassign',
          reason: 'Found couriers in extended radius',
          alternativeCouriers: extendedCouriers.slice(0, 3).map(c => c.courier.id),
          estimatedDelayMinutes: 30,
        };
      }

      // Check if we can queue for later
      if (order.delivery_scheduled_at) {
        const scheduledTime = new Date(order.delivery_scheduled_at);
        const now = new Date();
        const hoursUntilScheduled = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilScheduled > 2) {
          return {
            strategy: 'queue',
            reason: 'Queue for scheduled delivery time',
            estimatedDelayMinutes: Math.max(120, hoursUntilScheduled * 60),
          };
        }
      }

      // Escalate high-value or urgent orders
      if (order.priority <= 2 || order.total_amount > 10000) {
        return {
          strategy: 'escalate',
          reason: 'High priority or high value order requires manual intervention',
        };
      }

      return {
        strategy: 'reject',
        reason: 'No available couriers and cannot queue or escalate',
      };
    }

    // Default fallback
    return {
      strategy: 'queue',
      reason: 'Default conflict resolution - queue for retry',
      estimatedDelayMinutes: 60,
    };
  }

  /**
   * Set up automatic assignment triggers for shipped ecommerce orders
   */
  private async setupAutomaticAssignmentTrigger(orderId: string, requestId: string): Promise<void> {
    // This would typically involve setting up database triggers or event listeners
    // For now, we'll log the setup for future implementation
    logger.info('Setting up automatic assignment trigger', {
      requestId,
      orderId,
      triggerType: 'order_status_change',
      targetStatus: 'shipped',
    });

    // In a real implementation, this might:
    // 1. Create a database trigger on ecommerce_orders table
    // 2. Set up event listeners for order status changes
    // 3. Configure automatic assignment rules based on order properties
  }

  /**
   * Validate coordinates
   */
  private validateCoordinates(location: LocationCoordinates, type: string): void {
    if (!location.latitude || !location.longitude) {
      throw new ServiceError(`Invalid ${type} coordinates`, 'INVALID_COORDINATES', 400);
    }

    if (
      location.latitude < -90 ||
      location.latitude > 90 ||
      location.longitude < -180 ||
      location.longitude > 180
    ) {
      throw new ServiceError(`Invalid ${type} coordinate values`, 'INVALID_COORDINATE_VALUES', 400);
    }
  }

  /**
   * Check if order already has an active assignment
   */
  private async checkExistingAssignment(orderId: string, requestId: string): Promise<void> {
    const { data: existingAssignment } = await this.supabase
      .from('delivery_assignments')
      .select('id, status, courier_id')
      .eq('order_id', orderId)
      .not('status', 'in', '(delivered,failed,cancelled)')
      .is('deleted_at', null)
      .single();

    if (existingAssignment) {
      throw new ServiceError(
        'Order already has an active delivery assignment',
        'ASSIGNMENT_EXISTS',
        409,
        {
          assignmentId: existingAssignment.id,
          status: existingAssignment.status,
          courierId: existingAssignment.courier_id,
        }
      );
    }
  }

  /**
   * Validate specific courier for manual assignment
   */
  private async validateSpecificCourier(
    courierId: string,
    requestId: string
  ): Promise<CourierScore> {
    const { data: courier, error } = await this.supabase
      .from('courier_profiles')
      .select('*')
      .eq('id', courierId)
      .eq('is_active', true)
      .eq('is_verified', true)
      .eq('availability_status', 'available')
      .eq('is_online', true)
      .is('deleted_at', null)
      .single();

    if (error || !courier) {
      throw new ServiceError(
        'Specified courier is not available for assignment',
        'COURIER_NOT_AVAILABLE',
        404
      );
    }

    // Check current workload
    const { data: activeAssignments } = await this.supabase
      .from('delivery_assignments')
      .select('id')
      .eq('courier_id', courierId)
      .in('status', ['assigned', 'picked_up', 'in_transit'])
      .is('deleted_at', null);

    const currentAssignments = activeAssignments?.length || 0;

    if (currentAssignments >= this.MAX_COURIER_ASSIGNMENTS) {
      throw new ServiceError(
        'Courier has reached maximum assignment limit',
        'COURIER_OVERLOADED',
        409
      );
    }

    return {
      courier,
      score: 100, // Manual assignment gets perfect score
      distanceKm: 0, // Distance not calculated for manual assignment
      currentAssignments,
      reasoningFactors: {
        distanceScore: 0,
        ratingScore: 0,
        experienceScore: 0,
        workloadScore: 0,
        availabilityScore: 0,
        vehicleTypeMatch: true,
        priorityBonus: 0,
      },
    };
  }

  /**
   * Create the delivery assignment record
   */
  private async createAssignment(
    request: AssignmentRequest,
    courier: CourierScore,
    requestId: string
  ): Promise<DeliveryAssignment> {
    const assignmentData = {
      id: uuidv4(),
      order_id: request.orderId,
      courier_id: courier.courier.id,
      pickup_latitude: request.pickupLocation.latitude,
      pickup_longitude: request.pickupLocation.longitude,
      delivery_latitude: request.deliveryLocation.latitude,
      delivery_longitude: request.deliveryLocation.longitude,
      status: 'assigned' as const,
      priority: request.priority || 3,
      package_weight_kg: request.packageWeightKg,
      package_dimensions: request.packageDimensions,
      special_instructions: request.specialInstructions,
      pickup_instructions: request.pickupInstructions,
      delivery_instructions: request.deliveryInstructions,
      recipient_name: request.recipientName,
      recipient_phone: request.recipientPhone,
      sender_name: request.senderName,
      sender_phone: request.senderPhone,
      delivery_fee: request.deliveryFee || 0,
      courier_commission: request.courierCommission || 0,
      assigned_at: new Date().toISOString(),
      delivery_scheduled_at: request.deliveryScheduledAt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: assignment, error } = await this.supabase
      .from('delivery_assignments')
      .insert(assignmentData)
      .select('*')
      .single();

    if (error) {
      logger.error('Failed to create delivery assignment', {
        requestId,
        error: error.message,
        assignmentData,
      });
      throw new ServiceError(
        'Failed to create delivery assignment',
        'ASSIGNMENT_CREATION_FAILED',
        500
      );
    }

    return assignment;
  }

  /**
   * Update courier availability based on current workload
   */
  private async updateCourierAvailability(courierId: string, requestId: string): Promise<void> {
    // Check current assignment count
    const { data: assignments } = await this.supabase
      .from('delivery_assignments')
      .select('id')
      .eq('courier_id', courierId)
      .in('status', ['assigned', 'picked_up', 'in_transit'])
      .is('deleted_at', null);

    const assignmentCount = assignments?.length || 0;

    // Update availability if courier has reached max assignments
    if (assignmentCount >= this.MAX_COURIER_ASSIGNMENTS) {
      await this.supabase
        .from('courier_profiles')
        .update({
          availability_status: 'busy',
          updated_at: new Date().toISOString(),
        })
        .eq('id', courierId);

      logger.info('Courier marked as busy due to max assignments', {
        requestId,
        courierId,
        assignmentCount,
        maxAssignments: this.MAX_COURIER_ASSIGNMENTS,
      });
    }
  }
}
