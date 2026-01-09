-- Database triggers for automatic delivery assignment
-- This file contains SQL functions and triggers to automatically assign deliveries
-- when ecommerce orders change status to 'shipped'

-- Create function to handle order status changes for automatic assignment
CREATE OR REPLACE FUNCTION handle_order_status_change_for_delivery()
RETURNS TRIGGER AS $$
DECLARE
    delivery_service_url TEXT;
    webhook_payload JSONB;
    http_response RECORD;
BEGIN
    -- Only process when status changes to 'shipped'
    IF NEW.status = 'shipped' AND (OLD.status IS NULL OR OLD.status != 'shipped') THEN
        
        -- Get delivery service webhook URL from environment or configuration
        delivery_service_url := current_setting('app.delivery_service_webhook_url', true);
        
        -- If no webhook URL configured, log and skip
        IF delivery_service_url IS NULL OR delivery_service_url = '' THEN
            RAISE LOG 'Delivery service webhook URL not configured, skipping auto-assignment for order %', NEW.id;
            RETURN NEW;
        END IF;
        
        -- Prepare webhook payload
        webhook_payload := jsonb_build_object(
            'event_type', 'order_status_changed',
            'order_id', NEW.id,
            'old_status', COALESCE(OLD.status, 'unknown'),
            'new_status', NEW.status,
            'timestamp', NOW(),
            'order_data', jsonb_build_object(
                'id', NEW.id,
                'customer_name', NEW.customer_name,
                'customer_phone', NEW.customer_phone,
                'customer_email', NEW.customer_email,
                'total_amount', NEW.total_amount,
                'delivery_address_id', NEW.delivery_address_id,
                'pickup_address_id', NEW.pickup_address_id,
                'priority', COALESCE(NEW.priority, 3),
                'delivery_instructions', NEW.delivery_instructions,
                'delivery_scheduled_at', NEW.delivery_scheduled_at,
                'total_weight_kg', NEW.total_weight_kg,
                'package_dimensions', NEW.package_dimensions,
                'delivery_fee', NEW.delivery_fee,
                'created_at', NEW.created_at,
                'updated_at', NEW.updated_at
            )
        );
        
        -- Log the automatic assignment trigger
        INSERT INTO delivery_assignment_logs (
            order_id,
            event_type,
            status,
            payload,
            created_at
        ) VALUES (
            NEW.id,
            'auto_assignment_triggered',
            'pending',
            webhook_payload,
            NOW()
        );
        
        -- In a real implementation, you would make an HTTP request to the delivery service
        -- For now, we'll just log the event
        RAISE LOG 'Automatic delivery assignment triggered for order %, webhook payload: %', NEW.id, webhook_payload;
        
        -- Note: PostgreSQL doesn't have built-in HTTP client capabilities
        -- In production, you would either:
        -- 1. Use an extension like http or pgsql-http
        -- 2. Use NOTIFY/LISTEN with an external worker
        -- 3. Insert into a queue table for processing by an external service
        
        -- Example using NOTIFY (requires external listener):
        PERFORM pg_notify('delivery_assignment_queue', webhook_payload::text);
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on ecommerce_orders table
DROP TRIGGER IF EXISTS trigger_order_status_change_for_delivery ON ecommerce_orders;
CREATE TRIGGER trigger_order_status_change_for_delivery
    AFTER UPDATE OF status ON ecommerce_orders
    FOR EACH ROW
    WHEN (NEW.status = 'shipped' AND (OLD.status IS NULL OR OLD.status != 'shipped'))
    EXECUTE FUNCTION handle_order_status_change_for_delivery();

-- Create table to log delivery assignment events
CREATE TABLE IF NOT EXISTS delivery_assignment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES ecommerce_orders(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    payload JSONB,
    response JSONB,
    error_message TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT delivery_assignment_logs_event_type_check 
        CHECK (event_type IN ('auto_assignment_triggered', 'assignment_created', 'assignment_failed', 'retry_scheduled')),
    CONSTRAINT delivery_assignment_logs_status_check 
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_delivery_assignment_logs_order_id 
    ON delivery_assignment_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_assignment_logs_status 
    ON delivery_assignment_logs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_delivery_assignment_logs_event_type 
    ON delivery_assignment_logs(event_type, created_at);

-- Create function to process delivery assignment queue (for external workers)
CREATE OR REPLACE FUNCTION process_delivery_assignment_queue()
RETURNS TABLE (
    log_id UUID,
    order_id UUID,
    payload JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dal.id,
        dal.order_id,
        dal.payload
    FROM delivery_assignment_logs dal
    WHERE dal.status = 'pending'
        AND dal.event_type = 'auto_assignment_triggered'
        AND dal.created_at >= NOW() - INTERVAL '1 hour' -- Only process recent events
    ORDER BY dal.created_at ASC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update assignment log status
CREATE OR REPLACE FUNCTION update_delivery_assignment_log(
    log_id UUID,
    new_status TEXT,
    response_data JSONB DEFAULT NULL,
    error_msg TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE delivery_assignment_logs
    SET 
        status = new_status,
        response = response_data,
        error_message = error_msg,
        processed_at = CASE WHEN new_status IN ('completed', 'failed') THEN NOW() ELSE processed_at END,
        updated_at = NOW()
    WHERE id = log_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up old assignment logs
CREATE OR REPLACE FUNCTION cleanup_old_assignment_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete logs older than 30 days
    DELETE FROM delivery_assignment_logs
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE LOG 'Cleaned up % old delivery assignment logs', deleted_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get assignment statistics
CREATE OR REPLACE FUNCTION get_delivery_assignment_stats(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '7 days',
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    total_triggered INTEGER,
    total_completed INTEGER,
    total_failed INTEGER,
    success_rate NUMERIC,
    avg_processing_time_minutes NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_triggered,
        COUNT(*) FILTER (WHERE dal.status = 'completed')::INTEGER as total_completed,
        COUNT(*) FILTER (WHERE dal.status = 'failed')::INTEGER as total_failed,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND(
                    (COUNT(*) FILTER (WHERE dal.status = 'completed')::NUMERIC / COUNT(*)::NUMERIC) * 100, 
                    2
                )
            ELSE 0
        END as success_rate,
        CASE 
            WHEN COUNT(*) FILTER (WHERE dal.processed_at IS NOT NULL) > 0 THEN
                ROUND(
                    AVG(EXTRACT(EPOCH FROM (dal.processed_at - dal.created_at)) / 60) 
                    FILTER (WHERE dal.processed_at IS NOT NULL),
                    2
                )
            ELSE 0
        END as avg_processing_time_minutes
    FROM delivery_assignment_logs dal
    WHERE dal.event_type = 'auto_assignment_triggered'
        AND dal.created_at BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to retry failed assignments
CREATE OR REPLACE FUNCTION retry_failed_assignments(
    max_retries INTEGER DEFAULT 3,
    retry_delay_hours INTEGER DEFAULT 1
)
RETURNS INTEGER AS $$
DECLARE
    retry_count INTEGER := 0;
    log_record RECORD;
BEGIN
    -- Find failed assignments that are eligible for retry
    FOR log_record IN
        SELECT id, order_id, payload, 
               COALESCE((payload->>'retry_count')::INTEGER, 0) as current_retries
        FROM delivery_assignment_logs
        WHERE status = 'failed'
            AND event_type = 'auto_assignment_triggered'
            AND created_at >= NOW() - INTERVAL '24 hours'
            AND updated_at <= NOW() - (retry_delay_hours || ' hours')::INTERVAL
            AND COALESCE((payload->>'retry_count')::INTEGER, 0) < max_retries
    LOOP
        -- Update payload with retry count
        UPDATE delivery_assignment_logs
        SET 
            status = 'pending',
            payload = jsonb_set(
                payload, 
                '{retry_count}', 
                to_jsonb(log_record.current_retries + 1)
            ),
            updated_at = NOW()
        WHERE id = log_record.id;
        
        -- Send notification for retry
        PERFORM pg_notify('delivery_assignment_queue', 
            jsonb_build_object(
                'type', 'retry',
                'log_id', log_record.id,
                'order_id', log_record.order_id,
                'retry_count', log_record.current_retries + 1
            )::text
        );
        
        retry_count := retry_count + 1;
    END LOOP;
    
    RAISE LOG 'Scheduled % delivery assignments for retry', retry_count;
    
    RETURN retry_count;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_order_status_change_for_delivery() TO authenticated;
GRANT EXECUTE ON FUNCTION process_delivery_assignment_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION update_delivery_assignment_log(UUID, TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_assignment_logs() TO authenticated;
GRANT EXECUTE ON FUNCTION get_delivery_assignment_stats(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION retry_failed_assignments(INTEGER, INTEGER) TO authenticated;

GRANT SELECT, INSERT, UPDATE ON delivery_assignment_logs TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION handle_order_status_change_for_delivery() IS 
    'Trigger function that automatically initiates delivery assignment when order status changes to shipped';

COMMENT ON FUNCTION process_delivery_assignment_queue() IS 
    'Returns pending delivery assignment requests for processing by external workers';

COMMENT ON FUNCTION update_delivery_assignment_log(UUID, TEXT, JSONB, TEXT) IS 
    'Updates the status and response data for a delivery assignment log entry';

COMMENT ON FUNCTION cleanup_old_assignment_logs() IS 
    'Removes delivery assignment logs older than 30 days to maintain database performance';

COMMENT ON FUNCTION get_delivery_assignment_stats(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) IS 
    'Returns statistics about delivery assignment success rates and processing times';

COMMENT ON FUNCTION retry_failed_assignments(INTEGER, INTEGER) IS 
    'Schedules failed delivery assignments for retry based on configured limits and delays';

COMMENT ON TABLE delivery_assignment_logs IS 
    'Logs all delivery assignment events and their processing status for monitoring and debugging';