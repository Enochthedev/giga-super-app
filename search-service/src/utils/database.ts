/**
 * Database utilities for Search Service
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

import {
  DriverProfile,
  EcommerceProduct,
  Hotel,
  SearchCategory,
  SearchQuery,
  SearchResult,
  SocialPost,
  UserProfile,
} from '../types/index.js';

export class DatabaseService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      db: {
        schema: 'public',
      },
      auth: {
        persistSession: false,
      },
    });
  }

  /**
   * Search hotels with filters and pagination
   */
  async searchHotels(
    query: SearchQuery
  ): Promise<{ results: SearchResult<Hotel>[]; total: number }> {
    let dbQuery = this.supabase
      .from('hotels')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .is('deleted_at', null);

    // Text search
    if (query.q) {
      dbQuery = dbQuery.or(
        `name.ilike.%${query.q}%,description.ilike.%${query.q}%,location.ilike.%${query.q}%`
      );
    }

    // Location filter
    if (query.location) {
      dbQuery = dbQuery.ilike('location', `%${query.location}%`);
    }

    // Price filters
    if (query.min_price) {
      dbQuery = dbQuery.gte('price_per_night', query.min_price);
    }
    if (query.max_price) {
      dbQuery = dbQuery.lte('price_per_night', query.max_price);
    }

    // Star rating filter
    if (query.filters?.star_rating) {
      dbQuery = dbQuery.gte('star_rating', query.filters.star_rating);
    }

    // Amenities filter
    if (query.filters?.amenities && query.filters.amenities.length > 0) {
      dbQuery = dbQuery.contains('amenities', query.filters.amenities);
    }

    // Sorting
    const sortColumn = this.mapSortColumn(query.sort || 'relevance', 'hotels');
    dbQuery = dbQuery.order(sortColumn, { ascending: query.order === 'asc' });

    // Pagination
    const offset = ((query.page || 1) - 1) * (query.limit || 20);
    dbQuery = dbQuery.range(offset, offset + (query.limit || 20) - 1);

    const { data, count, error } = await dbQuery;

    if (error) {
      throw new Error(`Hotel search failed: ${error.message}`);
    }

    const results: SearchResult<Hotel>[] = (data || []).map((hotel: Hotel) => ({
      id: hotel.id,
      type: 'hotels' as SearchCategory,
      title: hotel.name,
      description: hotel.description,
      image_url: hotel.image_urls?.[0],
      price: hotel.price_per_night,
      currency: hotel.currency,
      rating: hotel.star_rating,
      location: hotel.location,
      relevance_score: this.calculateRelevanceScore(
        query.q || '',
        `${hotel.name} ${hotel.description}`
      ),
      data: hotel,
      created_at: hotel.created_at,
      updated_at: hotel.updated_at,
    }));

    return { results, total: count || 0 };
  }

  /**
   * Search ecommerce products with filters and pagination
   */
  async searchProducts(
    query: SearchQuery
  ): Promise<{ results: SearchResult<EcommerceProduct>[]; total: number }> {
    let dbQuery = this.supabase
      .from('ecommerce_products')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .is('deleted_at', null);

    // Text search
    if (query.q) {
      dbQuery = dbQuery.or(
        `name.ilike.%${query.q}%,description.ilike.%${query.q}%,category.ilike.%${query.q}%`
      );
    }

    // Price filters
    if (query.min_price) {
      dbQuery = dbQuery.gte('price', query.min_price);
    }
    if (query.max_price) {
      dbQuery = dbQuery.lte('price', query.max_price);
    }

    // Brand filter
    if (query.filters?.brand) {
      dbQuery = dbQuery.ilike('brand', `%${query.filters.brand}%`);
    }

    // Condition filter
    if (query.filters?.condition) {
      dbQuery = dbQuery.eq('condition', query.filters.condition);
    }

    // In stock filter
    dbQuery = dbQuery.gt('stock_quantity', 0);

    // Sorting
    const sortColumn = this.mapSortColumn(query.sort || 'relevance', 'products');
    dbQuery = dbQuery.order(sortColumn, { ascending: query.order === 'asc' });

    // Pagination
    const offset = ((query.page || 1) - 1) * (query.limit || 20);
    dbQuery = dbQuery.range(offset, offset + (query.limit || 20) - 1);

    const { data, count, error } = await dbQuery;

    if (error) {
      throw new Error(`Product search failed: ${error.message}`);
    }

    const results: SearchResult<EcommerceProduct>[] = (data || []).map(
      (product: EcommerceProduct) => ({
        id: product.id,
        type: 'products' as SearchCategory,
        title: product.name,
        description: product.description,
        image_url: product.image_urls?.[0],
        price: product.price,
        currency: product.currency,
        location: undefined,
        relevance_score: this.calculateRelevanceScore(
          query.q || '',
          `${product.name} ${product.description}`
        ),
        data: product,
        created_at: product.created_at,
        updated_at: product.updated_at,
      })
    );

    return { results, total: count || 0 };
  }

  /**
   * Search taxi drivers with location-based filtering
   */
  async searchDrivers(
    query: SearchQuery
  ): Promise<{ results: SearchResult<DriverProfile>[]; total: number }> {
    // If location-based search is requested, use RPC function
    if (query.filters?.latitude && query.filters?.longitude) {
      const radius = query.filters.radius || 10;
      const { data, error } = await this.supabase.rpc('drivers_within_radius', {
        lat: query.filters.latitude,
        lng: query.filters.longitude,
        radius_km: radius,
      });

      if (error) {
        // Fall back to regular query if RPC doesn't exist
        console.warn('drivers_within_radius RPC not available, using standard query');
      } else if (data) {
        const results: SearchResult<DriverProfile>[] = (data || []).map((driver: any) => ({
          id: driver.id,
          type: 'drivers' as SearchCategory,
          title: driver.name || 'Driver',
          description: `${driver.vehicle_type || 'Vehicle'}`,
          rating: driver.rating,
          location: undefined,
          distance: driver.distance,
          relevance_score: 1.0,
          data: driver as DriverProfile,
          created_at: driver.created_at,
          updated_at: driver.updated_at,
        }));
        return { results, total: data.length };
      }
    }

    // Standard query without location
    let dbQuery = this.supabase
      .from('driver_profiles')
      .select('*', { count: 'exact' })
      .eq('is_online', true)
      .eq('is_verified', true);

    // Text search on vehicle info
    if (query.q) {
      dbQuery = dbQuery.or(`vehicle_type.ilike.%${query.q}%,license_number.ilike.%${query.q}%`);
    }

    // Vehicle type filter
    if (query.filters?.vehicle_type) {
      dbQuery = dbQuery.ilike('vehicle_type', `%${query.filters.vehicle_type}%`);
    }

    // Rating filter
    if (query.filters?.rating_min) {
      dbQuery = dbQuery.gte('rating', query.filters.rating_min);
    }

    // Sorting
    const sortColumn = this.mapSortColumn(query.sort || 'rating', 'drivers');
    dbQuery = dbQuery.order(sortColumn, { ascending: query.order === 'asc' });

    // Pagination
    const offset = ((query.page || 1) - 1) * (query.limit || 20);
    dbQuery = dbQuery.range(offset, offset + (query.limit || 20) - 1);

    const { data, count, error } = await dbQuery;

    if (error) {
      throw new Error(`Driver search failed: ${error.message}`);
    }

    const results: SearchResult<DriverProfile>[] = (data || []).map((driver: any) => {
      const vehicleInfo = driver.vehicle_info || {};
      const currentLocation = driver.current_location || {};

      return {
        id: driver.id,
        type: 'drivers' as SearchCategory,
        title: 'Driver',
        description: `${driver.vehicle_type || vehicleInfo.type || 'Vehicle'} - ${vehicleInfo.model || 'Unknown'}`,
        rating: driver.rating,
        location: undefined,
        distance: this.calculateDistance(
          query.filters?.latitude,
          query.filters?.longitude,
          currentLocation.latitude,
          currentLocation.longitude
        ),
        relevance_score: this.calculateRelevanceScore(
          query.q || '',
          `${driver.vehicle_type || ''}`
        ),
        data: driver as DriverProfile,
        created_at: driver.created_at,
        updated_at: driver.updated_at,
      };
    });

    return { results, total: count || 0 };
  }

  /**
   * Search social posts with content filtering
   */
  async searchPosts(
    query: SearchQuery
  ): Promise<{ results: SearchResult<SocialPost>[]; total: number }> {
    let dbQuery = this.supabase
      .from('social_posts')
      .select('*', { count: 'exact' })
      .eq('is_public', true)
      .is('deleted_at', null);

    // Text search
    if (query.q) {
      dbQuery = dbQuery.ilike('content', `%${query.q}%`);
    }

    // Sorting
    const sortColumn = this.mapSortColumn(query.sort || 'created_at', 'posts');
    dbQuery = dbQuery.order(sortColumn, { ascending: query.order === 'asc' });

    // Pagination
    const offset = ((query.page || 1) - 1) * (query.limit || 20);
    dbQuery = dbQuery.range(offset, offset + (query.limit || 20) - 1);

    const { data, count, error } = await dbQuery;

    if (error) {
      throw new Error(`Post search failed: ${error.message}`);
    }

    const results: SearchResult<SocialPost>[] = (data || []).map((post: SocialPost) => ({
      id: post.id,
      type: 'posts' as SearchCategory,
      title: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
      description: post.content,
      image_url: post.image_urls?.[0],
      relevance_score: this.calculateRelevanceScore(query.q || '', post.content),
      data: post,
      created_at: post.created_at,
      updated_at: post.updated_at,
    }));

    return { results, total: count || 0 };
  }

  /**
   * Search user profiles
   */
  async searchUsers(
    query: SearchQuery
  ): Promise<{ results: SearchResult<UserProfile>[]; total: number }> {
    let dbQuery = this.supabase
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .is('deleted_at', null);

    // Text search
    if (query.q) {
      dbQuery = dbQuery.or(
        `first_name.ilike.%${query.q}%,last_name.ilike.%${query.q}%,bio.ilike.%${query.q}%`
      );
    }

    // Location filter
    if (query.location) {
      dbQuery = dbQuery.ilike('location', `%${query.location}%`);
    }

    // Verified filter
    if (query.filters?.available_only) {
      dbQuery = dbQuery.eq('is_verified', true);
    }

    // Sorting
    const sortColumn = this.mapSortColumn(query.sort || 'created_at', 'users');
    dbQuery = dbQuery.order(sortColumn, { ascending: query.order === 'asc' });

    // Pagination
    const offset = ((query.page || 1) - 1) * (query.limit || 20);
    dbQuery = dbQuery.range(offset, offset + (query.limit || 20) - 1);

    const { data, count, error } = await dbQuery;

    if (error) {
      throw new Error(`User search failed: ${error.message}`);
    }

    const results: SearchResult<UserProfile>[] = (data || []).map((user: UserProfile) => ({
      id: user.id,
      type: 'users' as SearchCategory,
      title: `${user.first_name} ${user.last_name}`,
      description: user.bio,
      image_url: user.avatar_url,
      location: user.location,
      relevance_score: this.calculateRelevanceScore(
        query.q || '',
        `${user.first_name} ${user.last_name} ${user.bio || ''}`
      ),
      data: user,
      created_at: user.created_at,
      updated_at: user.updated_at,
    }));

    return { results, total: count || 0 };
  }

  /**
   * Get search suggestions for autocomplete
   */
  async getSearchSuggestions(
    query: string,
    category: SearchCategory,
    limit: number = 10
  ): Promise<string[]> {
    const suggestions: string[] = [];

    try {
      if (category === 'all' || category === 'hotels') {
        const { data } = await this.supabase
          .from('hotels')
          .select('name')
          .ilike('name', `%${query}%`)
          .eq('is_active', true)
          .limit(limit);

        suggestions.push(...(data || []).map(h => h.name));
      }

      if (category === 'all' || category === 'products') {
        const { data } = await this.supabase
          .from('ecommerce_products')
          .select('name')
          .ilike('name', `%${query}%`)
          .eq('is_active', true)
          .limit(limit);

        suggestions.push(...(data || []).map(p => p.name));
      }

      // Remove duplicates and limit results
      return [...new Set(suggestions)].slice(0, limit);
    } catch (error) {
      console.error('Failed to get search suggestions:', error);
      return [];
    }
  }

  /**
   * Map sort options to database columns
   */
  private mapSortColumn(sort: string, category: string): string {
    const sortMappings: Record<string, Record<string, string>> = {
      hotels: {
        relevance: 'name',
        price: 'price_per_night',
        rating: 'star_rating',
        created_at: 'created_at',
      },
      products: {
        relevance: 'name',
        price: 'price',
        rating: 'name', // Products don't have ratings, fallback to name
        created_at: 'created_at',
      },
      drivers: {
        relevance: 'name',
        rating: 'rating',
        distance: 'name', // Distance calculated separately
        created_at: 'created_at',
      },
      posts: {
        relevance: 'content',
        created_at: 'created_at',
        likes_count: 'likes_count',
      },
      users: {
        relevance: 'first_name',
        created_at: 'created_at',
      },
    };

    return sortMappings[category]?.[sort] || 'created_at';
  }

  /**
   * Calculate relevance score based on text matching
   */
  private calculateRelevanceScore(query: string, text: string): number {
    if (!query || !text) return 0;

    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();

    // Exact match gets highest score
    if (textLower.includes(queryLower)) {
      return 1.0;
    }

    // Calculate word overlap
    const queryWords = queryLower.split(/\s+/);
    const textWords = textLower.split(/\s+/);

    const matchingWords = queryWords.filter(word =>
      textWords.some(textWord => textWord.includes(word))
    );

    return matchingWords.length / queryWords.length;
  }

  /**
   * Calculate distance between two coordinates in kilometers
   */
  private calculateDistance(
    lat1?: number,
    lon1?: number,
    lat2?: number,
    lon2?: number
  ): number | undefined {
    if (!lat1 || !lon1 || !lat2 || !lon2) return undefined;

    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
