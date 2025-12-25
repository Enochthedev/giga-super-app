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

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role_name')
      .eq('user_id', user.id);

    if (!roles?.some(r => r.role_name === 'ADMIN')) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    const url = new URL(req.url);
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    const module = url.searchParams.get('module');

    let query = supabase.from('platform_revenue').select('*');

    if (startDate) query = query.gte('revenue_date', startDate);
    if (endDate) query = query.lte('revenue_date', endDate);
    if (module) query = query.eq('module_name', module);

    const { data: revenue, error } = await query;
    if (error) throw error;

    const totalRevenue = revenue.reduce((sum, r) => sum + Number(r.commission_amount), 0);
    const totalGross = revenue.reduce((sum, r) => sum + Number(r.gross_amount), 0);
    const totalTax = revenue.reduce((sum, r) => sum + Number(r.tax_collected), 0);

    const byModule = revenue.reduce((acc, r) => {
      if (!acc[r.module_name]) {
        acc[r.module_name] = { count: 0, revenue: 0, gross: 0 };
      }
      acc[r.module_name].count++;
      acc[r.module_name].revenue += Number(r.commission_amount);
      acc[r.module_name].gross += Number(r.gross_amount);
      return acc;
    }, {});

    return new Response(
      JSON.stringify({
        summary: {
          totalRevenue,
          totalGross,
          totalTax,
          transactionCount: revenue.length,
        },
        byModule,
        transactions: revenue,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
