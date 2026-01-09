// Update Courier Availability Function for Real-time Status Tracking
// This function handles courier availability status updates and location tracking
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

interface AvailabilityUpdateRequest {
  availability_status: 'available' | 'busy' | 'offline' | 'on_break';
  latitude?: number;
  longitude?: number;
  is_online?: boolean;
  shift_start_time?: string;
  shift_end_time?: string;
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

    // 5. Parse and validate request body
    let requestBody: AvailabilityUpdateRequest;
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
    const validation = validateAvailabilityInput(requestBody);
    if (!validation.isValid) {
      return createErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Input validation failed',
        400,
        requestId,
        { validation_errors: validation.errors }
      );
    }

    // 6. Business logic implementation
    logger.info('Processing courier availability update', {
      user_id: user.id,
      request_id: requestId,
      availability_status: requestBody.availability_status,
    });

    const result = await updateCourierAvailability(supabase, user, requestBody);

    // 7. Return success response
    const duration = Date.now() - startTime;
    logger.info('Courier availability updated successfully', {
      user_id: user.id,
      request_id: requestId,
      duration_ms: duration,
      courier_id: result.courier_id,
      new_status: result.availability_status,
    });

    return createSuccessResponse(result, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Courier availability update failed', error, {
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

    if (error.message?.includes('not verified')) {
      return createErrorResponse(
        ERROR_CODES.AUTHORIZATION_ERROR,
        'Courier profile not verified. Cannot update availability.',
        403,
        requestId
      );
    }

    // Default to internal server error
    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      'An unexpected error occurred during availability update',
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

function validateAvailabilityInput(body: AvailabilityUpdateRequest): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate availability status
  const validStatuses = ['available', 'busy', 'offline', 'on_break'];
  if (!body.availability_status || !validStatuses.includes(body.availability_status)) {
    errors.push(`Availability status must be one of: ${validStatuses.join(', ')}`);
  }

  // Validate coordinates if provided
  if (body.latitude !== undefined) {
    if (typeof body.latitude !== 'number' || body.latitude < -90 || body.latitude > 90) {
      errors.push('Latitude must be a number between -90 and 90');
    }
  }

  if (body.longitude !== undefined) {
    if (
      typeof body.longitude !== 'number' ||
      body.longitude < -180 ||
      body.longitude > 180
    ) {
      errors.push('Longitude must be a number between -180 and 180');
    }
  }

  // Validate that both coordinates are provided together
  if (
    (body.latitude !== undefined && body.longitude === undefined) ||
    (body.latitude === undefined && body.longitude !== undefined)
  ) {
    errors.push('Both latitude and longitude must be provided together');
  }

  // Validate shift times if provided
  if (body.shift_start_time && !isValidTimeFormat(body.shift_start_time)) {
    errors.push('Shift start time must be in HH:MM format');
  }

  if (body.shift_end_time && !isValidTimeFormat(body.shift_end_time)) {
    errors.push('Shift end time must be in HH:MM format');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

async function updateCourierAvailability(
  supabase: any,
  user: any,
  requestBody: AvailabilityUpdateRequest
): Promise<any> {
  // Get current courier profile
  const { data: courier, error: fetchError } = await supabase
    .from('courier_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (fetchError || !courier) {
    throw new Error('Courier profile not found');
  }

  if (!courier.is_verified) {
    throw new Error('Courier profile not verified');
  }

  // Prepare update data
  const updateData: any = {
    availability_status: requestBody.availability_status,
    updated_at: new Date().toISOString(),
  };

  // Update location if provided
  if (requestBody.latitude !== undefined && requestBody.longitude !== undefined) {
    updateData.current_latitude = requestBody.latitude;
    updateData.current_longitude = requestBody.longitude;
    updateData.last_location_update = new Date().toISOString();

    // Create PostGIS point for spatial queries
    updateData.current_location = `POINT(${requestBody.longitude} ${requestBody.latitude})`;
  }

  // Update online status
  if (requestBody.is_online !== undefined) {
    updateData.is_online = requestBody.is_online;
  } else {
    // Auto-determine online status based on availability
    updateData.is_online = requestBody.availability_status !== 'offline';
  }

  // Update shift times if provided
  if (requestBody.shift_start_time) {
    updateData.shift_start_time = requestBody.shift_start_time;
  }

  if (requestBody.shift_end_time) {
    updateData.shift_end_time = requestBody.shift_end_time;
  }

  // Store old values for audit
  const oldValues = {
    availability_status: courier.availability_status,
    is_online: courier.is_online,
    current_latitude: courier.current_latitude,
    current_longitude: courier.current_longitude,
  };

  // Update courier profile
  const { data: updatedCourier, error: updateError } = await supabase
    .from('courier_profiles')
    .update(updateData)
    .eq('user_id', user.id)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to update courier availability: ${updateError.message}`);
  }

  // Create audit log entry
  await supabase.from('audit_trail').insert({
    table_name: 'courier_profiles',
    record_id: courier.id,
    action: 'UPDATE',
    old_values: oldValues,
    new_values: updateData,
    user_id: user.id,
    user_email: user.email,
    reason: 'availability_update',
  });

  // If courier went online and is available, check for pending assignments
  let pendingAssignments = null;
  if (requestBody.availability_status === 'available' && updateData.is_online) {
    const { data: assignments } = await supabase
      .from('delivery_assignments')
      .select(
        'id, assignment_number, pickup_latitude, pickup_longitude, delivery_latitude, delivery_longitude'
      )
      .eq('courier_id', courier.id)
      .eq('status', 'assigned')
      .order('created_at', { ascending: true })
      .limit(5);

    pendingAssignments = assignments || [];
  }

  return {
    courier_id: courier.id,
    courier_code: courier.courier_code,
    availability_status: updatedCourier.availability_status,
    is_online: updatedCourier.is_online,
    location:
      requestBody.latitude && requestBody.longitude
        ? {
            latitude: requestBody.latitude,
            longitude: requestBody.longitude,
            updated_at: updateData.last_location_update,
          }
        : null,
    shift_times: {
      start: updatedCourier.shift_start_time,
      end: updatedCourier.shift_end_time,
    },
    pending_assignments: pendingAssignments,
    message: `Availability updated to ${requestBody.availability_status}`,
  };
}

// Helper function for time format validation
function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}
