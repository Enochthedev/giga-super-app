/**
 * TypeScript type definitions for Search Service
 */

export interface SearchQuery {
  q: string;
  category?: SearchCategory;
  location?: string;
  min_price?: number;
  max_price?: number;
  page?: number;
  limit?: number;
  sort?: SortOption;
  order?: SortOrder;
  filters?: SearchFilters;
}

export type SearchCategory = 'all' | 'hotels' | 'products' | 'drivers' | 'posts' | 'users';

export type SortOption = 'relevance' | 'price' | 'rating' | 'created_at' | 'distance';

export type SortOrder = 'asc' | 'desc';

export interface SearchFilters {
  // Hotel filters
  amenities?: string[];
  star_rating?: number;
  room_type?: string;

  // Product filters
  brand?: string;
  condition?: 'new' | 'used' | 'refurbished';

  // Driver filters
  vehicle_type?: string;
  rating_min?: number;
  available_only?: boolean;

  // Location filters
  latitude?: number;
  longitude?: number;
  radius?: number; // in kilometers

  // Date filters
  start_date?: string;
  end_date?: string;
}

export interface SearchResult<T = any> {
  id: string;
  type: SearchCategory;
  title: string;
  description?: string;
  image_url?: string;
  price?: number;
  currency?: string;
  rating?: number;
  location?: string;
  distance?: number; // in kilometers
  relevance_score: number;
  data: T;
  created_at: string;
  updated_at: string;
}

export interface SearchResponse {
  success: boolean;
  data: {
    query: string;
    category: SearchCategory;
    total_results: number;
    results: SearchResult[];
    suggestions?: string[];
    facets?: SearchFacets;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_previous: boolean;
    has_next: boolean;
  };
  metadata: {
    timestamp: string;
    request_id: string;
    execution_time_ms: number;
    cached: boolean;
  };
}

export interface SearchFacets {
  categories: FacetCount[];
  price_ranges: FacetCount[];
  ratings: FacetCount[];
  locations: FacetCount[];
  brands?: FacetCount[];
  amenities?: FacetCount[];
}

export interface FacetCount {
  value: string;
  count: number;
  selected: boolean;
}

export interface AutocompleteQuery {
  q: string;
  category?: SearchCategory;
  limit?: number;
}

export interface AutocompleteResponse {
  success: boolean;
  data: {
    query: string;
    suggestions: AutocompleteSuggestion[];
  };
  metadata: {
    timestamp: string;
    request_id: string;
    execution_time_ms: number;
  };
}

export interface AutocompleteSuggestion {
  text: string;
  type: 'query' | 'category' | 'location' | 'brand';
  category?: SearchCategory;
  count?: number;
}

export interface SearchIndexDocument {
  id: string;
  type: SearchCategory;
  title: string;
  description: string;
  content: string;
  tags: string[];
  location?: {
    name: string;
    latitude: number;
    longitude: number;
  };
  price?: number;
  currency?: string;
  rating?: number;
  image_url?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SearchError {
  code: string;
  message: string;
  details?: any;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: SearchError;
  metadata: {
    timestamp: string;
    request_id: string;
    version: string;
    execution_time_ms?: number;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_previous: boolean;
    has_next: boolean;
  };
}

// Database table interfaces
export interface Hotel {
  id: string;
  name: string;
  description: string;
  location: string;
  latitude?: number;
  longitude?: number;
  price_per_night: number;
  currency: string;
  star_rating: number;
  amenities: string[];
  image_urls: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EcommerceProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  brand?: string;
  condition: 'new' | 'used' | 'refurbished';
  image_urls: string[];
  vendor_id: string;
  is_active: boolean;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface TaxiDriver {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  vehicle_type: string;
  vehicle_model: string;
  license_plate: string;
  rating: number;
  is_available: boolean;
  current_latitude?: number;
  current_longitude?: number;
  created_at: string;
  updated_at: string;
}

export interface SocialPost {
  id: string;
  user_id: string;
  content: string;
  image_urls?: string[];
  likes_count: number;
  comments_count: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}
