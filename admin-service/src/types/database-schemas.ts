/**
 * GIGA Database Schema Interfaces
 *
 * Generated from Supabase database on 2026-02-10
 * Database: nkrqcigvcakqicutkpfd.supabase.co
 *
 * IMPORTANT: These are the ACTUAL schemas from the database.
 * Use these to prevent "column does not exist" errors.
 *
 * DO NOT ASSUME column names - always reference this file.
 */

// ============================================================================
// E-COMMERCE SCHEMAS
// ============================================================================

export interface EcommerceVendor {
  // Core fields
  id: string; // uuid
  business_name: string;

  // Business details
  business_registration: string | null;
  tax_id: string | null;

  // Banking
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;

  // Statistics
  total_sales: number; // numeric, default 0
  total_orders: number; // default 0
  average_rating: number; // numeric, default 0
  commission_rate: number; // numeric, default 15.00

  // Status
  is_verified: boolean; // default false
  is_active: boolean; // default true
  verified_at: string | null; // timestamp

  // Timestamps
  created_at: string; // timestamp, default now()
  updated_at: string; // timestamp, default now()

  // ⚠️ MISSING COLUMNS (don't query these):
  // - business_description (does not exist)
  // - description (does not exist)
  // - user_id (does not exist - vendors are separate entities)
  // - contact_email (does not exist)
  // - contact_phone (does not exist)
  // - address (does not exist)
  // - logo_url (does not exist)
}

export interface EcommerceProduct {
  // Core fields
  id: string; // uuid
  vendor_id: string | null; // uuid
  category_id: string | null; // uuid
  name: string;
  slug: string;

  // Content
  description: string | null;
  short_description: string | null;

  // Pricing
  base_price: number; // numeric
  discount_percentage: number | null;
  final_price: number | null; // numeric
  cost_price: number | null; // numeric

  // Inventory
  sku: string | null;
  stock_quantity: number | null;
  low_stock_threshold: number | null;
  track_inventory: boolean | null;
  allow_backorder: boolean | null;

  // Media
  images: string[] | null; // text[]
  thumbnail: string | null;
  video_url: string | null;

  // SEO
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string[] | null; // text[]

  // Product details
  specifications: Record<string, any> | null; // jsonb
  attributes: Record<string, any> | null; // jsonb
  weight: number | null; // numeric
  dimensions: Record<string, any> | null; // jsonb
  requires_shipping: boolean | null;

  // Status & metrics
  is_active: boolean | null;
  is_featured: boolean | null;
  view_count: number | null;
  order_count: number | null;
  average_rating: number | null; // numeric
  review_count: number | null;

  // Timestamps
  published_at: string | null; // timestamp
  created_at: string | null; // timestamp
  updated_at: string | null; // timestamp

  // Soft delete
  deleted_at: string | null; // timestamp
  deleted_by: string | null; // uuid
  deletion_reason: string | null;
}

// ============================================================================
// HOTEL SCHEMAS
// ============================================================================

export interface Hotel {
  // Core fields
  id: string; // uuid
  host_id: string; // uuid
  name: string;
  slug: string;

  // Content
  description: string | null;
  short_description: string | null;

  // Location
  address: string;
  city: string;
  state: string | null;
  country: string;
  postal_code: string | null;
  latitude: number | null; // double precision
  longitude: number | null; // double precision
  location: any | null; // PostGIS geometry (USER-DEFINED)

  // Contact
  phone: string | null;
  email: string | null;
  website: string | null;

  // Operational details
  check_in_time: string; // time
  check_out_time: string; // time
  cancellation_policy: string | null;
  house_rules: string | null;

  // Ratings
  star_rating: number | null;
  average_rating: number | null; // double precision
  total_reviews: number | null;
  total_bookings: number | null;

  // Status
  is_active: boolean | null;
  is_verified: boolean | null;
  verified_at: string | null; // timestamp

  // Media
  featured_image: string | null;
  images: string[] | null; // text[]
  video_url: string | null;

  // Additional data
  amenities: string[] | null; // text[]
  nearby_attractions: Record<string, any> | null; // jsonb
  policies: Record<string, any> | null; // jsonb

  // Timestamps
  created_at: string | null; // timestamp
  updated_at: string | null; // timestamp

  // Soft delete
  deleted_at: string | null; // timestamp
  deleted_by: string | null; // uuid
  deletion_reason: string | null;

  // ⚠️ MISSING COLUMNS (don't query these):
  // - rating (use average_rating instead)
  // - total_rooms (does not exist - use room_types table)
  // - available_rooms (does not exist - use room_availability table)
}

// ============================================================================
// TAXI/DRIVER SCHEMAS
// ============================================================================

export interface DriverProfile {
  // Core fields
  id: string; // uuid
  user_id: string; // uuid
  license_number: string;

  // Vehicle
  vehicle_info: Record<string, any> | null; // jsonb
  vehicle_type: string | null;

  // Status & location
  is_online: boolean | null;
  current_location: Record<string, any> | null; // jsonb
  last_location: any | null; // PostGIS geometry (USER-DEFINED)
  last_location_updated_at: string | null; // timestamp
  heading: number | null; // numeric (direction in degrees)
  speed: number | null; // numeric (km/h or mph)

  // Performance
  rating: number | null; // double precision
  total_rides: number | null;
  is_verified: boolean | null;
  subscription_tier: string | null;

  // Timestamps
  created_at: string | null; // timestamp
  updated_at: string | null; // timestamp

  // ⚠️ MISSING COLUMNS (don't query these):
  // - vehicle_model (does not exist - use vehicle_info jsonb)
  // - vehicle_year (does not exist - use vehicle_info jsonb)
  // - is_active (does not exist - use is_verified)
  // - total_earnings (does not exist - calculate from driver_earnings table)
  // - email (does not exist - join with user_profiles)
  // - first_name (does not exist - join with user_profiles)
  // - last_name (does not exist - join with user_profiles)
  // - phone (does not exist - join with user_profiles)
  // - avatar_url (does not exist - join with user_profiles)
}

// ============================================================================
// USER & ADMIN SCHEMAS
// ============================================================================

export interface UserProfile {
  id: string; // uuid (references auth.users)
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  date_of_birth: string | null; // date
  gender: string | null;

  // Address
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;

  // Preferences
  preferred_language: string | null;
  preferred_currency: string | null;
  notification_preferences: Record<string, any> | null; // jsonb

  // Status
  is_active: boolean | null;
  email_verified: boolean | null;
  phone_verified: boolean | null;
  kyc_verified: boolean | null;
  kyc_verified_at: string | null; // timestamp

  // Timestamps
  created_at: string | null; // timestamp
  updated_at: string | null; // timestamp
  last_login_at: string | null; // timestamp
}

export interface FileMetadata {
  id: string; // uuid
  original_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number; // bigint
  uploaded_by: string | null; // uuid
  entity_type: string;
  entity_id: string;
  status: string; // 'uploading' | 'processing' | 'ready' | 'failed' | 'deleted'
  access_level: string; // 'public' | 'private' | 'restricted'
  processing_results: Record<string, any> | null; // jsonb
  metadata: Record<string, any> | null; // jsonb
  tags: string[] | null; // text[]
  created_at: string; // timestamp
  updated_at: string; // timestamp
  expires_at: string | null; // timestamp

  // ⚠️ MISSING COLUMNS (don't query these):
  // - filename (use original_name instead)
  // - file_type (use mime_type instead)
  // - file_size (use size_bytes instead)
  // - is_public (use access_level instead)
}

export interface NipostOfficial {
  id: string; // uuid
  user_id: string; // uuid
  employee_id: string;
  office_id: string; // uuid
  region_id: string; // uuid
  position: string;
  rank: string;
  department: string;
  clearance_level: number;
  jurisdiction_regions: string[] | null; // uuid[]
  reporting_to: string | null; // uuid
  hire_date: string; // date
  termination_date: string | null; // date
  is_active: boolean;
  created_at: string; // timestamp
  updated_at: string; // timestamp

  // ⚠️ MISSING COLUMNS (don't query these):
  // - staff_id (use employee_id instead)
  // - first_name (join with user_profiles)
  // - last_name (join with user_profiles)
  // - email (join with user_profiles)
  // - phone (join with user_profiles)
  // - office_location (join with nipost_offices)
  // - region (join with nipost_regions)
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Dashboard statistics response
 */
export interface DashboardStats {
  revenue: {
    value: number;
    change: string; // e.g., "+22%"
    trend: 'up' | 'down';
  };
  orders: {
    value: number;
    change: string;
    trend: 'up' | 'down';
  };
  visitors: {
    value: number;
    change: string;
    trend: 'up' | 'down';
  };
  conversion: {
    value: number;
    change: string;
    trend: 'up' | 'down';
  };
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Vendor query - use ONLY these fields
 */
export const VENDOR_SELECT_FIELDS = `
  id,
  business_name,
  business_registration,
  tax_id,
  bank_name,
  account_number,
  account_name,
  total_sales,
  total_orders,
  average_rating,
  commission_rate,
  is_verified,
  is_active,
  verified_at,
  created_at,
  updated_at
` as const;

/**
 * Hotel query - use ONLY these fields
 */
export const HOTEL_SELECT_FIELDS = `
  id,
  host_id,
  name,
  slug,
  description,
  short_description,
  address,
  city,
  state,
  country,
  postal_code,
  latitude,
  longitude,
  phone,
  email,
  website,
  check_in_time,
  check_out_time,
  star_rating,
  average_rating,
  total_reviews,
  total_bookings,
  is_active,
  is_verified,
  verified_at,
  featured_image,
  images,
  created_at,
  updated_at
` as const;

/**
 * Driver query - use ONLY these fields
 */
export const DRIVER_SELECT_FIELDS = `
  id,
  user_id,
  license_number,
  vehicle_info,
  vehicle_type,
  is_online,
  current_location,
  rating,
  total_rides,
  is_verified,
  subscription_tier,
  created_at,
  updated_at
` as const;

/**
 * Product query - use ONLY these fields
 */
export const PRODUCT_SELECT_FIELDS = `
  id,
  vendor_id,
  category_id,
  name,
  slug,
  description,
  short_description,
  base_price,
  discount_percentage,
  final_price,
  sku,
  stock_quantity,
  images,
  thumbnail,
  is_active,
  is_featured,
  average_rating,
  review_count,
  order_count,
  created_at,
  updated_at
` as const;

/**
 * File metadata query - use ONLY these fields
 */
export const FILE_METADATA_SELECT_FIELDS = `
  id,
  original_name,
  storage_path,
  mime_type,
  size_bytes,
  uploaded_by,
  entity_type,
  entity_id,
  status,
  access_level,
  created_at,
  updated_at
` as const;

/**
 * NIPOST official query - use ONLY these fields
 */
export const NIPOST_OFFICIAL_SELECT_FIELDS = `
  id,
  user_id,
  employee_id,
  office_id,
  region_id,
  position,
  rank,
  department,
  clearance_level,
  is_active,
  created_at,
  updated_at
` as const;

// ============================================================================
// NOTES FOR AI AGENTS
// ============================================================================

/**
 * COMMON MISTAKES TO AVOID:
 *
 * 1. ❌ DON'T query `ecommerce_vendors.business_description` - it doesn't exist
 * 2. ❌ DON'T query `ecommerce_vendors.user_id` - vendors aren't linked to users
 * 3. ❌ DON'T query `ecommerce_vendors.description` - use business_name instead
 * 4. ❌ DON'T query `driver_profiles.email` - join with user_profiles
 * 5. ❌ DON'T query `driver_profiles.vehicle_model` - use vehicle_info jsonb
 * 6. ❌ DON'T query `hotels.total_rooms` - use room_types table
 * 7. ❌ DON'T query `file_metadata.filename` - use original_name
 * 8. ❌ DON'T assume column names - always check this file first
 * 9. ❌ DON'T use SELECT * - explicitly list columns from const helpers above
 *
 * CORRECT PATTERNS:
 *
 * ✅ Use the SELECT_FIELDS constants for queries
 * ✅ Check interfaces before writing queries
 * ✅ Use null checks for all nullable fields
 * ✅ Use the ApiResponse wrapper for all endpoints
 * ✅ Use PaginatedResponse for list endpoints
 * ✅ Join with user_profiles when you need user data
 *
 * EXAMPLE QUERIES:
 *
 * ```typescript
 * // ✅ CORRECT - Explicit fields from constant
 * const { data: vendors } = await supabase
 *   .from('ecommerce_vendors')
 *   .select(VENDOR_SELECT_FIELDS);
 *
 * // ❌ WRONG - Assumes non-existent column
 * const { data: vendors } = await supabase
 *   .from('ecommerce_vendors')
 *   .select('*, business_description'); // ERROR!
 *
 * // ✅ CORRECT - Join with user_profiles for driver data
 * const { data: drivers } = await supabase
 *   .from('driver_profiles')
 *   .select(`
 *     ${DRIVER_SELECT_FIELDS},
 *     user:user_profiles!user_id (
 *       first_name,
 *       last_name,
 *       email,
 *       phone,
 *       avatar_url
 *     )
 *   `);
 *
 * // ✅ CORRECT - Using interface types
 * const vendor: EcommerceVendor = {
 *   business_name: 'Acme Corp',
 *   is_verified: false,
 *   // ... all required fields
 * };
 * ```
 */
