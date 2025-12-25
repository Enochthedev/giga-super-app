// Standardized Edge Function Template
// This template follows the established standards from Task 2.3
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
  RATE_LIMIT: 'RATE_LIMIT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
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

// Input validation schema interface
interface RequestValidation {
  validate(body: any): { isValid: boolean; errors: string[] };
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
    // 2. Authentication validation (for protected endpoints)
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
    let requestBody: any = {};
    if (req.method !== 'GET') {
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

      // Add your input validation here
      const validation = validateInput(requestBody);
      if (!validation.isValid) {
        return createErrorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'Input validation failed',
          400,
          requestId,
          { validation_errors: validation.errors }
        );
      }
    }

    // 6. Business logic implementation
    logger.info('Processing request', {
      user_id: user.id,
      endpoint: req.url,
      method: req.method,
      request_id: requestId,
    });

    // TODO: Implement your business logic here
    const result = await performBusinessLogic(supabase, user, requestBody);

    // 7. Return success response
    const duration = Date.now() - startTime;
    logger.info('Request completed successfully', {
      user_id: user.id,
      request_id: requestId,
      duration_ms: duration,
    });

    return createSuccessResponse(result, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Request failed', error, {
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

    if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
      return createErrorResponse(
        ERROR_CODES.CONFLICT,
        'Resource already exists',
        409,
        requestId
      );
    }

    // Default to internal server error
    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      'An unexpected error occurred',
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

function validateInput(body: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // TODO: Implement your specific validation logic here
  // Example validations:

  // if (!body.required_field) {
  //   errors.push('required_field is required')
  // }

  // if (body.email && !isValidEmail(body.email)) {
  //   errors.push('Invalid email format')
  // }

  // if (body.amount && (typeof body.amount !== 'number' || body.amount <= 0)) {
  //   errors.push('Amount must be a positive number')
  // }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

async function performBusinessLogic(
  supabase: any,
  user: any,
  requestBody: any
): Promise<any> {
  // TODO: Implement your specific business logic here

  // Example transaction pattern:
  // const { data, error } = await supabase
  //   .from('your_table')
  //   .insert(requestBody)
  //   .select()
  //   .single()

  // if (error) {
  //   throw new Error(`Database operation failed: ${error.message}`)
  // }

  // return data

  throw new Error('Business logic not implemented');
}

// Helper function for email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
