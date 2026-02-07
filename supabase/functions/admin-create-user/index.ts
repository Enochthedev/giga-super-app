import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-admin-master-key',
};

interface CreateUserRequest {
  email: string;
  password: string;
  user_type:
    | 'ADMIN'
    | 'CUSTOMER'
    | 'VENDOR'
    | 'DRIVER'
    | 'HOST'
    | 'ADVERTISER'
    | 'NIPOST_OFFICIAL';
  metadata?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    [key: string]: any;
  };
  nipost_details?: {
    employee_id: string;
    office_id: string;
    region_id: string;
    position: string;
    rank: string;
    department?: string;
    clearance_level: number;
    reporting_to?: string;
  };
}

serve(async req => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // ============================================================================
    // AUTHENTICATION CHECK
    // ============================================================================
    const masterKey = req.headers.get('x-admin-master-key');
    const authHeader = req.headers.get('authorization');

    let isAuthorized = false;
    let authorizedBy = 'unknown';

    // Option 1: Check master key
    if (masterKey && masterKey === Deno.env.get('ADMIN_MASTER_KEY')) {
      isAuthorized = true;
      authorizedBy = 'master_key';
      console.log('Authorized via master key');
    }
    // Option 2: Check if existing admin user
    else if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const {
        data: { user },
        error: authError,
      } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized', message: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user has ADMIN role
      const { data: roles, error: roleError } = await supabaseAdmin
        .from('user_active_roles')
        .select('role_name')
        .eq('user_id', user.id)
        .eq('role_name', 'ADMIN')
        .single();

      if (roles && !roleError) {
        isAuthorized = true;
        authorizedBy = `admin_user:${user.email}`;
        console.log(`Authorized via admin user: ${user.email}`);
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Invalid or missing admin master key or admin token',
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================================
    // RATE LIMITING
    // ============================================================================
    const { count } = await supabaseAdmin
      .from('audit_trail')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'ADMIN_USER_CREATED')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString()); // Last hour

    if (count && count >= 20) {
      return new Response(
        JSON.stringify({
          error: 'Rate Limit Exceeded',
          message: 'Too many admin creations in the last hour. Please try again later.',
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================================
    // PARSE & VALIDATE REQUEST
    // ============================================================================
    const body: CreateUserRequest = await req.json();
    const { email, password, user_type, metadata, nipost_details } = body;

    // Validate required fields
    if (!email || !password || !user_type) {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: 'Missing required fields: email, password, user_type',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: 'Invalid email format',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: 'Password must be at least 8 characters long',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate user_type
    const validRoles = [
      'ADMIN',
      'CUSTOMER',
      'VENDOR',
      'DRIVER',
      'HOST',
      'ADVERTISER',
      'NIPOST_OFFICIAL',
    ];
    if (!validRoles.includes(user_type)) {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: `Invalid user_type. Must be one of: ${validRoles.join(', ')}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Note: We don't pre-check for existing users - createUser will return an error if email exists

    // ============================================================================
    // CREATE USER
    // ============================================================================
    console.log(`Creating ${user_type} user: ${email}`);

    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: metadata || {},
        app_metadata: {
          role: user_type,
        },
      });

    if (createError || !newUser.user) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({
          error: 'User Creation Failed',
          message: createError?.message || 'Unknown error',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = newUser.user.id;

    // ============================================================================
    // GRANT ROLE
    // ============================================================================
    console.log(`Granting ${user_type} role to user ${userId}`);

    await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userId, role_name: user_type });

    await supabaseAdmin
      .from('user_active_roles')
      .insert({ user_id: userId, role_name: user_type });

    // ============================================================================
    // NIPOST OFFICIAL SETUP (if applicable)
    // ============================================================================
    if (user_type === 'NIPOST_OFFICIAL' && nipost_details) {
      console.log(`Creating NIPOST official record for ${email}`);

      const { error: nipostError } = await supabaseAdmin.from('nipost_officials').insert({
        user_id: userId,
        employee_id: nipost_details.employee_id,
        office_id: nipost_details.office_id,
        region_id: nipost_details.region_id,
        position: nipost_details.position,
        rank: nipost_details.rank,
        department: nipost_details.department || 'Operations',
        clearance_level: nipost_details.clearance_level,
        reporting_to: nipost_details.reporting_to || null,
        hire_date: new Date().toISOString().split('T')[0],
        is_active: true,
      });

      if (nipostError) {
        console.error('Error creating NIPOST official record:', nipostError);
        // Don't fail the whole operation, just log it
      }

      // Grant NIPOST permissions
      await supabaseAdmin.from('nipost_user_permissions').insert({
        user_id: userId,
        access_level:
          nipost_details.clearance_level >= 8
            ? 'national'
            : nipost_details.clearance_level >= 7
              ? 'zonal'
              : nipost_details.clearance_level >= 6
                ? 'state'
                : 'branch',
        role: nipost_details.rank,
        state_id: nipost_details.clearance_level < 7 ? nipost_details.region_id : null,
        is_active: true,
      });
    }

    // ============================================================================
    // AUDIT LOG
    // ============================================================================
    await supabaseAdmin.from('audit_trail').insert({
      user_id: userId,
      action: 'ADMIN_USER_CREATED',
      resource_type: 'user',
      resource_id: userId,
      details: `Created ${user_type} user: ${email} (by ${authorizedBy})`,
      metadata: {
        user_type,
        created_via: 'admin-create-user-endpoint',
        authorized_by: authorizedBy,
      },
    });

    console.log(`✅ Successfully created ${user_type} user: ${email}`);

    // ============================================================================
    // RESPONSE
    // ============================================================================
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: userId,
          email: newUser.user.email,
          role: user_type,
          created_at: newUser.user.created_at,
        },
        credentials: {
          email,
          password,
          note: 'Save these credentials securely. Password cannot be retrieved later.',
        },
        message: `${user_type} user created successfully`,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
