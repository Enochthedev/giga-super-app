export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5';
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      ad_campaigns: {
        Row: {
          advertiser_id: string;
          approved_at: string | null;
          approved_by: string | null;
          budget: number;
          campaign_name: string;
          campaign_number: string;
          campaign_type: string | null;
          clicks: number | null;
          conversions: number | null;
          created_at: string | null;
          creative_assets: Json | null;
          ctr: number | null;
          daily_budget: number | null;
          description: string | null;
          end_date: string;
          id: string;
          impressions: number | null;
          landing_url: string | null;
          payment_status: string | null;
          rejection_reason: string | null;
          spent_amount: number | null;
          start_date: string;
          status: string | null;
          target_audience: Json | null;
          updated_at: string | null;
        };
        Insert: {
          advertiser_id: string;
          approved_at?: string | null;
          approved_by?: string | null;
          budget: number;
          campaign_name: string;
          campaign_number: string;
          campaign_type?: string | null;
          clicks?: number | null;
          conversions?: number | null;
          created_at?: string | null;
          creative_assets?: Json | null;
          ctr?: number | null;
          daily_budget?: number | null;
          description?: string | null;
          end_date: string;
          id?: string;
          impressions?: number | null;
          landing_url?: string | null;
          payment_status?: string | null;
          rejection_reason?: string | null;
          spent_amount?: number | null;
          start_date: string;
          status?: string | null;
          target_audience?: Json | null;
          updated_at?: string | null;
        };
        Update: {
          advertiser_id?: string;
          approved_at?: string | null;
          approved_by?: string | null;
          budget?: number;
          campaign_name?: string;
          campaign_number?: string;
          campaign_type?: string | null;
          clicks?: number | null;
          conversions?: number | null;
          created_at?: string | null;
          creative_assets?: Json | null;
          ctr?: number | null;
          daily_budget?: number | null;
          description?: string | null;
          end_date?: string;
          id?: string;
          impressions?: number | null;
          landing_url?: string | null;
          payment_status?: string | null;
          rejection_reason?: string | null;
          spent_amount?: number | null;
          start_date?: string;
          status?: string | null;
          target_audience?: Json | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ad_campaigns_advertiser_id_fkey';
            columns: ['advertiser_id'];
            isOneToOne: false;
            referencedRelation: 'advertiser_profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      advertiser_profiles: {
        Row: {
          company_name: string;
          created_at: string | null;
          id: string;
          industry: string | null;
          is_verified: boolean | null;
          subscription_tier: string | null;
          total_campaigns: number | null;
          total_spend: number | null;
          updated_at: string | null;
          user_id: string;
          website: string | null;
        };
        Insert: {
          company_name: string;
          created_at?: string | null;
          id?: string;
          industry?: string | null;
          is_verified?: boolean | null;
          subscription_tier?: string | null;
          total_campaigns?: number | null;
          total_spend?: number | null;
          updated_at?: string | null;
          user_id: string;
          website?: string | null;
        };
        Update: {
          company_name?: string;
          created_at?: string | null;
          id?: string;
          industry?: string | null;
          is_verified?: boolean | null;
          subscription_tier?: string | null;
          total_campaigns?: number | null;
          total_spend?: number | null;
          updated_at?: string | null;
          user_id?: string;
          website?: string | null;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          action: string;
          created_at: string | null;
          id: string;
          ip_address: unknown;
          new_values: Json | null;
          old_values: Json | null;
          resource_id: string | null;
          resource_type: string;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string | null;
          id?: string;
          ip_address?: unknown;
          new_values?: Json | null;
          old_values?: Json | null;
          resource_id?: string | null;
          resource_type: string;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string | null;
          id?: string;
          ip_address?: unknown;
          new_values?: Json | null;
          old_values?: Json | null;
          resource_id?: string | null;
          resource_type?: string;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      customer_profiles: {
        Row: {
          company: string | null;
          created_at: string | null;
          emergency_contact: Json | null;
          id: string;
          loyalty_points: number | null;
          medical_info: Json | null;
          membership_tier: string | null;
          occupation: string | null;
          preferences: Json | null;
          social_media: Json | null;
          total_orders: number | null;
          total_spent: number | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          company?: string | null;
          created_at?: string | null;
          emergency_contact?: Json | null;
          id?: string;
          loyalty_points?: number | null;
          medical_info?: Json | null;
          membership_tier?: string | null;
          occupation?: string | null;
          preferences?: Json | null;
          social_media?: Json | null;
          total_orders?: number | null;
          total_spent?: number | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          company?: string | null;
          created_at?: string | null;
          emergency_contact?: Json | null;
          id?: string;
          loyalty_points?: number | null;
          medical_info?: Json | null;
          membership_tier?: string | null;
          occupation?: string | null;
          preferences?: Json | null;
          social_media?: Json | null;
          total_orders?: number | null;
          total_spent?: number | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      deposit_requirements: {
        Row: {
          balance_due_days_before: number | null;
          created_at: string | null;
          deposit_type: string;
          deposit_value: number;
          id: string;
          is_active: boolean | null;
          min_deposit_amount: number | null;
          module_name: string;
          updated_at: string | null;
        };
        Insert: {
          balance_due_days_before?: number | null;
          created_at?: string | null;
          deposit_type?: string;
          deposit_value: number;
          id?: string;
          is_active?: boolean | null;
          min_deposit_amount?: number | null;
          module_name: string;
          updated_at?: string | null;
        };
        Update: {
          balance_due_days_before?: number | null;
          created_at?: string | null;
          deposit_type?: string;
          deposit_value?: number;
          id?: string;
          is_active?: boolean | null;
          min_deposit_amount?: number | null;
          module_name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      driver_profiles: {
        Row: {
          created_at: string | null;
          current_location: Json | null;
          id: string;
          is_online: boolean | null;
          is_verified: boolean | null;
          license_number: string;
          rating: number | null;
          subscription_tier: string | null;
          total_rides: number | null;
          updated_at: string | null;
          user_id: string;
          vehicle_info: Json | null;
        };
        Insert: {
          created_at?: string | null;
          current_location?: Json | null;
          id?: string;
          is_online?: boolean | null;
          is_verified?: boolean | null;
          license_number: string;
          rating?: number | null;
          subscription_tier?: string | null;
          total_rides?: number | null;
          updated_at?: string | null;
          user_id: string;
          vehicle_info?: Json | null;
        };
        Update: {
          created_at?: string | null;
          current_location?: Json | null;
          id?: string;
          is_online?: boolean | null;
          is_verified?: boolean | null;
          license_number?: string;
          rating?: number | null;
          subscription_tier?: string | null;
          total_rides?: number | null;
          updated_at?: string | null;
          user_id?: string;
          vehicle_info?: Json | null;
        };
        Relationships: [];
      };
      ecommerce_cart_items: {
        Row: {
          added_at: string | null;
          cart_id: string | null;
          id: string;
          price_per_unit: number;
          product_id: string | null;
          quantity: number;
          subtotal: number | null;
          updated_at: string | null;
          variant_id: string | null;
        };
        Insert: {
          added_at?: string | null;
          cart_id?: string | null;
          id?: string;
          price_per_unit: number;
          product_id?: string | null;
          quantity?: number;
          subtotal?: number | null;
          updated_at?: string | null;
          variant_id?: string | null;
        };
        Update: {
          added_at?: string | null;
          cart_id?: string | null;
          id?: string;
          price_per_unit?: number;
          product_id?: string | null;
          quantity?: number;
          subtotal?: number | null;
          updated_at?: string | null;
          variant_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ecommerce_cart_items_cart_id_fkey';
            columns: ['cart_id'];
            isOneToOne: false;
            referencedRelation: 'ecommerce_carts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ecommerce_cart_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'ecommerce_products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ecommerce_cart_items_variant_id_fkey';
            columns: ['variant_id'];
            isOneToOne: false;
            referencedRelation: 'ecommerce_product_variants';
            referencedColumns: ['id'];
          },
        ];
      };
      ecommerce_carts: {
        Row: {
          created_at: string | null;
          discount_amount: number | null;
          expires_at: string | null;
          id: string;
          promo_code_id: string | null;
          session_id: string | null;
          shipping_cost: number | null;
          subtotal: number | null;
          tax_amount: number | null;
          total_amount: number | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          discount_amount?: number | null;
          expires_at?: string | null;
          id?: string;
          promo_code_id?: string | null;
          session_id?: string | null;
          shipping_cost?: number | null;
          subtotal?: number | null;
          tax_amount?: number | null;
          total_amount?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          discount_amount?: number | null;
          expires_at?: string | null;
          id?: string;
          promo_code_id?: string | null;
          session_id?: string | null;
          shipping_cost?: number | null;
          subtotal?: number | null;
          tax_amount?: number | null;
          total_amount?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ecommerce_carts_promo_code_id_fkey';
            columns: ['promo_code_id'];
            isOneToOne: false;
            referencedRelation: 'marketplace_promo_codes';
            referencedColumns: ['id'];
          },
        ];
      };
      ecommerce_categories: {
        Row: {
          created_at: string | null;
          description: string | null;
          display_order: number | null;
          icon_url: string | null;
          id: string;
          image_url: string | null;
          is_active: boolean | null;
          name: string;
          parent_id: string | null;
          slug: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          display_order?: number | null;
          icon_url?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean | null;
          name: string;
          parent_id?: string | null;
          slug: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          display_order?: number | null;
          icon_url?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean | null;
          name?: string;
          parent_id?: string | null;
          slug?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ecommerce_categories_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'ecommerce_categories';
            referencedColumns: ['id'];
          },
        ];
      };
      ecommerce_order_items: {
        Row: {
          created_at: string | null;
          id: string;
          order_id: string | null;
          price_per_unit: number;
          product_id: string | null;
          product_name: string;
          product_slug: string | null;
          product_snapshot: Json | null;
          quantity: number;
          sku: string | null;
          status: string | null;
          subtotal: number;
          variant_id: string | null;
          variant_name: string | null;
          vendor_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          order_id?: string | null;
          price_per_unit: number;
          product_id?: string | null;
          product_name: string;
          product_slug?: string | null;
          product_snapshot?: Json | null;
          quantity: number;
          sku?: string | null;
          status?: string | null;
          subtotal: number;
          variant_id?: string | null;
          variant_name?: string | null;
          vendor_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          order_id?: string | null;
          price_per_unit?: number;
          product_id?: string | null;
          product_name?: string;
          product_slug?: string | null;
          product_snapshot?: Json | null;
          quantity?: number;
          sku?: string | null;
          status?: string | null;
          subtotal?: number;
          variant_id?: string | null;
          variant_name?: string | null;
          vendor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ecommerce_order_items_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'ecommerce_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ecommerce_order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'ecommerce_products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ecommerce_order_items_variant_id_fkey';
            columns: ['variant_id'];
            isOneToOne: false;
            referencedRelation: 'ecommerce_product_variants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ecommerce_order_items_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'ecommerce_vendors';
            referencedColumns: ['id'];
          },
        ];
      };
      ecommerce_order_status_history: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          from_status: string | null;
          id: string;
          notes: string | null;
          order_id: string | null;
          to_status: string;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          from_status?: string | null;
          id?: string;
          notes?: string | null;
          order_id?: string | null;
          to_status: string;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          from_status?: string | null;
          id?: string;
          notes?: string | null;
          order_id?: string | null;
          to_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ecommerce_order_status_history_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'ecommerce_orders';
            referencedColumns: ['id'];
          },
        ];
      };
      ecommerce_orders: {
        Row: {
          admin_notes: string | null;
          billing_address_id: string | null;
          cancellation_reason: string | null;
          carrier: string | null;
          created_at: string | null;
          customer_notes: string | null;
          delivered_at: string | null;
          discount_amount: number | null;
          estimated_delivery_date: string | null;
          guest_email: string | null;
          id: string;
          order_number: string;
          paid_at: string | null;
          payment_id: string | null;
          payment_method: string | null;
          payment_provider: string | null;
          payment_status: string | null;
          promo_code: string | null;
          promo_code_id: string | null;
          shipping_address_id: string | null;
          shipping_cost: number | null;
          status: string | null;
          subtotal: number;
          tax_amount: number | null;
          total_amount: number;
          tracking_number: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          admin_notes?: string | null;
          billing_address_id?: string | null;
          cancellation_reason?: string | null;
          carrier?: string | null;
          created_at?: string | null;
          customer_notes?: string | null;
          delivered_at?: string | null;
          discount_amount?: number | null;
          estimated_delivery_date?: string | null;
          guest_email?: string | null;
          id?: string;
          order_number: string;
          paid_at?: string | null;
          payment_id?: string | null;
          payment_method?: string | null;
          payment_provider?: string | null;
          payment_status?: string | null;
          promo_code?: string | null;
          promo_code_id?: string | null;
          shipping_address_id?: string | null;
          shipping_cost?: number | null;
          status?: string | null;
          subtotal: number;
          tax_amount?: number | null;
          total_amount: number;
          tracking_number?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          admin_notes?: string | null;
          billing_address_id?: string | null;
          cancellation_reason?: string | null;
          carrier?: string | null;
          created_at?: string | null;
          customer_notes?: string | null;
          delivered_at?: string | null;
          discount_amount?: number | null;
          estimated_delivery_date?: string | null;
          guest_email?: string | null;
          id?: string;
          order_number?: string;
          paid_at?: string | null;
          payment_id?: string | null;
          payment_method?: string | null;
          payment_provider?: string | null;
          payment_status?: string | null;
          promo_code?: string | null;
          promo_code_id?: string | null;
          shipping_address_id?: string | null;
          shipping_cost?: number | null;
          status?: string | null;
          subtotal?: number;
          tax_amount?: number | null;
          total_amount?: number;
          tracking_number?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ecommerce_orders_billing_address_id_fkey';
            columns: ['billing_address_id'];
            isOneToOne: false;
            referencedRelation: 'shipping_addresses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ecommerce_orders_promo_code_id_fkey';
            columns: ['promo_code_id'];
            isOneToOne: false;
            referencedRelation: 'marketplace_promo_codes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ecommerce_orders_shipping_address_id_fkey';
            columns: ['shipping_address_id'];
            isOneToOne: false;
            referencedRelation: 'shipping_addresses';
            referencedColumns: ['id'];
          },
        ];
      };
      ecommerce_product_reviews: {
        Row: {
          comment: string | null;
          created_at: string | null;
          helpful_count: number | null;
          id: string;
          images: string[] | null;
          is_approved: boolean | null;
          is_featured: boolean | null;
          is_verified: boolean | null;
          order_id: string | null;
          product_id: string | null;
          rating: number;
          title: string | null;
          unhelpful_count: number | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          comment?: string | null;
          created_at?: string | null;
          helpful_count?: number | null;
          id?: string;
          images?: string[] | null;
          is_approved?: boolean | null;
          is_featured?: boolean | null;
          is_verified?: boolean | null;
          order_id?: string | null;
          product_id?: string | null;
          rating: number;
          title?: string | null;
          unhelpful_count?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          comment?: string | null;
          created_at?: string | null;
          helpful_count?: number | null;
          id?: string;
          images?: string[] | null;
          is_approved?: boolean | null;
          is_featured?: boolean | null;
          is_verified?: boolean | null;
          order_id?: string | null;
          product_id?: string | null;
          rating?: number;
          title?: string | null;
          unhelpful_count?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ecommerce_product_reviews_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'ecommerce_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ecommerce_product_reviews_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'ecommerce_products';
            referencedColumns: ['id'];
          },
        ];
      };
      ecommerce_product_variants: {
        Row: {
          attributes: Json;
          created_at: string | null;
          id: string;
          images: string[] | null;
          is_active: boolean | null;
          price_adjustment: number | null;
          product_id: string | null;
          sku: string | null;
          stock_quantity: number | null;
          updated_at: string | null;
          variant_name: string;
        };
        Insert: {
          attributes?: Json;
          created_at?: string | null;
          id?: string;
          images?: string[] | null;
          is_active?: boolean | null;
          price_adjustment?: number | null;
          product_id?: string | null;
          sku?: string | null;
          stock_quantity?: number | null;
          updated_at?: string | null;
          variant_name: string;
        };
        Update: {
          attributes?: Json;
          created_at?: string | null;
          id?: string;
          images?: string[] | null;
          is_active?: boolean | null;
          price_adjustment?: number | null;
          product_id?: string | null;
          sku?: string | null;
          stock_quantity?: number | null;
          updated_at?: string | null;
          variant_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ecommerce_product_variants_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'ecommerce_products';
            referencedColumns: ['id'];
          },
        ];
      };
      ecommerce_products: {
        Row: {
          allow_backorder: boolean | null;
          attributes: Json | null;
          average_rating: number | null;
          base_price: number;
          category_id: string | null;
          cost_price: number | null;
          created_at: string | null;
          description: string | null;
          dimensions: Json | null;
          discount_percentage: number | null;
          final_price: number | null;
          id: string;
          images: string[] | null;
          is_active: boolean | null;
          is_featured: boolean | null;
          low_stock_threshold: number | null;
          meta_description: string | null;
          meta_keywords: string[] | null;
          meta_title: string | null;
          name: string;
          order_count: number | null;
          published_at: string | null;
          requires_shipping: boolean | null;
          review_count: number | null;
          short_description: string | null;
          sku: string | null;
          slug: string;
          specifications: Json | null;
          stock_quantity: number | null;
          thumbnail: string | null;
          track_inventory: boolean | null;
          updated_at: string | null;
          vendor_id: string | null;
          video_url: string | null;
          view_count: number | null;
          weight: number | null;
        };
        Insert: {
          allow_backorder?: boolean | null;
          attributes?: Json | null;
          average_rating?: number | null;
          base_price: number;
          category_id?: string | null;
          cost_price?: number | null;
          created_at?: string | null;
          description?: string | null;
          dimensions?: Json | null;
          discount_percentage?: number | null;
          final_price?: number | null;
          id?: string;
          images?: string[] | null;
          is_active?: boolean | null;
          is_featured?: boolean | null;
          low_stock_threshold?: number | null;
          meta_description?: string | null;
          meta_keywords?: string[] | null;
          meta_title?: string | null;
          name: string;
          order_count?: number | null;
          published_at?: string | null;
          requires_shipping?: boolean | null;
          review_count?: number | null;
          short_description?: string | null;
          sku?: string | null;
          slug: string;
          specifications?: Json | null;
          stock_quantity?: number | null;
          thumbnail?: string | null;
          track_inventory?: boolean | null;
          updated_at?: string | null;
          vendor_id?: string | null;
          video_url?: string | null;
          view_count?: number | null;
          weight?: number | null;
        };
        Update: {
          allow_backorder?: boolean | null;
          attributes?: Json | null;
          average_rating?: number | null;
          base_price?: number;
          category_id?: string | null;
          cost_price?: number | null;
          created_at?: string | null;
          description?: string | null;
          dimensions?: Json | null;
          discount_percentage?: number | null;
          final_price?: number | null;
          id?: string;
          images?: string[] | null;
          is_active?: boolean | null;
          is_featured?: boolean | null;
          low_stock_threshold?: number | null;
          meta_description?: string | null;
          meta_keywords?: string[] | null;
          meta_title?: string | null;
          name?: string;
          order_count?: number | null;
          published_at?: string | null;
          requires_shipping?: boolean | null;
          review_count?: number | null;
          short_description?: string | null;
          sku?: string | null;
          slug?: string;
          specifications?: Json | null;
          stock_quantity?: number | null;
          thumbnail?: string | null;
          track_inventory?: boolean | null;
          updated_at?: string | null;
          vendor_id?: string | null;
          video_url?: string | null;
          view_count?: number | null;
          weight?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ecommerce_products_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'ecommerce_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ecommerce_products_vendor_id_fkey';
            columns: ['vendor_id'];
            isOneToOne: false;
            referencedRelation: 'ecommerce_vendors';
            referencedColumns: ['id'];
          },
        ];
      };
      ecommerce_vendors: {
        Row: {
          account_name: string | null;
          account_number: string | null;
          average_rating: number | null;
          bank_name: string | null;
          business_name: string;
          business_registration: string | null;
          commission_rate: number | null;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          is_verified: boolean | null;
          tax_id: string | null;
          total_orders: number | null;
          total_sales: number | null;
          updated_at: string | null;
          verified_at: string | null;
        };
        Insert: {
          account_name?: string | null;
          account_number?: string | null;
          average_rating?: number | null;
          bank_name?: string | null;
          business_name: string;
          business_registration?: string | null;
          commission_rate?: number | null;
          created_at?: string | null;
          id: string;
          is_active?: boolean | null;
          is_verified?: boolean | null;
          tax_id?: string | null;
          total_orders?: number | null;
          total_sales?: number | null;
          updated_at?: string | null;
          verified_at?: string | null;
        };
        Update: {
          account_name?: string | null;
          account_number?: string | null;
          average_rating?: number | null;
          bank_name?: string | null;
          business_name?: string;
          business_registration?: string | null;
          commission_rate?: number | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_verified?: boolean | null;
          tax_id?: string | null;
          total_orders?: number | null;
          total_sales?: number | null;
          updated_at?: string | null;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ecommerce_vendors_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'user_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      ecommerce_wishlists: {
        Row: {
          added_at: string | null;
          id: string;
          product_id: string | null;
          user_id: string | null;
        };
        Insert: {
          added_at?: string | null;
          id?: string;
          product_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          added_at?: string | null;
          id?: string;
          product_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ecommerce_wishlists_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'ecommerce_products';
            referencedColumns: ['id'];
          },
        ];
      };
      escrow_transactions: {
        Row: {
          commission_amount: number;
          gross_amount: number;
          held_at: string | null;
          id: string;
          metadata: Json | null;
          module_name: string;
          net_amount: number;
          payment_id: string;
          release_reason: string | null;
          release_trigger: string | null;
          released_at: string | null;
          released_by: string | null;
          status: string;
          vendor_id: string;
          vendor_type: string;
        };
        Insert: {
          commission_amount: number;
          gross_amount: number;
          held_at?: string | null;
          id?: string;
          metadata?: Json | null;
          module_name: string;
          net_amount: number;
          payment_id: string;
          release_reason?: string | null;
          release_trigger?: string | null;
          released_at?: string | null;
          released_by?: string | null;
          status?: string;
          vendor_id: string;
          vendor_type: string;
        };
        Update: {
          commission_amount?: number;
          gross_amount?: number;
          held_at?: string | null;
          id?: string;
          metadata?: Json | null;
          module_name?: string;
          net_amount?: number;
          payment_id?: string;
          release_reason?: string | null;
          release_trigger?: string | null;
          released_at?: string | null;
          released_by?: string | null;
          status?: string;
          vendor_id?: string;
          vendor_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'escrow_transactions_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
        ];
      };
      event_promo_code_usage: {
        Row: {
          discount_amount: number;
          event_ticket_id: string;
          id: string;
          promo_code_id: string;
          used_at: string | null;
          user_id: string;
        };
        Insert: {
          discount_amount: number;
          event_ticket_id: string;
          id?: string;
          promo_code_id: string;
          used_at?: string | null;
          user_id: string;
        };
        Update: {
          discount_amount?: number;
          event_ticket_id?: string;
          id?: string;
          promo_code_id?: string;
          used_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'event_promo_code_usage_promo_code_id_fkey';
            columns: ['promo_code_id'];
            isOneToOne: false;
            referencedRelation: 'event_promo_codes';
            referencedColumns: ['id'];
          },
        ];
      };
      event_promo_codes: {
        Row: {
          applicable_event_types: string[] | null;
          applicable_events: string[] | null;
          applicable_ticket_tiers: string[] | null;
          code: string;
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          discount_type: string;
          discount_value: number;
          early_bird_only: boolean | null;
          excluded_events: string[] | null;
          first_booking_only: boolean | null;
          id: string;
          is_active: boolean | null;
          max_discount_amount: number | null;
          min_order_amount: number | null;
          min_tickets: number | null;
          per_user_limit: number | null;
          student_only: boolean | null;
          updated_at: string | null;
          usage_count: number | null;
          usage_limit: number | null;
          valid_from: string | null;
          valid_until: string | null;
        };
        Insert: {
          applicable_event_types?: string[] | null;
          applicable_events?: string[] | null;
          applicable_ticket_tiers?: string[] | null;
          code: string;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          discount_type: string;
          discount_value: number;
          early_bird_only?: boolean | null;
          excluded_events?: string[] | null;
          first_booking_only?: boolean | null;
          id?: string;
          is_active?: boolean | null;
          max_discount_amount?: number | null;
          min_order_amount?: number | null;
          min_tickets?: number | null;
          per_user_limit?: number | null;
          student_only?: boolean | null;
          updated_at?: string | null;
          usage_count?: number | null;
          usage_limit?: number | null;
          valid_from?: string | null;
          valid_until?: string | null;
        };
        Update: {
          applicable_event_types?: string[] | null;
          applicable_events?: string[] | null;
          applicable_ticket_tiers?: string[] | null;
          code?: string;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          discount_type?: string;
          discount_value?: number;
          early_bird_only?: boolean | null;
          excluded_events?: string[] | null;
          first_booking_only?: boolean | null;
          id?: string;
          is_active?: boolean | null;
          max_discount_amount?: number | null;
          min_order_amount?: number | null;
          min_tickets?: number | null;
          per_user_limit?: number | null;
          student_only?: boolean | null;
          updated_at?: string | null;
          usage_count?: number | null;
          usage_limit?: number | null;
          valid_from?: string | null;
          valid_until?: string | null;
        };
        Relationships: [];
      };
      failed_payment_attempts: {
        Row: {
          amount: number;
          card_brand: string | null;
          card_last4: string | null;
          created_at: string | null;
          failure_reason: string;
          id: string;
          ip_address: unknown;
          is_suspicious: boolean | null;
          payment_method: string;
          payment_provider: string;
          provider_error_code: string | null;
          provider_error_message: string | null;
          risk_score: number | null;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          amount: number;
          card_brand?: string | null;
          card_last4?: string | null;
          created_at?: string | null;
          failure_reason: string;
          id?: string;
          ip_address?: unknown;
          is_suspicious?: boolean | null;
          payment_method: string;
          payment_provider: string;
          provider_error_code?: string | null;
          provider_error_message?: string | null;
          risk_score?: number | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          amount?: number;
          card_brand?: string | null;
          card_last4?: string | null;
          created_at?: string | null;
          failure_reason?: string;
          id?: string;
          ip_address?: unknown;
          is_suspicious?: boolean | null;
          payment_method?: string;
          payment_provider?: string;
          provider_error_code?: string | null;
          provider_error_message?: string | null;
          risk_score?: number | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      favorite_hotels: {
        Row: {
          created_at: string | null;
          hotel_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          hotel_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          hotel_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'favorite_hotels_hotel_id_fkey';
            columns: ['hotel_id'];
            isOneToOne: false;
            referencedRelation: 'hotels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'favorite_hotels_hotel_id_fkey';
            columns: ['hotel_id'];
            isOneToOne: false;
            referencedRelation: 'v_hotels_search';
            referencedColumns: ['id'];
          },
        ];
      };
      file_metadata: {
        Row: {
          access_level: string;
          created_at: string | null;
          entity_id: string;
          entity_type: string;
          expires_at: string | null;
          id: string;
          metadata: Json | null;
          mime_type: string;
          original_name: string;
          processing_results: Json | null;
          size_bytes: number;
          status: string;
          storage_path: string;
          tags: string[] | null;
          updated_at: string | null;
          uploaded_by: string | null;
        };
        Insert: {
          access_level?: string;
          created_at?: string | null;
          entity_id: string;
          entity_type: string;
          expires_at?: string | null;
          id?: string;
          metadata?: Json | null;
          mime_type: string;
          original_name: string;
          processing_results?: Json | null;
          size_bytes: number;
          status?: string;
          storage_path: string;
          tags?: string[] | null;
          updated_at?: string | null;
          uploaded_by?: string | null;
        };
        Update: {
          access_level?: string;
          created_at?: string | null;
          entity_id?: string;
          entity_type?: string;
          expires_at?: string | null;
          id?: string;
          metadata?: Json | null;
          mime_type?: string;
          original_name?: string;
          processing_results?: Json | null;
          size_bytes?: number;
          status?: string;
          storage_path?: string;
          tags?: string[] | null;
          updated_at?: string | null;
          uploaded_by?: string | null;
        };
        Relationships: [];
      };
      host_profiles: {
        Row: {
          business_name: string | null;
          created_at: string | null;
          description: string | null;
          host_type: string | null;
          id: string;
          is_verified: boolean | null;
          rating: number | null;
          response_rate: number | null;
          response_time: number | null;
          subscription_tier: string | null;
          total_bookings: number | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          business_name?: string | null;
          created_at?: string | null;
          description?: string | null;
          host_type?: string | null;
          id?: string;
          is_verified?: boolean | null;
          rating?: number | null;
          response_rate?: number | null;
          response_time?: number | null;
          subscription_tier?: string | null;
          total_bookings?: number | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          business_name?: string | null;
          created_at?: string | null;
          description?: string | null;
          host_type?: string | null;
          id?: string;
          is_verified?: boolean | null;
          rating?: number | null;
          response_rate?: number | null;
          response_time?: number | null;
          subscription_tier?: string | null;
          total_bookings?: number | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      hotel_amenities: {
        Row: {
          category: string | null;
          created_at: string | null;
          description: string | null;
          icon: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          slug: string;
        };
        Insert: {
          category?: string | null;
          created_at?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          slug: string;
        };
        Update: {
          category?: string | null;
          created_at?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      hotel_amenity_mappings: {
        Row: {
          amenity_id: string;
          created_at: string | null;
          hotel_id: string;
        };
        Insert: {
          amenity_id: string;
          created_at?: string | null;
          hotel_id: string;
        };
        Update: {
          amenity_id?: string;
          created_at?: string | null;
          hotel_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'hotel_amenity_mappings_amenity_id_fkey';
            columns: ['amenity_id'];
            isOneToOne: false;
            referencedRelation: 'hotel_amenities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hotel_amenity_mappings_hotel_id_fkey';
            columns: ['hotel_id'];
            isOneToOne: false;
            referencedRelation: 'hotels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hotel_amenity_mappings_hotel_id_fkey';
            columns: ['hotel_id'];
            isOneToOne: false;
            referencedRelation: 'v_hotels_search';
            referencedColumns: ['id'];
          },
        ];
      };
      hotel_booking_status_history: {
        Row: {
          booking_id: string;
          changed_by: string | null;
          created_at: string | null;
          from_status: string | null;
          id: string;
          notes: string | null;
          to_status: string;
        };
        Insert: {
          booking_id: string;
          changed_by?: string | null;
          created_at?: string | null;
          from_status?: string | null;
          id?: string;
          notes?: string | null;
          to_status: string;
        };
        Update: {
          booking_id?: string;
          changed_by?: string | null;
          created_at?: string | null;
          from_status?: string | null;
          id?: string;
          notes?: string | null;
          to_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'hotel_booking_status_history_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'hotel_bookings';
            referencedColumns: ['id'];
          },
        ];
      };
      hotel_bookings: {
        Row: {
          booking_number: string;
          booking_status: string | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          check_in_date: string;
          check_out_date: string;
          checked_in_at: string | null;
          checked_out_at: string | null;
          created_at: string | null;
          discount_amount: number | null;
          estimated_arrival_time: string | null;
          guest_count: Json;
          guest_email: string;
          guest_name: string;
          guest_phone: string;
          hotel_id: string;
          id: string;
          number_of_nights: number;
          number_of_rooms: number;
          payment_status: string | null;
          promo_code: string | null;
          promo_code_id: string | null;
          purpose_of_visit: string | null;
          room_id: string | null;
          room_rate: number;
          room_type_id: string;
          service_fee: number | null;
          special_requests: string | null;
          subtotal: number;
          tax_amount: number | null;
          total_amount: number;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          booking_number: string;
          booking_status?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          check_in_date: string;
          check_out_date: string;
          checked_in_at?: string | null;
          checked_out_at?: string | null;
          created_at?: string | null;
          discount_amount?: number | null;
          estimated_arrival_time?: string | null;
          guest_count: Json;
          guest_email: string;
          guest_name: string;
          guest_phone: string;
          hotel_id: string;
          id?: string;
          number_of_nights: number;
          number_of_rooms?: number;
          payment_status?: string | null;
          promo_code?: string | null;
          promo_code_id?: string | null;
          purpose_of_visit?: string | null;
          room_id?: string | null;
          room_rate: number;
          room_type_id: string;
          service_fee?: number | null;
          special_requests?: string | null;
          subtotal: number;
          tax_amount?: number | null;
          total_amount: number;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          booking_number?: string;
          booking_status?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          check_in_date?: string;
          check_out_date?: string;
          checked_in_at?: string | null;
          checked_out_at?: string | null;
          created_at?: string | null;
          discount_amount?: number | null;
          estimated_arrival_time?: string | null;
          guest_count?: Json;
          guest_email?: string;
          guest_name?: string;
          guest_phone?: string;
          hotel_id?: string;
          id?: string;
          number_of_nights?: number;
          number_of_rooms?: number;
          payment_status?: string | null;
          promo_code?: string | null;
          promo_code_id?: string | null;
          purpose_of_visit?: string | null;
          room_id?: string | null;
          room_rate?: number;
          room_type_id?: string;
          service_fee?: number | null;
          special_requests?: string | null;
          subtotal?: number;
          tax_amount?: number | null;
          total_amount?: number;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'hotel_bookings_hotel_id_fkey';
            columns: ['hotel_id'];
            isOneToOne: false;
            referencedRelation: 'hotels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hotel_bookings_hotel_id_fkey';
            columns: ['hotel_id'];
            isOneToOne: false;
            referencedRelation: 'v_hotels_search';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hotel_bookings_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hotel_bookings_room_type_id_fkey';
            columns: ['room_type_id'];
            isOneToOne: false;
            referencedRelation: 'room_types';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hotel_bookings_room_type_id_fkey';
            columns: ['room_type_id'];
            isOneToOne: false;
            referencedRelation: 'v_room_availability_summary';
            referencedColumns: ['room_type_id'];
          },
        ];
      };
      hotel_photos: {
        Row: {
          caption: string | null;
          created_at: string | null;
          display_order: number | null;
          hotel_id: string;
          id: string;
          is_featured: boolean | null;
          photo_type: string | null;
          room_type_id: string | null;
          uploaded_by: string | null;
          url: string;
        };
        Insert: {
          caption?: string | null;
          created_at?: string | null;
          display_order?: number | null;
          hotel_id: string;
          id?: string;
          is_featured?: boolean | null;
          photo_type?: string | null;
          room_type_id?: string | null;
          uploaded_by?: string | null;
          url: string;
        };
        Update: {
          caption?: string | null;
          created_at?: string | null;
          display_order?: number | null;
          hotel_id?: string;
          id?: string;
          is_featured?: boolean | null;
          photo_type?: string | null;
          room_type_id?: string | null;
          uploaded_by?: string | null;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'hotel_photos_hotel_id_fkey';
            columns: ['hotel_id'];
            isOneToOne: false;
            referencedRelation: 'hotels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hotel_photos_hotel_id_fkey';
            columns: ['hotel_id'];
            isOneToOne: false;
            referencedRelation: 'v_hotels_search';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hotel_photos_room_type_id_fkey';
            columns: ['room_type_id'];
            isOneToOne: false;
            referencedRelation: 'room_types';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hotel_photos_room_type_id_fkey';
            columns: ['room_type_id'];
            isOneToOne: false;
            referencedRelation: 'v_room_availability_summary';
            referencedColumns: ['room_type_id'];
          },
        ];
      };
      hotel_promo_code_usage: {
        Row: {
          booking_id: string;
          discount_amount: number;
          id: string;
          promo_code_id: string;
          used_at: string | null;
          user_id: string;
        };
        Insert: {
          booking_id: string;
          discount_amount: number;
          id?: string;
          promo_code_id: string;
          used_at?: string | null;
          user_id: string;
        };
        Update: {
          booking_id?: string;
          discount_amount?: number;
          id?: string;
          promo_code_id?: string;
          used_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'hotel_promo_code_usage_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'hotel_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hotel_promo_code_usage_promo_code_id_fkey';
            columns: ['promo_code_id'];
            isOneToOne: false;
            referencedRelation: 'hotel_promo_codes';
            referencedColumns: ['id'];
          },
        ];
      };
      hotel_promo_codes: {
        Row: {
          applicable_hotels: string[] | null;
          applicable_room_types: string[] | null;
          applies_to_weekends_only: boolean | null;
          code: string;
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          discount_type: string;
          discount_value: number;
          excluded_hotels: string[] | null;
          first_booking_only: boolean | null;
          id: string;
          is_active: boolean | null;
          max_discount_amount: number | null;
          min_nights: number | null;
          min_order_amount: number | null;
          per_user_limit: number | null;
          requires_early_booking_days: number | null;
          updated_at: string | null;
          usage_count: number | null;
          usage_limit: number | null;
          valid_from: string | null;
          valid_until: string | null;
        };
        Insert: {
          applicable_hotels?: string[] | null;
          applicable_room_types?: string[] | null;
          applies_to_weekends_only?: boolean | null;
          code: string;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          discount_type: string;
          discount_value: number;
          excluded_hotels?: string[] | null;
          first_booking_only?: boolean | null;
          id?: string;
          is_active?: boolean | null;
          max_discount_amount?: number | null;
          min_nights?: number | null;
          min_order_amount?: number | null;
          per_user_limit?: number | null;
          requires_early_booking_days?: number | null;
          updated_at?: string | null;
          usage_count?: number | null;
          usage_limit?: number | null;
          valid_from?: string | null;
          valid_until?: string | null;
        };
        Update: {
          applicable_hotels?: string[] | null;
          applicable_room_types?: string[] | null;
          applies_to_weekends_only?: boolean | null;
          code?: string;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          discount_type?: string;
          discount_value?: number;
          excluded_hotels?: string[] | null;
          first_booking_only?: boolean | null;
          id?: string;
          is_active?: boolean | null;
          max_discount_amount?: number | null;
          min_nights?: number | null;
          min_order_amount?: number | null;
          per_user_limit?: number | null;
          requires_early_booking_days?: number | null;
          updated_at?: string | null;
          usage_count?: number | null;
          usage_limit?: number | null;
          valid_from?: string | null;
          valid_until?: string | null;
        };
        Relationships: [];
      };
      hotel_reviews: {
        Row: {
          booking_id: string;
          cleanliness_rating: number | null;
          comfort_rating: number | null;
          comment: string | null;
          created_at: string | null;
          helpful_count: number | null;
          hotel_id: string;
          id: string;
          images: string[] | null;
          is_approved: boolean | null;
          is_featured: boolean | null;
          is_verified: boolean | null;
          location_rating: number | null;
          rating: number;
          responded_at: string | null;
          response_from_host: string | null;
          service_rating: number | null;
          title: string | null;
          updated_at: string | null;
          user_id: string;
          value_rating: number | null;
        };
        Insert: {
          booking_id: string;
          cleanliness_rating?: number | null;
          comfort_rating?: number | null;
          comment?: string | null;
          created_at?: string | null;
          helpful_count?: number | null;
          hotel_id: string;
          id?: string;
          images?: string[] | null;
          is_approved?: boolean | null;
          is_featured?: boolean | null;
          is_verified?: boolean | null;
          location_rating?: number | null;
          rating: number;
          responded_at?: string | null;
          response_from_host?: string | null;
          service_rating?: number | null;
          title?: string | null;
          updated_at?: string | null;
          user_id: string;
          value_rating?: number | null;
        };
        Update: {
          booking_id?: string;
          cleanliness_rating?: number | null;
          comfort_rating?: number | null;
          comment?: string | null;
          created_at?: string | null;
          helpful_count?: number | null;
          hotel_id?: string;
          id?: string;
          images?: string[] | null;
          is_approved?: boolean | null;
          is_featured?: boolean | null;
          is_verified?: boolean | null;
          location_rating?: number | null;
          rating?: number;
          responded_at?: string | null;
          response_from_host?: string | null;
          service_rating?: number | null;
          title?: string | null;
          updated_at?: string | null;
          user_id?: string;
          value_rating?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'hotel_reviews_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'hotel_bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hotel_reviews_hotel_id_fkey';
            columns: ['hotel_id'];
            isOneToOne: false;
            referencedRelation: 'hotels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'hotel_reviews_hotel_id_fkey';
            columns: ['hotel_id'];
            isOneToOne: false;
            referencedRelation: 'v_hotels_search';
            referencedColumns: ['id'];
          },
        ];
      };
      hotels: {
        Row: {
          address: string;
          amenities: string[] | null;
          average_rating: number | null;
          cancellation_policy: string | null;
          check_in_time: string;
          check_out_time: string;
          city: string;
          country: string;
          created_at: string | null;
          description: string | null;
          email: string | null;
          featured_image: string | null;
          host_id: string;
          house_rules: string | null;
          id: string;
          images: string[] | null;
          is_active: boolean | null;
          is_verified: boolean | null;
          latitude: number | null;
          location: unknown;
          longitude: number | null;
          name: string;
          nearby_attractions: Json | null;
          phone: string | null;
          policies: Json | null;
          postal_code: string | null;
          short_description: string | null;
          slug: string;
          star_rating: number | null;
          state: string | null;
          total_bookings: number | null;
          total_reviews: number | null;
          updated_at: string | null;
          verified_at: string | null;
          video_url: string | null;
          website: string | null;
        };
        Insert: {
          address: string;
          amenities?: string[] | null;
          average_rating?: number | null;
          cancellation_policy?: string | null;
          check_in_time?: string;
          check_out_time?: string;
          city: string;
          country: string;
          created_at?: string | null;
          description?: string | null;
          email?: string | null;
          featured_image?: string | null;
          host_id: string;
          house_rules?: string | null;
          id?: string;
          images?: string[] | null;
          is_active?: boolean | null;
          is_verified?: boolean | null;
          latitude?: number | null;
          location?: unknown;
          longitude?: number | null;
          name: string;
          nearby_attractions?: Json | null;
          phone?: string | null;
          policies?: Json | null;
          postal_code?: string | null;
          short_description?: string | null;
          slug: string;
          star_rating?: number | null;
          state?: string | null;
          total_bookings?: number | null;
          total_reviews?: number | null;
          updated_at?: string | null;
          verified_at?: string | null;
          video_url?: string | null;
          website?: string | null;
        };
        Update: {
          address?: string;
          amenities?: string[] | null;
          average_rating?: number | null;
          cancellation_policy?: string | null;
          check_in_time?: string;
          check_out_time?: string;
          city?: string;
          country?: string;
          created_at?: string | null;
          description?: string | null;
          email?: string | null;
          featured_image?: string | null;
          host_id?: string;
          house_rules?: string | null;
          id?: string;
          images?: string[] | null;
          is_active?: boolean | null;
          is_verified?: boolean | null;
          latitude?: number | null;
          location?: unknown;
          longitude?: number | null;
          name?: string;
          nearby_attractions?: Json | null;
          phone?: string | null;
          policies?: Json | null;
          postal_code?: string | null;
          short_description?: string | null;
          slug?: string;
          star_rating?: number | null;
          state?: string | null;
          total_bookings?: number | null;
          total_reviews?: number | null;
          updated_at?: string | null;
          verified_at?: string | null;
          video_url?: string | null;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'hotels_host_id_fkey';
            columns: ['host_id'];
            isOneToOne: false;
            referencedRelation: 'host_profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      in_app_notifications: {
        Row: {
          action_text: string | null;
          action_url: string | null;
          category: string | null;
          created_at: string | null;
          expires_at: string | null;
          id: string;
          is_read: boolean | null;
          message: string;
          metadata: Json | null;
          read_at: string | null;
          title: string;
          type: string;
          user_id: string | null;
        };
        Insert: {
          action_text?: string | null;
          action_url?: string | null;
          category?: string | null;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          message: string;
          metadata?: Json | null;
          read_at?: string | null;
          title: string;
          type: string;
          user_id?: string | null;
        };
        Update: {
          action_text?: string | null;
          action_url?: string | null;
          category?: string | null;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          message?: string;
          metadata?: Json | null;
          read_at?: string | null;
          title?: string;
          type?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      marketplace_promo_code_usage: {
        Row: {
          discount_amount: number;
          id: string;
          order_id: string | null;
          promo_code_id: string | null;
          used_at: string | null;
          user_id: string | null;
        };
        Insert: {
          discount_amount: number;
          id?: string;
          order_id?: string | null;
          promo_code_id?: string | null;
          used_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          discount_amount?: number;
          id?: string;
          order_id?: string | null;
          promo_code_id?: string | null;
          used_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ecommerce_promo_code_usage_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'ecommerce_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ecommerce_promo_code_usage_promo_code_id_fkey';
            columns: ['promo_code_id'];
            isOneToOne: false;
            referencedRelation: 'marketplace_promo_codes';
            referencedColumns: ['id'];
          },
        ];
      };
      marketplace_promo_codes: {
        Row: {
          applicable_categories: string[] | null;
          applicable_products: string[] | null;
          applicable_vendors: string[] | null;
          code: string;
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          discount_type: string | null;
          discount_value: number;
          excluded_products: string[] | null;
          free_shipping: boolean | null;
          id: string;
          is_active: boolean | null;
          max_discount_amount: number | null;
          min_order_amount: number | null;
          per_user_limit: number | null;
          updated_at: string | null;
          usage_count: number | null;
          usage_limit: number | null;
          valid_from: string | null;
          valid_until: string | null;
        };
        Insert: {
          applicable_categories?: string[] | null;
          applicable_products?: string[] | null;
          applicable_vendors?: string[] | null;
          code: string;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          discount_type?: string | null;
          discount_value: number;
          excluded_products?: string[] | null;
          free_shipping?: boolean | null;
          id?: string;
          is_active?: boolean | null;
          max_discount_amount?: number | null;
          min_order_amount?: number | null;
          per_user_limit?: number | null;
          updated_at?: string | null;
          usage_count?: number | null;
          usage_limit?: number | null;
          valid_from?: string | null;
          valid_until?: string | null;
        };
        Update: {
          applicable_categories?: string[] | null;
          applicable_products?: string[] | null;
          applicable_vendors?: string[] | null;
          code?: string;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          discount_type?: string | null;
          discount_value?: number;
          excluded_products?: string[] | null;
          free_shipping?: boolean | null;
          id?: string;
          is_active?: boolean | null;
          max_discount_amount?: number | null;
          min_order_amount?: number | null;
          per_user_limit?: number | null;
          updated_at?: string | null;
          usage_count?: number | null;
          usage_limit?: number | null;
          valid_from?: string | null;
          valid_until?: string | null;
        };
        Relationships: [];
      };
      module_commission_rates: {
        Row: {
          apply_tax_before_commission: boolean | null;
          commission_type: string;
          commission_value: number;
          created_at: string | null;
          created_by: string | null;
          id: string;
          is_active: boolean | null;
          min_transaction_amount: number | null;
          module_name: string;
          tiered_rates: Json | null;
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: {
          apply_tax_before_commission?: boolean | null;
          commission_type?: string;
          commission_value: number;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          is_active?: boolean | null;
          min_transaction_amount?: number | null;
          module_name: string;
          tiered_rates?: Json | null;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Update: {
          apply_tax_before_commission?: boolean | null;
          commission_type?: string;
          commission_value?: number;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          is_active?: boolean | null;
          min_transaction_amount?: number | null;
          module_name?: string;
          tiered_rates?: Json | null;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      notification_analytics: {
        Row: {
          bounced_count: number | null;
          channel: string;
          click_rate: number | null;
          clicked_count: number | null;
          created_at: string | null;
          date: string;
          delivered_count: number | null;
          delivery_rate: number | null;
          failed_count: number | null;
          id: string;
          open_rate: number | null;
          opened_count: number | null;
          sent_count: number | null;
          template_name: string;
        };
        Insert: {
          bounced_count?: number | null;
          channel: string;
          click_rate?: number | null;
          clicked_count?: number | null;
          created_at?: string | null;
          date: string;
          delivered_count?: number | null;
          delivery_rate?: number | null;
          failed_count?: number | null;
          id?: string;
          open_rate?: number | null;
          opened_count?: number | null;
          sent_count?: number | null;
          template_name: string;
        };
        Update: {
          bounced_count?: number | null;
          channel?: string;
          click_rate?: number | null;
          clicked_count?: number | null;
          created_at?: string | null;
          date?: string;
          delivered_count?: number | null;
          delivery_rate?: number | null;
          failed_count?: number | null;
          id?: string;
          open_rate?: number | null;
          opened_count?: number | null;
          sent_count?: number | null;
          template_name?: string;
        };
        Relationships: [];
      };
      notification_logs: {
        Row: {
          channels: string[];
          content: string | null;
          created_at: string | null;
          delivered_at: string | null;
          email_provider: string | null;
          email_provider_id: string | null;
          email_status: string | null;
          error_message: string | null;
          failed_at: string | null;
          id: string;
          metadata: Json | null;
          push_status: string | null;
          recipient_device_token: string | null;
          recipient_email: string | null;
          recipient_phone: string | null;
          retry_count: number | null;
          sent_at: string | null;
          sms_provider: string | null;
          sms_provider_id: string | null;
          sms_status: string | null;
          status: string;
          subject: string | null;
          template_id: string | null;
          template_name: string | null;
          user_id: string | null;
        };
        Insert: {
          channels: string[];
          content?: string | null;
          created_at?: string | null;
          delivered_at?: string | null;
          email_provider?: string | null;
          email_provider_id?: string | null;
          email_status?: string | null;
          error_message?: string | null;
          failed_at?: string | null;
          id?: string;
          metadata?: Json | null;
          push_status?: string | null;
          recipient_device_token?: string | null;
          recipient_email?: string | null;
          recipient_phone?: string | null;
          retry_count?: number | null;
          sent_at?: string | null;
          sms_provider?: string | null;
          sms_provider_id?: string | null;
          sms_status?: string | null;
          status?: string;
          subject?: string | null;
          template_id?: string | null;
          template_name?: string | null;
          user_id?: string | null;
        };
        Update: {
          channels?: string[];
          content?: string | null;
          created_at?: string | null;
          delivered_at?: string | null;
          email_provider?: string | null;
          email_provider_id?: string | null;
          email_status?: string | null;
          error_message?: string | null;
          failed_at?: string | null;
          id?: string;
          metadata?: Json | null;
          push_status?: string | null;
          recipient_device_token?: string | null;
          recipient_email?: string | null;
          recipient_phone?: string | null;
          retry_count?: number | null;
          sent_at?: string | null;
          sms_provider?: string | null;
          sms_provider_id?: string | null;
          sms_status?: string | null;
          status?: string;
          subject?: string | null;
          template_id?: string | null;
          template_name?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_logs_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'notification_templates';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_preferences: {
        Row: {
          category_preferences: Json | null;
          created_at: string | null;
          email_enabled: boolean | null;
          global_opt_out: boolean | null;
          id: string;
          in_app_enabled: boolean | null;
          language: string | null;
          push_enabled: boolean | null;
          quiet_hours_enabled: boolean | null;
          quiet_hours_end: string | null;
          quiet_hours_start: string | null;
          sms_enabled: boolean | null;
          timezone: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          category_preferences?: Json | null;
          created_at?: string | null;
          email_enabled?: boolean | null;
          global_opt_out?: boolean | null;
          id?: string;
          in_app_enabled?: boolean | null;
          language?: string | null;
          push_enabled?: boolean | null;
          quiet_hours_enabled?: boolean | null;
          quiet_hours_end?: string | null;
          quiet_hours_start?: string | null;
          sms_enabled?: boolean | null;
          timezone?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          category_preferences?: Json | null;
          created_at?: string | null;
          email_enabled?: boolean | null;
          global_opt_out?: boolean | null;
          id?: string;
          in_app_enabled?: boolean | null;
          language?: string | null;
          push_enabled?: boolean | null;
          quiet_hours_enabled?: boolean | null;
          quiet_hours_end?: string | null;
          quiet_hours_start?: string | null;
          sms_enabled?: boolean | null;
          timezone?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      notification_queue: {
        Row: {
          attempts: number | null;
          created_at: string | null;
          error_message: string | null;
          failed_at: string | null;
          id: string;
          max_attempts: number | null;
          metadata: Json | null;
          notification_log_id: string | null;
          picked_at: string | null;
          priority: number | null;
          process_after: string | null;
          processed_at: string | null;
          recipient_device_token: string | null;
          recipient_email: string | null;
          recipient_phone: string | null;
          scheduled_at: string | null;
          status: string | null;
          template_name: string;
          user_id: string | null;
          variables: Json;
        };
        Insert: {
          attempts?: number | null;
          created_at?: string | null;
          error_message?: string | null;
          failed_at?: string | null;
          id?: string;
          max_attempts?: number | null;
          metadata?: Json | null;
          notification_log_id?: string | null;
          picked_at?: string | null;
          priority?: number | null;
          process_after?: string | null;
          processed_at?: string | null;
          recipient_device_token?: string | null;
          recipient_email?: string | null;
          recipient_phone?: string | null;
          scheduled_at?: string | null;
          status?: string | null;
          template_name: string;
          user_id?: string | null;
          variables: Json;
        };
        Update: {
          attempts?: number | null;
          created_at?: string | null;
          error_message?: string | null;
          failed_at?: string | null;
          id?: string;
          max_attempts?: number | null;
          metadata?: Json | null;
          notification_log_id?: string | null;
          picked_at?: string | null;
          priority?: number | null;
          process_after?: string | null;
          processed_at?: string | null;
          recipient_device_token?: string | null;
          recipient_email?: string | null;
          recipient_phone?: string | null;
          scheduled_at?: string | null;
          status?: string | null;
          template_name?: string;
          user_id?: string | null;
          variables?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_queue_notification_log_id_fkey';
            columns: ['notification_log_id'];
            isOneToOne: false;
            referencedRelation: 'notification_logs';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_templates: {
        Row: {
          category: string;
          channels: string[];
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          email_body: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          optional_variables: string[] | null;
          push_body: string | null;
          push_title: string | null;
          required_variables: string[] | null;
          sms_body: string | null;
          subject: string | null;
          updated_at: string | null;
          version: number | null;
        };
        Insert: {
          category: string;
          channels: string[];
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          email_body?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          optional_variables?: string[] | null;
          push_body?: string | null;
          push_title?: string | null;
          required_variables?: string[] | null;
          sms_body?: string | null;
          subject?: string | null;
          updated_at?: string | null;
          version?: number | null;
        };
        Update: {
          category?: string;
          channels?: string[];
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          email_body?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          optional_variables?: string[] | null;
          push_body?: string | null;
          push_title?: string | null;
          required_variables?: string[] | null;
          sms_body?: string | null;
          subject?: string | null;
          updated_at?: string | null;
          version?: number | null;
        };
        Relationships: [];
      };
      payment_provider_config: {
        Row: {
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          is_test_mode: boolean | null;
          priority: number | null;
          provider_name: string;
          public_key: string;
          secret_key: string;
          settings: Json | null;
          supported_methods: string[] | null;
          updated_at: string | null;
          webhook_secret: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_test_mode?: boolean | null;
          priority?: number | null;
          provider_name: string;
          public_key: string;
          secret_key: string;
          settings?: Json | null;
          supported_methods?: string[] | null;
          updated_at?: string | null;
          webhook_secret: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_test_mode?: boolean | null;
          priority?: number | null;
          provider_name?: string;
          public_key?: string;
          secret_key?: string;
          settings?: Json | null;
          supported_methods?: string[] | null;
          updated_at?: string | null;
          webhook_secret?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          account_number_last4: string | null;
          amount: number;
          bank_name: string | null;
          card_brand: string | null;
          card_last4: string | null;
          card_type: string | null;
          created_at: string | null;
          currency: string;
          expires_at: string | null;
          id: string;
          ip_address: unknown;
          is_escrowed: boolean | null;
          metadata: Json | null;
          paid_at: string | null;
          payment_method: string;
          payment_provider: string;
          payment_status: string;
          payment_type: string;
          provider_reference: string | null;
          provider_transaction_id: string | null;
          reference_id: string;
          refund_amount: number | null;
          refund_reason: string | null;
          refund_transaction_id: string | null;
          refunded_at: string | null;
          transaction_id: string;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          account_number_last4?: string | null;
          amount: number;
          bank_name?: string | null;
          card_brand?: string | null;
          card_last4?: string | null;
          card_type?: string | null;
          created_at?: string | null;
          currency?: string;
          expires_at?: string | null;
          id?: string;
          ip_address?: unknown;
          is_escrowed?: boolean | null;
          metadata?: Json | null;
          paid_at?: string | null;
          payment_method: string;
          payment_provider: string;
          payment_status?: string;
          payment_type: string;
          provider_reference?: string | null;
          provider_transaction_id?: string | null;
          reference_id: string;
          refund_amount?: number | null;
          refund_reason?: string | null;
          refund_transaction_id?: string | null;
          refunded_at?: string | null;
          transaction_id: string;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          account_number_last4?: string | null;
          amount?: number;
          bank_name?: string | null;
          card_brand?: string | null;
          card_last4?: string | null;
          card_type?: string | null;
          created_at?: string | null;
          currency?: string;
          expires_at?: string | null;
          id?: string;
          ip_address?: unknown;
          is_escrowed?: boolean | null;
          metadata?: Json | null;
          paid_at?: string | null;
          payment_method?: string;
          payment_provider?: string;
          payment_status?: string;
          payment_type?: string;
          provider_reference?: string | null;
          provider_transaction_id?: string | null;
          reference_id?: string;
          refund_amount?: number | null;
          refund_reason?: string | null;
          refund_transaction_id?: string | null;
          refunded_at?: string | null;
          transaction_id?: string;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      platform_promo_code_usage: {
        Row: {
          discount_amount: number;
          id: string;
          promo_code_id: string;
          reference_id: string;
          service_type: string;
          used_at: string | null;
          user_id: string;
        };
        Insert: {
          discount_amount: number;
          id?: string;
          promo_code_id: string;
          reference_id: string;
          service_type: string;
          used_at?: string | null;
          user_id: string;
        };
        Update: {
          discount_amount?: number;
          id?: string;
          promo_code_id?: string;
          reference_id?: string;
          service_type?: string;
          used_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'platform_promo_code_usage_promo_code_id_fkey';
            columns: ['promo_code_id'];
            isOneToOne: false;
            referencedRelation: 'platform_promo_codes';
            referencedColumns: ['id'];
          },
        ];
      };
      platform_promo_codes: {
        Row: {
          applicable_services: string[] | null;
          campaign_id: string | null;
          campaign_name: string | null;
          code: string;
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          discount_type: string;
          discount_value: number;
          first_purchase_only: boolean | null;
          id: string;
          is_active: boolean | null;
          max_discount_amount: number | null;
          min_order_amount: number | null;
          new_users_only: boolean | null;
          per_user_limit: number | null;
          updated_at: string | null;
          usage_count: number | null;
          usage_limit: number | null;
          valid_from: string | null;
          valid_until: string | null;
        };
        Insert: {
          applicable_services?: string[] | null;
          campaign_id?: string | null;
          campaign_name?: string | null;
          code: string;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          discount_type: string;
          discount_value: number;
          first_purchase_only?: boolean | null;
          id?: string;
          is_active?: boolean | null;
          max_discount_amount?: number | null;
          min_order_amount?: number | null;
          new_users_only?: boolean | null;
          per_user_limit?: number | null;
          updated_at?: string | null;
          usage_count?: number | null;
          usage_limit?: number | null;
          valid_from?: string | null;
          valid_until?: string | null;
        };
        Update: {
          applicable_services?: string[] | null;
          campaign_id?: string | null;
          campaign_name?: string | null;
          code?: string;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          discount_type?: string;
          discount_value?: number;
          first_purchase_only?: boolean | null;
          id?: string;
          is_active?: boolean | null;
          max_discount_amount?: number | null;
          min_order_amount?: number | null;
          new_users_only?: boolean | null;
          per_user_limit?: number | null;
          updated_at?: string | null;
          usage_count?: number | null;
          usage_limit?: number | null;
          valid_from?: string | null;
          valid_until?: string | null;
        };
        Relationships: [];
      };
      platform_revenue: {
        Row: {
          commission_amount: number;
          created_at: string | null;
          escrow_id: string;
          gross_amount: number;
          id: string;
          module_name: string;
          payment_id: string;
          revenue_date: string;
          tax_collected: number | null;
        };
        Insert: {
          commission_amount: number;
          created_at?: string | null;
          escrow_id: string;
          gross_amount: number;
          id?: string;
          module_name: string;
          payment_id: string;
          revenue_date?: string;
          tax_collected?: number | null;
        };
        Update: {
          commission_amount?: number;
          created_at?: string | null;
          escrow_id?: string;
          gross_amount?: number;
          id?: string;
          module_name?: string;
          payment_id?: string;
          revenue_date?: string;
          tax_collected?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'platform_revenue_escrow_id_fkey';
            columns: ['escrow_id'];
            isOneToOne: false;
            referencedRelation: 'escrow_transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'platform_revenue_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'payments';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          email: string | null;
          full_name: string | null;
          id: string;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string | null;
          full_name?: string | null;
          id: string;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      refund_policies: {
        Row: {
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          module_name: string;
          non_refundable_exceptions: string[] | null;
          refund_processing_days: number | null;
          refund_tiers: Json;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          module_name: string;
          non_refundable_exceptions?: string[] | null;
          refund_processing_days?: number | null;
          refund_tiers: Json;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          module_name?: string;
          non_refundable_exceptions?: string[] | null;
          refund_processing_days?: number | null;
          refund_tiers?: Json;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      rides: {
        Row: {
          base_fare: number;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          created_at: string | null;
          discount_amount: number | null;
          distance_fare: number | null;
          distance_km: number | null;
          driver_id: string;
          driver_notes: string | null;
          dropoff_address: string | null;
          dropoff_location: Json;
          dropoff_time: string | null;
          estimated_duration_minutes: number | null;
          final_amount: number;
          id: string;
          passenger_id: string;
          passenger_notes: string | null;
          payment_status: string | null;
          pickup_address: string | null;
          pickup_location: Json;
          pickup_time: string | null;
          rating: number | null;
          review_comment: string | null;
          ride_number: string;
          status: string | null;
          surge_multiplier: number | null;
          time_fare: number | null;
          total_fare: number;
          updated_at: string | null;
        };
        Insert: {
          base_fare: number;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          created_at?: string | null;
          discount_amount?: number | null;
          distance_fare?: number | null;
          distance_km?: number | null;
          driver_id: string;
          driver_notes?: string | null;
          dropoff_address?: string | null;
          dropoff_location: Json;
          dropoff_time?: string | null;
          estimated_duration_minutes?: number | null;
          final_amount: number;
          id?: string;
          passenger_id: string;
          passenger_notes?: string | null;
          payment_status?: string | null;
          pickup_address?: string | null;
          pickup_location: Json;
          pickup_time?: string | null;
          rating?: number | null;
          review_comment?: string | null;
          ride_number: string;
          status?: string | null;
          surge_multiplier?: number | null;
          time_fare?: number | null;
          total_fare: number;
          updated_at?: string | null;
        };
        Update: {
          base_fare?: number;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          created_at?: string | null;
          discount_amount?: number | null;
          distance_fare?: number | null;
          distance_km?: number | null;
          driver_id?: string;
          driver_notes?: string | null;
          dropoff_address?: string | null;
          dropoff_location?: Json;
          dropoff_time?: string | null;
          estimated_duration_minutes?: number | null;
          final_amount?: number;
          id?: string;
          passenger_id?: string;
          passenger_notes?: string | null;
          payment_status?: string | null;
          pickup_address?: string | null;
          pickup_location?: Json;
          pickup_time?: string | null;
          rating?: number | null;
          review_comment?: string | null;
          ride_number?: string;
          status?: string | null;
          surge_multiplier?: number | null;
          time_fare?: number | null;
          total_fare?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'rides_driver_id_fkey';
            columns: ['driver_id'];
            isOneToOne: false;
            referencedRelation: 'driver_profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      role_applications: {
        Row: {
          application_data: Json | null;
          created_at: string | null;
          document_urls: string[] | null;
          id: string;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          role_name: string;
          status: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          application_data?: Json | null;
          created_at?: string | null;
          document_urls?: string[] | null;
          id?: string;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          role_name: string;
          status?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          application_data?: Json | null;
          created_at?: string | null;
          document_urls?: string[] | null;
          id?: string;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          role_name?: string;
          status?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      room_availability: {
        Row: {
          available_rooms: number;
          base_price: number | null;
          block_reason: string | null;
          created_at: string | null;
          date: string;
          dynamic_price: number | null;
          id: string;
          is_blocked: boolean | null;
          minimum_stay: number | null;
          room_type_id: string;
          updated_at: string | null;
        };
        Insert: {
          available_rooms?: number;
          base_price?: number | null;
          block_reason?: string | null;
          created_at?: string | null;
          date: string;
          dynamic_price?: number | null;
          id?: string;
          is_blocked?: boolean | null;
          minimum_stay?: number | null;
          room_type_id: string;
          updated_at?: string | null;
        };
        Update: {
          available_rooms?: number;
          base_price?: number | null;
          block_reason?: string | null;
          created_at?: string | null;
          date?: string;
          dynamic_price?: number | null;
          id?: string;
          is_blocked?: boolean | null;
          minimum_stay?: number | null;
          room_type_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'room_availability_room_type_id_fkey';
            columns: ['room_type_id'];
            isOneToOne: false;
            referencedRelation: 'room_types';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'room_availability_room_type_id_fkey';
            columns: ['room_type_id'];
            isOneToOne: false;
            referencedRelation: 'v_room_availability_summary';
            referencedColumns: ['room_type_id'];
          },
        ];
      };
      room_types: {
        Row: {
          allows_pets: boolean | null;
          allows_smoking: boolean | null;
          amenities: string[] | null;
          base_price: number;
          bed_type: string | null;
          beds_count: number;
          breakfast_included: boolean | null;
          cancellation_hours: number | null;
          capacity: number;
          created_at: string | null;
          description: string | null;
          display_order: number | null;
          hotel_id: string;
          id: string;
          images: string[] | null;
          is_active: boolean | null;
          max_adults: number;
          max_children: number | null;
          name: string;
          refundable: boolean | null;
          room_size_sqft: number | null;
          seasonal_prices: Json | null;
          slug: string;
          total_rooms: number;
          updated_at: string | null;
          weekend_price: number | null;
        };
        Insert: {
          allows_pets?: boolean | null;
          allows_smoking?: boolean | null;
          amenities?: string[] | null;
          base_price: number;
          bed_type?: string | null;
          beds_count?: number;
          breakfast_included?: boolean | null;
          cancellation_hours?: number | null;
          capacity: number;
          created_at?: string | null;
          description?: string | null;
          display_order?: number | null;
          hotel_id: string;
          id?: string;
          images?: string[] | null;
          is_active?: boolean | null;
          max_adults?: number;
          max_children?: number | null;
          name: string;
          refundable?: boolean | null;
          room_size_sqft?: number | null;
          seasonal_prices?: Json | null;
          slug: string;
          total_rooms?: number;
          updated_at?: string | null;
          weekend_price?: number | null;
        };
        Update: {
          allows_pets?: boolean | null;
          allows_smoking?: boolean | null;
          amenities?: string[] | null;
          base_price?: number;
          bed_type?: string | null;
          beds_count?: number;
          breakfast_included?: boolean | null;
          cancellation_hours?: number | null;
          capacity?: number;
          created_at?: string | null;
          description?: string | null;
          display_order?: number | null;
          hotel_id?: string;
          id?: string;
          images?: string[] | null;
          is_active?: boolean | null;
          max_adults?: number;
          max_children?: number | null;
          name?: string;
          refundable?: boolean | null;
          room_size_sqft?: number | null;
          seasonal_prices?: Json | null;
          slug?: string;
          total_rooms?: number;
          updated_at?: string | null;
          weekend_price?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'room_types_hotel_id_fkey';
            columns: ['hotel_id'];
            isOneToOne: false;
            referencedRelation: 'hotels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'room_types_hotel_id_fkey';
            columns: ['hotel_id'];
            isOneToOne: false;
            referencedRelation: 'v_hotels_search';
            referencedColumns: ['id'];
          },
        ];
      };
      rooms: {
        Row: {
          created_at: string | null;
          floor: number | null;
          id: string;
          last_cleaned_at: string | null;
          notes: string | null;
          room_number: string;
          room_type_id: string;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          floor?: number | null;
          id?: string;
          last_cleaned_at?: string | null;
          notes?: string | null;
          room_number: string;
          room_type_id: string;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          floor?: number | null;
          id?: string;
          last_cleaned_at?: string | null;
          notes?: string | null;
          room_number?: string;
          room_type_id?: string;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'rooms_room_type_id_fkey';
            columns: ['room_type_id'];
            isOneToOne: false;
            referencedRelation: 'room_types';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rooms_room_type_id_fkey';
            columns: ['room_type_id'];
            isOneToOne: false;
            referencedRelation: 'v_room_availability_summary';
            referencedColumns: ['room_type_id'];
          },
        ];
      };
      scheduled_notifications: {
        Row: {
          cancelled_at: string | null;
          created_at: string | null;
          error_message: string | null;
          failed_at: string | null;
          id: string;
          max_retries: number | null;
          notification_log_id: string | null;
          retry_count: number | null;
          scheduled_at: string;
          sent_at: string | null;
          status: string | null;
          template_name: string;
          timezone: string | null;
          user_id: string | null;
          variables: Json | null;
        };
        Insert: {
          cancelled_at?: string | null;
          created_at?: string | null;
          error_message?: string | null;
          failed_at?: string | null;
          id?: string;
          max_retries?: number | null;
          notification_log_id?: string | null;
          retry_count?: number | null;
          scheduled_at: string;
          sent_at?: string | null;
          status?: string | null;
          template_name: string;
          timezone?: string | null;
          user_id?: string | null;
          variables?: Json | null;
        };
        Update: {
          cancelled_at?: string | null;
          created_at?: string | null;
          error_message?: string | null;
          failed_at?: string | null;
          id?: string;
          max_retries?: number | null;
          notification_log_id?: string | null;
          retry_count?: number | null;
          scheduled_at?: string;
          sent_at?: string | null;
          status?: string | null;
          template_name?: string;
          timezone?: string | null;
          user_id?: string | null;
          variables?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'scheduled_notifications_notification_log_id_fkey';
            columns: ['notification_log_id'];
            isOneToOne: false;
            referencedRelation: 'notification_logs';
            referencedColumns: ['id'];
          },
        ];
      };
      shipping_addresses: {
        Row: {
          address2: string | null;
          apartment: string | null;
          building_number: string | null;
          city: string | null;
          contact_name: string | null;
          country: string | null;
          created_at: string | null;
          id: string;
          is_default: boolean | null;
          label: string | null;
          latitude: number | null;
          longitude: number | null;
          name: string | null;
          phone: string | null;
          postal_code: string | null;
          state: string | null;
          street: string | null;
          updated_at: string | null;
          user_id: string | null;
          zip_code: string | null;
        };
        Insert: {
          address2?: string | null;
          apartment?: string | null;
          building_number?: string | null;
          city?: string | null;
          contact_name?: string | null;
          country?: string | null;
          created_at?: string | null;
          id?: string;
          is_default?: boolean | null;
          label?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          name?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          state?: string | null;
          street?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
          zip_code?: string | null;
        };
        Update: {
          address2?: string | null;
          apartment?: string | null;
          building_number?: string | null;
          city?: string | null;
          contact_name?: string | null;
          country?: string | null;
          created_at?: string | null;
          id?: string;
          is_default?: boolean | null;
          label?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          name?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          state?: string | null;
          street?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
          zip_code?: string | null;
        };
        Relationships: [];
      };
      spatial_ref_sys: {
        Row: {
          auth_name: string | null;
          auth_srid: number | null;
          proj4text: string | null;
          srid: number;
          srtext: string | null;
        };
        Insert: {
          auth_name?: string | null;
          auth_srid?: number | null;
          proj4text?: string | null;
          srid: number;
          srtext?: string | null;
        };
        Update: {
          auth_name?: string | null;
          auth_srid?: number | null;
          proj4text?: string | null;
          srid?: number;
          srtext?: string | null;
        };
        Relationships: [];
      };
      tour_promo_code_usage: {
        Row: {
          discount_amount: number;
          id: string;
          promo_code_id: string;
          tour_booking_id: string;
          used_at: string | null;
          user_id: string;
        };
        Insert: {
          discount_amount: number;
          id?: string;
          promo_code_id: string;
          tour_booking_id: string;
          used_at?: string | null;
          user_id: string;
        };
        Update: {
          discount_amount?: number;
          id?: string;
          promo_code_id?: string;
          tour_booking_id?: string;
          used_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tour_promo_code_usage_promo_code_id_fkey';
            columns: ['promo_code_id'];
            isOneToOne: false;
            referencedRelation: 'tour_promo_codes';
            referencedColumns: ['id'];
          },
        ];
      };
      tour_promo_codes: {
        Row: {
          applicable_categories: string[] | null;
          applicable_tours: string[] | null;
          code: string;
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          discount_type: string;
          discount_value: number;
          excluded_tours: string[] | null;
          first_booking_only: boolean | null;
          group_booking_only: boolean | null;
          id: string;
          is_active: boolean | null;
          max_discount_amount: number | null;
          min_order_amount: number | null;
          min_participants: number | null;
          per_user_limit: number | null;
          requires_early_booking_days: number | null;
          updated_at: string | null;
          usage_count: number | null;
          usage_limit: number | null;
          valid_from: string | null;
          valid_until: string | null;
        };
        Insert: {
          applicable_categories?: string[] | null;
          applicable_tours?: string[] | null;
          code: string;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          discount_type: string;
          discount_value: number;
          excluded_tours?: string[] | null;
          first_booking_only?: boolean | null;
          group_booking_only?: boolean | null;
          id?: string;
          is_active?: boolean | null;
          max_discount_amount?: number | null;
          min_order_amount?: number | null;
          min_participants?: number | null;
          per_user_limit?: number | null;
          requires_early_booking_days?: number | null;
          updated_at?: string | null;
          usage_count?: number | null;
          usage_limit?: number | null;
          valid_from?: string | null;
          valid_until?: string | null;
        };
        Update: {
          applicable_categories?: string[] | null;
          applicable_tours?: string[] | null;
          code?: string;
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          discount_type?: string;
          discount_value?: number;
          excluded_tours?: string[] | null;
          first_booking_only?: boolean | null;
          group_booking_only?: boolean | null;
          id?: string;
          is_active?: boolean | null;
          max_discount_amount?: number | null;
          min_order_amount?: number | null;
          min_participants?: number | null;
          per_user_limit?: number | null;
          requires_early_booking_days?: number | null;
          updated_at?: string | null;
          usage_count?: number | null;
          usage_limit?: number | null;
          valid_from?: string | null;
          valid_until?: string | null;
        };
        Relationships: [];
      };
      user_active_roles: {
        Row: {
          active_role: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          active_role: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          active_role?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      user_addresses: {
        Row: {
          address_type: string | null;
          address2: string | null;
          apartment: string | null;
          building_number: string | null;
          city: string;
          contact_name: string | null;
          contact_phone: string | null;
          country: string;
          created_at: string | null;
          id: string;
          is_default: boolean | null;
          label: string;
          latitude: number | null;
          longitude: number | null;
          name: string | null;
          phone: string | null;
          postal_code: string | null;
          state: string | null;
          street: string;
          updated_at: string | null;
          user_id: string | null;
          zip_code: string | null;
        };
        Insert: {
          address_type?: string | null;
          address2?: string | null;
          apartment?: string | null;
          building_number?: string | null;
          city: string;
          contact_name?: string | null;
          contact_phone?: string | null;
          country: string;
          created_at?: string | null;
          id?: string;
          is_default?: boolean | null;
          label: string;
          latitude?: number | null;
          longitude?: number | null;
          name?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          state?: string | null;
          street: string;
          updated_at?: string | null;
          user_id?: string | null;
          zip_code?: string | null;
        };
        Update: {
          address_type?: string | null;
          address2?: string | null;
          apartment?: string | null;
          building_number?: string | null;
          city?: string;
          contact_name?: string | null;
          contact_phone?: string | null;
          country?: string;
          created_at?: string | null;
          id?: string;
          is_default?: boolean | null;
          label?: string;
          latitude?: number | null;
          longitude?: number | null;
          name?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          state?: string | null;
          street?: string;
          updated_at?: string | null;
          user_id?: string | null;
          zip_code?: string | null;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          age_group: string | null;
          areas_of_interest: string[] | null;
          avatar: string | null;
          avatar_url: string | null;
          body_weight: number | null;
          created_at: string | null;
          date_of_birth: string | null;
          email: string;
          first_name: string | null;
          gender: string | null;
          height: number | null;
          id: string;
          is_active: boolean | null;
          is_phone_verified: boolean | null;
          last_login_at: string | null;
          last_name: string | null;
          marital_status: string | null;
          phone: string | null;
          updated_at: string | null;
        };
        Insert: {
          age_group?: string | null;
          areas_of_interest?: string[] | null;
          avatar?: string | null;
          avatar_url?: string | null;
          body_weight?: number | null;
          created_at?: string | null;
          date_of_birth?: string | null;
          email: string;
          first_name?: string | null;
          gender?: string | null;
          height?: number | null;
          id: string;
          is_active?: boolean | null;
          is_phone_verified?: boolean | null;
          last_login_at?: string | null;
          last_name?: string | null;
          marital_status?: string | null;
          phone?: string | null;
          updated_at?: string | null;
        };
        Update: {
          age_group?: string | null;
          areas_of_interest?: string[] | null;
          avatar?: string | null;
          avatar_url?: string | null;
          body_weight?: number | null;
          created_at?: string | null;
          date_of_birth?: string | null;
          email?: string;
          first_name?: string | null;
          gender?: string | null;
          height?: number | null;
          id?: string;
          is_active?: boolean | null;
          is_phone_verified?: boolean | null;
          last_login_at?: string | null;
          last_name?: string | null;
          marital_status?: string | null;
          phone?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          granted_at: string | null;
          granted_by: string | null;
          id: string;
          role_name: string;
          user_id: string;
        };
        Insert: {
          granted_at?: string | null;
          granted_by?: string | null;
          id?: string;
          role_name: string;
          user_id: string;
        };
        Update: {
          granted_at?: string | null;
          granted_by?: string | null;
          id?: string;
          role_name?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_wallets: {
        Row: {
          balance: number;
          created_at: string | null;
          currency: string;
          id: string;
          is_active: boolean | null;
          is_locked: boolean | null;
          lock_reason: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          balance?: number;
          created_at?: string | null;
          currency?: string;
          id?: string;
          is_active?: boolean | null;
          is_locked?: boolean | null;
          lock_reason?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          balance?: number;
          created_at?: string | null;
          currency?: string;
          id?: string;
          is_active?: boolean | null;
          is_locked?: boolean | null;
          lock_reason?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      vendor_payouts: {
        Row: {
          account_name: string | null;
          account_number: string | null;
          bank_name: string | null;
          completed_at: string | null;
          escrow_transaction_ids: string[];
          failure_reason: string | null;
          id: string;
          metadata: Json | null;
          module_name: string;
          notes: string | null;
          payout_method: string;
          payout_provider: string | null;
          processed_at: string | null;
          processed_by: string | null;
          provider_reference: string | null;
          requested_at: string | null;
          retry_count: number | null;
          status: string;
          total_amount: number;
          transaction_count: number;
          vendor_id: string;
          vendor_type: string;
        };
        Insert: {
          account_name?: string | null;
          account_number?: string | null;
          bank_name?: string | null;
          completed_at?: string | null;
          escrow_transaction_ids: string[];
          failure_reason?: string | null;
          id?: string;
          metadata?: Json | null;
          module_name: string;
          notes?: string | null;
          payout_method?: string;
          payout_provider?: string | null;
          processed_at?: string | null;
          processed_by?: string | null;
          provider_reference?: string | null;
          requested_at?: string | null;
          retry_count?: number | null;
          status?: string;
          total_amount: number;
          transaction_count: number;
          vendor_id: string;
          vendor_type: string;
        };
        Update: {
          account_name?: string | null;
          account_number?: string | null;
          bank_name?: string | null;
          completed_at?: string | null;
          escrow_transaction_ids?: string[];
          failure_reason?: string | null;
          id?: string;
          metadata?: Json | null;
          module_name?: string;
          notes?: string | null;
          payout_method?: string;
          payout_provider?: string | null;
          processed_at?: string | null;
          processed_by?: string | null;
          provider_reference?: string | null;
          requested_at?: string | null;
          retry_count?: number | null;
          status?: string;
          total_amount?: number;
          transaction_count?: number;
          vendor_id?: string;
          vendor_type?: string;
        };
        Relationships: [];
      };
      vendor_profiles: {
        Row: {
          business_name: string;
          business_type: string | null;
          commission_rate: number | null;
          created_at: string | null;
          description: string | null;
          id: string;
          is_verified: boolean | null;
          logo: string | null;
          rating: number | null;
          subscription_tier: string | null;
          total_sales: number | null;
          updated_at: string | null;
          user_id: string;
          website: string | null;
        };
        Insert: {
          business_name: string;
          business_type?: string | null;
          commission_rate?: number | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_verified?: boolean | null;
          logo?: string | null;
          rating?: number | null;
          subscription_tier?: string | null;
          total_sales?: number | null;
          updated_at?: string | null;
          user_id: string;
          website?: string | null;
        };
        Update: {
          business_name?: string;
          business_type?: string | null;
          commission_rate?: number | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_verified?: boolean | null;
          logo?: string | null;
          rating?: number | null;
          subscription_tier?: string | null;
          total_sales?: number | null;
          updated_at?: string | null;
          user_id?: string;
          website?: string | null;
        };
        Relationships: [];
      };
      wallet_transactions: {
        Row: {
          amount: number;
          balance_after: number;
          balance_before: number;
          created_at: string | null;
          description: string;
          id: string;
          reference_id: string | null;
          reference_type: string | null;
          transaction_type: string;
          wallet_id: string;
        };
        Insert: {
          amount: number;
          balance_after: number;
          balance_before: number;
          created_at?: string | null;
          description: string;
          id?: string;
          reference_id?: string | null;
          reference_type?: string | null;
          transaction_type: string;
          wallet_id: string;
        };
        Update: {
          amount?: number;
          balance_after?: number;
          balance_before?: number;
          created_at?: string | null;
          description?: string;
          id?: string;
          reference_id?: string | null;
          reference_type?: string | null;
          transaction_type?: string;
          wallet_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'wallet_transactions_wallet_id_fkey';
            columns: ['wallet_id'];
            isOneToOne: false;
            referencedRelation: 'user_wallets';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null;
          f_geography_column: unknown;
          f_table_catalog: unknown;
          f_table_name: unknown;
          f_table_schema: unknown;
          srid: number | null;
          type: string | null;
        };
        Relationships: [];
      };
      geometry_columns: {
        Row: {
          coord_dimension: number | null;
          f_geometry_column: unknown;
          f_table_catalog: string | null;
          f_table_name: unknown;
          f_table_schema: unknown;
          srid: number | null;
          type: string | null;
        };
        Insert: {
          coord_dimension?: number | null;
          f_geometry_column?: unknown;
          f_table_catalog?: string | null;
          f_table_name?: unknown;
          f_table_schema?: unknown;
          srid?: number | null;
          type?: string | null;
        };
        Update: {
          coord_dimension?: number | null;
          f_geometry_column?: unknown;
          f_table_catalog?: string | null;
          f_table_name?: unknown;
          f_table_schema?: unknown;
          srid?: number | null;
          type?: string | null;
        };
        Relationships: [];
      };
      v_hotels_search: {
        Row: {
          average_rating: number | null;
          city: string | null;
          country: string | null;
          featured_image: string | null;
          host_name: string | null;
          host_rating: number | null;
          id: string | null;
          is_active: boolean | null;
          is_verified: boolean | null;
          latitude: number | null;
          longitude: number | null;
          min_price: number | null;
          name: string | null;
          short_description: string | null;
          slug: string | null;
          star_rating: number | null;
          state: string | null;
          total_bookings: number | null;
          total_reviews: number | null;
        };
        Relationships: [];
      };
      v_room_availability_summary: {
        Row: {
          available_rooms: number | null;
          base_price: number | null;
          date: string | null;
          dynamic_price: number | null;
          hotel_id: string | null;
          is_blocked: boolean | null;
          room_type_id: string | null;
          room_type_name: string | null;
          total_rooms: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'room_types_hotel_id_fkey';
            columns: ['hotel_id'];
            isOneToOne: false;
            referencedRelation: 'hotels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'room_types_hotel_id_fkey';
            columns: ['hotel_id'];
            isOneToOne: false;
            referencedRelation: 'v_hotels_search';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string };
        Returns: undefined;
      };
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown };
        Returns: unknown;
      };
      _postgis_pgsql_version: { Args: never; Returns: string };
      _postgis_scripts_pgsql_version: { Args: never; Returns: string };
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown };
        Returns: number;
      };
      _postgis_stats: {
        Args: { ''?: string; att_name: string; tbl: unknown };
        Returns: string;
      };
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_dwithin: {
        Args: {
          geog1: unknown;
          geog2: unknown;
          tolerance: number;
          use_spheroid?: boolean;
        };
        Returns: boolean;
      };
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown };
        Returns: number;
      };
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_sortablehash: { Args: { geom: unknown }; Returns: number };
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_voronoi: {
        Args: {
          clip?: unknown;
          g1: unknown;
          return_polygons?: boolean;
          tolerance?: number;
        };
        Returns: unknown;
      };
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      add_to_cart: {
        Args: {
          p_product_id: string;
          p_promo_code?: string;
          p_quantity?: number;
          p_user_id: string;
          p_variant_id?: string;
        };
        Returns: Json;
      };
      add_to_cart_clean: {
        Args: {
          product_id: string;
          promo_code?: string;
          quantity?: number;
          user_id: string;
          variant_id?: string;
        };
        Returns: Json;
      };
      addauth: { Args: { '': string }; Returns: boolean };
      addgeometrycolumn:
        | {
            Args: {
              column_name: string;
              new_dim: number;
              new_srid: number;
              new_type: string;
              schema_name: string;
              table_name: string;
              use_typmod?: boolean;
            };
            Returns: string;
          }
        | {
            Args: {
              column_name: string;
              new_dim: number;
              new_srid: number;
              new_type: string;
              table_name: string;
              use_typmod?: boolean;
            };
            Returns: string;
          }
        | {
            Args: {
              catalog_name: string;
              column_name: string;
              new_dim: number;
              new_srid_in: number;
              new_type: string;
              schema_name: string;
              table_name: string;
              use_typmod?: boolean;
            };
            Returns: string;
          };
      calculate_commission: {
        Args: { p_gross_amount: number; p_module_name: string };
        Returns: number;
      };
      calculate_deposit: {
        Args: { p_module_name: string; p_total_amount: number };
        Returns: number;
      };
      calculate_nights: {
        Args: { p_check_in: string; p_check_out: string };
        Returns: number;
      };
      check_booking_overlap: {
        Args: {
          p_check_in: string;
          p_check_out: string;
          p_exclude_booking_id?: string;
          p_room_type_id: string;
        };
        Returns: boolean;
      };
      complete_payout_atomic: {
        Args: {
          p_payout_id: string;
          p_provider_reference: string;
          p_transaction_id: string;
        };
        Returns: Json;
      };
      create_payout_request_atomic: {
        Args: {
          p_account_name: string;
          p_account_number: string;
          p_bank_name: string;
          p_requested_amount?: number;
          p_vendor_id: string;
        };
        Returns: Json;
      };
      disablelongtransactions: { Args: never; Returns: string };
      dropgeometrycolumn:
        | {
            Args: {
              column_name: string;
              schema_name: string;
              table_name: string;
            };
            Returns: string;
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
        | {
            Args: {
              catalog_name: string;
              column_name: string;
              schema_name: string;
              table_name: string;
            };
            Returns: string;
          };
      dropgeometrytable:
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
        | {
            Args: {
              catalog_name: string;
              schema_name: string;
              table_name: string;
            };
            Returns: string;
          };
      ecommerce_checkout_transaction: {
        Args: {
          p_cart_id: string;
          p_payment_method?: string;
          p_shipping_address?: Json;
          p_shipping_address_id?: string;
          p_simulate_failure?: boolean;
          p_user_id: string;
        };
        Returns: {
          order_id: string;
          payment_status: string;
        }[];
      };
      enablelongtransactions: { Args: never; Returns: string };
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      expire_pending_payments: { Args: never; Returns: undefined };
      fail_payout_atomic: {
        Args: { p_failure_reason: string; p_payout_id: string };
        Returns: Json;
      };
      generate_booking_number: { Args: never; Returns: string };
      generate_order_number: { Args: never; Returns: string };
      geometry: { Args: { '': string }; Returns: unknown };
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geomfromewkt: { Args: { '': string }; Returns: unknown };
      get_available_room_count: {
        Args: {
          p_check_in: string;
          p_check_out: string;
          p_room_type_id: string;
        };
        Returns: number;
      };
      get_vendor_available_balance: {
        Args: { p_vendor_id: string };
        Returns: Json;
      };
      get_vendor_balance_detailed: {
        Args: { p_vendor_id: string };
        Returns: Json;
      };
      get_vendor_dashboard_stats: {
        Args: { p_vendor_id: string };
        Returns: Json;
      };
      get_vendor_earnings_list: {
        Args: {
          p_limit?: number;
          p_offset?: number;
          p_status?: string;
          p_vendor_id: string;
        };
        Returns: Json;
      };
      get_vendor_payout_history: {
        Args: { p_limit?: number; p_offset?: number; p_vendor_id: string };
        Returns: Json;
      };
      get_wallet_balance: { Args: { p_user_id: string }; Returns: Json };
      gettransactionid: { Args: never; Returns: unknown };
      increment_event_promo_usage: {
        Args: { promo_id: string };
        Returns: undefined;
      };
      increment_hotel_promo_usage: {
        Args: { promo_id: string };
        Returns: undefined;
      };
      increment_marketplace_promo_usage: {
        Args: { promo_id: string };
        Returns: undefined;
      };
      increment_platform_promo_usage: {
        Args: { promo_id: string };
        Returns: undefined;
      };
      increment_tour_promo_usage: {
        Args: { promo_id: string };
        Returns: undefined;
      };
      longtransactionsenabled: { Args: never; Returns: boolean };
      pay_with_wallet_atomic: {
        Args: {
          p_amount: number;
          p_metadata?: Json;
          p_module_type: string;
          p_reference_id: string;
          p_user_id: string;
        };
        Returns: Json;
      };
      payout_to_wallet_atomic: { Args: { p_payout_id: string }; Returns: Json };
      populate_geometry_columns:
        | { Args: { use_typmod?: boolean }; Returns: string }
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number };
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: number;
      };
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: number;
      };
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: string;
      };
      postgis_extensions_upgrade: { Args: never; Returns: string };
      postgis_full_version: { Args: never; Returns: string };
      postgis_geos_version: { Args: never; Returns: string };
      postgis_lib_build_date: { Args: never; Returns: string };
      postgis_lib_revision: { Args: never; Returns: string };
      postgis_lib_version: { Args: never; Returns: string };
      postgis_libjson_version: { Args: never; Returns: string };
      postgis_liblwgeom_version: { Args: never; Returns: string };
      postgis_libprotobuf_version: { Args: never; Returns: string };
      postgis_libxml_version: { Args: never; Returns: string };
      postgis_proj_version: { Args: never; Returns: string };
      postgis_scripts_build_date: { Args: never; Returns: string };
      postgis_scripts_installed: { Args: never; Returns: string };
      postgis_scripts_released: { Args: never; Returns: string };
      postgis_svn_version: { Args: never; Returns: string };
      postgis_type_name: {
        Args: {
          coord_dimension: number;
          geomname: string;
          use_new_name?: boolean;
        };
        Returns: string;
      };
      postgis_version: { Args: never; Returns: string };
      postgis_wagyu_version: { Args: never; Returns: string };
      process_payout_atomic: {
        Args: { p_admin_id: string; p_payout_id: string };
        Returns: Json;
      };
      process_refund_atomic: {
        Args: {
          p_manual_amount?: number;
          p_module_type: string;
          p_reason: string;
          p_reference_id: string;
          p_user_id: string;
        };
        Returns: Json;
      };
      refund_to_wallet_atomic: {
        Args: {
          p_payment_id: string;
          p_reason: string;
          p_refund_amount: number;
        };
        Returns: Json;
      };
      search_hotels_rpc: {
        Args: {
          p_amenities?: string[];
          p_check_in?: string;
          p_check_out?: string;
          p_city?: string;
          p_guests?: number;
          p_limit?: number;
          p_max_price?: number;
          p_min_price?: number;
          p_offset?: number;
          p_rooms?: number;
          p_sort_by?: string;
          p_star_rating?: number;
        };
        Returns: {
          available_rooms: Json;
          average_rating: number;
          city: string;
          country: string;
          hotel_id: string;
          lowest_price: number;
          name: string;
          suitable_room_count: number;
          total_bookings: number;
        }[];
      };
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown };
            Returns: number;
          };
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { '': string }; Returns: number };
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number };
        Returns: string;
      };
      st_asewkt: { Args: { '': string }; Returns: string };
      st_asgeojson:
        | {
            Args: {
              geom_column?: string;
              maxdecimaldigits?: number;
              pretty_bool?: boolean;
              r: Record<string, unknown>;
            };
            Returns: string;
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number };
            Returns: string;
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number };
            Returns: string;
          }
        | { Args: { '': string }; Returns: string };
      st_asgml:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number };
            Returns: string;
          }
        | {
            Args: {
              geom: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
              version: number;
            };
            Returns: string;
          }
        | {
            Args: {
              geog: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
              version: number;
            };
            Returns: string;
          }
        | {
            Args: {
              geog: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
            };
            Returns: string;
          }
        | { Args: { '': string }; Returns: string };
      st_askml:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string };
            Returns: string;
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string };
            Returns: string;
          }
        | { Args: { '': string }; Returns: string };
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string };
        Returns: string;
      };
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string };
      st_asmvtgeom: {
        Args: {
          bounds: unknown;
          buffer?: number;
          clip_geom?: boolean;
          extent?: number;
          geom: unknown;
        };
        Returns: unknown;
      };
      st_assvg:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number };
            Returns: string;
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number };
            Returns: string;
          }
        | { Args: { '': string }; Returns: string };
      st_astext: { Args: { '': string }; Returns: string };
      st_astwkb:
        | {
            Args: {
              geom: unknown[];
              ids: number[];
              prec?: number;
              prec_m?: number;
              prec_z?: number;
              with_boxes?: boolean;
              with_sizes?: boolean;
            };
            Returns: string;
          }
        | {
            Args: {
              geom: unknown;
              prec?: number;
              prec_m?: number;
              prec_z?: number;
              with_boxes?: boolean;
              with_sizes?: boolean;
            };
            Returns: string;
          };
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number };
        Returns: string;
      };
      st_azimuth:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number };
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown };
        Returns: unknown;
      };
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number };
            Returns: unknown;
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number };
            Returns: unknown;
          };
      st_centroid: { Args: { '': string }; Returns: unknown };
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown };
        Returns: unknown;
      };
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown };
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean;
          param_geom: unknown;
          param_pctconvex: number;
        };
        Returns: unknown;
      };
      st_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_coorddim: { Args: { geometry: unknown }; Returns: number };
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number };
        Returns: unknown;
      };
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_distance:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean };
            Returns: number;
          };
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number };
            Returns: number;
          };
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_dwithin: {
        Args: {
          geog1: unknown;
          geog2: unknown;
          tolerance: number;
          use_spheroid?: boolean;
        };
        Returns: boolean;
      };
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_expand:
        | {
            Args: {
              dm?: number;
              dx: number;
              dy: number;
              dz?: number;
              geom: unknown;
            };
            Returns: unknown;
          }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number };
            Returns: unknown;
          }
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown };
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown };
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number };
        Returns: unknown;
      };
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number };
        Returns: unknown;
      };
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number };
        Returns: unknown;
      };
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number };
            Returns: unknown;
          };
      st_geogfromtext: { Args: { '': string }; Returns: unknown };
      st_geographyfromtext: { Args: { '': string }; Returns: unknown };
      st_geohash:
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
        | { Args: { geog: unknown; maxchars?: number }; Returns: string };
      st_geomcollfromtext: { Args: { '': string }; Returns: unknown };
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean;
          g: unknown;
          max_iter?: number;
          tolerance?: number;
        };
        Returns: unknown;
      };
      st_geometryfromtext: { Args: { '': string }; Returns: unknown };
      st_geomfromewkt: { Args: { '': string }; Returns: unknown };
      st_geomfromgeojson:
        | { Args: { '': Json }; Returns: unknown }
        | { Args: { '': Json }; Returns: unknown }
        | { Args: { '': string }; Returns: unknown };
      st_geomfromgml: { Args: { '': string }; Returns: unknown };
      st_geomfromkml: { Args: { '': string }; Returns: unknown };
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown };
      st_geomfromtext: { Args: { '': string }; Returns: unknown };
      st_gmltosql: { Args: { '': string }; Returns: unknown };
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean };
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number };
        Returns: unknown;
      };
      st_hexagongrid: {
        Args: { bounds: unknown; size: number };
        Returns: Record<string, unknown>[];
      };
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown };
        Returns: number;
      };
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_intersects:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean };
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown };
        Returns: Database['public']['CompositeTypes']['valid_detail'];
        SetofOptions: {
          from: '*';
          to: 'valid_detail';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { '': string }; Returns: number };
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown };
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown };
        Returns: number;
      };
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string };
        Returns: unknown;
      };
      st_linefromtext: { Args: { '': string }; Returns: unknown };
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown };
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number };
        Returns: unknown;
      };
      st_locatebetween: {
        Args: {
          frommeasure: number;
          geometry: unknown;
          leftrightoffset?: number;
          tomeasure: number;
        };
        Returns: unknown;
      };
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number };
        Returns: unknown;
      };
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makevalid: {
        Args: { geom: unknown; params: string };
        Returns: unknown;
      };
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number };
        Returns: unknown;
      };
      st_mlinefromtext: { Args: { '': string }; Returns: unknown };
      st_mpointfromtext: { Args: { '': string }; Returns: unknown };
      st_mpolyfromtext: { Args: { '': string }; Returns: unknown };
      st_multilinestringfromtext: { Args: { '': string }; Returns: unknown };
      st_multipointfromtext: { Args: { '': string }; Returns: unknown };
      st_multipolygonfromtext: { Args: { '': string }; Returns: unknown };
      st_node: { Args: { g: unknown }; Returns: unknown };
      st_normalize: { Args: { geom: unknown }; Returns: unknown };
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string };
        Returns: unknown;
      };
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean };
        Returns: number;
      };
      st_pointfromtext: { Args: { '': string }; Returns: unknown };
      st_pointm: {
        Args: {
          mcoordinate: number;
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
        };
        Returns: unknown;
      };
      st_pointz: {
        Args: {
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
          zcoordinate: number;
        };
        Returns: unknown;
      };
      st_pointzm: {
        Args: {
          mcoordinate: number;
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
          zcoordinate: number;
        };
        Returns: unknown;
      };
      st_polyfromtext: { Args: { '': string }; Returns: unknown };
      st_polygonfromtext: { Args: { '': string }; Returns: unknown };
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown };
        Returns: unknown;
      };
      st_quantizecoordinates: {
        Args: {
          g: unknown;
          prec_m?: number;
          prec_x: number;
          prec_y?: number;
          prec_z?: number;
        };
        Returns: unknown;
      };
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number };
        Returns: unknown;
      };
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string };
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number };
        Returns: unknown;
      };
      st_setsrid:
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
        | { Args: { geog: unknown; srid: number }; Returns: unknown };
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number };
        Returns: unknown;
      };
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown };
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number };
        Returns: unknown;
      };
      st_squaregrid: {
        Args: { bounds: unknown; size: number };
        Returns: Record<string, unknown>[];
      };
      st_srid:
        | { Args: { geom: unknown }; Returns: number }
        | { Args: { geog: unknown }; Returns: number };
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number };
        Returns: unknown[];
      };
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown };
        Returns: unknown;
      };
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_tileenvelope: {
        Args: {
          bounds?: unknown;
          margin?: number;
          x: number;
          y: number;
          zoom: number;
        };
        Returns: unknown;
      };
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_transform:
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number };
            Returns: unknown;
          }
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string };
            Returns: unknown;
          };
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown };
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number };
            Returns: unknown;
          };
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean };
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown };
      st_wkttosql: { Args: { '': string }; Returns: unknown };
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number };
        Returns: unknown;
      };
      topup_wallet_atomic: {
        Args: {
          p_amount: number;
          p_metadata?: Json;
          p_payment_provider: string;
          p_transaction_id: string;
          p_user_id: string;
        };
        Returns: Json;
      };
      unlockrows: { Args: { '': string }; Returns: number };
      updategeometrysrid: {
        Args: {
          catalogn_name: string;
          column_name: string;
          new_srid_in: number;
          schema_name: string;
          table_name: string;
        };
        Returns: string;
      };
    };
    Enums: {
      notification_status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
      notification_type: 'email' | 'sms' | 'push' | 'in_app';
      user_role: 'user' | 'admin' | 'moderator' | 'driver' | 'merchant' | 'hotel_manager';
      user_status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
    };
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null;
        geom: unknown;
      };
      valid_detail: {
        valid: boolean | null;
        reason: string | null;
        location: unknown;
      };
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      notification_status: ['pending', 'sent', 'delivered', 'failed', 'read'],
      notification_type: ['email', 'sms', 'push', 'in_app'],
      user_role: ['user', 'admin', 'moderator', 'driver', 'merchant', 'hotel_manager'],
      user_status: ['active', 'inactive', 'suspended', 'pending_verification'],
    },
  },
} as const;
