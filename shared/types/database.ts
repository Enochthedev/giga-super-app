/**
 * Shared Database Type Definitions
 *
 * This file serves as the single source of truth for database types across all services.
 * It's automatically generated from the Supabase schema and shared across:
 * - API Gateway
 * - Admin Service
 * - Social Service
 * - Delivery Service
 * - Payment Queue Service
 * - Search Service
 * - Taxi Realtime Service
 *
 * To update these types:
 * 1. Run: npm run db:generate-types
 * 2. This will fetch the latest schema from Supabase
 * 3. All services will automatically use the updated types
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          phone: string | null;
          first_name: string;
          last_name: string;
          avatar_url: string | null;
          date_of_birth: string | null;
          gender: string | null;
          marital_status: string | null;
          body_weight: number | null;
          height: number | null;
          age_group: string | null;
          areas_of_interest: string[] | null;
          is_phone_verified: boolean;
          is_active: boolean;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
          deletion_reason: string | null;
          region_id: string | null;
        };
        Insert: {
          id: string;
          email: string;
          phone?: string | null;
          first_name?: string;
          last_name?: string;
          avatar_url?: string | null;
          date_of_birth?: string | null;
          gender?: string | null;
          marital_status?: string | null;
          body_weight?: number | null;
          height?: number | null;
          age_group?: string | null;
          areas_of_interest?: string[] | null;
          is_phone_verified?: boolean;
          is_active?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deletion_reason?: string | null;
          region_id?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          phone?: string | null;
          first_name?: string;
          last_name?: string;
          avatar_url?: string | null;
          date_of_birth?: string | null;
          gender?: string | null;
          marital_status?: string | null;
          body_weight?: number | null;
          height?: number | null;
          age_group?: string | null;
          areas_of_interest?: string[] | null;
          is_phone_verified?: boolean;
          is_active?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deletion_reason?: string | null;
          region_id?: string | null;
        };
      };
      social_posts: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          media_urls: string[];
          post_type: string;
          visibility: string;
          allowed_viewers: string[] | null;
          location: Json | null;
          feeling_activity: string | null;
          tagged_users: string[] | null;
          like_count: number;
          comment_count: number;
          share_count: number;
          view_count: number;
          shared_post_id: string | null;
          is_active: boolean;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
          deletion_reason: string | null;
          tenant_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          media_urls?: string[];
          post_type?: string;
          visibility?: string;
          allowed_viewers?: string[] | null;
          location?: Json | null;
          feeling_activity?: string | null;
          tagged_users?: string[] | null;
          like_count?: number;
          comment_count?: number;
          share_count?: number;
          view_count?: number;
          shared_post_id?: string | null;
          is_active?: boolean;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deletion_reason?: string | null;
          tenant_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          media_urls?: string[];
          post_type?: string;
          visibility?: string;
          allowed_viewers?: string[] | null;
          location?: Json | null;
          feeling_activity?: string | null;
          tagged_users?: string[] | null;
          like_count?: number;
          comment_count?: number;
          share_count?: number;
          view_count?: number;
          shared_post_id?: string | null;
          is_active?: boolean;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deletion_reason?: string | null;
          tenant_id?: string | null;
        };
      };
      hotels: {
        Row: {
          id: string;
          host_id: string;
          name: string;
          slug: string;
          description: string | null;
          short_description: string | null;
          address: string;
          city: string;
          state: string | null;
          country: string;
          postal_code: string | null;
          latitude: number | null;
          longitude: number | null;
          phone: string | null;
          email: string | null;
          website: string | null;
          check_in_time: string;
          check_out_time: string;
          cancellation_policy: string | null;
          house_rules: string | null;
          star_rating: number | null;
          average_rating: number;
          total_reviews: number;
          total_bookings: number;
          is_active: boolean;
          is_verified: boolean;
          verified_at: string | null;
          featured_image: string | null;
          images: string[];
          video_url: string | null;
          amenities: string[];
          nearby_attractions: Json;
          policies: Json;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
          deletion_reason: string | null;
        };
        Insert: {
          id?: string;
          host_id: string;
          name: string;
          slug: string;
          description?: string | null;
          short_description?: string | null;
          address: string;
          city: string;
          state?: string | null;
          country: string;
          postal_code?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          check_in_time?: string;
          check_out_time?: string;
          cancellation_policy?: string | null;
          house_rules?: string | null;
          star_rating?: number | null;
          average_rating?: number;
          total_reviews?: number;
          total_bookings?: number;
          is_active?: boolean;
          is_verified?: boolean;
          verified_at?: string | null;
          featured_image?: string | null;
          images?: string[];
          video_url?: string | null;
          amenities?: string[];
          nearby_attractions?: Json;
          policies?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deletion_reason?: string | null;
        };
        Update: {
          id?: string;
          host_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          short_description?: string | null;
          address?: string;
          city?: string;
          state?: string | null;
          country?: string;
          postal_code?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          check_in_time?: string;
          check_out_time?: string;
          cancellation_policy?: string | null;
          house_rules?: string | null;
          star_rating?: number | null;
          average_rating?: number;
          total_reviews?: number;
          total_bookings?: number;
          is_active?: boolean;
          is_verified?: boolean;
          verified_at?: string | null;
          featured_image?: string | null;
          images?: string[];
          video_url?: string | null;
          amenities?: string[];
          nearby_attractions?: Json;
          policies?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deletion_reason?: string | null;
        };
      };
      // Add more tables as needed - this is a starter template
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Insertable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type Updatable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Commonly used types
export type UserProfile = Tables<'user_profiles'>;
export type SocialPost = Tables<'social_posts'>;
export type Hotel = Tables<'hotels'>;
