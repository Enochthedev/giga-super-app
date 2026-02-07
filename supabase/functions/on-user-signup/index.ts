/**
 * On User Signup Webhook Handler
 *
 * This edge function is triggered by a Supabase Database Webhook
 * when a new user is created in auth.users.
 *
 * It creates:
 * - user_profiles entry
 * - customer_profiles entry (for non-admins)
 * - user_roles with CUSTOMER or ADMIN role
 * - user_active_roles with the assigned role
 * - user_wallets with 0.00 NGN balance (for non-admins)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: {
    id: string;
    email: string;
    phone?: string;
    created_at: string;
    raw_user_meta_data?: {
      first_name?: string;
      last_name?: string;
      phone?: string;
      is_admin?: boolean;
    };
    raw_app_meta_data?: {
      role?: string;
      provider?: string;
    };
  };
  old_record: null | Record<string, unknown>;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse webhook payload
    const payload: WebhookPayload = await req.json();

    // Only process INSERT events on auth.users
    if (
      payload.type !== 'INSERT' ||
      payload.table !== 'users' ||
      payload.schema !== 'auth'
    ) {
      console.log(
        'Ignoring non-insert event:',
        payload.type,
        payload.schema,
        payload.table
      );
      return new Response(
        JSON.stringify({ success: true, message: 'Ignored non-insert event' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const user = payload.record;
    const userId = user.id;
    const email = user.email;
    const userMetadata = user.raw_user_meta_data || {};
    const appMetadata = user.raw_app_meta_data || {};

    console.log(`Setting up user: ${email} (${userId})`);

    // Create Supabase client with service role key (bypasses RLS)
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

    // Determine if this is an admin user
    const isAdmin = userMetadata.is_admin === true || appMetadata.role === 'ADMIN';
    const roleName = isAdmin ? 'ADMIN' : 'CUSTOMER';

    // Track results for logging
    const results: string[] = [];

    // 1. Create user_profiles entry
    const { error: profileError } = await supabaseAdmin.from('user_profiles').upsert(
      {
        id: userId,
        email: email,
        first_name: userMetadata.first_name || null,
        last_name: userMetadata.last_name || null,
        phone: userMetadata.phone || user.phone || null,
        created_at: user.created_at,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      console.error('Error creating user_profiles:', profileError);
      results.push(`❌ User profile failed: ${profileError.message}`);
    } else {
      console.log('✅ User profile created');
      results.push('✅ User profile created');
    }

    // 2. Create customer_profiles entry (only for non-admins)
    if (!isAdmin) {
      const { error: customerError } = await supabaseAdmin
        .from('customer_profiles')
        .upsert(
          {
            user_id: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (customerError) {
        console.error('Error creating customer_profiles:', customerError);
        results.push(`❌ Customer profile failed: ${customerError.message}`);
      } else {
        console.log('✅ Customer profile created');
        results.push('✅ Customer profile created');
      }
    } else {
      console.log('ℹ️ Skipping customer_profiles for admin user');
      results.push('ℹ️ Skipped customer_profiles (admin)');
    }

    // 3. Assign role (CUSTOMER or ADMIN)
    const { error: roleError } = await supabaseAdmin.from('user_roles').upsert(
      {
        user_id: userId,
        role_name: roleName,
        granted_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,role_name', ignoreDuplicates: true }
    );

    if (roleError) {
      console.error('Error assigning role:', roleError);
      results.push(`❌ Role assignment failed: ${roleError.message}`);
    } else {
      console.log(`✅ ${roleName} role assigned`);
      results.push(`✅ ${roleName} role assigned`);
    }

    // 4. Set active role
    const { error: activeRoleError } = await supabaseAdmin
      .from('user_active_roles')
      .upsert(
        {
          user_id: userId,
          active_role: roleName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (activeRoleError) {
      console.error('Error setting active role:', activeRoleError);
      results.push(`❌ Active role failed: ${activeRoleError.message}`);
    } else {
      console.log('✅ Active role set');
      results.push('✅ Active role set');
    }

    // 5. Create wallet (only for non-admins)
    if (!isAdmin) {
      const { error: walletError } = await supabaseAdmin.from('user_wallets').upsert(
        {
          user_id: userId,
          balance: 0,
          currency: 'NGN',
          is_active: true,
          is_locked: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      if (walletError) {
        console.error('Error creating wallet:', walletError);
        results.push(`❌ Wallet creation failed: ${walletError.message}`);
      } else {
        console.log('✅ Wallet created with 0.00 NGN');
        results.push('✅ Wallet created with 0.00 NGN');
      }
    } else {
      console.log('ℹ️ Skipping wallet creation for admin user');
      results.push('ℹ️ Skipped wallet (admin)');
    }

    console.log('🎉 User setup complete');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User setup complete',
        userId: userId,
        email: email,
        role: roleName,
        results: results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Webhook handler error:', error);

    // Return 200 even on error so signup doesn't fail
    // The error is logged but doesn't block user creation
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'User setup encountered an error but signup succeeded',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
