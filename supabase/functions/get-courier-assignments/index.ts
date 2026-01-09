// Get Courier Assignments Function for Workload Management
// This function retrieves and manages courier delivery assignments
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

    // 5. Parse query parameters
    const url = new URL(req.url);
    const status = url.searchParams.get('status') || 'all';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const date = url.searchParams.get('date'); // YYYY-MM-DD format
    const includeRoute = url.searchParams.get('include_route') === 'true';

    // Validate query parameters
    const validation = validateQueryParams({ status, limit, offset, date });
    if (!validation.isValid) {
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        400,
        requestId,
        { validation_errors: validation.errors }
      );
    }

    // 6. Business logic implementation
    logger.info('Processing courier assignments request', {
      user_id: user.id,
      request_id: requestId,
      status,
      limit,
      offset,
    });

    const result = await getCourierAssignments(supabase, user, {
      status,
      limit,
      offset,
      date,
      includeRoute,
    });

    // 7. Return success response
    const duration = Date.now() - startTime;
    logger.info('Courier assignments retrieved successfully', {
      user_id: user.id,
      request_id: requestId,
      duration_ms: duration,
      assignments_count: result.assignments.length,
    });

    return createSuccessResponse(result, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Get courier assignments failed', error, {
      request_id: requestId,
      duration_ms: duration,
      endpoint: req.url,
      method: req.method,
    });

    // Handle specific error types
    if (error.message?.includes('not found')) {
      return createErrorResponse(
        ERROR_CODES.NOT_FOUND,
        'Courier profile not found',
        404,
        requestId
      );
    }

    // Default to internal server error
    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      'An unexpected error occurred while retrieving assignments',
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

function validateQueryParams(params: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate status
  const validStatuses = [
    'all',
    'pending',
    'assigned',
    'picked_up',
    'in_transit',
    'out_for_delivery',
    'delivered',
    'failed',
    'cancelled',
  ];
  if (!validStatuses.includes(params.status)) {
    errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
  }

  // Validate limit
  if (params.limit < 1 || params.limit > 100) {
    errors.push('Limit must be between 1 and 100');
  }

  // Validate offset
  if (params.offset < 0) {
    errors.push('Offset must be non-negative');
  }

  // Validate date format if provided
  if (params.date && !isValidDateFormat(params.date)) {
    errors.push('Date must be in YYYY-MM-DD format');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

async function getCourierAssignments(
  supabase: any,
  user: any,
  params: {
    status: string;
    limit: number;
    offset: number;
    date?: string;
    includeRoute: boolean;
  }
): Promise<any> {
  // Get courier profile
  const { data: courier, error: courierError } = await supabase
    .from('courier_profiles')
    .select(
      'id, courier_code, availability_status, is_verified, rating, total_deliveries'
    )
    .eq('user_id', user.id)
    .single();

  if (courierError || !courier) {
    throw new Error('Courier profile not found');
  }

  // Build query for assignments
  let query = supabase
    .from('delivery_assignments')
    .select(
      `
      id,
      assignment_number,
      order_id,
      pickup_latitude,
      pickup_longitude,
      delivery_latitude,
      delivery_longitude,
      status,
      priority,
      estimated_distance_km,
      estimated_duration_minutes,
      actual_distance_km,
      actual_duration_minutes,
      package_weight_kg,
      special_instructions,
      pickup_instructions,
      delivery_instructions,
      recipient_name,
      recipient_phone,
      delivery_fee,
      courier_commission,
      assigned_at,
      pickup_scheduled_at,
      delivery_scheduled_at,
      picked_up_at,
      delivered_at,
      customer_rating,
      customer_feedback,
      created_at,
      pickup_address:pickup_address_id(
        street,
        city,
        state,
        country
      ),
      delivery_address:delivery_address_id(
        street,
        city,
        state,
        country
      ),
      order:ecommerce_orders(
        order_number,
        total_amount,
        status as order_status
      )
    `
    )
    .eq('courier_id', courier.id);

  // Apply status filter
  if (params.status !== 'all') {
    query = query.eq('status', params.status);
  }

  // Apply date filter
  if (params.date) {
    const startDate = `${params.date}T00:00:00Z`;
    const endDate = `${params.date}T23:59:59Z`;
    query = query.gte('created_at', startDate).lte('created_at', endDate);
  }

  // Apply pagination and ordering
  query = query
    .order('created_at', { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  const { data: assignments, error: assignmentsError } = await query;

  if (assignmentsError) {
    throw new Error(`Failed to fetch assignments: ${assignmentsError.message}`);
  }

  // Get route information if requested
  let routeInfo = null;
  if (params.includeRoute && assignments.length > 0) {
    const assignmentIds = assignments.map(a => a.id);

    const { data: routes } = await supabase
      .from('delivery_routes')
      .select(
        `
        id,
        route_name,
        route_date,
        delivery_assignments,
        optimized_sequence,
        total_distance_km,
        estimated_total_duration_minutes,
        route_status,
        route_efficiency_score
      `
      )
      .eq('courier_id', courier.id)
      .overlaps('delivery_assignments', assignmentIds)
      .order('route_date', { ascending: false })
      .limit(1)
      .single();

    routeInfo = routes;
  }

  // Calculate workload statistics
  const workloadStats = await calculateWorkloadStats(supabase, courier.id, params.date);

  // Get recent performance metrics
  const performanceMetrics = await getPerformanceMetrics(supabase, courier.id);

  return {
    courier: {
      id: courier.id,
      courier_code: courier.courier_code,
      availability_status: courier.availability_status,
      is_verified: courier.is_verified,
      rating: courier.rating,
      total_deliveries: courier.total_deliveries,
    },
    assignments: assignments || [],
    workload_stats: workloadStats,
    performance_metrics: performanceMetrics,
    route_info: routeInfo,
    pagination: {
      limit: params.limit,
      offset: params.offset,
      total: assignments?.length || 0,
      has_more: (assignments?.length || 0) === params.limit,
    },
  };
}

async function calculateWorkloadStats(
  supabase: any,
  courierId: string,
  date?: string
): Promise<any> {
  let dateFilter = '';
  if (date) {
    dateFilter = `AND created_at >= '${date}T00:00:00Z' AND created_at <= '${date}T23:59:59Z'`;
  } else {
    // Default to today
    const today = new Date().toISOString().split('T')[0];
    dateFilter = `AND created_at >= '${today}T00:00:00Z' AND created_at <= '${today}T23:59:59Z'`;
  }

  const { data: stats } = await supabase.rpc('get_courier_workload_stats', {
    p_courier_id: courierId,
    p_date_filter: dateFilter,
  });

  // If RPC doesn't exist, calculate manually
  if (!stats) {
    const { data: assignments } = await supabase
      .from('delivery_assignments')
      .select('status, delivery_fee, courier_commission, created_at')
      .eq('courier_id', courierId)
      .gte(
        'created_at',
        date ? `${date}T00:00:00Z` : new Date().toISOString().split('T')[0] + 'T00:00:00Z'
      )
      .lte(
        'created_at',
        date ? `${date}T23:59:59Z` : new Date().toISOString().split('T')[0] + 'T23:59:59Z'
      );

    const totalAssignments = assignments?.length || 0;
    const completedAssignments =
      assignments?.filter(a => a.status === 'delivered').length || 0;
    const pendingAssignments =
      assignments?.filter(a =>
        ['pending', 'assigned', 'picked_up', 'in_transit', 'out_for_delivery'].includes(
          a.status
        )
      ).length || 0;
    const totalEarnings =
      assignments?.reduce((sum, a) => sum + (parseFloat(a.courier_commission) || 0), 0) ||
      0;

    return {
      total_assignments: totalAssignments,
      completed_assignments: completedAssignments,
      pending_assignments: pendingAssignments,
      failed_assignments: assignments?.filter(a => a.status === 'failed').length || 0,
      completion_rate:
        totalAssignments > 0
          ? ((completedAssignments / totalAssignments) * 100).toFixed(2)
          : 0,
      total_earnings: totalEarnings.toFixed(2),
    };
  }

  return stats;
}

async function getPerformanceMetrics(supabase: any, courierId: string): Promise<any> {
  // Get last 30 days performance
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentAssignments } = await supabase
    .from('delivery_assignments')
    .select(
      'status, customer_rating, actual_duration_minutes, estimated_duration_minutes, delivered_at, picked_up_at'
    )
    .eq('courier_id', courierId)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .eq('status', 'delivered');

  if (!recentAssignments || recentAssignments.length === 0) {
    return {
      average_rating: 0,
      total_deliveries_30d: 0,
      average_delivery_time: 0,
      on_time_delivery_rate: 0,
    };
  }

  const totalDeliveries = recentAssignments.length;
  const averageRating =
    recentAssignments
      .filter(a => a.customer_rating)
      .reduce((sum, a) => sum + a.customer_rating, 0) /
      recentAssignments.filter(a => a.customer_rating).length || 0;

  const averageDeliveryTime =
    recentAssignments
      .filter(a => a.actual_duration_minutes)
      .reduce((sum, a) => sum + a.actual_duration_minutes, 0) /
      recentAssignments.filter(a => a.actual_duration_minutes).length || 0;

  const onTimeDeliveries = recentAssignments.filter(
    a =>
      a.actual_duration_minutes &&
      a.estimated_duration_minutes &&
      a.actual_duration_minutes <= a.estimated_duration_minutes * 1.1 // 10% tolerance
  ).length;

  const onTimeRate = totalDeliveries > 0 ? (onTimeDeliveries / totalDeliveries) * 100 : 0;

  return {
    average_rating: parseFloat(averageRating.toFixed(2)),
    total_deliveries_30d: totalDeliveries,
    average_delivery_time: Math.round(averageDeliveryTime),
    on_time_delivery_rate: parseFloat(onTimeRate.toFixed(2)),
  };
}

// Helper function for date format validation
function isValidDateFormat(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date));
}
