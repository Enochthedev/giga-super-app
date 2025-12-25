import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role_name')
      .eq('user_id', user.id);

    if (!roles?.some(r => r.role_name === 'ADMIN')) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    // Get stats
    const [users, hotels, bookings, orders, rides, revenue] = await Promise.all([
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('hotels').select('id', { count: 'exact', head: true }),
      supabase.from('hotel_bookings').select('id', { count: 'exact', head: true }),
      supabase.from('ecommerce_orders').select('id', { count: 'exact', head: true }),
      supabase.from('rides').select('id', { count: 'exact', head: true }),
      supabase.from('platform_revenue').select('commission_amount'),
    ]);

    const totalRevenue =
      revenue.data?.reduce((sum, r) => sum + Number(r.commission_amount), 0) || 0;

    return new Response(
      JSON.stringify({
        users: users.count || 0,
        hotels: hotels.count || 0,
        bookings: bookings.count || 0,
        orders: orders.count || 0,
        rides: rides.count || 0,
        revenue: totalRevenue,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
