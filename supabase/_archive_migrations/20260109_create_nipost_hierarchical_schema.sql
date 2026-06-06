-- NIPOST Hierarchical Data Schema with RLS Policies
-- This migration creates tables for hierarchical user permissions, business data, financial ledger, and audit trails
-- National HQ → State Centers → Local Branches hierarchy

-- Enable RLS
ALTER DATABASE postgres SET row_security = on;

-- ============================================
-- 1. HIERARCHICAL USER PERMISSIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS nipost_user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Hierarchical access levels
    access_level VARCHAR(20) NOT NULL CHECK (access_level IN ('national', 'state', 'branch')),
    
    -- Geographic identifiers
    branch_id VARCHAR(50),
    branch_name VARCHAR(255),
    state_id VARCHAR(50),
    state_name VARCHAR(100),
    
    -- Additional metadata
    role VARCHAR(50) NOT NULL, -- admin, manager, staff
    is_active BOOLEAN DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT valid_branch_level CHECK (
        (access_level = 'branch' AND branch_id IS NOT NULL AND state_id IS NOT NULL) OR
        (access_level = 'state' AND branch_id IS NULL AND state_id IS NOT NULL) OR
        (access_level = 'national' AND branch_id IS NULL AND state_id IS NULL)
    ),
    
    -- Unique constraint: one active permission per user per level
    CONSTRAINT unique_active_user_permission UNIQUE (user_id, access_level, branch_id, state_id)
);

-- Indexes for performance
CREATE INDEX idx_nipost_permissions_user_id ON nipost_user_permissions(user_id);
CREATE INDEX idx_nipost_permissions_branch_id ON nipost_user_permissions(branch_id) WHERE branch_id IS NOT NULL;
CREATE INDEX idx_nipost_permissions_state_id ON nipost_user_permissions(state_id) WHERE state_id IS NOT NULL;
CREATE INDEX idx_nipost_permissions_access_level ON nipost_user_permissions(access_level);
CREATE INDEX idx_nipost_permissions_active ON nipost_user_permissions(is_active) WHERE is_active = true;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_nipost_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER nipost_permissions_updated_at
    BEFORE UPDATE ON nipost_user_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_nipost_permissions_updated_at();

-- ============================================
-- 2. REGION-PARTITIONED BUSINESS DATA TABLES
-- ============================================

-- Hotels Business Data
CREATE TABLE IF NOT EXISTS nipost_hotels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Hotel information
    hotel_id UUID NOT NULL, -- Reference to main hotels table
    hotel_name VARCHAR(255) NOT NULL,
    
    -- NIPOST hierarchy
    branch_id VARCHAR(50) NOT NULL,
    branch_name VARCHAR(255) NOT NULL,
    state_id VARCHAR(50) NOT NULL,
    state_name VARCHAR(100) NOT NULL,
    
    -- Business metrics
    total_bookings INTEGER DEFAULT 0,
    total_revenue DECIMAL(15, 2) DEFAULT 0.00,
    commission_earned DECIMAL(15, 2) DEFAULT 0.00,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_hotel_branch FOREIGN KEY (branch_id) REFERENCES nipost_user_permissions(branch_id) ON DELETE RESTRICT
);

CREATE INDEX idx_nipost_hotels_branch_id ON nipost_hotels(branch_id);
CREATE INDEX idx_nipost_hotels_state_id ON nipost_hotels(state_id);
CREATE INDEX idx_nipost_hotels_hotel_id ON nipost_hotels(hotel_id);

-- Ecommerce Business Data
CREATE TABLE IF NOT EXISTS nipost_ecommerce (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Product/seller information
    seller_id UUID NOT NULL,
    seller_name VARCHAR(255) NOT NULL,
    
    -- NIPOST hierarchy
    branch_id VARCHAR(50) NOT NULL,
    branch_name VARCHAR(255) NOT NULL,
    state_id VARCHAR(50) NOT NULL,
    state_name VARCHAR(100) NOT NULL,
    
    -- Business metrics
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(15, 2) DEFAULT 0.00,
    commission_earned DECIMAL(15, 2) DEFAULT 0.00,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_nipost_ecommerce_branch_id ON nipost_ecommerce(branch_id);
CREATE INDEX idx_nipost_ecommerce_state_id ON nipost_ecommerce(state_id);
CREATE INDEX idx_nipost_ecommerce_seller_id ON nipost_ecommerce(seller_id);

-- Taxi Services Business Data
CREATE TABLE IF NOT EXISTS nipost_taxi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Driver information
    driver_id UUID NOT NULL,
    driver_name VARCHAR(255) NOT NULL,
    
    -- NIPOST hierarchy
    branch_id VARCHAR(50) NOT NULL,
    branch_name VARCHAR(255) NOT NULL,
    state_id VARCHAR(50) NOT NULL,
    state_name VARCHAR(100) NOT NULL,
    
    -- Business metrics
    total_trips INTEGER DEFAULT 0,
    total_revenue DECIMAL(15, 2) DEFAULT 0.00,
    commission_earned DECIMAL(15, 2) DEFAULT 0.00,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_nipost_taxi_branch_id ON nipost_taxi(branch_id);
CREATE INDEX idx_nipost_taxi_state_id ON nipost_taxi(state_id);
CREATE INDEX idx_nipost_taxi_driver_id ON nipost_taxi(driver_id);

-- ============================================
-- 3. FINANCIAL LEDGER TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS nipost_financial_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Transaction details
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('hotel_booking', 'ecommerce_order', 'taxi_trip', 'refund', 'adjustment')),
    
    -- Module reference
    module VARCHAR(20) NOT NULL CHECK (module IN ('hotel', 'taxi', 'ecommerce')),
    module_transaction_id UUID NOT NULL,
    
    -- NIPOST hierarchy
    branch_id VARCHAR(50) NOT NULL,
    branch_name VARCHAR(255) NOT NULL,
    state_id VARCHAR(50) NOT NULL,
    state_name VARCHAR(100) NOT NULL,
    
    -- Financial details
    gross_amount DECIMAL(15, 2) NOT NULL,
    commission_rate DECIMAL(5, 2) NOT NULL, -- Percentage (e.g., 5.00 for 5%)
    commission_amount DECIMAL(15, 2) NOT NULL,
    net_amount DECIMAL(15, 2) NOT NULL,
    
    -- Payment details
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    
    -- Settlement details
    settlement_status VARCHAR(20) DEFAULT 'unsettled' CHECK (settlement_status IN ('unsettled', 'settled', 'disputed')),
    settlement_date TIMESTAMP WITH TIME ZONE,
    settlement_batch_id VARCHAR(100),
    
    -- User information
    user_id UUID REFERENCES auth.users(id),
    
    -- Metadata
    metadata JSONB,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for financial ledger
CREATE INDEX idx_financial_ledger_transaction_id ON nipost_financial_ledger(transaction_id);
CREATE INDEX idx_financial_ledger_branch_id ON nipost_financial_ledger(branch_id);
CREATE INDEX idx_financial_ledger_state_id ON nipost_financial_ledger(state_id);
CREATE INDEX idx_financial_ledger_user_id ON nipost_financial_ledger(user_id);
CREATE INDEX idx_financial_ledger_module ON nipost_financial_ledger(module);
CREATE INDEX idx_financial_ledger_status ON nipost_financial_ledger(payment_status, settlement_status);
CREATE INDEX idx_financial_ledger_created_at ON nipost_financial_ledger(created_at);
CREATE INDEX idx_financial_ledger_settlement_date ON nipost_financial_ledger(settlement_date) WHERE settlement_date IS NOT NULL;

-- ============================================
-- 4. AUDIT TABLES
-- ============================================

-- Financial Audit Trail
CREATE TABLE IF NOT EXISTS nipost_financial_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference to financial transaction
    ledger_id UUID REFERENCES nipost_financial_ledger(id) ON DELETE CASCADE,
    
    -- Audit details
    action VARCHAR(50) NOT NULL, -- create, update, refund, settle, dispute
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    
    -- Change details
    changes JSONB,
    reason TEXT,
    
    -- Actor information
    performed_by UUID REFERENCES auth.users(id),
    performed_by_name VARCHAR(255),
    performed_by_role VARCHAR(50),
    
    -- IP and metadata
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_financial_audit_ledger_id ON nipost_financial_audit(ledger_id);
CREATE INDEX idx_financial_audit_performed_by ON nipost_financial_audit(performed_by);
CREATE INDEX idx_financial_audit_created_at ON nipost_financial_audit(created_at);
CREATE INDEX idx_financial_audit_action ON nipost_financial_audit(action);

-- Admin Actions Audit Trail
CREATE TABLE IF NOT EXISTS nipost_admin_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Admin user information
    admin_id UUID NOT NULL REFERENCES auth.users(id),
    admin_name VARCHAR(255) NOT NULL,
    admin_role VARCHAR(50) NOT NULL,
    
    -- Access level at time of action
    access_level VARCHAR(20) NOT NULL,
    branch_id VARCHAR(50),
    state_id VARCHAR(50),
    
    -- Action details
    action_type VARCHAR(50) NOT NULL, -- view_report, modify_permission, export_data, etc.
    resource_type VARCHAR(50) NOT NULL, -- user, transaction, report, etc.
    resource_id VARCHAR(100),
    
    -- Action details
    action_details JSONB,
    description TEXT,
    
    -- Request metadata
    endpoint VARCHAR(255),
    method VARCHAR(10),
    ip_address INET,
    user_agent TEXT,
    
    -- Result
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_admin_id ON nipost_admin_audit(admin_id);
CREATE INDEX idx_admin_audit_branch_id ON nipost_admin_audit(branch_id) WHERE branch_id IS NOT NULL;
CREATE INDEX idx_admin_audit_state_id ON nipost_admin_audit(state_id) WHERE state_id IS NOT NULL;
CREATE INDEX idx_admin_audit_action_type ON nipost_admin_audit(action_type);
CREATE INDEX idx_admin_audit_created_at ON nipost_admin_audit(created_at);
CREATE INDEX idx_admin_audit_resource ON nipost_admin_audit(resource_type, resource_id);

-- ============================================
-- 5. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE nipost_user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nipost_hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE nipost_ecommerce ENABLE ROW LEVEL SECURITY;
ALTER TABLE nipost_taxi ENABLE ROW LEVEL SECURITY;
ALTER TABLE nipost_financial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE nipost_financial_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE nipost_admin_audit ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's access level
CREATE OR REPLACE FUNCTION get_user_access_level(uid UUID)
RETURNS TABLE (
    access_level VARCHAR(20),
    branch_id VARCHAR(50),
    state_id VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.access_level, p.branch_id, p.state_id
    FROM nipost_user_permissions p
    WHERE p.user_id = uid AND p.is_active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RLS POLICIES FOR USER PERMISSIONS TABLE
-- ============================================

-- Users can view their own permissions
CREATE POLICY user_permissions_select_own ON nipost_user_permissions
    FOR SELECT
    USING (auth.uid() = user_id);

-- National admins can view all permissions
CREATE POLICY user_permissions_select_national ON nipost_user_permissions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM nipost_user_permissions p
            WHERE p.user_id = auth.uid()
            AND p.access_level = 'national'
            AND p.is_active = true
        )
    );

-- State admins can view permissions in their state
CREATE POLICY user_permissions_select_state ON nipost_user_permissions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM nipost_user_permissions p
            WHERE p.user_id = auth.uid()
            AND p.access_level = 'state'
            AND p.state_id = nipost_user_permissions.state_id
            AND p.is_active = true
        )
    );

-- ============================================
-- RLS POLICIES FOR HOTELS TABLE
-- ============================================

-- Branch-level: Users see only their branch data
CREATE POLICY hotels_select_branch ON nipost_hotels
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM nipost_user_permissions p
            WHERE p.user_id = auth.uid()
            AND p.access_level = 'branch'
            AND p.branch_id = nipost_hotels.branch_id
            AND p.is_active = true
        )
    );

-- State-level: State admins see all branches in their state
CREATE POLICY hotels_select_state ON nipost_hotels
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM nipost_user_permissions p
            WHERE p.user_id = auth.uid()
            AND p.access_level = 'state'
            AND p.state_id = nipost_hotels.state_id
            AND p.is_active = true
        )
    );

-- National-level: National HQ sees all data
CREATE POLICY hotels_select_national ON nipost_hotels
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM nipost_user_permissions p
            WHERE p.user_id = auth.uid()
            AND p.access_level = 'national'
            AND p.is_active = true
        )
    );

-- ============================================
-- RLS POLICIES FOR ECOMMERCE TABLE
-- ============================================

CREATE POLICY ecommerce_select_branch ON nipost_ecommerce
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM nipost_user_permissions p
            WHERE p.user_id = auth.uid()
            AND p.access_level = 'branch'
            AND p.branch_id = nipost_ecommerce.branch_id
            AND p.is_active = true
        )
    );

CREATE POLICY ecommerce_select_state ON nipost_ecommerce
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM nipost_user_permissions p
            WHERE p.user_id = auth.uid()
            AND p.access_level = 'state'
            AND p.state_id = nipost_ecommerce.state_id
            AND p.is_active = true
        )
    );

CREATE POLICY ecommerce_select_national ON nipost_ecommerce
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM nipost_user_permissions p
            WHERE p.user_id = auth.uid()
            AND p.access_level = 'national'
            AND p.is_active = true
        )
    );

-- ============================================
-- RLS POLICIES FOR TAXI TABLE
-- ============================================

CREATE POLICY taxi_select_branch ON nipost_taxi
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM nipost_user_permissions p
            WHERE p.user_id = auth.uid()
            AND p.access_level = 'branch'
            AND p.branch_id = nipost_taxi.branch_id
            AND p.is_active = true
        )
    );

CREATE POLICY taxi_select_state ON nipost_taxi
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM nipost_user_permissions p
            WHERE p.user_id = auth.uid()
            AND p.access_level = 'state'
            AND p.state_id = nipost_taxi.state_id
            AND p.is_active = true
        )
    );

CREATE POLICY taxi_select_national ON nipost_taxi
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM nipost_user_permissions p
            WHERE p.user_id = auth.uid()
            AND p.access_level = 'national'
            AND p.is_active = true
        )
    );

-- ============================================
-- RLS POLICIES FOR FINANCIAL LEDGER
-- ============================================

CREATE POLICY financial_ledger_select_branch ON nipost_financial_ledger
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM nipost_user_permissions p
            WHERE p.user_id = auth.uid()
            AND p.access_level = 'branch'
            AND p.branch_id = nipost_financial_ledger.branch_id
            AND p.is_active = true
        )
    );

CREATE POLICY financial_ledger_select_state ON nipost_financial_ledger
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM nipost_user_permissions p
            WHERE p.user_id = auth.uid()
            AND p.access_level = 'state'
            AND p.state_id = nipost_financial_ledger.state_id
            AND p.is_active = true
        )
    );

CREATE POLICY financial_ledger_select_national ON nipost_financial_ledger
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM nipost_user_permissions p
            WHERE p.user_id = auth.uid()
            AND p.access_level = 'national'
            AND p.is_active = true
        )
    );

-- Insert policy for financial ledger (system-level only)
CREATE POLICY financial_ledger_insert ON nipost_financial_ledger
    FOR INSERT
    WITH CHECK (true); -- Will be restricted by service role in application

-- ============================================
-- RLS POLICIES FOR AUDIT TABLES
-- ============================================

-- Financial audit: Read access based on hierarchy
CREATE POLICY financial_audit_select_branch ON nipost_financial_audit
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM nipost_financial_ledger l
            JOIN nipost_user_permissions p ON p.user_id = auth.uid()
            WHERE l.id = nipost_financial_audit.ledger_id
            AND p.access_level = 'branch'
            AND p.branch_id = l.branch_id
            AND p.is_active = true
        )
    );

CREATE POLICY financial_audit_select_state ON nipost_financial_audit
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM nipost_financial_ledger l
            JOIN nipost_user_permissions p ON p.user_id = auth.uid()
            WHERE l.id = nipost_financial_audit.ledger_id
            AND p.access_level = 'state'
            AND p.state_id = l.state_id
            AND p.is_active = true
        )
    );

CREATE POLICY financial_audit_select_national ON nipost_financial_audit
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM nipost_user_permissions p
            WHERE p.user_id = auth.uid()
            AND p.access_level = 'national'
            AND p.is_active = true
        )
    );

-- Admin audit: Read access based on hierarchy
CREATE POLICY admin_audit_select_branch ON nipost_admin_audit
    FOR SELECT
    USING (
        branch_id IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM nipost_user_permissions p
            WHERE p.user_id = auth.uid()
            AND p.access_level = 'branch'
            AND p.branch_id = nipost_admin_audit.branch_id
            AND p.is_active = true
        )
    );

CREATE POLICY admin_audit_select_state ON nipost_admin_audit
    FOR SELECT
    USING (
        state_id IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM nipost_user_permissions p
            WHERE p.user_id = auth.uid()
            AND p.access_level = 'state'
            AND p.state_id = nipost_admin_audit.state_id
            AND p.is_active = true
        )
    );

CREATE POLICY admin_audit_select_national ON nipost_admin_audit
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM nipost_user_permissions p
            WHERE p.user_id = auth.uid()
            AND p.access_level = 'national'
            AND p.is_active = true
        )
    );

-- Insert policy for audit tables (all authenticated users)
CREATE POLICY admin_audit_insert ON nipost_admin_audit
    FOR INSERT
    WITH CHECK (auth.uid() = admin_id);

CREATE POLICY financial_audit_insert ON nipost_financial_audit
    FOR INSERT
    WITH CHECK (true); -- Application-level control

-- ============================================
-- 6. HELPER FUNCTIONS FOR AGGREGATIONS
-- ============================================

-- Get branch summary
CREATE OR REPLACE FUNCTION get_branch_summary(p_branch_id VARCHAR(50))
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'branch_id', p_branch_id,
        'hotels', (SELECT COUNT(*) FROM nipost_hotels WHERE branch_id = p_branch_id),
        'ecommerce', (SELECT COUNT(*) FROM nipost_ecommerce WHERE branch_id = p_branch_id),
        'taxi', (SELECT COUNT(*) FROM nipost_taxi WHERE branch_id = p_branch_id),
        'total_revenue', (
            SELECT COALESCE(SUM(gross_amount), 0)
            FROM nipost_financial_ledger
            WHERE branch_id = p_branch_id AND payment_status = 'completed'
        ),
        'total_commission', (
            SELECT COALESCE(SUM(commission_amount), 0)
            FROM nipost_financial_ledger
            WHERE branch_id = p_branch_id AND payment_status = 'completed'
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get state summary
CREATE OR REPLACE FUNCTION get_state_summary(p_state_id VARCHAR(50))
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'state_id', p_state_id,
        'branches', (SELECT COUNT(DISTINCT branch_id) FROM nipost_user_permissions WHERE state_id = p_state_id),
        'hotels', (SELECT COUNT(*) FROM nipost_hotels WHERE state_id = p_state_id),
        'ecommerce', (SELECT COUNT(*) FROM nipost_ecommerce WHERE state_id = p_state_id),
        'taxi', (SELECT COUNT(*) FROM nipost_taxi WHERE state_id = p_state_id),
        'total_revenue', (
            SELECT COALESCE(SUM(gross_amount), 0)
            FROM nipost_financial_ledger
            WHERE state_id = p_state_id AND payment_status = 'completed'
        ),
        'total_commission', (
            SELECT COALESCE(SUM(commission_amount), 0)
            FROM nipost_financial_ledger
            WHERE state_id = p_state_id AND payment_status = 'completed'
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get national summary
CREATE OR REPLACE FUNCTION get_national_summary()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'states', (SELECT COUNT(DISTINCT state_id) FROM nipost_user_permissions WHERE state_id IS NOT NULL),
        'branches', (SELECT COUNT(DISTINCT branch_id) FROM nipost_user_permissions WHERE branch_id IS NOT NULL),
        'hotels', (SELECT COUNT(*) FROM nipost_hotels),
        'ecommerce', (SELECT COUNT(*) FROM nipost_ecommerce),
        'taxi', (SELECT COUNT(*) FROM nipost_taxi),
        'total_revenue', (
            SELECT COALESCE(SUM(gross_amount), 0)
            FROM nipost_financial_ledger
            WHERE payment_status = 'completed'
        ),
        'total_commission', (
            SELECT COALESCE(SUM(commission_amount), 0)
            FROM nipost_financial_ledger
            WHERE payment_status = 'completed'
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. SEED DATA FOR TESTING (OPTIONAL)
-- ============================================

-- This section can be used to insert test data
-- Uncomment and modify as needed for development

/*
INSERT INTO nipost_user_permissions (user_id, access_level, branch_id, branch_name, state_id, state_name, role)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'national', NULL, NULL, NULL, NULL, 'admin'),
    ('00000000-0000-0000-0000-000000000002', 'state', NULL, NULL, 'LA', 'Lagos', 'manager'),
    ('00000000-0000-0000-0000-000000000003', 'branch', 'LA-IKJ', 'Ikeja Branch', 'LA', 'Lagos', 'staff');
*/
