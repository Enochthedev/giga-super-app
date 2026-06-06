-- =====================================================
-- Admin Service RLS Policies
-- Defense in depth: Database-level access control
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "admin_ecommerce_vendors_select" ON ecommerce_vendors;
DROP POLICY IF EXISTS "admin_driver_profiles_select" ON driver_profiles;
DROP POLICY IF EXISTS "admin_hotels_select" ON hotels;
DROP POLICY IF EXISTS "admin_file_metadata_select" ON file_metadata;
DROP POLICY IF EXISTS "admin_nipost_officials_select" ON nipost_officials;
DROP POLICY IF EXISTS "admin_ecommerce_orders_select" ON ecommerce_orders;
DROP POLICY IF EXISTS "admin_ecommerce_orders_update" ON ecommerce_orders;
DROP POLICY IF EXISTS "admin_ecommerce_orders_delete" ON ecommerce_orders;
DROP POLICY IF EXISTS "admin_ad_campaigns_select" ON ad_campaigns;
DROP POLICY IF EXISTS "admin_ad_campaigns_update" ON ad_campaigns;
DROP POLICY IF EXISTS "admin_user_profiles_select" ON user_profiles;
DROP POLICY IF EXISTS "admin_user_profiles_update" ON user_profiles;
DROP POLICY IF EXISTS "admin_user_profiles_delete" ON user_profiles;

-- =====================================================
-- Helper function to check if user has admin access
-- =====================================================
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM nipost_user_permissions 
    WHERE user_id = auth.uid() 
    AND is_active = true
    AND access_level IN ('national', 'state', 'branch')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Helper function to check specific permission
-- =====================================================
CREATE OR REPLACE FUNCTION has_permission(required_permission TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM nipost_user_permissions 
    WHERE user_id = auth.uid() 
    AND is_active = true
    AND permissions @> ARRAY[required_permission]::TEXT[]
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Helper function to check user role
-- =====================================================
CREATE OR REPLACE FUNCTION has_role(required_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM nipost_user_permissions 
    WHERE user_id = auth.uid() 
    AND is_active = true
    AND role = ANY(required_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- E-commerce Vendors (Traders) Policies
-- =====================================================
CREATE POLICY "admin_ecommerce_vendors_select"
ON ecommerce_vendors FOR SELECT
TO authenticated
USING (
  is_admin_user()
);

-- =====================================================
-- Driver Profiles Policies
-- =====================================================
CREATE POLICY "admin_driver_profiles_select"
ON driver_profiles FOR SELECT
TO authenticated
USING (
  is_admin_user()
);

-- =====================================================
-- Hotels Policies
-- =====================================================
CREATE POLICY "admin_hotels_select"
ON hotels FOR SELECT
TO authenticated
USING (
  is_admin_user()
);

-- =====================================================
-- File Metadata (Media) Policies
-- =====================================================
CREATE POLICY "admin_file_metadata_select"
ON file_metadata FOR SELECT
TO authenticated
USING (
  is_admin_user()
);

-- =====================================================
-- NIPOST Officials (Postal Staff) Policies
-- =====================================================
CREATE POLICY "admin_nipost_officials_select"
ON nipost_officials FOR SELECT
TO authenticated
USING (
  is_admin_user()
);

-- =====================================================
-- E-commerce Orders Policies
-- =====================================================
CREATE POLICY "admin_ecommerce_orders_select"
ON ecommerce_orders FOR SELECT
TO authenticated
USING (
  is_admin_user()
);

CREATE POLICY "admin_ecommerce_orders_update"
ON ecommerce_orders FOR UPDATE
TO authenticated
USING (
  has_role(ARRAY['admin', 'super_admin', 'manager'])
)
WITH CHECK (
  has_role(ARRAY['admin', 'super_admin', 'manager'])
);

CREATE POLICY "admin_ecommerce_orders_delete"
ON ecommerce_orders FOR UPDATE
TO authenticated
USING (
  has_role(ARRAY['admin', 'super_admin', 'manager'])
  AND deleted_at IS NULL
)
WITH CHECK (
  deleted_at IS NOT NULL -- Only allow setting deleted_at (soft delete)
);

-- =====================================================
-- Ad Campaigns Policies
-- =====================================================
CREATE POLICY "admin_ad_campaigns_select"
ON ad_campaigns FOR SELECT
TO authenticated
USING (
  is_admin_user()
);

CREATE POLICY "admin_ad_campaigns_update"
ON ad_campaigns FOR UPDATE
TO authenticated
USING (
  has_permission('ads:approve') OR has_role(ARRAY['admin', 'super_admin'])
)
WITH CHECK (
  has_permission('ads:approve') OR has_role(ARRAY['admin', 'super_admin'])
);

-- =====================================================
-- User Profiles Policies (Admin Management)
-- =====================================================
CREATE POLICY "admin_user_profiles_select"
ON user_profiles FOR SELECT
TO authenticated
USING (
  has_role(ARRAY['admin', 'super_admin']) 
  OR auth.uid() = id -- Users can always see their own profile
);

CREATE POLICY "admin_user_profiles_update"
ON user_profiles FOR UPDATE
TO authenticated
USING (
  has_role(ARRAY['admin', 'super_admin'])
  OR auth.uid() = id -- Users can update their own profile
)
WITH CHECK (
  has_role(ARRAY['admin', 'super_admin'])
  OR auth.uid() = id
);

CREATE POLICY "admin_user_profiles_delete"
ON user_profiles FOR UPDATE
TO authenticated
USING (
  has_role(ARRAY['admin', 'super_admin'])
  AND deleted_at IS NULL
)
WITH CHECK (
  deleted_at IS NOT NULL -- Only allow soft delete
);

-- =====================================================
-- NIPOST Financial Ledger Policies
-- =====================================================
CREATE POLICY "admin_financial_ledger_select"
ON nipost_financial_ledger FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM nipost_user_permissions 
    WHERE user_id = auth.uid() 
    AND is_active = true
    AND (
      access_level = 'national'
      OR (access_level = 'state' AND state_id = nipost_financial_ledger.state_id)
      OR (access_level = 'branch' AND branch_id = nipost_financial_ledger.branch_id)
    )
  )
);

-- =====================================================
-- Add permissions column to nipost_user_permissions if not exists
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'nipost_user_permissions' 
    AND column_name = 'permissions'
  ) THEN
    ALTER TABLE nipost_user_permissions 
    ADD COLUMN permissions TEXT[] DEFAULT ARRAY[]::TEXT[];
    
    COMMENT ON COLUMN nipost_user_permissions.permissions IS 
    'Array of permission strings (e.g., users:write, ads:approve, orders:manage)';
  END IF;
END $$;

-- =====================================================
-- Create index for permissions array
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_nipost_user_permissions_permissions 
ON nipost_user_permissions USING GIN (permissions);

-- =====================================================
-- Grant execute permissions on helper functions
-- =====================================================
GRANT EXECUTE ON FUNCTION is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION has_permission(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION has_role(TEXT[]) TO authenticated;

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON FUNCTION is_admin_user() IS 
'Check if the current user has any admin access level (national, state, or branch)';

COMMENT ON FUNCTION has_permission(TEXT) IS 
'Check if the current user has a specific permission string';

COMMENT ON FUNCTION has_role(TEXT[]) IS 
'Check if the current user has any of the specified roles';
