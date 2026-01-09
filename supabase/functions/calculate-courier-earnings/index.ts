// Calculate Courier Earnings Function for Payout Integration
// This function handles courier earnings calculation and payout processing
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

interface PayoutRequest {
  courier_id?: string;
  period_start?: string; // YYYY-MM-DD
  period_end?: string; // YYYY-MM-DD
  payout_method?: 'bank_transfer' | 'mobile_money';
  bank_details?: {
    bank_name: string;
    account_number: string;
    account_name: string;
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

    // 5. Handle different HTTP methods
    if (req.method === 'GET') {
      // Get earnings summary
      const url = new URL(req.url);
      const courierId = url.searchParams.get('courier_id');
      const period = url.searchParams.get('period') || 'current_month';
      const includeBreakdown = url.searchParams.get('include_breakdown') === 'true';

      const result = await getCourierEarnings(
        supabase,
        user,
        courierId,
        period,
        includeBreakdown
      );

      const duration = Date.now() - startTime;
      logger.info('Courier earnings retrieved successfully', {
        user_id: user.id,
        request_id: requestId,
        duration_ms: duration,
      });

      return createSuccessResponse(result, requestId);
    } else if (req.method === 'POST') {
      // Process payout request
      let requestBody: PayoutRequest;
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
      const validation = validatePayoutInput(requestBody);
      if (!validation.isValid) {
        return createErrorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          'Input validation failed',
          400,
          requestId,
          { validation_errors: validation.errors }
        );
      }

      logger.info('Processing courier payout request', {
        user_id: user.id,
        request_id: requestId,
        courier_id: requestBody.courier_id,
      });

      const result = await processCourierPayout(supabase, user, requestBody);

      const duration = Date.now() - startTime;
      logger.info('Courier payout processed successfully', {
        user_id: user.id,
        request_id: requestId,
        duration_ms: duration,
        payout_id: result.payout_id,
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
    logger.error('Courier earnings operation failed', error, {
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

    if (error.message?.includes('insufficient balance')) {
      return createErrorResponse(
        ERROR_CODES.CONFLICT,
        'Insufficient earnings balance for payout',
        409,
        requestId
      );
    }

    // Default to internal server error
    return createErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      'An unexpected error occurred during earnings operation',
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

function validatePayoutInput(body: PayoutRequest): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate payout method if provided
  if (
    body.payout_method &&
    !['bank_transfer', 'mobile_money'].includes(body.payout_method)
  ) {
    errors.push('Payout method must be either bank_transfer or mobile_money');
  }

  // Validate bank details if bank transfer is selected
  if (body.payout_method === 'bank_transfer' && body.bank_details) {
    if (!body.bank_details.bank_name || body.bank_details.bank_name.trim().length < 2) {
      errors.push('Bank name is required for bank transfer');
    }
    if (
      !body.bank_details.account_number ||
      body.bank_details.account_number.trim().length < 8
    ) {
      errors.push('Valid account number is required for bank transfer');
    }
    if (
      !body.bank_details.account_name ||
      body.bank_details.account_name.trim().length < 2
    ) {
      errors.push('Account holder name is required for bank transfer');
    }
  }

  // Validate date formats if provided
  if (body.period_start && !isValidDateFormat(body.period_start)) {
    errors.push('Period start date must be in YYYY-MM-DD format');
  }

  if (body.period_end && !isValidDateFormat(body.period_end)) {
    errors.push('Period end date must be in YYYY-MM-DD format');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

async function getCourierEarnings(
  supabase: any,
  user: any,
  courierId: string | null,
  period: string,
  includeBreakdown: boolean
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

  // Check authorization - users can only view their own earnings unless admin
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
      throw new Error("Unauthorized to view this courier's earnings");
    }
  }

  // Calculate date range based on period
  const { startDate, endDate } = calculateDateRange(period);

  // Get courier basic info
  const { data: courier, error: courierError } = await supabase
    .from('courier_profiles')
    .select(
      `
      id,
      courier_code,
      first_name,
      last_name,
      bank_account_number,
      bank_name,
      account_holder_name,
      total_deliveries,
      successful_deliveries
    `
    )
    .eq('id', targetCourierId)
    .single();

  if (courierError || !courier) {
    throw new Error('Courier not found');
  }

  // Get earnings data for the period
  const { data: assignments } = await supabase
    .from('delivery_assignments')
    .select(
      `
      id,
      assignment_number,
      status,
      delivery_fee,
      courier_commission,
      created_at,
      delivered_at,
      order:ecommerce_orders(order_number, total_amount)
    `
    )
    .eq('courier_id', targetCourierId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: false });

  // Calculate earnings summary
  const totalAssignments = assignments?.length || 0;
  const completedAssignments = assignments?.filter(a => a.status === 'delivered') || [];
  const pendingAssignments =
    assignments?.filter(a =>
      ['assigned', 'picked_up', 'in_transit', 'out_for_delivery'].includes(a.status)
    ) || [];

  const totalEarnings =
    assignments?.reduce((sum, a) => sum + (parseFloat(a.courier_commission) || 0), 0) ||
    0;
  const completedEarnings = completedAssignments.reduce(
    (sum, a) => sum + (parseFloat(a.courier_commission) || 0),
    0
  );
  const pendingEarnings = pendingAssignments.reduce(
    (sum, a) => sum + (parseFloat(a.courier_commission) || 0),
    0
  );

  const totalDeliveryFees =
    assignments?.reduce((sum, a) => sum + (parseFloat(a.delivery_fee) || 0), 0) || 0;
  const averageCommissionRate =
    totalDeliveryFees > 0 ? (totalEarnings / totalDeliveryFees) * 100 : 0;

  // Get payout history
  const { data: payouts } = await supabase
    .from('vendor_payouts')
    .select(
      `
      id,
      total_amount,
      status,
      payout_method,
      requested_at,
      completed_at,
      failure_reason
    `
    )
    .eq('vendor_id', courier.user_id || user.id)
    .eq('vendor_type', 'courier')
    .order('requested_at', { ascending: false })
    .limit(10);

  const totalPaidOut =
    payouts
      ?.filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + parseFloat(p.total_amount), 0) || 0;

  const availableBalance = completedEarnings - totalPaidOut;

  const earningsSummary = {
    period: {
      type: period,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    },
    earnings: {
      total_earnings: parseFloat(totalEarnings.toFixed(2)),
      completed_earnings: parseFloat(completedEarnings.toFixed(2)),
      pending_earnings: parseFloat(pendingEarnings.toFixed(2)),
      available_balance: parseFloat(availableBalance.toFixed(2)),
      total_paid_out: parseFloat(totalPaidOut.toFixed(2)),
    },
    statistics: {
      total_assignments: totalAssignments,
      completed_assignments: completedAssignments.length,
      pending_assignments: pendingAssignments.length,
      average_earnings_per_delivery:
        completedAssignments.length > 0
          ? parseFloat((completedEarnings / completedAssignments.length).toFixed(2))
          : 0,
      average_commission_rate: parseFloat(averageCommissionRate.toFixed(2)),
    },
    payout_info: {
      bank_account_configured: !!(courier.bank_account_number && courier.bank_name),
      bank_details: courier.bank_account_number
        ? {
            bank_name: courier.bank_name,
            account_number: maskAccountNumber(courier.bank_account_number),
            account_holder_name: courier.account_holder_name,
          }
        : null,
      minimum_payout_amount: 1000.0, // Configurable minimum
      can_request_payout: availableBalance >= 1000.0,
    },
  };

  const result: any = {
    courier: {
      id: courier.id,
      courier_code: courier.courier_code,
      name: `${courier.first_name} ${courier.last_name}`,
      total_deliveries: courier.total_deliveries,
      successful_deliveries: courier.successful_deliveries,
    },
    earnings_summary: earningsSummary,
    recent_payouts: payouts?.slice(0, 5) || [],
  };

  // Include detailed breakdown if requested
  if (includeBreakdown) {
    result.earnings_breakdown = {
      daily_earnings: calculateDailyEarnings(assignments || []),
      assignments_by_status: groupAssignmentsByStatus(assignments || []),
      top_earning_assignments: (assignments || [])
        .filter(a => a.status === 'delivered')
        .sort(
          (a, b) => parseFloat(b.courier_commission) - parseFloat(a.courier_commission)
        )
        .slice(0, 10)
        .map(a => ({
          assignment_number: a.assignment_number,
          order_number: a.order?.order_number,
          commission: parseFloat(a.courier_commission),
          delivery_fee: parseFloat(a.delivery_fee),
          delivered_at: a.delivered_at,
        })),
    };
  }

  return result;
}

async function processCourierPayout(
  supabase: any,
  user: any,
  requestBody: PayoutRequest
): Promise<any> {
  // Get courier profile
  let targetCourierId = requestBody.courier_id;
  if (!targetCourierId) {
    const { data: courier } = await supabase
      .from('courier_profiles')
      .select('id, user_id, bank_account_number, bank_name, account_holder_name')
      .eq('user_id', user.id)
      .single();

    if (!courier) {
      throw new Error('Courier profile not found');
    }
    targetCourierId = courier.id;
  }

  // Check authorization
  const { data: userRoles } = await supabase
    .from('user_active_roles')
    .select('active_role')
    .eq('user_id', user.id)
    .single();

  const isAdmin = userRoles?.active_role === 'ADMIN';

  if (!isAdmin && requestBody.courier_id) {
    const { data: courierProfile } = await supabase
      .from('courier_profiles')
      .select('user_id')
      .eq('id', requestBody.courier_id)
      .single();

    if (!courierProfile || courierProfile.user_id !== user.id) {
      throw new Error('Unauthorized to request payout for this courier');
    }
  }

  // Calculate available earnings
  const { startDate, endDate } =
    requestBody.period_start && requestBody.period_end
      ? {
          startDate: new Date(requestBody.period_start),
          endDate: new Date(requestBody.period_end),
        }
      : calculateDateRange('current_month');

  const { data: assignments } = await supabase
    .from('delivery_assignments')
    .select('id, courier_commission, status')
    .eq('courier_id', targetCourierId)
    .eq('status', 'delivered')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const totalEarnings =
    assignments?.reduce((sum, a) => sum + parseFloat(a.courier_commission), 0) || 0;

  // Check minimum payout amount
  const minimumPayout = 1000.0;
  if (totalEarnings < minimumPayout) {
    throw new Error(`Insufficient balance. Minimum payout amount is ${minimumPayout}`);
  }

  // Get courier details for payout
  const { data: courier } = await supabase
    .from('courier_profiles')
    .select('user_id, bank_account_number, bank_name, account_holder_name')
    .eq('id', targetCourierId)
    .single();

  // Use provided bank details or courier's saved details
  const bankDetails = requestBody.bank_details || {
    bank_name: courier.bank_name,
    account_number: courier.bank_account_number,
    account_name: courier.account_holder_name,
  };

  if (
    !bankDetails.bank_name ||
    !bankDetails.account_number ||
    !bankDetails.account_name
  ) {
    throw new Error('Bank details are required for payout processing');
  }

  // Create payout request
  const payoutData = {
    vendor_id: courier.user_id,
    vendor_type: 'courier',
    module_name: 'delivery',
    total_amount: totalEarnings,
    escrow_transaction_ids: assignments?.map(a => a.id) || [],
    transaction_count: assignments?.length || 0,
    payout_method: requestBody.payout_method || 'bank_transfer',
    bank_name: bankDetails.bank_name,
    account_number: bankDetails.account_number,
    account_name: bankDetails.account_name,
    status: 'pending',
    requested_at: new Date().toISOString(),
    metadata: {
      period_start: startDate.toISOString().split('T')[0],
      period_end: endDate.toISOString().split('T')[0],
      courier_id: targetCourierId,
      requested_by: user.id,
    },
  };

  const { data: payout, error: payoutError } = await supabase
    .from('vendor_payouts')
    .insert(payoutData)
    .select()
    .single();

  if (payoutError) {
    throw new Error(`Failed to create payout request: ${payoutError.message}`);
  }

  // Create audit log
  await supabase.from('audit_trail').insert({
    table_name: 'vendor_payouts',
    record_id: payout.id,
    action: 'INSERT',
    new_values: payoutData,
    user_id: user.id,
    user_email: user.email,
    reason: 'courier_payout_request',
  });

  return {
    payout_id: payout.id,
    amount: totalEarnings,
    currency: 'NGN',
    payout_method: payoutData.payout_method,
    bank_details: {
      bank_name: bankDetails.bank_name,
      account_number: maskAccountNumber(bankDetails.account_number),
      account_name: bankDetails.account_name,
    },
    status: 'pending',
    estimated_processing_time: '1-3 business days',
    assignments_included: assignments?.length || 0,
    message:
      'Payout request submitted successfully. You will receive a notification once processed.',
  };
}

function calculateDateRange(period: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date(now);
  let startDate = new Date(now);

  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'yesterday':
      startDate.setDate(now.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(now.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'current_week':
      const dayOfWeek = now.getDay();
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'current_month':
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'last_month':
      startDate.setMonth(now.getMonth() - 1, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(0); // Last day of previous month
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'last_30_days':
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      break;
    default:
      // Default to current month
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
  }

  return { startDate, endDate };
}

function calculateDailyEarnings(assignments: any[]): any[] {
  const dailyEarnings: { [key: string]: number } = {};

  assignments.forEach(assignment => {
    if (assignment.status === 'delivered' && assignment.delivered_at) {
      const date = assignment.delivered_at.split('T')[0];
      const commission = parseFloat(assignment.courier_commission) || 0;
      dailyEarnings[date] = (dailyEarnings[date] || 0) + commission;
    }
  });

  return Object.entries(dailyEarnings)
    .map(([date, earnings]) => ({ date, earnings: parseFloat(earnings.toFixed(2)) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function groupAssignmentsByStatus(assignments: any[]): any {
  const statusGroups: { [key: string]: { count: number; earnings: number } } = {};

  assignments.forEach(assignment => {
    const status = assignment.status;
    const commission = parseFloat(assignment.courier_commission) || 0;

    if (!statusGroups[status]) {
      statusGroups[status] = { count: 0, earnings: 0 };
    }

    statusGroups[status].count++;
    statusGroups[status].earnings += commission;
  });

  // Round earnings to 2 decimal places
  Object.keys(statusGroups).forEach(status => {
    statusGroups[status].earnings = parseFloat(statusGroups[status].earnings.toFixed(2));
  });

  return statusGroups;
}

function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return accountNumber;
  const visibleDigits = accountNumber.slice(-4);
  const maskedPart = '*'.repeat(accountNumber.length - 4);
  return maskedPart + visibleDigits;
}

// Helper function for date format validation
function isValidDateFormat(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date));
}
