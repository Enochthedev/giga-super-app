-- Payment Queue Service Database Schema
-- Commission Rules and Payment Tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Commission Rules Table
CREATE TABLE IF NOT EXISTS commission_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module VARCHAR(50) NOT NULL CHECK (module IN ('hotel', 'taxi', 'ecommerce')),
  transaction_type VARCHAR(50) NOT NULL DEFAULT 'standard',
  commission_rate DECIMAL(5, 2) NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 100),
  min_commission DECIMAL(10, 2) NULL,
  max_commission DECIMAL(10, 2) NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Ensure min is less than max if both are set
  CONSTRAINT check_min_max_commission CHECK (
    min_commission IS NULL OR 
    max_commission IS NULL OR 
    min_commission <= max_commission
  ),
  
  -- Unique constraint on module and transaction type
  CONSTRAINT unique_module_transaction_type UNIQUE (module, transaction_type)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_commission_rules_module ON commission_rules(module);
CREATE INDEX IF NOT EXISTS idx_commission_rules_active ON commission_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_commission_rules_effective_dates ON commission_rules(effective_from, effective_to);

-- Payment Requests Table
CREATE TABLE IF NOT EXISTS payment_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  state_id UUID NOT NULL,
  module VARCHAR(50) NOT NULL CHECK (module IN ('hotel', 'taxi', 'ecommerce')),
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
  commission_rate DECIMAL(5, 2) NOT NULL,
  commission_amount DECIMAL(10, 2) NOT NULL,
  net_amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL DEFAULT 'paystack' CHECK (payment_method IN ('paystack', 'stripe')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  message TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_branch_id ON payment_requests(branch_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_state_id ON payment_requests(state_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_created_at ON payment_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_requests_module ON payment_requests(module);

-- Transactions Table (completed payments)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  state_id UUID NOT NULL,
  module VARCHAR(50) NOT NULL CHECK (module IN ('hotel', 'taxi', 'ecommerce')),
  transaction_type VARCHAR(50) NOT NULL DEFAULT 'payment',
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  commission_amount DECIMAL(10, 2) NOT NULL,
  net_amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
  status VARCHAR(20) NOT NULL CHECK (status IN ('completed', 'failed', 'refunded', 'partially_refunded')),
  payment_reference VARCHAR(255) NULL,
  payment_method VARCHAR(20) NOT NULL DEFAULT 'paystack',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT NULL,
  webhook_data JSONB NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_branch_id ON transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_transactions_state_id ON transactions(state_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_module ON transactions(module);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_reference ON transactions(payment_reference);

-- Refunds Table
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL,
  requested_by UUID NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  refund_reference VARCHAR(255) NULL,
  error_message TEXT NULL,
  webhook_data JSONB NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_refunds_transaction_id ON refunds(transaction_id);
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON refunds(created_at DESC);

-- Settlements Table
CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level VARCHAR(20) NOT NULL CHECK (level IN ('branch', 'state', 'national')),
  entity_id UUID NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  total_transactions INTEGER NOT NULL DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_commission DECIMAL(12, 2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  breakdown_by_module JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  transfer_reference VARCHAR(255) NULL,
  error_message TEXT NULL,
  webhook_data JSONB NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_settlements_level ON settlements(level);
CREATE INDEX IF NOT EXISTS idx_settlements_entity_id ON settlements(entity_id);
CREATE INDEX IF NOT EXISTS idx_settlements_period ON settlements(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);
CREATE INDEX IF NOT EXISTS idx_settlements_created_at ON settlements(created_at DESC);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  channels TEXT[] NOT NULL DEFAULT ARRAY['in_app'],
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE NULL,
  read_at TIMESTAMP WITH TIME ZONE NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Webhook Logs Table
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider VARCHAR(20) NOT NULL,
  event VARCHAR(100) NOT NULL,
  data JSONB NOT NULL,
  signature TEXT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('processed', 'failed')),
  error TEXT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_webhook_logs_provider ON webhook_logs(provider);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event ON webhook_logs(event);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_received_at ON webhook_logs(received_at DESC);

-- User Notification Preferences Table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  user_id UUID PRIMARY KEY,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert default commission rules
INSERT INTO commission_rules (module, transaction_type, commission_rate, min_commission, max_commission, is_active)
VALUES 
  ('hotel', 'standard', 10.00, 100.00, 10000.00, true),
  ('taxi', 'standard', 15.00, 50.00, 5000.00, true),
  ('ecommerce', 'standard', 5.00, 20.00, 2000.00, true)
ON CONFLICT (module, transaction_type) DO NOTHING;

-- Row Level Security (RLS) Policies
-- Enable RLS on tables
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- Branch Admin: Can only see their branch data
CREATE POLICY branch_admin_transactions ON transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'branch_admin'
      AND user_roles.branch_id = transactions.branch_id
    )
  );

-- State Admin: Can see all data in their state
CREATE POLICY state_admin_transactions ON transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'state_admin'
      AND user_roles.state_id = transactions.state_id
    )
  );

-- National Admin: Can see all data
CREATE POLICY national_admin_transactions ON transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('national_admin', 'super_admin')
    )
  );

-- User can see their own transactions
CREATE POLICY user_own_transactions ON transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Apply similar policies to payment_requests
CREATE POLICY branch_admin_payment_requests ON payment_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'branch_admin'
      AND user_roles.branch_id = payment_requests.branch_id
    )
  );

CREATE POLICY state_admin_payment_requests ON payment_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'state_admin'
      AND user_roles.state_id = payment_requests.state_id
    )
  );

CREATE POLICY national_admin_payment_requests ON payment_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('national_admin', 'super_admin')
    )
  );

CREATE POLICY user_own_payment_requests ON payment_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE commission_rules IS 'Commission rules for different modules and transaction types with min/max constraints';
COMMENT ON TABLE payment_requests IS 'Payment requests before processing';
COMMENT ON TABLE transactions IS 'Completed payment transactions';
COMMENT ON TABLE refunds IS 'Payment refund records';
COMMENT ON TABLE settlements IS 'Settlement reports for branches, states, and national levels';
COMMENT ON TABLE notifications IS 'User notifications for payment events';
COMMENT ON TABLE webhook_logs IS 'Logs of incoming webhook events from payment providers';
COMMENT ON TABLE user_notification_preferences IS 'User preferences for notification channels';
