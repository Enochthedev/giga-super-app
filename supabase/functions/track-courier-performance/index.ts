// Track Courier Performance Function for Rating and Metrics System
// This function handles courier performance tracking, ratings, and analytics
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Standardized CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// Standardized error codes
const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

// Standardized response interfaces
interface SuccessResponse<T = any> {
  success: true;
  data: T;
  metadata: {
    timestamp: string;
    request_id?: string;
    version: string;
  };
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    timestamp: string;
    request_id?: string;
    version: string;
  };
}

interface PerformanceUpdateRequest {
  delivery_assignment_id: string;
  customer_rating?: number;
  customer_feedback?: string;
  delivery_time_minutes?: number;
  on_time_delivery?: boolean;
  delivery_issues?: string[];
  performance_notes?: string;
}

// Structured logging utility
const logger = {
  info: (message: string, context?: any) => {
    console.log(
      JSON.stringify({
        level: 'info',
        message,
        context,
        timestamp: new Date().toISOString(),
      })
    );
  },
  error: (message: string, error?: any, context?: any) => {
    console.error(
      JSON.stringify({
        level: 'error',
        message,
        error: error?.message || error,
        stack: error?.stack,
        context,
        timestamp: new Date().toISOString(),
      })
    );
  },
  security: (event: string, userId?: string, details?: any) => {
    console.log(
      JSON.stringify({
        level: 'security',
        event,
        user_id: userId,
        details,
        timestamp: new Date().toISOString(),
      })
    );
  },
};

serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Authentication validation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logger.security('authentication_missing', undefined, {
        endpoint: req.url,
        method: req.method,
      });

      return createErrorResponse(
        ERROR_CODES.AUTHENTICATION_ERROR,
        'Missing authorization header',
        401,
        requestId
      );
    }

    // 3. Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // 4. Get user context
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      logger.security('authentication_failed', undefined, {
        error: authError?.message,
        endpoint: req.url,
      });

      return createErrorResponse(
        ERROR_CODES.AUTHENTICATION_ERROR,
        'Invalid authentication token',
        401,
        requestId
      );
    }

    // 5. Handle different HTTP methods
    if (req.method === 'GET') {
      // Get performance metrics
      const url = new URL(req.url);
      const courierId = url.searchParams.get('courier_id');
      const period = url.searchParams.get('period') || '30'; // days
      const includeDetails = url.searchParams.get('include_details') === 'true';

      const result = await getCourierPerformance(
        supabase,
        user,
        courierId,
        parseInt(period),
        includeDetails
      );

      const duration = Date.now() - startTime;
      logger.info('Courier performance retrieved successfully', {
        user_id: user.id,
        request_id: requestId,
        duration_ms: duration,
      });

      return createSuccessResponse(result, requestId);
    } else if (req.method === 'POST') {
      // Update performance metrics
      let requestBody: PerformanceUpdateRequest;
      try {
        requestBody = await req.json();
      } catch (error) {
        return createErrorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'Invalid JSON in request body',
          400,
          requestId
        );
      }

      // Input validation
      const validation = validatePerformanceInput(requestBody);
      if (!validation.isValid) {
        return createErrorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'Input validation failed',
          400,
          requestId,
          { validation_errors: validation.errors }
        );
      }

      logger.info('Processing courier performance update', {
        user_id: user.id,
        request_id: requestId,
        delivery_assignment_id: requestBody.delivery_assignment_id,
      });

      const result = await updateCourierPerformance(supabase, user, requestBody);

      const duration = Date.now() - startTime;
      logger.info('Courier performance updated successfully', {
        user_id: user.id,
        request_id: requestId,
        duration_ms: duration,
      });

      return createSuccessResponse(result, requestId);
    } else {
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Method not allowed',
        405,
        requestId
      );
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Courier performance operation failed', error, {
      request_id: requestId,
      duration_ms: duration,
      endpoint: req.url,
      method: req.method,
    });

    // Handle specific error types
    if (error.message?.includes('not found')) {
      return createErrorResponse(
        ERROR_CODES.NOT_FOUND,
        'Resource not found',
        404,
        requestId
      );
    }

    if (error.message?.includes('unauthorized')) {
      return createErrorResponse(
        ERROR_CODES.AUTHORIZATION_ERROR,
        'Unauthorized to access this resource',
        403,
        requestId
      );
    }

    // Default to internal server error
    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      'An unexpected error occurred during performance operation',
      500,
      requestId,
      process.env.NODE_ENV === 'development' ? { error: error.message } : undefined
    );
  }
});

// Utility functions
function createSuccessResponse<T>(data: T, requestId: string): Response {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      request_id: requestId,
      version: '1.0.0',
    },
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function createErrorResponse(
  code: string,
  message: string,
  status: number,
  requestId: string,
  details?: any
): Response {
  const response: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      request_id: requestId,
      version: '1.0.0',
    },
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function validatePerformanceInput(body: PerformanceUpdateRequest): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate delivery assignment ID
  if (!body.delivery_assignment_id || typeof body.delivery_assignment_id !== 'string') {
    errors.push('Delivery assignment ID is required');
  }

  // Validate customer rating if provided
  if (body.customer_rating !== undefined) {
    if (
      typeof body.customer_rating !== 'number' ||
      body.customer_rating < 1 ||
      body.customer_rating > 5
    ) {
      errors.push('Customer rating must be a number between 1 and 5');
    }
  }

  // Validate delivery time if provided
  if (body.delivery_time_minutes !== undefined) {
    if (
      typeof body.delivery_time_minutes !== 'number' ||
      body.delivery_time_minutes < 0
    ) {
      errors.push('Delivery time must be a non-negative number');
    }
  }

  // Validate delivery issues if provided
  if (body.delivery_issues !== undefined) {
    if (!Array.isArray(body.delivery_issues)) {
      errors.push('Delivery issues must be an array');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

async function getCourierPerformance(
  supabase: any,
  user: any,
  courierId: string | null,
  periodDays: number,
  includeDetails: boolean
): Promise<any> {
  // If no courier ID provided, get current user's courier profile
  let targetCourierId = courierId;
  if (!targetCourierId) {
    const { data: courier } = await supabase
      .from('courier_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!courier) {
      throw new Error('Courier profile not found');
    }
    targetCourierId = courier.id;
  }

  // Check authorization - users can only view their own performance unless admin
  const { data: userRoles } = await supabase
    .from('user_active_roles')
    .select('active_role')
    .eq('user_id', user.id)
    .single();

  const isAdmin = userRoles?.active_role === 'ADMIN';

  if (!isAdmin && courierId) {
    const { data: courierProfile } = await supabase
      .from('courier_profiles')
      .select('user_id')
      .eq('id', courierId)
      .single();

    if (!courierProfile || courierProfile.user_id !== user.id) {
      throw new Error("Unauthorized to view this courier's performance");
    }
  }

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  // Get courier basic info
  const { data: courier, error: courierError } = await supabase
    .from('courier_profiles')
    .select(
      `
      id,
      courier_code,
      first_name,
      last_name,
      rating,
      total_deliveries,
      successful_deliveries,
      failed_deliveries,
      average_delivery_time_minutes,
      is_verified,
      created_at
    `
    )
    .eq('id', targetCourierId)
    .single();

  if (courierError || !courier) {
    throw new Error('Courier not found');
  }

  // Get performance metrics for the period
  const { data: assignments } = await supabase
    .from('delivery_assignments')
    .select(
      `
      id,
      assignment_number,
      status,
      customer_rating,
      customer_feedback,
      actual_duration_minutes,
      estimated_duration_minutes,
      delivery_fee,
      courier_commission,
      created_at,
      delivered_at,
      failed_at
    `
    )
    .eq('courier_id', targetCourierId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: false });

  // Calculate performance metrics
  const totalAssignments = assignments?.length || 0;
  const completedAssignments = assignments?.filter(a => a.status === 'delivered') || [];
  const failedAssignments = assignments?.filter(a => a.status === 'failed') || [];

  const completionRate =
    totalAssignments > 0 ? (completedAssignments.length / totalAssignments) * 100 : 0;

  const ratingsWithValues = completedAssignments.filter(a => a.customer_rating);
  const averageRating =
    ratingsWithValues.length > 0
      ? ratingsWithValues.reduce((sum, a) => sum + a.customer_rating, 0) /
        ratingsWithValues.length
      : 0;

  const onTimeDeliveries = completedAssignments.filter(
    a =>
      a.actual_duration_minutes &&
      a.estimated_duration_minutes &&
      a.actual_duration_minutes <= a.estimated_duration_minutes * 1.1 // 10% tolerance
  );
  const onTimeRate =
    completedAssignments.length > 0
      ? (onTimeDeliveries.length / completedAssignments.length) * 100
      : 0;

  const totalEarnings =
    assignments?.reduce((sum, a) => sum + (parseFloat(a.courier_commission) || 0), 0) ||
    0;
  const averageEarningsPerDelivery =
    completedAssignments.length > 0 ? totalEarnings / completedAssignments.length : 0;

  // Calculate average delivery time for completed deliveries
  const deliveriesWithTime = completedAssignments.filter(a => a.actual_duration_minutes);
  const averageDeliveryTime =
    deliveriesWithTime.length > 0
      ? deliveriesWithTime.reduce((sum, a) => sum + a.actual_duration_minutes, 0) /
        deliveriesWithTime.length
      : 0;

  // Get performance trends (compare with previous period)
  const previousStartDate = new Date(startDate);
  previousStartDate.setDate(previousStartDate.getDate() - periodDays);

  const { data: previousAssignments } = await supabase
    .from('delivery_assignments')
    .select('status, customer_rating, actual_duration_minutes')
    .eq('courier_id', targetCourierId)
    .gte('created_at', previousStartDate.toISOString())
    .lt('created_at', startDate.toISOString());

  const previousCompleted =
    previousAssignments?.filter(a => a.status === 'delivered') || [];
  const previousCompletionRate =
    previousAssignments?.length > 0
      ? (previousCompleted.length / previousAssignments.length) * 100
      : 0;

  const previousRatings = previousCompleted.filter(a => a.customer_rating);
  const previousAverageRating =
    previousRatings.length > 0
      ? previousRatings.reduce((sum, a) => sum + a.customer_rating, 0) /
        previousRatings.length
      : 0;

  const performanceMetrics = {
    period: {
      days: periodDays,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    },
    summary: {
      total_assignments: totalAssignments,
      completed_assignments: completedAssignments.length,
      failed_assignments: failedAssignments.length,
      completion_rate: parseFloat(completionRate.toFixed(2)),
      average_rating: parseFloat(averageRating.toFixed(2)),
      on_time_delivery_rate: parseFloat(onTimeRate.toFixed(2)),
      total_earnings: parseFloat(totalEarnings.toFixed(2)),
      average_earnings_per_delivery: parseFloat(averageEarningsPerDelivery.toFixed(2)),
      average_delivery_time_minutes: Math.round(averageDeliveryTime),
    },
    trends: {
      completion_rate_change: parseFloat(
        (completionRate - previousCompletionRate).toFixed(2)
      ),
      rating_change: parseFloat((averageRating - previousAverageRating).toFixed(2)),
    },
    ratings_distribution: calculateRatingsDistribution(ratingsWithValues),
  };

  const result: any = {
    courier: {
      id: courier.id,
      courier_code: courier.courier_code,
      name: `${courier.first_name} ${courier.last_name}`,
      overall_rating: courier.rating,
      total_deliveries: courier.total_deliveries,
      successful_deliveries: courier.successful_deliveries,
      failed_deliveries: courier.failed_deliveries,
      is_verified: courier.is_verified,
      member_since: courier.created_at,
    },
    performance_metrics: performanceMetrics,
  };

  // Include detailed assignments if requested
  if (includeDetails) {
    result.recent_assignments = assignments?.slice(0, 20).map(a => ({
      id: a.id,
      assignment_number: a.assignment_number,
      status: a.status,
      customer_rating: a.customer_rating,
      customer_feedback: a.customer_feedback,
      delivery_time_minutes: a.actual_duration_minutes,
      earnings: parseFloat(a.courier_commission || '0'),
      created_at: a.created_at,
      completed_at: a.delivered_at || a.failed_at,
    }));
  }

  return result;
}

async function updateCourierPerformance(
  supabase: any,
  user: any,
  requestBody: PerformanceUpdateRequest
): Promise<any> {
  // Get the delivery assignment and verify authorization
  const { data: assignment, error: assignmentError } = await supabase
    .from('delivery_assignments')
    .select(
      `
      id,
      courier_id,
      status,
      customer_rating,
      actual_duration_minutes,
      courier_profiles!inner(user_id, id)
    `
    )
    .eq('id', requestBody.delivery_assignment_id)
    .single();

  if (assignmentError || !assignment) {
    throw new Error('Delivery assignment not found');
  }

  // Check authorization - only the courier or admin can update performance
  const { data: userRoles } = await supabase
    .from('user_active_roles')
    .select('active_role')
    .eq('user_id', user.id)
    .single();

  const isAdmin = userRoles?.active_role === 'ADMIN';
  const isCourierOwner = assignment.courier_profiles.user_id === user.id;

  if (!isAdmin && !isCourierOwner) {
    throw new Error('Unauthorized to update this delivery performance');
  }

  // Update assignment with performance data
  const updateData: any = {};

  if (requestBody.customer_rating !== undefined) {
    updateData.customer_rating = requestBody.customer_rating;
  }

  if (requestBody.customer_feedback !== undefined) {
    updateData.customer_feedback = requestBody.customer_feedback;
  }

  if (requestBody.delivery_time_minutes !== undefined) {
    updateData.actual_duration_minutes = requestBody.delivery_time_minutes;
  }

  if (Object.keys(updateData).length > 0) {
    updateData.updated_at = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('delivery_assignments')
      .update(updateData)
      .eq('id', requestBody.delivery_assignment_id);

    if (updateError) {
      throw new Error(`Failed to update assignment: ${updateError.message}`);
    }
  }

  // Recalculate courier's overall performance metrics
  await recalculateCourierMetrics(supabase, assignment.courier_id);

  // Create audit log
  await supabase.from('audit_trail').insert({
    table_name: 'delivery_assignments',
    record_id: requestBody.delivery_assignment_id,
    action: 'UPDATE',
    new_values: updateData,
    user_id: user.id,
    user_email: user.email,
    reason: 'performance_update',
  });

  return {
    assignment_id: requestBody.delivery_assignment_id,
    updated_fields: Object.keys(updateData),
    message: 'Performance metrics updated successfully',
  };
}

async function recalculateCourierMetrics(
  supabase: any,
  courierId: string
): Promise<void> {
  // Get all completed assignments for this courier
  const { data: assignments } = await supabase
    .from('delivery_assignments')
    .select('status, customer_rating, actual_duration_minutes')
    .eq('courier_id', courierId);

  if (!assignments || assignments.length === 0) {
    return;
  }

  const totalDeliveries = assignments.length;
  const successfulDeliveries = assignments.filter(a => a.status === 'delivered').length;
  const failedDeliveries = assignments.filter(a => a.status === 'failed').length;

  const ratingsWithValues = assignments.filter(
    a => a.customer_rating && a.status === 'delivered'
  );
  const averageRating =
    ratingsWithValues.length > 0
      ? ratingsWithValues.reduce((sum, a) => sum + a.customer_rating, 0) /
        ratingsWithValues.length
      : 0;

  const deliveriesWithTime = assignments.filter(
    a => a.actual_duration_minutes && a.status === 'delivered'
  );
  const averageDeliveryTime =
    deliveriesWithTime.length > 0
      ? deliveriesWithTime.reduce((sum, a) => sum + a.actual_duration_minutes, 0) /
        deliveriesWithTime.length
      : 0;

  // Update courier profile with new metrics
  const { error: updateError } = await supabase
    .from('courier_profiles')
    .update({
      total_deliveries: totalDeliveries,
      successful_deliveries: successfulDeliveries,
      failed_deliveries: failedDeliveries,
      rating: parseFloat(averageRating.toFixed(2)),
      average_delivery_time_minutes: Math.round(averageDeliveryTime),
      updated_at: new Date().toISOString(),
    })
    .eq('id', courierId);

  if (updateError) {
    console.error('Failed to update courier metrics:', updateError);
  }
}

function calculateRatingsDistribution(ratings: any[]): any {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  ratings.forEach(assignment => {
    const rating = Math.floor(assignment.customer_rating);
    if (rating >= 1 && rating <= 5) {
      distribution[rating as keyof typeof distribution]++;
    }
  });

  const total = ratings.length;
  return {
    counts: distribution,
    percentages:
      total > 0
        ? {
            1: parseFloat(((distribution[1] / total) * 100).toFixed(1)),
            2: parseFloat(((distribution[2] / total) * 100).toFixed(1)),
            3: parseFloat(((distribution[3] / total) * 100).toFixed(1)),
            4: parseFloat(((distribution[4] / total) * 100).toFixed(1)),
            5: parseFloat(((distribution[5] / total) * 100).toFixed(1)),
          }
        : { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };
}
