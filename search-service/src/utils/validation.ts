/**
 * Input validation utilities for Search Service
 */

import { z } from 'zod';
import { AutocompleteQuery, SearchQuery } from '../types/index.js';

// Search query validation schema
export const SearchQuerySchema = z
  .object({
    q: z.string().min(1, 'Search query is required').max(500, 'Search query too long'),
    category: z
      .enum(['all', 'hotels', 'products', 'drivers', 'posts', 'users'])
      .optional()
      .default('all'),
    location: z.string().max(100).optional(),
    min_price: z.number().min(0).optional(),
    max_price: z.number().min(0).optional(),
    page: z.number().int().min(1).optional().default(1),
    limit: z.number().int().min(1).max(100).optional().default(20),
    sort: z
      .enum(['relevance', 'price', 'rating', 'created_at', 'distance'])
      .optional()
      .default('relevance'),
    order: z.enum(['asc', 'desc']).optional().default('desc'),
    filters: z
      .object({
        // Hotel filters
        amenities: z.array(z.string()).optional(),
        star_rating: z.number().int().min(1).max(5).optional(),
        room_type: z.string().optional(),

        // Product filters
        brand: z.string().optional(),
        condition: z.enum(['new', 'used', 'refurbished']).optional(),

        // Driver filters
        vehicle_type: z.string().optional(),
        rating_min: z.number().min(0).max(5).optional(),
        available_only: z.boolean().optional(),

        // Location filters
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        radius: z.number().min(0).max(100).optional().default(10),

        // Date filters
        start_date: z.string().datetime().optional(),
        end_date: z.string().datetime().optional(),
      })
      .optional(),
  })
  .refine(
    data => {
      // Validate price range
      if (data.min_price && data.max_price && data.min_price > data.max_price) {
        return false;
      }

      // Validate date range
      if (data.filters?.start_date && data.filters?.end_date) {
        const startDate = new Date(data.filters.start_date);
        const endDate = new Date(data.filters.end_date);
        if (startDate > endDate) {
          return false;
        }
      }

      // Validate location coordinates
      if (data.filters?.latitude && !data.filters?.longitude) {
        return false;
      }
      if (data.filters?.longitude && !data.filters?.latitude) {
        return false;
      }

      return true;
    },
    {
      message: 'Invalid query parameters',
    }
  );

// Autocomplete query validation schema
export const AutocompleteQuerySchema = z.object({
  q: z.string().min(1, 'Query is required').max(100, 'Query too long'),
  category: z
    .enum(['all', 'hotels', 'products', 'drivers', 'posts', 'users'])
    .optional()
    .default('all'),
  limit: z.number().int().min(1).max(20).optional().default(10),
});

// Hotel search validation schema
export const HotelSearchSchema = z
  .object({
    q: z.string().optional(),
    location: z.string().optional(),
    min_price: z.number().min(0).optional(),
    max_price: z.number().min(0).optional(),
    star_rating: z.number().int().min(1).max(5).optional(),
    amenities: z.array(z.string()).optional(),
    check_in: z.string().datetime().optional(),
    check_out: z.string().datetime().optional(),
    guests: z.number().int().min(1).max(20).optional(),
    page: z.number().int().min(1).optional().default(1),
    limit: z.number().int().min(1).max(100).optional().default(20),
    sort: z.enum(['relevance', 'price', 'rating', 'distance']).optional().default('relevance'),
    order: z.enum(['asc', 'desc']).optional().default('desc'),
  })
  .refine(
    data => {
      if (data.min_price && data.max_price && data.min_price > data.max_price) {
        return false;
      }
      if (data.check_in && data.check_out) {
        const checkIn = new Date(data.check_in);
        const checkOut = new Date(data.check_out);
        if (checkIn >= checkOut) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'Invalid hotel search parameters',
    }
  );

// Product search validation schema
export const ProductSearchSchema = z
  .object({
    q: z.string().optional(),
    category: z.string().optional(),
    brand: z.string().optional(),
    condition: z.enum(['new', 'used', 'refurbished']).optional(),
    min_price: z.number().min(0).optional(),
    max_price: z.number().min(0).optional(),
    in_stock: z.boolean().optional(),
    page: z.number().int().min(1).optional().default(1),
    limit: z.number().int().min(1).max(100).optional().default(20),
    sort: z.enum(['relevance', 'price', 'rating', 'created_at']).optional().default('relevance'),
    order: z.enum(['asc', 'desc']).optional().default('desc'),
  })
  .refine(
    data => {
      if (data.min_price && data.max_price && data.min_price > data.max_price) {
        return false;
      }
      return true;
    },
    {
      message: 'Invalid product search parameters',
    }
  );

// Driver search validation schema
export const DriverSearchSchema = z
  .object({
    q: z.string().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    radius: z.number().min(0).max(100).optional().default(10),
    vehicle_type: z.string().optional(),
    rating_min: z.number().min(0).max(5).optional(),
    available_only: z.boolean().optional().default(true),
    page: z.number().int().min(1).optional().default(1),
    limit: z.number().int().min(1).max(100).optional().default(20),
    sort: z.enum(['distance', 'rating', 'price']).optional().default('distance'),
    order: z.enum(['asc', 'desc']).optional().default('asc'),
  })
  .refine(
    data => {
      // Both latitude and longitude must be provided together
      if ((data.latitude && !data.longitude) || (!data.latitude && data.longitude)) {
        return false;
      }
      return true;
    },
    {
      message: 'Both latitude and longitude must be provided for location-based search',
    }
  );

// Post search validation schema
export const PostSearchSchema = z.object({
  q: z.string().optional(),
  user_id: z.string().uuid().optional(),
  public_only: z.boolean().optional().default(true),
  has_images: z.boolean().optional(),
  min_likes: z.number().int().min(0).optional(),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
  sort: z.enum(['relevance', 'created_at', 'likes_count']).optional().default('relevance'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// User search validation schema
export const UserSearchSchema = z.object({
  q: z.string().optional(),
  location: z.string().optional(),
  verified_only: z.boolean().optional(),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
  sort: z.enum(['relevance', 'created_at']).optional().default('relevance'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * Validate search query parameters
 */
export const validateSearchQuery = (query: any): SearchQuery => {
  return SearchQuerySchema.parse(query);
};

/**
 * Validate autocomplete query parameters
 */
export const validateAutocompleteQuery = (query: any): AutocompleteQuery => {
  return AutocompleteQuerySchema.parse(query);
};

/**
 * Validate hotel search parameters
 */
export const validateHotelSearch = (query: any) => {
  return HotelSearchSchema.parse(query);
};

/**
 * Validate product search parameters
 */
export const validateProductSearch = (query: any) => {
  return ProductSearchSchema.parse(query);
};

/**
 * Validate driver search parameters
 */
export const validateDriverSearch = (query: any) => {
  return DriverSearchSchema.parse(query);
};

/**
 * Validate post search parameters
 */
export const validatePostSearch = (query: any) => {
  return PostSearchSchema.parse(query);
};

/**
 * Validate user search parameters
 */
export const validateUserSearch = (query: any) => {
  return UserSearchSchema.parse(query);
};

/**
 * Sanitize search query to prevent injection attacks
 */
export const sanitizeSearchQuery = (query: string): string => {
  return query
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .replace(/[;]/g, '') // Remove semicolons
    .replace(/--/g, '') // Remove SQL comments
    .substring(0, 500); // Limit length
};

/**
 * Extract search terms from query
 */
export const extractSearchTerms = (query: string): string[] => {
  return sanitizeSearchQuery(query)
    .toLowerCase()
    .split(/\s+/)
    .filter(term => term.length > 2)
    .slice(0, 10); // Limit to 10 terms
};
