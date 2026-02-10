-- Migration to fix get_giga_dashboard_stats function
-- Fixes "column user_id does not exist" error by using correct columns and logic

CREATE OR REPLACE FUNCTION get_giga_dashboard_stats(start_date date DEFAULT NULL, end_date date DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_start timestamp;
  current_end timestamp;
  previous_start timestamp;
  previous_end timestamp;
  
  current_revenue numeric := 0;
  previous_revenue numeric := 0;
  
  current_orders integer := 0;
  previous_orders integer := 0;
  
  current_visitors integer := 0;
  previous_visitors integer := 0;
  
  revenue_change numeric := 0;
  revenue_trend text := 'up';
  
  orders_change numeric := 0;
  orders_trend text := 'up';
  
  visitors_change numeric := 0;
  visitors_trend text := 'up';
  
  current_conversion numeric := 0;
  previous_conversion numeric := 0;
  conversion_change numeric := 0;
  conversion_trend text := 'up';
  
BEGIN
  -- Set date ranges
  IF start_date IS NULL OR end_date IS NULL THEN
    current_end := NOW();
    current_start := current_end - INTERVAL '30 days';
  ELSE
    current_start := start_date::timestamp;
    current_end := (end_date::timestamp) + INTERVAL '1 day' - INTERVAL '1 second';
  END IF;
  
  -- Calculate previous period (same duration immediately before)
  previous_end := current_start - INTERVAL '1 second';
  previous_start := previous_end - (current_end - current_start);

  -- 1. REVENUE (from platform_revenue)
  SELECT COALESCE(SUM(gross_amount), 0) INTO current_revenue
  FROM platform_revenue
  WHERE created_at BETWEEN current_start AND current_end;
  
  SELECT COALESCE(SUM(gross_amount), 0) INTO previous_revenue
  FROM platform_revenue
  WHERE created_at BETWEEN previous_start AND previous_end;

  -- 2. ORDERS (from ecommerce_orders)
  SELECT COUNT(*) INTO current_orders
  FROM ecommerce_orders
  WHERE created_at BETWEEN current_start AND current_end;
  
  SELECT COUNT(*) INTO previous_orders
  FROM ecommerce_orders
  WHERE created_at BETWEEN previous_start AND previous_end;

  -- 3. VISITORS (Proxy: using new user signups as we don't have page view tracking yet)
  -- NOTE: This avoids the "user_id" error by querying referencing the table correctly or just counting rows
  SELECT COUNT(*) INTO current_visitors
  FROM user_profiles
  WHERE created_at BETWEEN current_start AND current_end;
  
  SELECT COUNT(*) INTO previous_visitors
  FROM user_profiles
  WHERE created_at BETWEEN previous_start AND previous_end;

  -- Calculate Changes
  
  -- Revenue Change
  IF previous_revenue > 0 THEN
    revenue_change := ROUND(((current_revenue - previous_revenue) / previous_revenue) * 100, 1);
  ELSE
    revenue_change := 100; -- If from 0 to something, it's 100% increase (or logic choice)
  END IF;
  revenue_trend := CASE WHEN revenue_change >= 0 THEN 'up' ELSE 'down' END;

  -- Orders Change
  IF previous_orders > 0 THEN
    orders_change := ROUND(((current_orders::numeric - previous_orders::numeric) / previous_orders::numeric) * 100, 1);
  ELSE
    orders_change := 100;
  END IF;
  orders_trend := CASE WHEN orders_change >= 0 THEN 'up' ELSE 'down' END;

  -- Visitors Change
  IF previous_visitors > 0 THEN
    visitors_change := ROUND(((current_visitors::numeric - previous_visitors::numeric) / previous_visitors::numeric) * 100, 1);
  ELSE
    visitors_change := 100;
  END IF;
  visitors_trend := CASE WHEN visitors_change >= 0 THEN 'up' ELSE 'down' END;

  -- Conversion Rate (Orders / Visitors * 100)
  -- Guard against division by zero
  IF current_visitors > 0 THEN
    current_conversion := ROUND((current_orders::numeric / current_visitors::numeric) * 100, 1);
  ELSE
    current_conversion := 0;
  END IF;

  IF previous_visitors > 0 THEN
    previous_conversion := ROUND((previous_orders::numeric / previous_visitors::numeric) * 100, 1);
  ELSE
    previous_conversion := 0;
  END IF;
  
  -- Conversion Change
  IF previous_conversion > 0 THEN
    conversion_change := ROUND(((current_conversion - previous_conversion) / previous_conversion) * 100, 1);
  ELSE
    conversion_change := 100;
  END IF;
  conversion_trend := CASE WHEN conversion_change >= 0 THEN 'up' ELSE 'down' END;

  -- Construct Result JSON
  RETURN json_build_object(
    'revenue', json_build_object(
      'value', current_revenue,
      'change', (CASE WHEN revenue_change >= 0 THEN '+' ELSE '' END) || revenue_change || '%',
      'trend', revenue_trend
    ),
    'orders', json_build_object(
      'value', current_orders,
      'change', (CASE WHEN orders_change >= 0 THEN '+' ELSE '' END) || orders_change || '%',
      'trend', orders_trend
    ),
    'visitors', json_build_object(
      'value', current_visitors,
      'change', (CASE WHEN visitors_change >= 0 THEN '+' ELSE '' END) || visitors_change || '%',
      'trend', visitors_trend
    ),
    'conversion', json_build_object(
      'value', current_conversion,
      'change', (CASE WHEN conversion_change >= 0 THEN '+' ELSE '' END) || conversion_change || '%',
      'trend', conversion_trend
    )
  );
END;
$$;
