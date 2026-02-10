import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Common select fields for different entities
export const SELECT_FIELDS = {
  VENDOR: `
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
    updated_at,
    user_profiles(first_name, last_name, email, avatar_url)
  `,

  DRIVER: `
    id,
    user_id,
    license_number,
    vehicle_info,
    is_online,
    current_location,
    rating,
    total_rides,
    is_verified,
    subscription_tier,
    created_at,
    updated_at
  `,

  HOTEL: `
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
    star_rating,
    average_rating,
    total_reviews,
    total_bookings,
    is_active,
    is_verified,
    verified_at,
    featured_image,
    created_at,
    updated_at
  `,

  USER_PROFILE: `
    id,
    email,
    phone,
    first_name,
    last_name,
    avatar_url,
    date_of_birth,
    gender,
    is_phone_verified,
    is_active,
    last_login_at,
    created_at,
    updated_at
  `,

  NIPOST_OFFICIAL: `
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
  `,
};

// Pagination helper
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const calculatePagination = (
  page: number | string,
  limit: number | string,
  total: number
): PaginationResult => {
  const pageNum = Number(page);
  const limitNum = Number(limit);

  return {
    page: pageNum,
    limit: limitNum,
    total,
    pages: Math.ceil(total / limitNum),
  };
};

export const getPaginationRange = (page: number | string, limit: number | string) => {
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const offset = (pageNum - 1) * limitNum;

  return {
    from: offset,
    to: offset + limitNum - 1,
  };
};
