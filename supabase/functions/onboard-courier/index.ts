// Courier Onboarding Function with Verification Workflow
// This function handles new courier registration and verification process
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

interface CourierOnboardingRequest {
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
  license_number: string;
  license_expiry_date: string;
  vehicle_type: string;
  vehicle_registration: string;
  vehicle_capacity_kg?: number;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  bank_account_number?: string;
  bank_name?: string;
  account_holder_name?: string;
  max_delivery_radius_km?: number;
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
    let requestBody: CourierOnboardingRequest;
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
    const validation = validateOnboardingInput(requestBody);
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
    logger.info('Processing courier onboarding request', {
      user_id: user.id,
      request_id: requestId,
    });

    const result = await onboardCourier(supabase, user, requestBody);

    // 7. Return success response
    const duration = Date.now() - startTime;
    logger.info('Courier onboarding completed successfully', {
      user_id: user.id,
      request_id: requestId,
      duration_ms: duration,
      courier_id: result.courier_id,
    });

    return createSuccessResponse(result, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Courier onboarding failed', error, {
      request_id: requestId,
      duration_ms: duration,
      endpoint: req.url,
      method: req.method,
    });

    // Handle specific error types
    if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
      return createErrorResponse(
        ERROR_CODES.CONFLICT,
        'Courier profile already exists or duplicate information provided',
        409,
        requestId
      );
    }

    // Default to internal server error
    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      'An unexpected error occurred during courier onboarding',
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

function validateOnboardingInput(body: CourierOnboardingRequest): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields validation
  if (!body.first_name || body.first_name.trim().length < 2) {
    errors.push('First name is required and must be at least 2 characters');
  }

  if (!body.last_name || body.last_name.trim().length < 2) {
    errors.push('Last name is required and must be at least 2 characters');
  }

  if (!body.phone_number || !isValidPhoneNumber(body.phone_number)) {
    errors.push('Valid phone number is required');
  }

  if (!body.email || !isValidEmail(body.email)) {
    errors.push('Valid email address is required');
  }

  if (!body.license_number || body.license_number.trim().length < 5) {
    errors.push('Valid license number is required (minimum 5 characters)');
  }

  if (!body.license_expiry_date || !isValidDate(body.license_expiry_date)) {
    errors.push('Valid license expiry date is required (YYYY-MM-DD format)');
  } else if (new Date(body.license_expiry_date) <= new Date()) {
    errors.push('License expiry date must be in the future');
  }

  if (!body.vehicle_type || body.vehicle_type.trim().length < 2) {
    errors.push('Vehicle type is required');
  }

  if (!body.vehicle_registration || body.vehicle_registration.trim().length < 3) {
    errors.push('Vehicle registration is required');
  }

  // Optional fields validation
  if (
    body.vehicle_capacity_kg &&
    (body.vehicle_capacity_kg <= 0 || body.vehicle_capacity_kg > 10000)
  ) {
    errors.push('Vehicle capacity must be between 0 and 10000 kg');
  }

  if (
    body.max_delivery_radius_km &&
    (body.max_delivery_radius_km <= 0 || body.max_delivery_radius_km > 500)
  ) {
    errors.push('Maximum delivery radius must be between 0 and 500 km');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

async function onboardCourier(
  supabase: any,
  user: any,
  requestBody: CourierOnboardingRequest
): Promise<any> {
  // Check if courier profile already exists
  const { data: existingCourier, error: checkError } = await supabase
    .from('courier_profiles')
    .select('id, user_id')
    .eq('user_id', user.id)
    .single();

  if (existingCourier) {
    throw new Error('Courier profile already exists for this user');
  }

  // Generate unique courier code
  const courierCode = await generateCourierCode(supabase);

  // Create courier profile
  const courierData = {
    user_id: user.id,
    courier_code: courierCode,
    first_name: requestBody.first_name.trim(),
    last_name: requestBody.last_name.trim(),
    phone_number: requestBody.phone_number.trim(),
    email: requestBody.email.trim().toLowerCase(),
    license_number: requestBody.license_number.trim(),
    license_expiry_date: requestBody.license_expiry_date,
    vehicle_type: requestBody.vehicle_type.trim(),
    vehicle_registration: requestBody.vehicle_registration.trim().toUpperCase(),
    vehicle_capacity_kg: requestBody.vehicle_capacity_kg || 50.0,
    emergency_contact_name: requestBody.emergency_contact_name?.trim(),
    emergency_contact_phone: requestBody.emergency_contact_phone?.trim(),
    bank_account_number: requestBody.bank_account_number?.trim(),
    bank_name: requestBody.bank_name?.trim(),
    account_holder_name: requestBody.account_holder_name?.trim(),
    max_delivery_radius_km: requestBody.max_delivery_radius_km || 10.0,
    availability_status: 'offline',
    is_online: false,
    is_verified: false, // Requires manual verification
    is_active: true,
    rating: 0.0,
    total_deliveries: 0,
    successful_deliveries: 0,
    failed_deliveries: 0,
    average_delivery_time_minutes: 0,
  };

  const { data: courier, error: insertError } = await supabase
    .from('courier_profiles')
    .insert(courierData)
    .select()
    .single();

  if (insertError) {
    throw new Error(`Failed to create courier profile: ${insertError.message}`);
  }

  // Create audit log entry
  await supabase.from('audit_trail').insert({
    table_name: 'courier_profiles',
    record_id: courier.id,
    action: 'INSERT',
    new_values: courierData,
    user_id: user.id,
    user_email: user.email,
    reason: 'courier_onboarding',
  });

  return {
    courier_id: courier.id,
    courier_code: courier.courier_code,
    verification_status: 'pending',
    message:
      'Courier profile created successfully. Verification required before activation.',
    next_steps: [
      'Submit required documents for verification',
      'Complete background check process',
      'Attend orientation session',
      'Download courier mobile app',
    ],
  };
}

async function generateCourierCode(supabase: any): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    // Generate code format: CUR-YYYYMMDD-XXXX (e.g., CUR-20241231-A1B2)
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const courierCode = `CUR-${date}-${randomSuffix}`;

    // Check if code already exists
    const { data: existing } = await supabase
      .from('courier_profiles')
      .select('courier_code')
      .eq('courier_code', courierCode)
      .single();

    if (!existing) {
      return courierCode;
    }

    attempts++;
  }

  throw new Error('Failed to generate unique courier code after maximum attempts');
}

// Helper function for email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function for phone number validation
function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/;
  return phoneRegex.test(phone);
}

// Helper function for date validation
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return (
    date instanceof Date &&
    !isNaN(date.getTime()) &&
    dateString.match(/^\d{4}-\d{2}-\d{2}$/)
  );
}
