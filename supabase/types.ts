export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ad_campaigns: {
        Row: {
          advertiser_id: string
          approved_at: string | null
          approved_by: string | null
          budget: number
          campaign_name: string
          campaign_number: string
          campaign_type: string | null
          clicks: number | null
          conversions: number | null
          created_at: string | null
          creative_assets: Json | null
          ctr: number | null
          daily_budget: number | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          description: string | null
          end_date: string
          id: string
          impressions: number | null
          landing_url: string | null
          payment_status: string | null
          rejection_reason: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          spent_amount: number | null
          start_date: string
          status: string | null
          target_audience: Json | null
          updated_at: string | null
        }
        Insert: {
          advertiser_id: string
          approved_at?: string | null
          approved_by?: string | null
          budget: number
          campaign_name: string
          campaign_number: string
          campaign_type?: string | null
          clicks?: number | null
          conversions?: number | null
          created_at?: string | null
          creative_assets?: Json | null
          ctr?: number | null
          daily_budget?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          end_date: string
          id?: string
          impressions?: number | null
          landing_url?: string | null
          payment_status?: string | null
          rejection_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          spent_amount?: number | null
          start_date: string
          status?: string | null
          target_audience?: Json | null
          updated_at?: string | null
        }
        Update: {
          advertiser_id?: string
          approved_at?: string | null
          approved_by?: string | null
          budget?: number
          campaign_name?: string
          campaign_number?: string
          campaign_type?: string | null
          clicks?: number | null
          conversions?: number | null
          created_at?: string | null
          creative_assets?: Json | null
          ctr?: number | null
          daily_budget?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          end_date?: string
          id?: string
          impressions?: number | null
          landing_url?: string | null
          payment_status?: string | null
          rejection_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          spent_amount?: number | null
          start_date?: string
          status?: string | null
          target_audience?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertiser_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_actions: {
        Row: {
          action_details: Json | null
          action_type: string
          created_at: string | null
          error_message: string | null
          id: string
          ip_address: unknown
          module_name: string
          official_id: string | null
          region_id: string | null
          resource_id: string | null
          resource_type: string
          status: string | null
          user_agent: string | null
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          module_name: string
          official_id?: string | null
          region_id?: string | null
          resource_id?: string | null
          resource_type: string
          status?: string | null
          user_agent?: string | null
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          module_name?: string
          official_id?: string | null
          region_id?: string | null
          resource_id?: string | null
          resource_type?: string
          status?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_official_id_fkey"
            columns: ["official_id"]
            isOneToOne: false
            referencedRelation: "nipost_officials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "nipost_regions"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_approvals: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          escalated_to: string | null
          escalation_reason: string | null
          id: string
          priority: string | null
          reference_id: string
          reference_type: string
          region_id: string | null
          request_data: Json | null
          request_type: string
          requested_by: string | null
          sla_deadline: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          escalated_to?: string | null
          escalation_reason?: string | null
          id?: string
          priority?: string | null
          reference_id: string
          reference_type: string
          region_id?: string | null
          request_data?: Json | null
          request_type: string
          requested_by?: string | null
          sla_deadline?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          escalated_to?: string | null
          escalation_reason?: string | null
          id?: string
          priority?: string | null
          reference_id?: string
          reference_type?: string
          region_id?: string | null
          request_data?: Json | null
          request_type?: string
          requested_by?: string | null
          sla_deadline?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_approvals_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "nipost_officials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_approvals_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "nipost_officials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_approvals_escalated_to_fkey"
            columns: ["escalated_to"]
            isOneToOne: false
            referencedRelation: "nipost_officials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_approvals_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "nipost_regions"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_permissions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_global: boolean | null
          min_clearance_level: number | null
          module_name: string
          permission_code: string
          permission_name: string
          required_department: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_global?: boolean | null
          min_clearance_level?: number | null
          module_name: string
          permission_code: string
          permission_name: string
          required_department?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_global?: boolean | null
          min_clearance_level?: number | null
          module_name?: string
          permission_code?: string
          permission_name?: string
          required_department?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      advertiser_profiles: {
        Row: {
          company_name: string
          created_at: string | null
          id: string
          industry: string | null
          is_verified: boolean | null
          subscription_tier: string | null
          total_campaigns: number | null
          total_spend: number | null
          updated_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          company_name: string
          created_at?: string | null
          id?: string
          industry?: string | null
          is_verified?: boolean | null
          subscription_tier?: string | null
          total_campaigns?: number | null
          total_spend?: number | null
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string | null
          id?: string
          industry?: string | null
          is_verified?: boolean | null
          subscription_tier?: string | null
          total_campaigns?: number | null
          total_spend?: number | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advertiser_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advertiser_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_trail: {
        Row: {
          action: string
          changed_fields: string[] | null
          created_at: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          reason: string | null
          record_id: string
          request_id: string | null
          session_id: string | null
          table_name: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          action: string
          changed_fields?: string[] | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
          record_id: string
          request_id?: string | null
          session_id?: string | null
          table_name: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          action?: string
          changed_fields?: string[] | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
          record_id?: string
          request_id?: string | null
          session_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      call_participants: {
        Row: {
          call_id: string
          id: string
          joined_at: string | null
          left_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          call_id: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          call_id?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_participants_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          agora_channel: string | null
          agora_token: string | null
          call_quality_rating: number | null
          call_type: string
          conversation_id: string | null
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          initiated_by: string
          participants: string[]
          started_at: string | null
          status: string
        }
        Insert: {
          agora_channel?: string | null
          agora_token?: string | null
          call_quality_rating?: number | null
          call_type: string
          conversation_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          initiated_by: string
          participants: string[]
          started_at?: string | null
          status: string
        }
        Update: {
          agora_channel?: string | null
          agora_token?: string | null
          call_quality_rating?: number | null
          call_type?: string
          conversation_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          initiated_by?: string
          participants?: string[]
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "active_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments_with_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          is_blocked: boolean | null
          is_muted: boolean | null
          joined_at: string | null
          last_read_at: string | null
          left_at: string | null
          nickname: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_blocked?: boolean | null
          is_muted?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          left_at?: string | null
          nickname?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_blocked?: boolean | null
          is_muted?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          left_at?: string | null
          nickname?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "active_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          avatar_url: string | null
          conversation_type: string
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_encrypted: boolean | null
          last_message_at: string | null
          last_message_sender: string | null
          last_message_text: string | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          conversation_type: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_encrypted?: boolean | null
          last_message_at?: string | null
          last_message_sender?: string | null
          last_message_text?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          conversation_type?: string
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_encrypted?: boolean | null
          last_message_at?: string | null
          last_message_sender?: string | null
          last_message_text?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      courier_profiles: {
        Row: {
          account_holder_name: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          approving_state: string | null
          approving_state_id: string | null
          availability_status:
            | Database["public"]["Enums"]["courier_availability_status"]
            | null
          average_delivery_time_minutes: number | null
          bank_account_number: string | null
          bank_name: string | null
          courier_code: string
          created_at: string
          current_latitude: number | null
          current_location: unknown
          current_longitude: number | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          failed_deliveries: number | null
          first_name: string
          id: string
          is_active: boolean | null
          is_online: boolean | null
          is_verified: boolean | null
          last_location_update: string | null
          last_name: string
          license_expiry_date: string
          license_number: string
          max_delivery_radius_km: number | null
          phone_number: string
          rating: number | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          shift_end_time: string | null
          shift_start_time: string | null
          state: string | null
          state_id: string | null
          successful_deliveries: number | null
          total_deliveries: number | null
          updated_at: string
          user_id: string
          vehicle_capacity_kg: number | null
          vehicle_registration: string
          vehicle_type: string
        }
        Insert: {
          account_holder_name?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          approving_state?: string | null
          approving_state_id?: string | null
          availability_status?:
            | Database["public"]["Enums"]["courier_availability_status"]
            | null
          average_delivery_time_minutes?: number | null
          bank_account_number?: string | null
          bank_name?: string | null
          courier_code: string
          created_at?: string
          current_latitude?: number | null
          current_location?: unknown
          current_longitude?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          failed_deliveries?: number | null
          first_name: string
          id?: string
          is_active?: boolean | null
          is_online?: boolean | null
          is_verified?: boolean | null
          last_location_update?: string | null
          last_name: string
          license_expiry_date: string
          license_number: string
          max_delivery_radius_km?: number | null
          phone_number: string
          rating?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          shift_end_time?: string | null
          shift_start_time?: string | null
          state?: string | null
          state_id?: string | null
          successful_deliveries?: number | null
          total_deliveries?: number | null
          updated_at?: string
          user_id: string
          vehicle_capacity_kg?: number | null
          vehicle_registration: string
          vehicle_type: string
        }
        Update: {
          account_holder_name?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          approving_state?: string | null
          approving_state_id?: string | null
          availability_status?:
            | Database["public"]["Enums"]["courier_availability_status"]
            | null
          average_delivery_time_minutes?: number | null
          bank_account_number?: string | null
          bank_name?: string | null
          courier_code?: string
          created_at?: string
          current_latitude?: number | null
          current_location?: unknown
          current_longitude?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          failed_deliveries?: number | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          is_online?: boolean | null
          is_verified?: boolean | null
          last_location_update?: string | null
          last_name?: string
          license_expiry_date?: string
          license_number?: string
          max_delivery_radius_km?: number | null
          phone_number?: string
          rating?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          shift_end_time?: string | null
          shift_start_time?: string | null
          state?: string | null
          state_id?: string | null
          successful_deliveries?: number | null
          total_deliveries?: number | null
          updated_at?: string
          user_id?: string
          vehicle_capacity_kg?: number | null
          vehicle_registration?: string
          vehicle_type?: string
        }
        Relationships: []
      }
      customer_profiles: {
        Row: {
          company: string | null
          created_at: string | null
          emergency_contact: Json | null
          id: string
          loyalty_points: number | null
          medical_info: Json | null
          membership_tier: string | null
          occupation: string | null
          preferences: Json | null
          social_media: Json | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          emergency_contact?: Json | null
          id?: string
          loyalty_points?: number | null
          medical_info?: Json | null
          membership_tier?: string | null
          occupation?: string | null
          preferences?: Json | null
          social_media?: Json | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string | null
          emergency_contact?: Json | null
          id?: string
          loyalty_points?: number | null
          medical_info?: Json | null
          membership_tier?: string | null
          occupation?: string | null
          preferences?: Json | null
          social_media?: Json | null
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      data_classification: {
        Row: {
          audit_required: boolean | null
          classification: string
          column_name: string
          created_at: string | null
          encryption_required: boolean | null
          id: string
          retention_days: number | null
          table_name: string
          updated_at: string | null
        }
        Insert: {
          audit_required?: boolean | null
          classification: string
          column_name: string
          created_at?: string | null
          encryption_required?: boolean | null
          id?: string
          retention_days?: number | null
          table_name: string
          updated_at?: string | null
        }
        Update: {
          audit_required?: boolean | null
          classification?: string
          column_name?: string
          created_at?: string | null
          encryption_required?: boolean | null
          id?: string
          retention_days?: number | null
          table_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      delivery_assignments: {
        Row: {
          actual_distance_km: number | null
          actual_duration_minutes: number | null
          assigned_at: string | null
          assignment_number: string
          cancellation_reason: string | null
          cancelled_at: string | null
          courier_commission: number | null
          courier_id: string
          courier_notes: string | null
          created_at: string
          customer_feedback: string | null
          customer_rating: number | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          delivered_at: string | null
          delivery_address_id: string
          delivery_fee: number | null
          delivery_instructions: string | null
          delivery_latitude: number | null
          delivery_location: unknown
          delivery_longitude: number | null
          delivery_photo_url: string | null
          delivery_proof_url: string | null
          delivery_scheduled_at: string | null
          estimated_distance_km: number | null
          estimated_duration_minutes: number | null
          failed_at: string | null
          id: string
          order_id: string
          package_dimensions: Json | null
          package_weight_kg: number | null
          picked_up_at: string | null
          pickup_address_id: string | null
          pickup_instructions: string | null
          pickup_latitude: number | null
          pickup_location: unknown
          pickup_longitude: number | null
          pickup_scheduled_at: string | null
          priority: number | null
          recipient_name: string
          recipient_phone: string
          recipient_signature_url: string | null
          sender_name: string | null
          sender_phone: string | null
          special_instructions: string | null
          status: Database["public"]["Enums"]["delivery_status"] | null
          updated_at: string
        }
        Insert: {
          actual_distance_km?: number | null
          actual_duration_minutes?: number | null
          assigned_at?: string | null
          assignment_number: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          courier_commission?: number | null
          courier_id: string
          courier_notes?: string | null
          created_at?: string
          customer_feedback?: string | null
          customer_rating?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          delivered_at?: string | null
          delivery_address_id: string
          delivery_fee?: number | null
          delivery_instructions?: string | null
          delivery_latitude?: number | null
          delivery_location?: unknown
          delivery_longitude?: number | null
          delivery_photo_url?: string | null
          delivery_proof_url?: string | null
          delivery_scheduled_at?: string | null
          estimated_distance_km?: number | null
          estimated_duration_minutes?: number | null
          failed_at?: string | null
          id?: string
          order_id: string
          package_dimensions?: Json | null
          package_weight_kg?: number | null
          picked_up_at?: string | null
          pickup_address_id?: string | null
          pickup_instructions?: string | null
          pickup_latitude?: number | null
          pickup_location?: unknown
          pickup_longitude?: number | null
          pickup_scheduled_at?: string | null
          priority?: number | null
          recipient_name: string
          recipient_phone: string
          recipient_signature_url?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["delivery_status"] | null
          updated_at?: string
        }
        Update: {
          actual_distance_km?: number | null
          actual_duration_minutes?: number | null
          assigned_at?: string | null
          assignment_number?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          courier_commission?: number | null
          courier_id?: string
          courier_notes?: string | null
          created_at?: string
          customer_feedback?: string | null
          customer_rating?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          delivered_at?: string | null
          delivery_address_id?: string
          delivery_fee?: number | null
          delivery_instructions?: string | null
          delivery_latitude?: number | null
          delivery_location?: unknown
          delivery_longitude?: number | null
          delivery_photo_url?: string | null
          delivery_proof_url?: string | null
          delivery_scheduled_at?: string | null
          estimated_distance_km?: number | null
          estimated_duration_minutes?: number | null
          failed_at?: string | null
          id?: string
          order_id?: string
          package_dimensions?: Json | null
          package_weight_kg?: number | null
          picked_up_at?: string | null
          pickup_address_id?: string | null
          pickup_instructions?: string | null
          pickup_latitude?: number | null
          pickup_location?: unknown
          pickup_longitude?: number | null
          pickup_scheduled_at?: string | null
          priority?: number | null
          recipient_name?: string
          recipient_phone?: string
          recipient_signature_url?: string | null
          sender_name?: string | null
          sender_phone?: string | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["delivery_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_assignments_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "courier_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_delivery_address_id_fkey"
            columns: ["delivery_address_id"]
            isOneToOne: false
            referencedRelation: "user_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_pickup_address_id_fkey"
            columns: ["pickup_address_id"]
            isOneToOne: false
            referencedRelation: "user_addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_exceptions: {
        Row: {
          additional_cost: number | null
          audio_note_url: string | null
          courier_id: string
          created_at: string
          customer_notification_sent_at: string | null
          customer_notified: boolean | null
          delay_minutes: number | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          delivery_assignment_id: string
          description: string
          escalated_at: string | null
          escalated_to: string | null
          escalation_reason: string | null
          exception_code: string | null
          exception_type: Database["public"]["Enums"]["delivery_exception_type"]
          id: string
          impact_on_delivery: string | null
          latitude: number | null
          location: unknown
          longitude: number | null
          metadata: Json | null
          photo_urls: string[] | null
          resolution_notes: string | null
          resolution_status: string | null
          resolved_at: string | null
          resolved_by: string | null
          retry_scheduled_at: string | null
          severity: string | null
          title: string
          updated_at: string
        }
        Insert: {
          additional_cost?: number | null
          audio_note_url?: string | null
          courier_id: string
          created_at?: string
          customer_notification_sent_at?: string | null
          customer_notified?: boolean | null
          delay_minutes?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          delivery_assignment_id: string
          description: string
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_reason?: string | null
          exception_code?: string | null
          exception_type: Database["public"]["Enums"]["delivery_exception_type"]
          id?: string
          impact_on_delivery?: string | null
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          metadata?: Json | null
          photo_urls?: string[] | null
          resolution_notes?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          retry_scheduled_at?: string | null
          severity?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          additional_cost?: number | null
          audio_note_url?: string | null
          courier_id?: string
          created_at?: string
          customer_notification_sent_at?: string | null
          customer_notified?: boolean | null
          delay_minutes?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          delivery_assignment_id?: string
          description?: string
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_reason?: string | null
          exception_code?: string | null
          exception_type?: Database["public"]["Enums"]["delivery_exception_type"]
          id?: string
          impact_on_delivery?: string | null
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          metadata?: Json | null
          photo_urls?: string[] | null
          resolution_notes?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          retry_scheduled_at?: string | null
          severity?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_exceptions_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "courier_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_exceptions_delivery_assignment_id_fkey"
            columns: ["delivery_assignment_id"]
            isOneToOne: false
            referencedRelation: "delivery_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_packages: {
        Row: {
          actual_delivery: string | null
          created_at: string | null
          current_location: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          delivery_fee: number | null
          delivery_instructions: string | null
          estimated_delivery: string | null
          estimated_delivery_date: string | null
          id: string
          last_status_update: string | null
          package_description: string | null
          package_dimensions: Json | null
          package_type: string | null
          package_weight: number | null
          priority: string | null
          proof_of_delivery: string | null
          recipient_address: string
          recipient_id: string | null
          recipient_lat: number | null
          recipient_lng: number | null
          recipient_name: string
          recipient_phone: string
          sender_address: string
          sender_id: string | null
          sender_lat: number | null
          sender_lng: number | null
          sender_name: string
          sender_phone: string
          status: string | null
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery?: string | null
          created_at?: string | null
          current_location?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          delivery_fee?: number | null
          delivery_instructions?: string | null
          estimated_delivery?: string | null
          estimated_delivery_date?: string | null
          id?: string
          last_status_update?: string | null
          package_description?: string | null
          package_dimensions?: Json | null
          package_type?: string | null
          package_weight?: number | null
          priority?: string | null
          proof_of_delivery?: string | null
          recipient_address: string
          recipient_id?: string | null
          recipient_lat?: number | null
          recipient_lng?: number | null
          recipient_name: string
          recipient_phone: string
          sender_address: string
          sender_id?: string | null
          sender_lat?: number | null
          sender_lng?: number | null
          sender_name: string
          sender_phone: string
          status?: string | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery?: string | null
          created_at?: string | null
          current_location?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          delivery_fee?: number | null
          delivery_instructions?: string | null
          estimated_delivery?: string | null
          estimated_delivery_date?: string | null
          id?: string
          last_status_update?: string | null
          package_description?: string | null
          package_dimensions?: Json | null
          package_type?: string | null
          package_weight?: number | null
          priority?: string | null
          proof_of_delivery?: string | null
          recipient_address?: string
          recipient_id?: string | null
          recipient_lat?: number | null
          recipient_lng?: number | null
          recipient_name?: string
          recipient_phone?: string
          sender_address?: string
          sender_id?: string | null
          sender_lat?: number | null
          sender_lng?: number | null
          sender_name?: string
          sender_phone?: string
          status?: string | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      delivery_routes: {
        Row: {
          actual_total_duration_minutes: number | null
          break_times: Json | null
          courier_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          delivery_assignments: string[] | null
          end_location: unknown
          estimated_total_duration_minutes: number | null
          fuel_cost_estimate: number | null
          id: string
          optimization_algorithm: string | null
          optimization_parameters: Json | null
          optimized_sequence: Json | null
          route_completed_at: string | null
          route_date: string
          route_efficiency_score: number | null
          route_name: string
          route_started_at: string | null
          route_status: string | null
          start_location: unknown
          total_distance_km: number | null
          traffic_conditions: Json | null
          updated_at: string
          waypoints: Json | null
          weather_conditions: Json | null
        }
        Insert: {
          actual_total_duration_minutes?: number | null
          break_times?: Json | null
          courier_id: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          delivery_assignments?: string[] | null
          end_location?: unknown
          estimated_total_duration_minutes?: number | null
          fuel_cost_estimate?: number | null
          id?: string
          optimization_algorithm?: string | null
          optimization_parameters?: Json | null
          optimized_sequence?: Json | null
          route_completed_at?: string | null
          route_date: string
          route_efficiency_score?: number | null
          route_name: string
          route_started_at?: string | null
          route_status?: string | null
          start_location?: unknown
          total_distance_km?: number | null
          traffic_conditions?: Json | null
          updated_at?: string
          waypoints?: Json | null
          weather_conditions?: Json | null
        }
        Update: {
          actual_total_duration_minutes?: number | null
          break_times?: Json | null
          courier_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          delivery_assignments?: string[] | null
          end_location?: unknown
          estimated_total_duration_minutes?: number | null
          fuel_cost_estimate?: number | null
          id?: string
          optimization_algorithm?: string | null
          optimization_parameters?: Json | null
          optimized_sequence?: Json | null
          route_completed_at?: string | null
          route_date?: string
          route_efficiency_score?: number | null
          route_name?: string
          route_started_at?: string | null
          route_status?: string | null
          start_location?: unknown
          total_distance_km?: number | null
          traffic_conditions?: Json | null
          updated_at?: string
          waypoints?: Json | null
          weather_conditions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_routes_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "courier_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_status_history: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          location: string | null
          notes: string | null
          package_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          package_id: string
          status: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          package_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_status_history_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "delivery_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_tracking: {
        Row: {
          accuracy_meters: number | null
          activity_type: string | null
          altitude: number | null
          battery_level: number | null
          courier_id: string
          created_at: string
          delivery_assignment_id: string
          device_info: Json | null
          distance_from_destination_km: number | null
          estimated_arrival_minutes: number | null
          heading_degrees: number | null
          id: string
          is_active_tracking: boolean | null
          latitude: number
          location: unknown
          longitude: number
          network_type: string | null
          signal_strength: number | null
          speed_kmh: number | null
          timestamp: string
          tracking_source: string | null
        }
        Insert: {
          accuracy_meters?: number | null
          activity_type?: string | null
          altitude?: number | null
          battery_level?: number | null
          courier_id: string
          created_at?: string
          delivery_assignment_id: string
          device_info?: Json | null
          distance_from_destination_km?: number | null
          estimated_arrival_minutes?: number | null
          heading_degrees?: number | null
          id?: string
          is_active_tracking?: boolean | null
          latitude: number
          location: unknown
          longitude: number
          network_type?: string | null
          signal_strength?: number | null
          speed_kmh?: number | null
          timestamp?: string
          tracking_source?: string | null
        }
        Update: {
          accuracy_meters?: number | null
          activity_type?: string | null
          altitude?: number | null
          battery_level?: number | null
          courier_id?: string
          created_at?: string
          delivery_assignment_id?: string
          device_info?: Json | null
          distance_from_destination_km?: number | null
          estimated_arrival_minutes?: number | null
          heading_degrees?: number | null
          id?: string
          is_active_tracking?: boolean | null
          latitude?: number
          location?: unknown
          longitude?: number
          network_type?: string | null
          signal_strength?: number | null
          speed_kmh?: number | null
          timestamp?: string
          tracking_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_tracking_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "courier_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_tracking_delivery_assignment_id_fkey"
            columns: ["delivery_assignment_id"]
            isOneToOne: false
            referencedRelation: "delivery_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_requirements: {
        Row: {
          balance_due_days_before: number | null
          created_at: string | null
          deposit_type: string
          deposit_value: number
          id: string
          is_active: boolean | null
          min_deposit_amount: number | null
          module_name: string
          updated_at: string | null
        }
        Insert: {
          balance_due_days_before?: number | null
          created_at?: string | null
          deposit_type?: string
          deposit_value: number
          id?: string
          is_active?: boolean | null
          min_deposit_amount?: number | null
          module_name: string
          updated_at?: string | null
        }
        Update: {
          balance_due_days_before?: number | null
          created_at?: string | null
          deposit_type?: string
          deposit_value?: number
          id?: string
          is_active?: boolean | null
          min_deposit_amount?: number | null
          module_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      driver_earnings: {
        Row: {
          amount: number
          commission: number
          created_at: string | null
          driver_id: string
          id: string
          net_earning: number
          payout_date: string | null
          payout_status: string | null
          ride_id: string | null
        }
        Insert: {
          amount: number
          commission: number
          created_at?: string | null
          driver_id: string
          id?: string
          net_earning: number
          payout_date?: string | null
          payout_status?: string | null
          ride_id?: string | null
        }
        Update: {
          amount?: number
          commission?: number
          created_at?: string | null
          driver_id?: string
          id?: string
          net_earning?: number
          payout_date?: string | null
          payout_status?: string | null
          ride_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_earnings_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_profiles: {
        Row: {
          created_at: string | null
          current_location: Json | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          heading: number | null
          id: string
          is_online: boolean | null
          is_verified: boolean | null
          last_location: unknown
          last_location_updated_at: string | null
          license_number: string
          rating: number | null
          speed: number | null
          subscription_tier: string | null
          total_rides: number | null
          updated_at: string | null
          user_id: string
          vehicle_info: Json | null
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string | null
          current_location?: Json | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          heading?: number | null
          id?: string
          is_online?: boolean | null
          is_verified?: boolean | null
          last_location?: unknown
          last_location_updated_at?: string | null
          license_number: string
          rating?: number | null
          speed?: number | null
          subscription_tier?: string | null
          total_rides?: number | null
          updated_at?: string | null
          user_id: string
          vehicle_info?: Json | null
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string | null
          current_location?: Json | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          heading?: number | null
          id?: string
          is_online?: boolean | null
          is_verified?: boolean | null
          last_location?: unknown
          last_location_updated_at?: string | null
          license_number?: string
          rating?: number | null
          speed?: number | null
          subscription_tier?: string | null
          total_rides?: number | null
          updated_at?: string | null
          user_id?: string
          vehicle_info?: Json | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_profiles_user_id_user_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_profiles_user_id_user_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_cart_items: {
        Row: {
          added_at: string | null
          cart_id: string | null
          id: string
          price_per_unit: number
          product_id: string | null
          quantity: number
          subtotal: number | null
          updated_at: string | null
          variant_id: string | null
        }
        Insert: {
          added_at?: string | null
          cart_id?: string | null
          id?: string
          price_per_unit: number
          product_id?: string | null
          quantity?: number
          subtotal?: number | null
          updated_at?: string | null
          variant_id?: string | null
        }
        Update: {
          added_at?: string | null
          cart_id?: string | null
          id?: string
          price_per_unit?: number
          product_id?: string | null
          quantity?: number
          subtotal?: number | null
          updated_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "active_ecommerce_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_carts: {
        Row: {
          created_at: string | null
          discount_amount: number | null
          expires_at: string | null
          id: string
          promo_code_id: string | null
          session_id: string | null
          shipping_cost: number | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          discount_amount?: number | null
          expires_at?: string | null
          id?: string
          promo_code_id?: string | null
          session_id?: string | null
          shipping_cost?: number | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          discount_amount?: number | null
          expires_at?: string | null
          id?: string
          promo_code_id?: string | null
          session_id?: string | null
          shipping_cost?: number | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_carts_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "marketplace_promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          icon_url: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          parent_id: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_order_items: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          id: string
          order_id: string | null
          price_per_unit: number
          product_id: string | null
          product_name: string
          product_slug: string | null
          product_snapshot: Json | null
          quantity: number
          sku: string | null
          status: string | null
          subtotal: number
          variant_id: string | null
          variant_name: string | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          id?: string
          order_id?: string | null
          price_per_unit: number
          product_id?: string | null
          product_name: string
          product_slug?: string | null
          product_snapshot?: Json | null
          quantity: number
          sku?: string | null
          status?: string | null
          subtotal: number
          variant_id?: string | null
          variant_name?: string | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          id?: string
          order_id?: string | null
          price_per_unit?: number
          product_id?: string | null
          product_name?: string
          product_slug?: string | null
          product_snapshot?: Json | null
          quantity?: number
          sku?: string | null
          status?: string | null
          subtotal?: number
          variant_id?: string | null
          variant_name?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "active_ecommerce_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_order_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_order_status_history: {
        Row: {
          created_at: string | null
          created_by: string | null
          from_status: string | null
          id: string
          notes: string | null
          order_id: string | null
          to_status: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          from_status?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          to_status: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          from_status?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_orders: {
        Row: {
          admin_notes: string | null
          billing_address_id: string | null
          cancellation_reason: string | null
          carrier: string | null
          created_at: string | null
          customer_notes: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          delivered_at: string | null
          discount_amount: number | null
          estimated_delivery_date: string | null
          guest_email: string | null
          id: string
          order_number: string
          paid_at: string | null
          payment_id: string | null
          payment_method: string | null
          payment_provider: string | null
          payment_status: string | null
          promo_code: string | null
          promo_code_id: string | null
          shipping_address_id: string | null
          shipping_cost: number | null
          status: string | null
          subtotal: number
          tax_amount: number | null
          total_amount: number
          tracking_number: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          billing_address_id?: string | null
          cancellation_reason?: string | null
          carrier?: string | null
          created_at?: string | null
          customer_notes?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          delivered_at?: string | null
          discount_amount?: number | null
          estimated_delivery_date?: string | null
          guest_email?: string | null
          id?: string
          order_number: string
          paid_at?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_status?: string | null
          promo_code?: string | null
          promo_code_id?: string | null
          shipping_address_id?: string | null
          shipping_cost?: number | null
          status?: string | null
          subtotal: number
          tax_amount?: number | null
          total_amount: number
          tracking_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          billing_address_id?: string | null
          cancellation_reason?: string | null
          carrier?: string | null
          created_at?: string | null
          customer_notes?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          delivered_at?: string | null
          discount_amount?: number | null
          estimated_delivery_date?: string | null
          guest_email?: string | null
          id?: string
          order_number?: string
          paid_at?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_status?: string | null
          promo_code?: string | null
          promo_code_id?: string | null
          shipping_address_id?: string | null
          shipping_cost?: number | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_orders_billing_address_id_fkey"
            columns: ["billing_address_id"]
            isOneToOne: false
            referencedRelation: "user_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_orders_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "marketplace_promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "user_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_product_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          helpful_count: number | null
          id: string
          images: string[] | null
          is_approved: boolean | null
          is_featured: boolean | null
          is_verified: boolean | null
          order_id: string | null
          product_id: string | null
          rating: number
          title: string | null
          unhelpful_count: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          helpful_count?: number | null
          id?: string
          images?: string[] | null
          is_approved?: boolean | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          order_id?: string | null
          product_id?: string | null
          rating: number
          title?: string | null
          unhelpful_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          helpful_count?: number | null
          id?: string
          images?: string[] | null
          is_approved?: boolean | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          order_id?: string | null
          product_id?: string | null
          rating?: number
          title?: string | null
          unhelpful_count?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "active_ecommerce_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_products"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_product_variants: {
        Row: {
          attributes: Json
          created_at: string | null
          id: string
          images: string[] | null
          is_active: boolean | null
          price_adjustment: number | null
          product_id: string | null
          sku: string | null
          stock_quantity: number | null
          updated_at: string | null
          variant_name: string
        }
        Insert: {
          attributes?: Json
          created_at?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          price_adjustment?: number | null
          product_id?: string | null
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string | null
          variant_name: string
        }
        Update: {
          attributes?: Json
          created_at?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          price_adjustment?: number | null
          product_id?: string | null
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string | null
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "active_ecommerce_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_products"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_products: {
        Row: {
          allow_backorder: boolean | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          attributes: Json | null
          average_rating: number | null
          base_price: number
          category_id: string | null
          cost_price: number | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          description: string | null
          dimensions: Json | null
          discount_percentage: number | null
          final_price: number | null
          id: string
          images: string[] | null
          is_active: boolean | null
          is_featured: boolean | null
          low_stock_threshold: number | null
          meta_description: string | null
          meta_keywords: string[] | null
          meta_title: string | null
          name: string
          order_count: number | null
          published_at: string | null
          rejection_reason: string | null
          requires_shipping: boolean | null
          review_count: number | null
          short_description: string | null
          sku: string | null
          slug: string
          specifications: Json | null
          stock_quantity: number | null
          thumbnail: string | null
          track_inventory: boolean | null
          updated_at: string | null
          vendor_id: string | null
          video_url: string | null
          view_count: number | null
          weight: number | null
        }
        Insert: {
          allow_backorder?: boolean | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attributes?: Json | null
          average_rating?: number | null
          base_price: number
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          dimensions?: Json | null
          discount_percentage?: number | null
          final_price?: number | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          low_stock_threshold?: number | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          meta_title?: string | null
          name: string
          order_count?: number | null
          published_at?: string | null
          rejection_reason?: string | null
          requires_shipping?: boolean | null
          review_count?: number | null
          short_description?: string | null
          sku?: string | null
          slug: string
          specifications?: Json | null
          stock_quantity?: number | null
          thumbnail?: string | null
          track_inventory?: boolean | null
          updated_at?: string | null
          vendor_id?: string | null
          video_url?: string | null
          view_count?: number | null
          weight?: number | null
        }
        Update: {
          allow_backorder?: boolean | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attributes?: Json | null
          average_rating?: number | null
          base_price?: number
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          dimensions?: Json | null
          discount_percentage?: number | null
          final_price?: number | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          low_stock_threshold?: number | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          meta_title?: string | null
          name?: string
          order_count?: number | null
          published_at?: string | null
          rejection_reason?: string | null
          requires_shipping?: boolean | null
          review_count?: number | null
          short_description?: string | null
          sku?: string | null
          slug?: string
          specifications?: Json | null
          stock_quantity?: number | null
          thumbnail?: string | null
          track_inventory?: boolean | null
          updated_at?: string | null
          vendor_id?: string | null
          video_url?: string | null
          view_count?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_vendors: {
        Row: {
          account_name: string | null
          account_number: string | null
          average_rating: number | null
          bank_name: string | null
          business_name: string
          business_registration: string | null
          commission_rate: number | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          tax_id: string | null
          total_orders: number | null
          total_sales: number | null
          updated_at: string | null
          user_id: string | null
          verified_at: string | null
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          average_rating?: number | null
          bank_name?: string | null
          business_name: string
          business_registration?: string | null
          commission_rate?: number | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          id: string
          is_active?: boolean | null
          is_verified?: boolean | null
          tax_id?: string | null
          total_orders?: number | null
          total_sales?: number | null
          updated_at?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          average_rating?: number | null
          bank_name?: string | null
          business_name?: string
          business_registration?: string | null
          commission_rate?: number | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          tax_id?: string | null
          total_orders?: number | null
          total_sales?: number | null
          updated_at?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_vendors_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_vendors_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_wishlists: {
        Row: {
          added_at: string | null
          id: string
          product_id: string | null
          user_id: string | null
        }
        Insert: {
          added_at?: string | null
          id?: string
          product_id?: string | null
          user_id?: string | null
        }
        Update: {
          added_at?: string | null
          id?: string
          product_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "active_ecommerce_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_products"
            referencedColumns: ["id"]
          },
        ]
      }
      edge_function_inventory: {
        Row: {
          analyzed_by: string | null
          category: string
          code_quality_score: number | null
          compute_intensity: number
          consolidation_target: string | null
          created_at: string | null
          database_intensity: number
          error_handling_quality: number | null
          external_services: string[] | null
          function_name: string
          function_slug: string
          has_external_deps: boolean
          id: string
          input_params: Json | null
          migration_complexity: string | null
          migration_priority: number | null
          module_type: string
          notes: string | null
          output_format: Json | null
          primary_tables: string[] | null
          purpose: string
          recommended_platform: string
          secondary_tables: string[] | null
          status: string
          supabase_id: string
          traffic_pattern: string
          updated_at: string | null
          usage_frequency: string
          verify_jwt: boolean
        }
        Insert: {
          analyzed_by?: string | null
          category: string
          code_quality_score?: number | null
          compute_intensity: number
          consolidation_target?: string | null
          created_at?: string | null
          database_intensity: number
          error_handling_quality?: number | null
          external_services?: string[] | null
          function_name: string
          function_slug: string
          has_external_deps?: boolean
          id?: string
          input_params?: Json | null
          migration_complexity?: string | null
          migration_priority?: number | null
          module_type: string
          notes?: string | null
          output_format?: Json | null
          primary_tables?: string[] | null
          purpose: string
          recommended_platform: string
          secondary_tables?: string[] | null
          status?: string
          supabase_id: string
          traffic_pattern: string
          updated_at?: string | null
          usage_frequency: string
          verify_jwt?: boolean
        }
        Update: {
          analyzed_by?: string | null
          category?: string
          code_quality_score?: number | null
          compute_intensity?: number
          consolidation_target?: string | null
          created_at?: string | null
          database_intensity?: number
          error_handling_quality?: number | null
          external_services?: string[] | null
          function_name?: string
          function_slug?: string
          has_external_deps?: boolean
          id?: string
          input_params?: Json | null
          migration_complexity?: string | null
          migration_priority?: number | null
          module_type?: string
          notes?: string | null
          output_format?: Json | null
          primary_tables?: string[] | null
          purpose?: string
          recommended_platform?: string
          secondary_tables?: string[] | null
          status?: string
          supabase_id?: string
          traffic_pattern?: string
          updated_at?: string | null
          usage_frequency?: string
          verify_jwt?: boolean
        }
        Relationships: []
      }
      escrow_transactions: {
        Row: {
          commission_amount: number
          gross_amount: number
          held_at: string | null
          id: string
          metadata: Json | null
          module_name: string
          net_amount: number
          payment_id: string
          release_reason: string | null
          release_trigger: string | null
          released_at: string | null
          released_by: string | null
          status: string
          vendor_id: string
          vendor_type: string
        }
        Insert: {
          commission_amount: number
          gross_amount: number
          held_at?: string | null
          id?: string
          metadata?: Json | null
          module_name: string
          net_amount: number
          payment_id: string
          release_reason?: string | null
          release_trigger?: string | null
          released_at?: string | null
          released_by?: string | null
          status?: string
          vendor_id: string
          vendor_type: string
        }
        Update: {
          commission_amount?: number
          gross_amount?: number
          held_at?: string | null
          id?: string
          metadata?: Json | null
          module_name?: string
          net_amount?: number
          payment_id?: string
          release_reason?: string | null
          release_trigger?: string | null
          released_at?: string | null
          released_by?: string | null
          status?: string
          vendor_id?: string
          vendor_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      event_promo_code_usage: {
        Row: {
          discount_amount: number
          event_ticket_id: string
          id: string
          promo_code_id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          discount_amount: number
          event_ticket_id: string
          id?: string
          promo_code_id: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          discount_amount?: number
          event_ticket_id?: string
          id?: string
          promo_code_id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_promo_code_usage_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "event_promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      event_promo_codes: {
        Row: {
          applicable_event_types: string[] | null
          applicable_events: string[] | null
          applicable_ticket_tiers: string[] | null
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          early_bird_only: boolean | null
          excluded_events: string[] | null
          first_booking_only: boolean | null
          id: string
          is_active: boolean | null
          max_discount_amount: number | null
          min_order_amount: number | null
          min_tickets: number | null
          per_user_limit: number | null
          student_only: boolean | null
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applicable_event_types?: string[] | null
          applicable_events?: string[] | null
          applicable_ticket_tiers?: string[] | null
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          early_bird_only?: boolean | null
          excluded_events?: string[] | null
          first_booking_only?: boolean | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_amount?: number | null
          min_tickets?: number | null
          per_user_limit?: number | null
          student_only?: boolean | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applicable_event_types?: string[] | null
          applicable_events?: string[] | null
          applicable_ticket_tiers?: string[] | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          early_bird_only?: boolean | null
          excluded_events?: string[] | null
          first_booking_only?: boolean | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_amount?: number | null
          min_tickets?: number | null
          per_user_limit?: number | null
          student_only?: boolean | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      failed_payment_attempts: {
        Row: {
          amount: number
          card_brand: string | null
          card_last4: string | null
          created_at: string | null
          failure_reason: string
          id: string
          ip_address: unknown
          is_suspicious: boolean | null
          payment_method: string
          payment_provider: string
          provider_error_code: string | null
          provider_error_message: string | null
          risk_score: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          card_brand?: string | null
          card_last4?: string | null
          created_at?: string | null
          failure_reason: string
          id?: string
          ip_address?: unknown
          is_suspicious?: boolean | null
          payment_method: string
          payment_provider: string
          provider_error_code?: string | null
          provider_error_message?: string | null
          risk_score?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          card_brand?: string | null
          card_last4?: string | null
          created_at?: string | null
          failure_reason?: string
          id?: string
          ip_address?: unknown
          is_suspicious?: boolean | null
          payment_method?: string
          payment_provider?: string
          provider_error_code?: string | null
          provider_error_message?: string | null
          risk_score?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      favorite_hotels: {
        Row: {
          created_at: string | null
          hotel_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          hotel_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          hotel_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_hotels_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "active_hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_hotels_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_hotels_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "v_hotels_search"
            referencedColumns: ["id"]
          },
        ]
      }
      file_metadata: {
        Row: {
          access_level: string
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          entity_id: string
          entity_type: string
          expires_at: string | null
          id: string
          metadata: Json | null
          mime_type: string
          original_name: string
          processing_results: Json | null
          size_bytes: number
          status: string
          storage_path: string
          tags: string[] | null
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          access_level?: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          entity_id: string
          entity_type: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          mime_type: string
          original_name: string
          processing_results?: Json | null
          size_bytes: number
          status?: string
          storage_path: string
          tags?: string[] | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          access_level?: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          entity_id?: string
          entity_type?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          mime_type?: string
          original_name?: string
          processing_results?: Json | null
          size_bytes?: number
          status?: string
          storage_path?: string
          tags?: string[] | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_metadata_uploaded_by_user_profiles_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_metadata_uploaded_by_user_profiles_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      function_classification: {
        Row: {
          analysis_version: string | null
          analyzed_by: string | null
          audit_logging_required: boolean | null
          avg_requests_per_minute: number | null
          avg_response_time_ms: number | null
          business_criticality: string
          category: string
          compliance_requirements: string[] | null
          compute_intensity: number
          created_at: string | null
          database_intensity: number
          database_tables: string[] | null
          dependent_functions: string[] | null
          error_rate_percentage: number | null
          estimated_cpu_cores: number | null
          estimated_memory_mb: number | null
          estimated_storage_mb: number | null
          external_services: string[] | null
          function_name: string
          function_slug: string
          id: string
          io_intensity: number
          memory_intensity: number
          migration_complexity: string
          migration_priority: number
          module_type: string
          notes: string | null
          p95_response_time_ms: number | null
          p99_response_time_ms: number | null
          peak_concurrent_users: number | null
          platform_confidence: number
          recommended_platform: string
          revenue_impact: string | null
          security_level: string
          subcategory: string | null
          traffic_pattern: string
          updated_at: string | null
          usage_frequency: string
          user_impact_score: number | null
        }
        Insert: {
          analysis_version?: string | null
          analyzed_by?: string | null
          audit_logging_required?: boolean | null
          avg_requests_per_minute?: number | null
          avg_response_time_ms?: number | null
          business_criticality?: string
          category: string
          compliance_requirements?: string[] | null
          compute_intensity: number
          created_at?: string | null
          database_intensity: number
          database_tables?: string[] | null
          dependent_functions?: string[] | null
          error_rate_percentage?: number | null
          estimated_cpu_cores?: number | null
          estimated_memory_mb?: number | null
          estimated_storage_mb?: number | null
          external_services?: string[] | null
          function_name: string
          function_slug: string
          id?: string
          io_intensity?: number
          memory_intensity?: number
          migration_complexity?: string
          migration_priority?: number
          module_type: string
          notes?: string | null
          p95_response_time_ms?: number | null
          p99_response_time_ms?: number | null
          peak_concurrent_users?: number | null
          platform_confidence?: number
          recommended_platform: string
          revenue_impact?: string | null
          security_level?: string
          subcategory?: string | null
          traffic_pattern: string
          updated_at?: string | null
          usage_frequency: string
          user_impact_score?: number | null
        }
        Update: {
          analysis_version?: string | null
          analyzed_by?: string | null
          audit_logging_required?: boolean | null
          avg_requests_per_minute?: number | null
          avg_response_time_ms?: number | null
          business_criticality?: string
          category?: string
          compliance_requirements?: string[] | null
          compute_intensity?: number
          created_at?: string | null
          database_intensity?: number
          database_tables?: string[] | null
          dependent_functions?: string[] | null
          error_rate_percentage?: number | null
          estimated_cpu_cores?: number | null
          estimated_memory_mb?: number | null
          estimated_storage_mb?: number | null
          external_services?: string[] | null
          function_name?: string
          function_slug?: string
          id?: string
          io_intensity?: number
          memory_intensity?: number
          migration_complexity?: string
          migration_priority?: number
          module_type?: string
          notes?: string | null
          p95_response_time_ms?: number | null
          p99_response_time_ms?: number | null
          peak_concurrent_users?: number | null
          platform_confidence?: number
          recommended_platform?: string
          revenue_impact?: string | null
          security_level?: string
          subcategory?: string | null
          traffic_pattern?: string
          updated_at?: string | null
          usage_frequency?: string
          user_impact_score?: number | null
        }
        Relationships: []
      }
      function_consolidation_actions: {
        Row: {
          action_type: string
          completed_at: string | null
          completion_notes: string | null
          consolidation_method: string | null
          created_at: string | null
          created_by: string | null
          id: string
          impact_assessment: string | null
          reason: string
          source_function_name: string
          source_function_slug: string
          source_supabase_id: string
          status: string
          target_function_name: string | null
          target_function_slug: string | null
          target_supabase_id: string | null
        }
        Insert: {
          action_type: string
          completed_at?: string | null
          completion_notes?: string | null
          consolidation_method?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          impact_assessment?: string | null
          reason: string
          source_function_name: string
          source_function_slug: string
          source_supabase_id: string
          status?: string
          target_function_name?: string | null
          target_function_slug?: string | null
          target_supabase_id?: string | null
        }
        Update: {
          action_type?: string
          completed_at?: string | null
          completion_notes?: string | null
          consolidation_method?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          impact_assessment?: string | null
          reason?: string
          source_function_name?: string
          source_function_slug?: string
          source_supabase_id?: string
          status?: string
          target_function_name?: string | null
          target_function_slug?: string | null
          target_supabase_id?: string | null
        }
        Relationships: []
      }
      function_dependencies: {
        Row: {
          created_at: string | null
          dependency_type: string
          depends_on_table: string
          function_name: string
          id: string
          is_critical: boolean | null
          notes: string | null
        }
        Insert: {
          created_at?: string | null
          dependency_type: string
          depends_on_table: string
          function_name: string
          id?: string
          is_critical?: boolean | null
          notes?: string | null
        }
        Update: {
          created_at?: string | null
          dependency_type?: string
          depends_on_table?: string
          function_name?: string
          id?: string
          is_critical?: boolean | null
          notes?: string | null
        }
        Relationships: []
      }
      function_dependencies_map: {
        Row: {
          called_by_functions: string[] | null
          calls_functions: string[] | null
          created_at: string | null
          database_functions: string[] | null
          dependency_complexity_score: number | null
          external_apis: string[] | null
          external_services: string[] | null
          function_name: string
          id: string
          migration_risk_level: string | null
          primary_tables: string[]
          secondary_tables: string[] | null
          updated_at: string | null
          used_by_clients: string[] | null
        }
        Insert: {
          called_by_functions?: string[] | null
          calls_functions?: string[] | null
          created_at?: string | null
          database_functions?: string[] | null
          dependency_complexity_score?: number | null
          external_apis?: string[] | null
          external_services?: string[] | null
          function_name: string
          id?: string
          migration_risk_level?: string | null
          primary_tables?: string[]
          secondary_tables?: string[] | null
          updated_at?: string | null
          used_by_clients?: string[] | null
        }
        Update: {
          called_by_functions?: string[] | null
          calls_functions?: string[] | null
          created_at?: string | null
          database_functions?: string[] | null
          dependency_complexity_score?: number | null
          external_apis?: string[] | null
          external_services?: string[] | null
          function_name?: string
          id?: string
          migration_risk_level?: string | null
          primary_tables?: string[]
          secondary_tables?: string[] | null
          updated_at?: string | null
          used_by_clients?: string[] | null
        }
        Relationships: []
      }
      function_improvement_plan: {
        Row: {
          created_at: string | null
          current_score: number | null
          dependencies: string[] | null
          estimated_effort_hours: number | null
          function_name: string
          id: string
          implementation_priority: number | null
          improvement_category: string
          improvement_description: string
          status: string | null
          target_score: number | null
        }
        Insert: {
          created_at?: string | null
          current_score?: number | null
          dependencies?: string[] | null
          estimated_effort_hours?: number | null
          function_name: string
          id?: string
          implementation_priority?: number | null
          improvement_category: string
          improvement_description: string
          status?: string | null
          target_score?: number | null
        }
        Update: {
          created_at?: string | null
          current_score?: number | null
          dependencies?: string[] | null
          estimated_effort_hours?: number | null
          function_name?: string
          id?: string
          implementation_priority?: number | null
          improvement_category?: string
          improvement_description?: string
          status?: string | null
          target_score?: number | null
        }
        Relationships: []
      }
      function_openapi_specs: {
        Row: {
          created_at: string | null
          deprecated: boolean | null
          description: string
          endpoint_path: string
          error_response_schemas: Json
          external_docs: Json | null
          full_openapi_spec: Json | null
          function_name: string
          function_slug: string
          generated_by: string | null
          header_parameters: Json | null
          http_method: string
          id: string
          openapi_version: string | null
          operation_id: string
          path_parameters: Json | null
          query_parameters: Json | null
          request_content_type: string | null
          request_examples: Json | null
          request_schema: Json | null
          required_permissions: string[] | null
          requires_authentication: boolean | null
          response_examples: Json | null
          security_schemes: string[] | null
          success_response_schema: Json
          summary: string
          tags: string[]
          title: string
          updated_at: string | null
          version: string | null
        }
        Insert: {
          created_at?: string | null
          deprecated?: boolean | null
          description: string
          endpoint_path: string
          error_response_schemas: Json
          external_docs?: Json | null
          full_openapi_spec?: Json | null
          function_name: string
          function_slug: string
          generated_by?: string | null
          header_parameters?: Json | null
          http_method: string
          id?: string
          openapi_version?: string | null
          operation_id: string
          path_parameters?: Json | null
          query_parameters?: Json | null
          request_content_type?: string | null
          request_examples?: Json | null
          request_schema?: Json | null
          required_permissions?: string[] | null
          requires_authentication?: boolean | null
          response_examples?: Json | null
          security_schemes?: string[] | null
          success_response_schema: Json
          summary: string
          tags: string[]
          title: string
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          created_at?: string | null
          deprecated?: boolean | null
          description?: string
          endpoint_path?: string
          error_response_schemas?: Json
          external_docs?: Json | null
          full_openapi_spec?: Json | null
          function_name?: string
          function_slug?: string
          generated_by?: string | null
          header_parameters?: Json | null
          http_method?: string
          id?: string
          openapi_version?: string | null
          operation_id?: string
          path_parameters?: Json | null
          query_parameters?: Json | null
          request_content_type?: string | null
          request_examples?: Json | null
          request_schema?: Json | null
          required_permissions?: string[] | null
          requires_authentication?: boolean | null
          response_examples?: Json | null
          security_schemes?: string[] | null
          success_response_schema?: Json
          summary?: string
          tags?: string[]
          title?: string
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      function_quality_standards: {
        Row: {
          compliance_criteria: string
          created_at: string | null
          description: string
          example_code: string | null
          id: string
          priority_level: number | null
          standard_category: string
          standard_name: string
        }
        Insert: {
          compliance_criteria: string
          created_at?: string | null
          description: string
          example_code?: string | null
          id?: string
          priority_level?: number | null
          standard_category: string
          standard_name: string
        }
        Update: {
          compliance_criteria?: string
          created_at?: string | null
          description?: string
          example_code?: string | null
          id?: string
          priority_level?: number | null
          standard_category?: string
          standard_name?: string
        }
        Relationships: []
      }
      function_standardization_audit: {
        Row: {
          audit_date: string | null
          audited_by: string | null
          auth_validation_score: number | null
          compliance_level: string | null
          cors_handling_score: number | null
          error_handling_score: number | null
          function_name: string
          function_slug: string
          has_auth_validation: boolean | null
          has_comprehensive_logging: boolean | null
          has_consistent_response_format: boolean | null
          has_cors_preflight: boolean | null
          has_input_validation: boolean | null
          has_structured_error_handling: boolean | null
          has_transaction_handling: boolean | null
          id: string
          identified_issues: string[] | null
          improvement_recommendations: string[] | null
          input_validation_score: number | null
          logging_quality_score: number | null
          notes: string | null
          overall_compliance_score: number | null
          response_format_score: number | null
          standardization_status: string | null
        }
        Insert: {
          audit_date?: string | null
          audited_by?: string | null
          auth_validation_score?: number | null
          compliance_level?: string | null
          cors_handling_score?: number | null
          error_handling_score?: number | null
          function_name: string
          function_slug: string
          has_auth_validation?: boolean | null
          has_comprehensive_logging?: boolean | null
          has_consistent_response_format?: boolean | null
          has_cors_preflight?: boolean | null
          has_input_validation?: boolean | null
          has_structured_error_handling?: boolean | null
          has_transaction_handling?: boolean | null
          id?: string
          identified_issues?: string[] | null
          improvement_recommendations?: string[] | null
          input_validation_score?: number | null
          logging_quality_score?: number | null
          notes?: string | null
          overall_compliance_score?: number | null
          response_format_score?: number | null
          standardization_status?: string | null
        }
        Update: {
          audit_date?: string | null
          audited_by?: string | null
          auth_validation_score?: number | null
          compliance_level?: string | null
          cors_handling_score?: number | null
          error_handling_score?: number | null
          function_name?: string
          function_slug?: string
          has_auth_validation?: boolean | null
          has_comprehensive_logging?: boolean | null
          has_consistent_response_format?: boolean | null
          has_cors_preflight?: boolean | null
          has_input_validation?: boolean | null
          has_structured_error_handling?: boolean | null
          has_transaction_handling?: boolean | null
          id?: string
          identified_issues?: string[] | null
          improvement_recommendations?: string[] | null
          input_validation_score?: number | null
          logging_quality_score?: number | null
          notes?: string | null
          overall_compliance_score?: number | null
          response_format_score?: number | null
          standardization_status?: string | null
        }
        Relationships: []
      }
      host_profiles: {
        Row: {
          business_name: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          description: string | null
          host_type: string | null
          id: string
          is_verified: boolean | null
          rating: number | null
          response_rate: number | null
          response_time: number | null
          subscription_tier: string | null
          total_bookings: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          host_type?: string | null
          id?: string
          is_verified?: boolean | null
          rating?: number | null
          response_rate?: number | null
          response_time?: number | null
          subscription_tier?: string | null
          total_bookings?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          business_name?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          host_type?: string | null
          id?: string
          is_verified?: boolean | null
          rating?: number | null
          response_rate?: number | null
          response_time?: number | null
          subscription_tier?: string | null
          total_bookings?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "host_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "host_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_amenities: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      hotel_amenity_mappings: {
        Row: {
          amenity_id: string
          created_at: string | null
          hotel_id: string
        }
        Insert: {
          amenity_id: string
          created_at?: string | null
          hotel_id: string
        }
        Update: {
          amenity_id?: string
          created_at?: string | null
          hotel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_amenity_mappings_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "hotel_amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_amenity_mappings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "active_hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_amenity_mappings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_amenity_mappings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "v_hotels_search"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_booking_status_history: {
        Row: {
          booking_id: string
          changed_by: string | null
          created_at: string | null
          from_status: string | null
          id: string
          notes: string | null
          to_status: string
        }
        Insert: {
          booking_id: string
          changed_by?: string | null
          created_at?: string | null
          from_status?: string | null
          id?: string
          notes?: string | null
          to_status: string
        }
        Update: {
          booking_id?: string
          changed_by?: string | null
          created_at?: string | null
          from_status?: string | null
          id?: string
          notes?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_booking_status_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "hotel_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_bookings: {
        Row: {
          booking_number: string
          booking_status: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          check_in_date: string
          check_out_date: string
          checked_in_at: string | null
          checked_out_at: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          discount_amount: number | null
          estimated_arrival_time: string | null
          guest_count: Json
          guest_email: string
          guest_name: string
          guest_phone: string
          hotel_id: string
          id: string
          number_of_nights: number
          number_of_rooms: number
          payment_status: string | null
          promo_code: string | null
          promo_code_id: string | null
          purpose_of_visit: string | null
          room_id: string | null
          room_rate: number
          room_type_id: string
          service_fee: number | null
          special_requests: string | null
          subtotal: number
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          booking_number: string
          booking_status?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          check_in_date: string
          check_out_date: string
          checked_in_at?: string | null
          checked_out_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          discount_amount?: number | null
          estimated_arrival_time?: string | null
          guest_count: Json
          guest_email: string
          guest_name: string
          guest_phone: string
          hotel_id: string
          id?: string
          number_of_nights: number
          number_of_rooms?: number
          payment_status?: string | null
          promo_code?: string | null
          promo_code_id?: string | null
          purpose_of_visit?: string | null
          room_id?: string | null
          room_rate: number
          room_type_id: string
          service_fee?: number | null
          special_requests?: string | null
          subtotal: number
          tax_amount?: number | null
          total_amount: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          booking_number?: string
          booking_status?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          check_in_date?: string
          check_out_date?: string
          checked_in_at?: string | null
          checked_out_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          discount_amount?: number | null
          estimated_arrival_time?: string | null
          guest_count?: Json
          guest_email?: string
          guest_name?: string
          guest_phone?: string
          hotel_id?: string
          id?: string
          number_of_nights?: number
          number_of_rooms?: number
          payment_status?: string | null
          promo_code?: string | null
          promo_code_id?: string | null
          purpose_of_visit?: string | null
          room_id?: string | null
          room_rate?: number
          room_type_id?: string
          service_fee?: number | null
          special_requests?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_bookings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "active_hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_bookings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_bookings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "v_hotels_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_bookings_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_bookings_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "v_room_availability_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_photos: {
        Row: {
          caption: string | null
          created_at: string | null
          display_order: number | null
          hotel_id: string
          id: string
          is_featured: boolean | null
          photo_type: string | null
          room_type_id: string | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          hotel_id: string
          id?: string
          is_featured?: boolean | null
          photo_type?: string | null
          room_type_id?: string | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          hotel_id?: string
          id?: string
          is_featured?: boolean | null
          photo_type?: string | null
          room_type_id?: string | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_photos_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "active_hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_photos_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_photos_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "v_hotels_search"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_photos_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_photos_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "v_room_availability_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_promo_code_usage: {
        Row: {
          booking_id: string
          discount_amount: number
          id: string
          promo_code_id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          booking_id: string
          discount_amount: number
          id?: string
          promo_code_id: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          booking_id?: string
          discount_amount?: number
          id?: string
          promo_code_id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_promo_code_usage_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "hotel_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_promo_code_usage_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "hotel_promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_promo_codes: {
        Row: {
          applicable_hotels: string[] | null
          applicable_room_types: string[] | null
          applies_to_weekends_only: boolean | null
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          excluded_hotels: string[] | null
          first_booking_only: boolean | null
          id: string
          is_active: boolean | null
          max_discount_amount: number | null
          min_nights: number | null
          min_order_amount: number | null
          per_user_limit: number | null
          requires_early_booking_days: number | null
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applicable_hotels?: string[] | null
          applicable_room_types?: string[] | null
          applies_to_weekends_only?: boolean | null
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          excluded_hotels?: string[] | null
          first_booking_only?: boolean | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_nights?: number | null
          min_order_amount?: number | null
          per_user_limit?: number | null
          requires_early_booking_days?: number | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applicable_hotels?: string[] | null
          applicable_room_types?: string[] | null
          applies_to_weekends_only?: boolean | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          excluded_hotels?: string[] | null
          first_booking_only?: boolean | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_nights?: number | null
          min_order_amount?: number | null
          per_user_limit?: number | null
          requires_early_booking_days?: number | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      hotel_reviews: {
        Row: {
          booking_id: string
          cleanliness_rating: number | null
          comfort_rating: number | null
          comment: string | null
          created_at: string | null
          helpful_count: number | null
          hotel_id: string
          id: string
          images: string[] | null
          is_approved: boolean | null
          is_featured: boolean | null
          is_verified: boolean | null
          location_rating: number | null
          rating: number
          responded_at: string | null
          response_from_host: string | null
          service_rating: number | null
          title: string | null
          updated_at: string | null
          user_id: string
          value_rating: number | null
        }
        Insert: {
          booking_id: string
          cleanliness_rating?: number | null
          comfort_rating?: number | null
          comment?: string | null
          created_at?: string | null
          helpful_count?: number | null
          hotel_id: string
          id?: string
          images?: string[] | null
          is_approved?: boolean | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          location_rating?: number | null
          rating: number
          responded_at?: string | null
          response_from_host?: string | null
          service_rating?: number | null
          title?: string | null
          updated_at?: string | null
          user_id: string
          value_rating?: number | null
        }
        Update: {
          booking_id?: string
          cleanliness_rating?: number | null
          comfort_rating?: number | null
          comment?: string | null
          created_at?: string | null
          helpful_count?: number | null
          hotel_id?: string
          id?: string
          images?: string[] | null
          is_approved?: boolean | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          location_rating?: number | null
          rating?: number
          responded_at?: string | null
          response_from_host?: string | null
          service_rating?: number | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
          value_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "hotel_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_reviews_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "active_hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_reviews_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_reviews_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "v_hotels_search"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          address: string
          amenities: string[] | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          average_rating: number | null
          cancellation_policy: string | null
          check_in_time: string
          check_out_time: string
          city: string
          country: string
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          description: string | null
          email: string | null
          featured_image: string | null
          host_id: string
          house_rules: string | null
          id: string
          images: string[] | null
          is_active: boolean | null
          is_verified: boolean | null
          latitude: number | null
          location: unknown
          longitude: number | null
          name: string
          nearby_attractions: Json | null
          phone: string | null
          policies: Json | null
          postal_code: string | null
          rejection_reason: string | null
          short_description: string | null
          slug: string
          star_rating: number | null
          state: string | null
          total_bookings: number | null
          total_reviews: number | null
          updated_at: string | null
          verified_at: string | null
          video_url: string | null
          website: string | null
        }
        Insert: {
          address: string
          amenities?: string[] | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          average_rating?: number | null
          cancellation_policy?: string | null
          check_in_time?: string
          check_out_time?: string
          city: string
          country: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          email?: string | null
          featured_image?: string | null
          host_id: string
          house_rules?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          name: string
          nearby_attractions?: Json | null
          phone?: string | null
          policies?: Json | null
          postal_code?: string | null
          rejection_reason?: string | null
          short_description?: string | null
          slug: string
          star_rating?: number | null
          state?: string | null
          total_bookings?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          verified_at?: string | null
          video_url?: string | null
          website?: string | null
        }
        Update: {
          address?: string
          amenities?: string[] | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          average_rating?: number | null
          cancellation_policy?: string | null
          check_in_time?: string
          check_out_time?: string
          city?: string
          country?: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          email?: string | null
          featured_image?: string | null
          host_id?: string
          house_rules?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          name?: string
          nearby_attractions?: Json | null
          phone?: string | null
          policies?: Json | null
          postal_code?: string | null
          rejection_reason?: string | null
          short_description?: string | null
          slug?: string
          star_rating?: number | null
          state?: string | null
          total_bookings?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          verified_at?: string | null
          video_url?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotels_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "host_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      in_app_notifications: {
        Row: {
          action_text: string | null
          action_url: string | null
          category: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          action_text?: string | null
          action_url?: string | null
          category?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          action_text?: string | null
          action_url?: string | null
          category?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      marketplace_promo_code_usage: {
        Row: {
          discount_amount: number
          id: string
          order_id: string | null
          promo_code_id: string | null
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          discount_amount: number
          id?: string
          order_id?: string | null
          promo_code_id?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          discount_amount?: number
          id?: string
          order_id?: string | null
          promo_code_id?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_promo_code_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_promo_code_usage_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "marketplace_promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_promo_codes: {
        Row: {
          applicable_categories: string[] | null
          applicable_products: string[] | null
          applicable_vendors: string[] | null
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          discount_type: string | null
          discount_value: number
          excluded_products: string[] | null
          free_shipping: boolean | null
          id: string
          is_active: boolean | null
          max_discount_amount: number | null
          min_order_amount: number | null
          per_user_limit: number | null
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applicable_categories?: string[] | null
          applicable_products?: string[] | null
          applicable_vendors?: string[] | null
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value: number
          excluded_products?: string[] | null
          free_shipping?: boolean | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_amount?: number | null
          per_user_limit?: number | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applicable_categories?: string[] | null
          applicable_products?: string[] | null
          applicable_vendors?: string[] | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number
          excluded_products?: string[] | null
          free_shipping?: boolean | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_amount?: number | null
          per_user_limit?: number | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      media_content: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          category: string | null
          content_type: string
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          description: string | null
          dimensions: Json | null
          duration_seconds: number | null
          file_name: string
          file_size: number | null
          file_url: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          like_count: number | null
          mime_type: string | null
          moderation_notes: string | null
          publisher_email: string | null
          publisher_name: string | null
          rejection_reason: string | null
          share_count: number | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          user_id: string | null
          view_count: number | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          content_type: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          dimensions?: Json | null
          duration_seconds?: number | null
          file_name: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          like_count?: number | null
          mime_type?: string | null
          moderation_notes?: string | null
          publisher_email?: string | null
          publisher_name?: string | null
          rejection_reason?: string | null
          share_count?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
          view_count?: number | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          content_type?: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          dimensions?: Json | null
          duration_seconds?: number | null
          file_name?: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          like_count?: number | null
          mime_type?: string | null
          moderation_notes?: string | null
          publisher_email?: string | null
          publisher_name?: string | null
          rejection_reason?: string | null
          share_count?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      message_status: {
        Row: {
          id: string
          message_id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_status_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "active_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_status_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          contact_data: Json | null
          content: string | null
          conversation_id: string
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_for_everyone: boolean | null
          deletion_reason: string | null
          delivered_to: string[] | null
          duration_seconds: number | null
          edited_at: string | null
          file_name: string | null
          file_size: number | null
          forward_from: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          location_data: Json | null
          media_url: string | null
          message_type: string
          reactions: Json | null
          read_by: string[] | null
          reply_to_id: string | null
          sender_id: string
          thumbnail_url: string | null
        }
        Insert: {
          contact_data?: Json | null
          content?: string | null
          conversation_id: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_for_everyone?: boolean | null
          deletion_reason?: string | null
          delivered_to?: string[] | null
          duration_seconds?: number | null
          edited_at?: string | null
          file_name?: string | null
          file_size?: number | null
          forward_from?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          location_data?: Json | null
          media_url?: string | null
          message_type: string
          reactions?: Json | null
          read_by?: string[] | null
          reply_to_id?: string | null
          sender_id: string
          thumbnail_url?: string | null
        }
        Update: {
          contact_data?: Json | null
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_for_everyone?: boolean | null
          deletion_reason?: string | null
          delivered_to?: string[] | null
          duration_seconds?: number | null
          edited_at?: string | null
          file_name?: string | null
          file_size?: number | null
          forward_from?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          location_data?: Json | null
          media_url?: string | null
          message_type?: string
          reactions?: Json | null
          read_by?: string[] | null
          reply_to_id?: string | null
          sender_id?: string
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "active_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_forward_from_fkey"
            columns: ["forward_from"]
            isOneToOne: false
            referencedRelation: "active_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_forward_from_fkey"
            columns: ["forward_from"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "active_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      module_commission_rates: {
        Row: {
          apply_tax_before_commission: boolean | null
          commission_type: string
          commission_value: number
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          min_transaction_amount: number | null
          module_name: string
          tiered_rates: Json | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          apply_tax_before_commission?: boolean | null
          commission_type?: string
          commission_value: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          min_transaction_amount?: number | null
          module_name: string
          tiered_rates?: Json | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          apply_tax_before_commission?: boolean | null
          commission_type?: string
          commission_value?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          min_transaction_amount?: number | null
          module_name?: string
          tiered_rates?: Json | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      nipost_admin_audit: {
        Row: {
          access_level: string
          action_details: Json | null
          action_type: string
          admin_id: string
          admin_name: string
          admin_role: string
          branch_id: string | null
          created_at: string | null
          description: string | null
          endpoint: string | null
          error_message: string | null
          id: string
          ip_address: unknown
          method: string | null
          resource_id: string | null
          resource_type: string
          state_id: string | null
          success: boolean | null
          user_agent: string | null
        }
        Insert: {
          access_level: string
          action_details?: Json | null
          action_type: string
          admin_id: string
          admin_name: string
          admin_role: string
          branch_id?: string | null
          created_at?: string | null
          description?: string | null
          endpoint?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          method?: string | null
          resource_id?: string | null
          resource_type: string
          state_id?: string | null
          success?: boolean | null
          user_agent?: string | null
        }
        Update: {
          access_level?: string
          action_details?: Json | null
          action_type?: string
          admin_id?: string
          admin_name?: string
          admin_role?: string
          branch_id?: string | null
          created_at?: string | null
          description?: string | null
          endpoint?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          method?: string | null
          resource_id?: string | null
          resource_type?: string
          state_id?: string | null
          success?: boolean | null
          user_agent?: string | null
        }
        Relationships: []
      }
      nipost_ecommerce: {
        Row: {
          branch_id: string
          branch_name: string
          commission_earned: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          seller_id: string
          seller_name: string
          state_id: string
          state_name: string
          total_orders: number | null
          total_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          branch_name: string
          commission_earned?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          seller_id: string
          seller_name: string
          state_id: string
          state_name: string
          total_orders?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          branch_name?: string
          commission_earned?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          seller_id?: string
          seller_name?: string
          state_id?: string
          state_name?: string
          total_orders?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      nipost_financial_audit: {
        Row: {
          action: string
          changes: Json | null
          created_at: string | null
          id: string
          ip_address: unknown
          ledger_id: string | null
          new_status: string | null
          old_status: string | null
          performed_by: string | null
          performed_by_name: string | null
          performed_by_role: string | null
          reason: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          ledger_id?: string | null
          new_status?: string | null
          old_status?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          performed_by_role?: string | null
          reason?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          ledger_id?: string | null
          new_status?: string | null
          old_status?: string | null
          performed_by?: string | null
          performed_by_name?: string | null
          performed_by_role?: string | null
          reason?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nipost_financial_audit_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "nipost_financial_ledger"
            referencedColumns: ["id"]
          },
        ]
      }
      nipost_financial_ledger: {
        Row: {
          branch_id: string
          branch_name: string
          commission_amount: number
          commission_rate: number
          created_at: string | null
          gross_amount: number
          id: string
          metadata: Json | null
          module: string
          module_transaction_id: string
          net_amount: number
          payment_method: string | null
          payment_reference: string | null
          payment_status: string
          settlement_batch_id: string | null
          settlement_date: string | null
          settlement_status: string | null
          state_id: string
          state_name: string
          transaction_id: string
          transaction_type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          branch_id: string
          branch_name: string
          commission_amount: number
          commission_rate: number
          created_at?: string | null
          gross_amount: number
          id?: string
          metadata?: Json | null
          module: string
          module_transaction_id: string
          net_amount: number
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          settlement_batch_id?: string | null
          settlement_date?: string | null
          settlement_status?: string | null
          state_id: string
          state_name: string
          transaction_id: string
          transaction_type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          branch_id?: string
          branch_name?: string
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          gross_amount?: number
          id?: string
          metadata?: Json | null
          module?: string
          module_transaction_id?: string
          net_amount?: number
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string
          settlement_batch_id?: string | null
          settlement_date?: string | null
          settlement_status?: string | null
          state_id?: string
          state_name?: string
          transaction_id?: string
          transaction_type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      nipost_hotels: {
        Row: {
          branch_id: string
          branch_name: string
          commission_earned: number | null
          created_at: string | null
          hotel_id: string
          hotel_name: string
          id: string
          is_active: boolean | null
          state_id: string
          state_name: string
          total_bookings: number | null
          total_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          branch_name: string
          commission_earned?: number | null
          created_at?: string | null
          hotel_id: string
          hotel_name: string
          id?: string
          is_active?: boolean | null
          state_id: string
          state_name: string
          total_bookings?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          branch_name?: string
          commission_earned?: number | null
          created_at?: string | null
          hotel_id?: string
          hotel_name?: string
          id?: string
          is_active?: boolean | null
          state_id?: string
          state_name?: string
          total_bookings?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      nipost_offices: {
        Row: {
          address: string
          city: string
          country: string
          created_at: string | null
          email_addresses: string[] | null
          id: string
          is_24_7: boolean | null
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          manager_id: string | null
          office_code: string
          office_name: string
          office_type: string
          operating_hours: Json | null
          phone_numbers: string[] | null
          postal_code: string | null
          region_id: string
          services_offered: string[] | null
          state_province: string | null
          updated_at: string | null
        }
        Insert: {
          address: string
          city: string
          country: string
          created_at?: string | null
          email_addresses?: string[] | null
          id?: string
          is_24_7?: boolean | null
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          manager_id?: string | null
          office_code: string
          office_name: string
          office_type: string
          operating_hours?: Json | null
          phone_numbers?: string[] | null
          postal_code?: string | null
          region_id: string
          services_offered?: string[] | null
          state_province?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          city?: string
          country?: string
          created_at?: string | null
          email_addresses?: string[] | null
          id?: string
          is_24_7?: boolean | null
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          manager_id?: string | null
          office_code?: string
          office_name?: string
          office_type?: string
          operating_hours?: Json | null
          phone_numbers?: string[] | null
          postal_code?: string | null
          region_id?: string
          services_offered?: string[] | null
          state_province?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nipost_offices_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "nipost_regions"
            referencedColumns: ["id"]
          },
        ]
      }
      nipost_officials: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          clearance_level: number
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          department: string
          employee_id: string
          hire_date: string
          id: string
          is_active: boolean | null
          jurisdiction_regions: string[] | null
          office_id: string
          position: string
          rank: string
          region_id: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          reporting_to: string | null
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          termination_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          clearance_level: number
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          department: string
          employee_id: string
          hire_date: string
          id?: string
          is_active?: boolean | null
          jurisdiction_regions?: string[] | null
          office_id: string
          position: string
          rank: string
          region_id: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          reporting_to?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          termination_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          clearance_level?: number
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          department?: string
          employee_id?: string
          hire_date?: string
          id?: string
          is_active?: boolean | null
          jurisdiction_regions?: string[] | null
          office_id?: string
          position?: string
          rank?: string
          region_id?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          reporting_to?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          termination_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nipost_officials_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "nipost_offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nipost_officials_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "nipost_regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nipost_officials_reporting_to_fkey"
            columns: ["reporting_to"]
            isOneToOne: false
            referencedRelation: "nipost_officials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nipost_officials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "active_user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nipost_officials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nipost_regions: {
        Row: {
          area_sq_km: number | null
          coordinates: Json | null
          country_code: string | null
          created_at: string | null
          currency: string | null
          id: string
          is_active: boolean | null
          languages: string[] | null
          parent_region_id: string | null
          population: number | null
          region_code: string
          region_name: string
          region_type: string
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          area_sq_km?: number | null
          coordinates?: Json | null
          country_code?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          languages?: string[] | null
          parent_region_id?: string | null
          population?: number | null
          region_code: string
          region_name: string
          region_type: string
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          area_sq_km?: number | null
          coordinates?: Json | null
          country_code?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          languages?: string[] | null
          parent_region_id?: string | null
          population?: number | null
          region_code?: string
          region_name?: string
          region_type?: string
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nipost_regions_parent_region_id_fkey"
            columns: ["parent_region_id"]
            isOneToOne: false
            referencedRelation: "nipost_regions"
            referencedColumns: ["id"]
          },
        ]
      }
      nipost_taxi: {
        Row: {
          branch_id: string
          branch_name: string
          commission_earned: number | null
          created_at: string | null
          driver_id: string
          driver_name: string
          id: string
          is_active: boolean | null
          state_id: string
          state_name: string
          total_revenue: number | null
          total_trips: number | null
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          branch_name: string
          commission_earned?: number | null
          created_at?: string | null
          driver_id: string
          driver_name: string
          id?: string
          is_active?: boolean | null
          state_id: string
          state_name: string
          total_revenue?: number | null
          total_trips?: number | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          branch_name?: string
          commission_earned?: number | null
          created_at?: string | null
          driver_id?: string
          driver_name?: string
          id?: string
          is_active?: boolean | null
          state_id?: string
          state_name?: string
          total_revenue?: number | null
          total_trips?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      nipost_user_permissions: {
        Row: {
          access_level: string
          branch_id: string | null
          branch_name: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          module_permissions: Json | null
          permissions: string[] | null
          role: string
          state_id: string | null
          state_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_level: string
          branch_id?: string | null
          branch_name?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          module_permissions?: Json | null
          permissions?: string[] | null
          role: string
          state_id?: string | null
          state_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_level?: string
          branch_id?: string | null
          branch_name?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          module_permissions?: Json | null
          permissions?: string[] | null
          role?: string
          state_id?: string | null
          state_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_analytics: {
        Row: {
          bounced_count: number | null
          channel: string
          click_rate: number | null
          clicked_count: number | null
          created_at: string | null
          date: string
          delivered_count: number | null
          delivery_rate: number | null
          failed_count: number | null
          id: string
          open_rate: number | null
          opened_count: number | null
          sent_count: number | null
          template_name: string
        }
        Insert: {
          bounced_count?: number | null
          channel: string
          click_rate?: number | null
          clicked_count?: number | null
          created_at?: string | null
          date: string
          delivered_count?: number | null
          delivery_rate?: number | null
          failed_count?: number | null
          id?: string
          open_rate?: number | null
          opened_count?: number | null
          sent_count?: number | null
          template_name: string
        }
        Update: {
          bounced_count?: number | null
          channel?: string
          click_rate?: number | null
          clicked_count?: number | null
          created_at?: string | null
          date?: string
          delivered_count?: number | null
          delivery_rate?: number | null
          failed_count?: number | null
          id?: string
          open_rate?: number | null
          opened_count?: number | null
          sent_count?: number | null
          template_name?: string
        }
        Relationships: []
      }
      notification_campaigns: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          delivered_count: number | null
          failed_count: number | null
          id: string
          name: string
          scheduled_for: string | null
          sent_count: number | null
          started_at: string | null
          status: string | null
          target_audience: Json | null
          template_id: string | null
          total_recipients: number | null
          type: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          name: string
          scheduled_for?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string | null
          target_audience?: Json | null
          template_id?: string | null
          total_recipients?: number | null
          type: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_count?: number | null
          failed_count?: number | null
          id?: string
          name?: string
          scheduled_for?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string | null
          target_audience?: Json | null
          template_id?: string | null
          total_recipients?: number | null
          type?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          channels: string[]
          clicked_at: string | null
          content: string | null
          created_at: string | null
          delivered_at: string | null
          email_provider: string | null
          email_provider_id: string | null
          email_status: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          metadata: Json | null
          opened_at: string | null
          provider: string | null
          provider_id: string | null
          push_status: string | null
          recipient_device_token: string | null
          recipient_email: string | null
          recipient_phone: string | null
          retry_count: number | null
          scheduled_for: string | null
          sent_at: string | null
          sms_provider: string | null
          sms_provider_id: string | null
          sms_status: string | null
          status: string
          subject: string | null
          template_id: string | null
          template_name: string | null
          type: string | null
          user_id: string | null
          variables: Json | null
        }
        Insert: {
          channels: string[]
          clicked_at?: string | null
          content?: string | null
          created_at?: string | null
          delivered_at?: string | null
          email_provider?: string | null
          email_provider_id?: string | null
          email_status?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          provider?: string | null
          provider_id?: string | null
          push_status?: string | null
          recipient_device_token?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          retry_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          sms_provider?: string | null
          sms_provider_id?: string | null
          sms_status?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
          template_name?: string | null
          type?: string | null
          user_id?: string | null
          variables?: Json | null
        }
        Update: {
          channels?: string[]
          clicked_at?: string | null
          content?: string | null
          created_at?: string | null
          delivered_at?: string | null
          email_provider?: string | null
          email_provider_id?: string | null
          email_status?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          provider?: string | null
          provider_id?: string | null
          push_status?: string | null
          recipient_device_token?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          retry_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          sms_provider?: string | null
          sms_provider_id?: string | null
          sms_status?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
          template_name?: string | null
          type?: string | null
          user_id?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          booking_notifications: boolean | null
          category_preferences: Json | null
          created_at: string | null
          delivery_notifications: boolean | null
          email_enabled: boolean | null
          email_frequency: string | null
          global_opt_out: boolean | null
          id: string
          in_app_enabled: boolean | null
          language: string | null
          marketing_emails: boolean | null
          payment_notifications: boolean | null
          push_enabled: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          security_notifications: boolean | null
          sms_enabled: boolean | null
          social_notifications: boolean | null
          timezone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          booking_notifications?: boolean | null
          category_preferences?: Json | null
          created_at?: string | null
          delivery_notifications?: boolean | null
          email_enabled?: boolean | null
          email_frequency?: string | null
          global_opt_out?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          language?: string | null
          marketing_emails?: boolean | null
          payment_notifications?: boolean | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          security_notifications?: boolean | null
          sms_enabled?: boolean | null
          social_notifications?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          booking_notifications?: boolean | null
          category_preferences?: Json | null
          created_at?: string | null
          delivery_notifications?: boolean | null
          email_enabled?: boolean | null
          email_frequency?: string | null
          global_opt_out?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          language?: string | null
          marketing_emails?: boolean | null
          payment_notifications?: boolean | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          security_notifications?: boolean | null
          sms_enabled?: boolean | null
          social_notifications?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          attempts: number | null
          created_at: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          max_attempts: number | null
          metadata: Json | null
          notification_log_id: string | null
          picked_at: string | null
          priority: number | null
          process_after: string | null
          processed_at: string | null
          recipient_device_token: string | null
          recipient_email: string | null
          recipient_phone: string | null
          scheduled_at: string | null
          status: string | null
          template_name: string
          user_id: string | null
          variables: Json
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          max_attempts?: number | null
          metadata?: Json | null
          notification_log_id?: string | null
          picked_at?: string | null
          priority?: number | null
          process_after?: string | null
          processed_at?: string | null
          recipient_device_token?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          scheduled_at?: string | null
          status?: string | null
          template_name: string
          user_id?: string | null
          variables: Json
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          max_attempts?: number | null
          metadata?: Json | null
          notification_log_id?: string | null
          picked_at?: string | null
          priority?: number | null
          process_after?: string | null
          processed_at?: string | null
          recipient_device_token?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          scheduled_at?: string | null
          status?: string | null
          template_name?: string
          user_id?: string | null
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_notification_log_id_fkey"
            columns: ["notification_log_id"]
            isOneToOne: false
            referencedRelation: "notification_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body: string | null
          category: string
          channels: string[]
          created_at: string | null
          created_by: string | null
          description: string | null
          email_body: string | null
          id: string
          is_active: boolean | null
          name: string
          optional_variables: string[] | null
          push_body: string | null
          push_title: string | null
          required_variables: string[] | null
          sms_body: string | null
          subject: string | null
          type: string
          updated_at: string | null
          variables: string[] | null
          version: number | null
        }
        Insert: {
          body?: string | null
          category: string
          channels: string[]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          email_body?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          optional_variables?: string[] | null
          push_body?: string | null
          push_title?: string | null
          required_variables?: string[] | null
          sms_body?: string | null
          subject?: string | null
          type: string
          updated_at?: string | null
          variables?: string[] | null
          version?: number | null
        }
        Update: {
          body?: string | null
          category?: string
          channels?: string[]
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          email_body?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          optional_variables?: string[] | null
          push_body?: string | null
          push_title?: string | null
          required_variables?: string[] | null
          sms_body?: string | null
          subject?: string | null
          type?: string
          updated_at?: string | null
          variables?: string[] | null
          version?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          message: string
          read: boolean | null
          read_at: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message: string
          read?: boolean | null
          read_at?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string
          read?: boolean | null
          read_at?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      official_permissions: {
        Row: {
          applicable_regions: string[] | null
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          official_id: string
          permission_id: string
        }
        Insert: {
          applicable_regions?: string[] | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          official_id: string
          permission_id: string
        }
        Update: {
          applicable_regions?: string[] | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          official_id?: string
          permission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "official_permissions_official_id_fkey"
            columns: ["official_id"]
            isOneToOne: false
            referencedRelation: "nipost_officials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "official_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "admin_permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_provider_config: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          is_test_mode: boolean | null
          priority: number | null
          provider_name: string
          public_key: string
          secret_key: string
          settings: Json | null
          supported_methods: string[] | null
          updated_at: string | null
          webhook_secret: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_test_mode?: boolean | null
          priority?: number | null
          provider_name: string
          public_key: string
          secret_key: string
          settings?: Json | null
          supported_methods?: string[] | null
          updated_at?: string | null
          webhook_secret: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_test_mode?: boolean | null
          priority?: number | null
          provider_name?: string
          public_key?: string
          secret_key?: string
          settings?: Json | null
          supported_methods?: string[] | null
          updated_at?: string | null
          webhook_secret?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          account_number_last4: string | null
          amount: number
          bank_name: string | null
          card_brand: string | null
          card_last4: string | null
          card_type: string | null
          created_at: string | null
          currency: string
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          expires_at: string | null
          id: string
          ip_address: unknown
          is_escrowed: boolean | null
          metadata: Json | null
          paid_at: string | null
          payment_method: string
          payment_provider: string
          payment_status: string
          payment_type: string
          provider_reference: string | null
          provider_transaction_id: string | null
          reference_id: string
          refund_amount: number | null
          refund_reason: string | null
          refund_transaction_id: string | null
          refunded_at: string | null
          transaction_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          account_number_last4?: string | null
          amount: number
          bank_name?: string | null
          card_brand?: string | null
          card_last4?: string | null
          card_type?: string | null
          created_at?: string | null
          currency?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_escrowed?: boolean | null
          metadata?: Json | null
          paid_at?: string | null
          payment_method: string
          payment_provider: string
          payment_status?: string
          payment_type: string
          provider_reference?: string | null
          provider_transaction_id?: string | null
          reference_id: string
          refund_amount?: number | null
          refund_reason?: string | null
          refund_transaction_id?: string | null
          refunded_at?: string | null
          transaction_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          account_number_last4?: string | null
          amount?: number
          bank_name?: string | null
          card_brand?: string | null
          card_last4?: string | null
          card_type?: string | null
          created_at?: string | null
          currency?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_escrowed?: boolean | null
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string
          payment_provider?: string
          payment_status?: string
          payment_type?: string
          provider_reference?: string | null
          provider_transaction_id?: string | null
          reference_id?: string
          refund_amount?: number | null
          refund_reason?: string | null
          refund_transaction_id?: string | null
          refunded_at?: string | null
          transaction_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      platform_migration_status: {
        Row: {
          component_name: string
          component_type: string
          created_at: string | null
          current_platform: string
          id: string
          migration_date: string | null
          migration_status: string
          notes: string | null
          rollback_plan: string | null
          target_platform: string
          updated_at: string | null
        }
        Insert: {
          component_name: string
          component_type: string
          created_at?: string | null
          current_platform: string
          id?: string
          migration_date?: string | null
          migration_status: string
          notes?: string | null
          rollback_plan?: string | null
          target_platform: string
          updated_at?: string | null
        }
        Update: {
          component_name?: string
          component_type?: string
          created_at?: string | null
          current_platform?: string
          id?: string
          migration_date?: string | null
          migration_status?: string
          notes?: string | null
          rollback_plan?: string | null
          target_platform?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_promo_code_usage: {
        Row: {
          discount_amount: number
          id: string
          promo_code_id: string
          reference_id: string
          service_type: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          discount_amount: number
          id?: string
          promo_code_id: string
          reference_id: string
          service_type: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          discount_amount?: number
          id?: string
          promo_code_id?: string
          reference_id?: string
          service_type?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_promo_code_usage_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "platform_promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_promo_codes: {
        Row: {
          applicable_services: string[] | null
          campaign_id: string | null
          campaign_name: string | null
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          first_purchase_only: boolean | null
          id: string
          is_active: boolean | null
          max_discount_amount: number | null
          min_order_amount: number | null
          new_users_only: boolean | null
          per_user_limit: number | null
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applicable_services?: string[] | null
          campaign_id?: string | null
          campaign_name?: string | null
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          first_purchase_only?: boolean | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_amount?: number | null
          new_users_only?: boolean | null
          per_user_limit?: number | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applicable_services?: string[] | null
          campaign_id?: string | null
          campaign_name?: string | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          first_purchase_only?: boolean | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_amount?: number | null
          new_users_only?: boolean | null
          per_user_limit?: number | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      platform_revenue: {
        Row: {
          commission_amount: number
          created_at: string | null
          escrow_id: string
          gross_amount: number
          id: string
          module_name: string
          payment_id: string
          revenue_date: string
          tax_collected: number | null
        }
        Insert: {
          commission_amount: number
          created_at?: string | null
          escrow_id: string
          gross_amount: number
          id?: string
          module_name: string
          payment_id: string
          revenue_date?: string
          tax_collected?: number | null
        }
        Update: {
          commission_amount?: number
          created_at?: string | null
          escrow_id?: string
          gross_amount?: number
          id?: string
          module_name?: string
          payment_id?: string
          revenue_date?: string
          tax_collected?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_revenue_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrow_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_revenue_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string
          value_type: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: string
          value_type?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string
          value_type?: string | null
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          id: string
          is_edited: boolean | null
          like_count: number | null
          parent_comment_id: string | null
          post_id: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          id?: string
          is_edited?: boolean | null
          like_count?: number | null
          parent_comment_id?: string | null
          post_id: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          id?: string
          is_edited?: boolean | null
          like_count?: number | null
          parent_comment_id?: string | null
          post_id?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments_with_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "active_social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts_with_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          reaction_type: string | null
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          reaction_type?: string | null
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          reaction_type?: string | null
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "active_social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts_with_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      postal_staff: {
        Row: {
          admission_date: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          assigned_post_office_id: string | null
          assigned_region: string | null
          city: string | null
          country: string | null
          created_at: string | null
          date_of_birth: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          department: string | null
          email: string
          employee_id: string | null
          first_name: string
          gender: string | null
          hire_date: string | null
          id: string
          is_active: boolean | null
          last_name: string
          phone: string | null
          position: string | null
          postal_code: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          residential_address: string | null
          staff_type: string
          state: string | null
          updated_at: string | null
          user_id: string | null
          years_of_service: number | null
        }
        Insert: {
          admission_date?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_post_office_id?: string | null
          assigned_region?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          department?: string | null
          email: string
          employee_id?: string | null
          first_name: string
          gender?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          last_name: string
          phone?: string | null
          position?: string | null
          postal_code?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          residential_address?: string | null
          staff_type: string
          state?: string | null
          updated_at?: string | null
          user_id?: string | null
          years_of_service?: number | null
        }
        Update: {
          admission_date?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_post_office_id?: string | null
          assigned_region?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          department?: string | null
          email?: string
          employee_id?: string | null
          first_name?: string
          gender?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string
          phone?: string | null
          position?: string | null
          postal_code?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          residential_address?: string | null
          staff_type?: string
          state?: string | null
          updated_at?: string | null
          user_id?: string | null
          years_of_service?: number | null
        }
        Relationships: []
      }
      refund_policies: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          module_name: string
          non_refundable_exceptions: string[] | null
          refund_processing_days: number | null
          refund_tiers: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          module_name: string
          non_refundable_exceptions?: string[] | null
          refund_processing_days?: number | null
          refund_tiers: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          module_name?: string
          non_refundable_exceptions?: string[] | null
          refund_processing_days?: number | null
          refund_tiers?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      ride_rejections: {
        Row: {
          created_at: string | null
          driver_id: string
          id: string
          reason: string | null
          ride_id: string
        }
        Insert: {
          created_at?: string | null
          driver_id: string
          id?: string
          reason?: string | null
          ride_id: string
        }
        Update: {
          created_at?: string | null
          driver_id?: string
          id?: string
          reason?: string | null
          ride_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_rejections_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_tracking: {
        Row: {
          heading: number | null
          id: string
          location: unknown
          ride_id: string
          speed: number | null
          timestamp: string | null
        }
        Insert: {
          heading?: number | null
          id?: string
          location: unknown
          ride_id: string
          speed?: number | null
          timestamp?: string | null
        }
        Update: {
          heading?: number | null
          id?: string
          location?: unknown
          ride_id?: string
          speed?: number | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ride_tracking_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          accepted_at: string | null
          actual_distance_km: number | null
          actual_dropoff_location: Json | null
          actual_duration_minutes: number | null
          base_fare: number
          cancellation_fee: number | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          created_at: string | null
          discount_amount: number | null
          distance_fare: number | null
          distance_km: number | null
          driver_eta_minutes: number | null
          driver_id: string | null
          driver_notes: string | null
          dropoff_address: string | null
          dropoff_location: Json
          dropoff_time: string | null
          estimated_duration_minutes: number | null
          final_amount: number
          final_fare: number | null
          id: string
          passenger_id: string
          passenger_notes: string | null
          payment_status: string | null
          pickup_address: string | null
          pickup_location: Json
          pickup_time: string | null
          rating: number | null
          review_comment: string | null
          ride_number: string
          scheduled_time: string | null
          started_at: string | null
          status: string | null
          surge_multiplier: number | null
          time_fare: number | null
          total_fare: number
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          actual_distance_km?: number | null
          actual_dropoff_location?: Json | null
          actual_duration_minutes?: number | null
          base_fare: number
          cancellation_fee?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          discount_amount?: number | null
          distance_fare?: number | null
          distance_km?: number | null
          driver_eta_minutes?: number | null
          driver_id?: string | null
          driver_notes?: string | null
          dropoff_address?: string | null
          dropoff_location: Json
          dropoff_time?: string | null
          estimated_duration_minutes?: number | null
          final_amount: number
          final_fare?: number | null
          id?: string
          passenger_id: string
          passenger_notes?: string | null
          payment_status?: string | null
          pickup_address?: string | null
          pickup_location: Json
          pickup_time?: string | null
          rating?: number | null
          review_comment?: string | null
          ride_number: string
          scheduled_time?: string | null
          started_at?: string | null
          status?: string | null
          surge_multiplier?: number | null
          time_fare?: number | null
          total_fare: number
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          actual_distance_km?: number | null
          actual_dropoff_location?: Json | null
          actual_duration_minutes?: number | null
          base_fare?: number
          cancellation_fee?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          discount_amount?: number | null
          distance_fare?: number | null
          distance_km?: number | null
          driver_eta_minutes?: number | null
          driver_id?: string | null
          driver_notes?: string | null
          dropoff_address?: string | null
          dropoff_location?: Json
          dropoff_time?: string | null
          estimated_duration_minutes?: number | null
          final_amount?: number
          final_fare?: number | null
          id?: string
          passenger_id?: string
          passenger_notes?: string | null
          payment_status?: string | null
          pickup_address?: string | null
          pickup_location?: Json
          pickup_time?: string | null
          rating?: number | null
          review_comment?: string | null
          ride_number?: string
          scheduled_time?: string | null
          started_at?: string | null
          status?: string | null
          surge_multiplier?: number | null
          time_fare?: number | null
          total_fare?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      role_applications: {
        Row: {
          application_data: Json | null
          created_at: string | null
          document_urls: string[] | null
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role_name: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          application_data?: Json | null
          created_at?: string | null
          document_urls?: string[] | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_name: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          application_data?: Json | null
          created_at?: string | null
          document_urls?: string[] | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_name?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      room_availability: {
        Row: {
          available_rooms: number
          base_price: number | null
          block_reason: string | null
          created_at: string | null
          date: string
          dynamic_price: number | null
          id: string
          is_blocked: boolean | null
          minimum_stay: number | null
          room_type_id: string
          updated_at: string | null
        }
        Insert: {
          available_rooms?: number
          base_price?: number | null
          block_reason?: string | null
          created_at?: string | null
          date: string
          dynamic_price?: number | null
          id?: string
          is_blocked?: boolean | null
          minimum_stay?: number | null
          room_type_id: string
          updated_at?: string | null
        }
        Update: {
          available_rooms?: number
          base_price?: number | null
          block_reason?: string | null
          created_at?: string | null
          date?: string
          dynamic_price?: number | null
          id?: string
          is_blocked?: boolean | null
          minimum_stay?: number | null
          room_type_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_availability_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_availability_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "v_room_availability_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      room_types: {
        Row: {
          allows_pets: boolean | null
          allows_smoking: boolean | null
          amenities: string[] | null
          base_price: number
          bed_type: string | null
          beds_count: number
          breakfast_included: boolean | null
          cancellation_hours: number | null
          capacity: number
          created_at: string | null
          description: string | null
          display_order: number | null
          hotel_id: string
          id: string
          images: string[] | null
          is_active: boolean | null
          max_adults: number
          max_children: number | null
          name: string
          refundable: boolean | null
          room_size_sqft: number | null
          seasonal_prices: Json | null
          slug: string
          total_rooms: number
          updated_at: string | null
          weekend_price: number | null
        }
        Insert: {
          allows_pets?: boolean | null
          allows_smoking?: boolean | null
          amenities?: string[] | null
          base_price: number
          bed_type?: string | null
          beds_count?: number
          breakfast_included?: boolean | null
          cancellation_hours?: number | null
          capacity: number
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          hotel_id: string
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          max_adults?: number
          max_children?: number | null
          name: string
          refundable?: boolean | null
          room_size_sqft?: number | null
          seasonal_prices?: Json | null
          slug: string
          total_rooms?: number
          updated_at?: string | null
          weekend_price?: number | null
        }
        Update: {
          allows_pets?: boolean | null
          allows_smoking?: boolean | null
          amenities?: string[] | null
          base_price?: number
          bed_type?: string | null
          beds_count?: number
          breakfast_included?: boolean | null
          cancellation_hours?: number | null
          capacity?: number
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          hotel_id?: string
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          max_adults?: number
          max_children?: number | null
          name?: string
          refundable?: boolean | null
          room_size_sqft?: number | null
          seasonal_prices?: Json | null
          slug?: string
          total_rooms?: number
          updated_at?: string | null
          weekend_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "room_types_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "active_hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_types_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_types_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "v_hotels_search"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string | null
          floor: number | null
          id: string
          last_cleaned_at: string | null
          notes: string | null
          room_number: string
          room_type_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          floor?: number | null
          id?: string
          last_cleaned_at?: string | null
          notes?: string | null
          room_number: string
          room_type_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          floor?: number | null
          id?: string
          last_cleaned_at?: string | null
          notes?: string | null
          room_number?: string
          room_type_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "v_room_availability_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_notifications: {
        Row: {
          cancelled_at: string | null
          created_at: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          max_retries: number | null
          notification_log_id: string | null
          retry_count: number | null
          scheduled_at: string
          sent_at: string | null
          status: string | null
          template_name: string
          timezone: string | null
          user_id: string | null
          variables: Json | null
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          max_retries?: number | null
          notification_log_id?: string | null
          retry_count?: number | null
          scheduled_at: string
          sent_at?: string | null
          status?: string | null
          template_name: string
          timezone?: string | null
          user_id?: string | null
          variables?: Json | null
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          max_retries?: number | null
          notification_log_id?: string | null
          retry_count?: number | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string | null
          template_name?: string
          timezone?: string | null
          user_id?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_notifications_notification_log_id_fkey"
            columns: ["notification_log_id"]
            isOneToOne: false
            referencedRelation: "notification_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      service_module_mapping: {
        Row: {
          access_pattern: string
          compute_intensity: number | null
          created_at: string | null
          database_intensity: number | null
          description: string | null
          id: string
          module_type: string
          primary_service: string
          table_name: string
          traffic_pattern: string | null
          updated_at: string | null
        }
        Insert: {
          access_pattern: string
          compute_intensity?: number | null
          created_at?: string | null
          database_intensity?: number | null
          description?: string | null
          id?: string
          module_type: string
          primary_service: string
          table_name: string
          traffic_pattern?: string | null
          updated_at?: string | null
        }
        Update: {
          access_pattern?: string
          compute_intensity?: number | null
          created_at?: string | null
          database_intensity?: number | null
          description?: string | null
          id?: string
          module_type?: string
          primary_service?: string
          table_name?: string
          traffic_pattern?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shipping_addresses: {
        Row: {
          address2: string | null
          apartment: string | null
          building_number: string | null
          city: string | null
          contact_name: string | null
          country: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          label: string | null
          latitude: number | null
          longitude: number | null
          name: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          street: string | null
          updated_at: string | null
          user_id: string | null
          zip_code: string | null
        }
        Insert: {
          address2?: string | null
          apartment?: string | null
          building_number?: string | null
          city?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string | null
          user_id?: string | null
          zip_code?: string | null
        }
        Update: {
          address2?: string | null
          apartment?: string | null
          building_number?: string | null
          city?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string | null
          user_id?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          allowed_viewers: string[] | null
          comment_count: number | null
          content: string
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          expires_at: string | null
          feeling_activity: string | null
          id: string
          is_active: boolean | null
          like_count: number | null
          location: Json | null
          media_urls: string[] | null
          post_type: string | null
          share_count: number | null
          shared_post_id: string | null
          tagged_users: string[] | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string
          view_count: number | null
          visibility: string | null
        }
        Insert: {
          allowed_viewers?: string[] | null
          comment_count?: number | null
          content: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          expires_at?: string | null
          feeling_activity?: string | null
          id?: string
          is_active?: boolean | null
          like_count?: number | null
          location?: Json | null
          media_urls?: string[] | null
          post_type?: string | null
          share_count?: number | null
          shared_post_id?: string | null
          tagged_users?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
          view_count?: number | null
          visibility?: string | null
        }
        Update: {
          allowed_viewers?: string[] | null
          comment_count?: number | null
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          expires_at?: string | null
          feeling_activity?: string | null
          id?: string
          is_active?: boolean | null
          like_count?: number | null
          location?: Json | null
          media_urls?: string[] | null
          post_type?: string | null
          share_count?: number | null
          shared_post_id?: string | null
          tagged_users?: string[] | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_shared_post_id_fkey"
            columns: ["shared_post_id"]
            isOneToOne: false
            referencedRelation: "active_social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_shared_post_id_fkey"
            columns: ["shared_post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_shared_post_id_fkey"
            columns: ["shared_post_id"]
            isOneToOne: false
            referencedRelation: "social_posts_with_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      stories: {
        Row: {
          caption: string | null
          created_at: string | null
          duration_seconds: number | null
          expires_at: string
          id: string
          media_type: string | null
          media_url: string
          user_id: string
          view_count: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          expires_at?: string
          id?: string
          media_type?: string | null
          media_url: string
          user_id: string
          view_count?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          expires_at?: string
          id?: string
          media_type?: string | null
          media_url?: string
          user_id?: string
          view_count?: number | null
        }
        Relationships: []
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          id?: string
          story_id: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          id?: string
          story_id?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      support_articles: {
        Row: {
          author_id: string | null
          category: string
          content: string
          created_at: string | null
          helpful_count: number | null
          id: string
          is_published: boolean | null
          not_helpful_count: number | null
          published_at: string | null
          slug: string
          subcategory: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author_id?: string | null
          category: string
          content: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_published?: boolean | null
          not_helpful_count?: number | null
          published_at?: string | null
          slug: string
          subcategory?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author_id?: string | null
          category?: string
          content?: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_published?: boolean | null
          not_helpful_count?: number | null
          published_at?: string | null
          slug?: string
          subcategory?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      support_shifts: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          created_at: string | null
          id: string
          shift_end: string
          shift_start: string
          staff_id: string | null
          status: string | null
          tickets_handled: number | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string | null
          id?: string
          shift_end: string
          shift_start: string
          staff_id?: string | null
          status?: string | null
          tickets_handled?: number | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string | null
          id?: string
          shift_end?: string
          shift_start?: string
          staff_id?: string | null
          status?: string | null
          tickets_handled?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "support_shifts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "support_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      support_staff: {
        Row: {
          average_resolution_time_minutes: number | null
          created_at: string | null
          customer_satisfaction_rating: number | null
          employee_id: string
          id: string
          is_active: boolean | null
          is_online: boolean | null
          languages: string[] | null
          max_concurrent_tickets: number | null
          specializations: string[] | null
          staff_type: string | null
          tier_level: number | null
          total_tickets_resolved: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          average_resolution_time_minutes?: number | null
          created_at?: string | null
          customer_satisfaction_rating?: number | null
          employee_id: string
          id?: string
          is_active?: boolean | null
          is_online?: boolean | null
          languages?: string[] | null
          max_concurrent_tickets?: number | null
          specializations?: string[] | null
          staff_type?: string | null
          tier_level?: number | null
          total_tickets_resolved?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          average_resolution_time_minutes?: number | null
          created_at?: string | null
          customer_satisfaction_rating?: number | null
          employee_id?: string
          id?: string
          is_active?: boolean | null
          is_online?: boolean | null
          languages?: string[] | null
          max_concurrent_tickets?: number | null
          specializations?: string[] | null
          staff_type?: string | null
          tier_level?: number | null
          total_tickets_resolved?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          attachments: string[] | null
          category: string | null
          closed_at: string | null
          created_at: string | null
          description: string
          escalated_to: string | null
          escalation_reason: string | null
          first_response_at: string | null
          id: string
          module_name: string | null
          priority: string | null
          reference_id: string | null
          resolved_at: string | null
          sla_deadline: string | null
          status: string | null
          subject: string
          tags: string[] | null
          ticket_number: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          attachments?: string[] | null
          category?: string | null
          closed_at?: string | null
          created_at?: string | null
          description: string
          escalated_to?: string | null
          escalation_reason?: string | null
          first_response_at?: string | null
          id?: string
          module_name?: string | null
          priority?: string | null
          reference_id?: string | null
          resolved_at?: string | null
          sla_deadline?: string | null
          status?: string | null
          subject: string
          tags?: string[] | null
          ticket_number: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          attachments?: string[] | null
          category?: string | null
          closed_at?: string | null
          created_at?: string | null
          description?: string
          escalated_to?: string | null
          escalation_reason?: string | null
          first_response_at?: string | null
          id?: string
          module_name?: string | null
          priority?: string | null
          reference_id?: string | null
          resolved_at?: string | null
          sla_deadline?: string | null
          status?: string | null
          subject?: string
          tags?: string[] | null
          ticket_number?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "support_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_escalated_to_fkey"
            columns: ["escalated_to"]
            isOneToOne: false
            referencedRelation: "support_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      surge_pricing_zones: {
        Row: {
          area: unknown
          created_at: string | null
          days_of_week: number[] | null
          end_time: string | null
          id: string
          is_active: boolean | null
          multiplier: number | null
          name: string
          start_time: string | null
          updated_at: string | null
        }
        Insert: {
          area: unknown
          created_at?: string | null
          days_of_week?: number[] | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          multiplier?: number | null
          name: string
          start_time?: string | null
          updated_at?: string | null
        }
        Update: {
          area?: unknown
          created_at?: string | null
          days_of_week?: number[] | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          multiplier?: number | null
          name?: string
          start_time?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      taxi_drivers: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          city: string | null
          country: string | null
          created_at: string | null
          date_of_birth: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          email: string
          first_name: string
          gender: string | null
          id: string
          is_active: boolean | null
          is_online: boolean | null
          is_verified: boolean | null
          last_name: string
          license_class: string | null
          license_expiry: string | null
          license_number: string
          phone: string
          plate_number: string | null
          rating: number | null
          rejection_reason: string | null
          residential_address: string | null
          state: string | null
          total_rides: number | null
          updated_at: string | null
          user_id: string | null
          vehicle_color: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_type: string | null
          vehicle_year: number | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          email: string
          first_name: string
          gender?: string | null
          id?: string
          is_active?: boolean | null
          is_online?: boolean | null
          is_verified?: boolean | null
          last_name: string
          license_class?: string | null
          license_expiry?: string | null
          license_number: string
          phone: string
          plate_number?: string | null
          rating?: number | null
          rejection_reason?: string | null
          residential_address?: string | null
          state?: string | null
          total_rides?: number | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_type?: string | null
          vehicle_year?: number | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          email?: string
          first_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean | null
          is_online?: boolean | null
          is_verified?: boolean | null
          last_name?: string
          license_class?: string | null
          license_expiry?: string | null
          license_number?: string
          phone?: string
          plate_number?: string | null
          rating?: number | null
          rejection_reason?: string | null
          residential_address?: string | null
          state?: string | null
          total_rides?: number | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_type?: string | null
          vehicle_year?: number | null
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          attachments: string[] | null
          created_at: string | null
          id: string
          is_internal_note: boolean | null
          message: string
          sender_id: string | null
          sender_type: string | null
          ticket_id: string | null
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string | null
          id?: string
          is_internal_note?: boolean | null
          message: string
          sender_id?: string | null
          sender_type?: string | null
          ticket_id?: string | null
        }
        Update: {
          attachments?: string[] | null
          created_at?: string | null
          id?: string
          is_internal_note?: boolean | null
          message?: string
          sender_id?: string | null
          sender_type?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_promo_code_usage: {
        Row: {
          discount_amount: number
          id: string
          promo_code_id: string
          tour_booking_id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          discount_amount: number
          id?: string
          promo_code_id: string
          tour_booking_id: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          discount_amount?: number
          id?: string
          promo_code_id?: string
          tour_booking_id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_promo_code_usage_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "tour_promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_promo_codes: {
        Row: {
          applicable_categories: string[] | null
          applicable_tours: string[] | null
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          excluded_tours: string[] | null
          first_booking_only: boolean | null
          group_booking_only: boolean | null
          id: string
          is_active: boolean | null
          max_discount_amount: number | null
          min_order_amount: number | null
          min_participants: number | null
          per_user_limit: number | null
          requires_early_booking_days: number | null
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applicable_categories?: string[] | null
          applicable_tours?: string[] | null
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          excluded_tours?: string[] | null
          first_booking_only?: boolean | null
          group_booking_only?: boolean | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_amount?: number | null
          min_participants?: number | null
          per_user_limit?: number | null
          requires_early_booking_days?: number | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applicable_categories?: string[] | null
          applicable_tours?: string[] | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          excluded_tours?: string[] | null
          first_booking_only?: boolean | null
          group_booking_only?: boolean | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_amount?: number | null
          min_participants?: number | null
          per_user_limit?: number | null
          requires_early_booking_days?: number | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      unsubscribe_tokens: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          token: string
          type: string
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          token: string
          type: string
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          token?: string
          type?: string
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_active_roles: {
        Row: {
          active_role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_addresses: {
        Row: {
          address_type: string | null
          address2: string | null
          apartment: string | null
          building_number: string | null
          city: string
          contact_name: string | null
          contact_phone: string | null
          country: string
          created_at: string | null
          id: string
          is_default: boolean | null
          label: string
          latitude: number | null
          longitude: number | null
          name: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          street: string
          updated_at: string | null
          user_id: string | null
          zip_code: string | null
        }
        Insert: {
          address_type?: string | null
          address2?: string | null
          apartment?: string | null
          building_number?: string | null
          city: string
          contact_name?: string | null
          contact_phone?: string | null
          country: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label: string
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          street: string
          updated_at?: string | null
          user_id?: string | null
          zip_code?: string | null
        }
        Update: {
          address_type?: string | null
          address2?: string | null
          apartment?: string | null
          building_number?: string | null
          city?: string
          contact_name?: string | null
          contact_phone?: string | null
          country?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label?: string
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          street?: string
          updated_at?: string | null
          user_id?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      user_connections: {
        Row: {
          connected_user_id: string
          connection_type: string | null
          created_at: string | null
          id: string
          is_close_friend: boolean | null
          notes: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          connected_user_id: string
          connection_type?: string | null
          created_at?: string | null
          id?: string
          is_close_friend?: boolean | null
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          connected_user_id?: string
          connection_type?: string | null
          created_at?: string | null
          id?: string
          is_close_friend?: boolean | null
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          age_group: string | null
          areas_of_interest: string[] | null
          avatar: string | null
          avatar_url: string | null
          body_weight: number | null
          created_at: string | null
          date_of_birth: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          email: string
          first_name: string | null
          gender: string | null
          height: number | null
          id: string
          is_active: boolean | null
          is_phone_verified: boolean | null
          last_login_at: string | null
          last_name: string | null
          marital_status: string | null
          phone: string | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          age_group?: string | null
          areas_of_interest?: string[] | null
          avatar?: string | null
          avatar_url?: string | null
          body_weight?: number | null
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          email: string
          first_name?: string | null
          gender?: string | null
          height?: number | null
          id: string
          is_active?: boolean | null
          is_phone_verified?: boolean | null
          last_login_at?: string | null
          last_name?: string | null
          marital_status?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          age_group?: string | null
          areas_of_interest?: string[] | null
          avatar?: string | null
          avatar_url?: string | null
          body_weight?: number | null
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          email?: string
          first_name?: string | null
          gender?: string | null
          height?: number | null
          id?: string
          is_active?: boolean | null
          is_phone_verified?: boolean | null
          last_login_at?: string | null
          last_name?: string | null
          marital_status?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean
          role_name: string
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean
          role_name: string
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean
          role_name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          balance: number
          created_at: string | null
          currency: string
          id: string
          is_active: boolean | null
          is_locked: boolean | null
          lock_reason: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string | null
          currency?: string
          id?: string
          is_active?: boolean | null
          is_locked?: boolean | null
          lock_reason?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          currency?: string
          id?: string
          is_active?: boolean | null
          is_locked?: boolean | null
          lock_reason?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vehicle_types: {
        Row: {
          capacity: number | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          price_multiplier: number | null
          slug: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price_multiplier?: number | null
          slug: string
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_multiplier?: number | null
          slug?: string
        }
        Relationships: []
      }
      vendor_payouts: {
        Row: {
          account_name: string | null
          account_number: string | null
          bank_name: string | null
          completed_at: string | null
          escrow_transaction_ids: string[]
          failure_reason: string | null
          id: string
          metadata: Json | null
          module_name: string
          notes: string | null
          payout_method: string
          payout_provider: string | null
          processed_at: string | null
          processed_by: string | null
          provider_reference: string | null
          requested_at: string | null
          retry_count: number | null
          status: string
          total_amount: number
          transaction_count: number
          vendor_id: string
          vendor_type: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          completed_at?: string | null
          escrow_transaction_ids: string[]
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          module_name: string
          notes?: string | null
          payout_method?: string
          payout_provider?: string | null
          processed_at?: string | null
          processed_by?: string | null
          provider_reference?: string | null
          requested_at?: string | null
          retry_count?: number | null
          status?: string
          total_amount: number
          transaction_count: number
          vendor_id: string
          vendor_type: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          completed_at?: string | null
          escrow_transaction_ids?: string[]
          failure_reason?: string | null
          id?: string
          metadata?: Json | null
          module_name?: string
          notes?: string | null
          payout_method?: string
          payout_provider?: string | null
          processed_at?: string | null
          processed_by?: string | null
          provider_reference?: string | null
          requested_at?: string | null
          retry_count?: number | null
          status?: string
          total_amount?: number
          transaction_count?: number
          vendor_id?: string
          vendor_type?: string
        }
        Relationships: []
      }
      vendor_profiles: {
        Row: {
          business_name: string
          business_type: string | null
          commission_rate: number | null
          created_at: string | null
          description: string | null
          id: string
          is_verified: boolean | null
          logo: string | null
          rating: number | null
          subscription_tier: string | null
          total_sales: number | null
          updated_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          business_name: string
          business_type?: string | null
          commission_rate?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_verified?: boolean | null
          logo?: string | null
          rating?: number | null
          subscription_tier?: string | null
          total_sales?: number | null
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          business_name?: string
          business_type?: string | null
          commission_rate?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_verified?: boolean | null
          logo?: string | null
          rating?: number | null
          subscription_tier?: string | null
          total_sales?: number | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          created_at: string | null
          currency: string | null
          description: string
          id: string
          metadata: Json | null
          reference: string | null
          reference_id: string | null
          reference_type: string | null
          status: string | null
          transaction_type: string
          type: string | null
          user_id: string | null
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          balance_before: number
          created_at?: string | null
          currency?: string | null
          description: string
          id?: string
          metadata?: Json | null
          reference?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          transaction_type: string
          type?: string | null
          user_id?: string | null
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string | null
          currency?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          reference?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          transaction_type?: string
          type?: string | null
          user_id?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_conversations: {
        Row: {
          avatar_url: string | null
          conversation_type: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          is_encrypted: boolean | null
          last_message_at: string | null
          last_message_sender: string | null
          last_message_text: string | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          conversation_type?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          is_encrypted?: boolean | null
          last_message_at?: string | null
          last_message_sender?: string | null
          last_message_text?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          conversation_type?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          is_encrypted?: boolean | null
          last_message_at?: string | null
          last_message_sender?: string | null
          last_message_text?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      active_ecommerce_products: {
        Row: {
          allow_backorder: boolean | null
          attributes: Json | null
          average_rating: number | null
          base_price: number | null
          category_id: string | null
          cost_price: number | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          description: string | null
          dimensions: Json | null
          discount_percentage: number | null
          final_price: number | null
          id: string | null
          images: string[] | null
          is_active: boolean | null
          is_featured: boolean | null
          low_stock_threshold: number | null
          meta_description: string | null
          meta_keywords: string[] | null
          meta_title: string | null
          name: string | null
          order_count: number | null
          published_at: string | null
          requires_shipping: boolean | null
          review_count: number | null
          short_description: string | null
          sku: string | null
          slug: string | null
          specifications: Json | null
          stock_quantity: number | null
          thumbnail: string | null
          track_inventory: boolean | null
          updated_at: string | null
          vendor_id: string | null
          video_url: string | null
          view_count: number | null
          weight: number | null
        }
        Insert: {
          allow_backorder?: boolean | null
          attributes?: Json | null
          average_rating?: number | null
          base_price?: number | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          dimensions?: Json | null
          discount_percentage?: number | null
          final_price?: number | null
          id?: string | null
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          low_stock_threshold?: number | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          meta_title?: string | null
          name?: string | null
          order_count?: number | null
          published_at?: string | null
          requires_shipping?: boolean | null
          review_count?: number | null
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          specifications?: Json | null
          stock_quantity?: number | null
          thumbnail?: string | null
          track_inventory?: boolean | null
          updated_at?: string | null
          vendor_id?: string | null
          video_url?: string | null
          view_count?: number | null
          weight?: number | null
        }
        Update: {
          allow_backorder?: boolean | null
          attributes?: Json | null
          average_rating?: number | null
          base_price?: number | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          dimensions?: Json | null
          discount_percentage?: number | null
          final_price?: number | null
          id?: string | null
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          low_stock_threshold?: number | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          meta_title?: string | null
          name?: string | null
          order_count?: number | null
          published_at?: string | null
          requires_shipping?: boolean | null
          review_count?: number | null
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          specifications?: Json | null
          stock_quantity?: number | null
          thumbnail?: string | null
          track_inventory?: boolean | null
          updated_at?: string | null
          vendor_id?: string | null
          video_url?: string | null
          view_count?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      active_hotels: {
        Row: {
          address: string | null
          amenities: string[] | null
          average_rating: number | null
          cancellation_policy: string | null
          check_in_time: string | null
          check_out_time: string | null
          city: string | null
          country: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          description: string | null
          email: string | null
          featured_image: string | null
          host_id: string | null
          house_rules: string | null
          id: string | null
          images: string[] | null
          is_active: boolean | null
          is_verified: boolean | null
          latitude: number | null
          location: unknown
          longitude: number | null
          name: string | null
          nearby_attractions: Json | null
          phone: string | null
          policies: Json | null
          postal_code: string | null
          short_description: string | null
          slug: string | null
          star_rating: number | null
          state: string | null
          total_bookings: number | null
          total_reviews: number | null
          updated_at: string | null
          verified_at: string | null
          video_url: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          amenities?: string[] | null
          average_rating?: number | null
          cancellation_policy?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          email?: string | null
          featured_image?: string | null
          host_id?: string | null
          house_rules?: string | null
          id?: string | null
          images?: string[] | null
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          name?: string | null
          nearby_attractions?: Json | null
          phone?: string | null
          policies?: Json | null
          postal_code?: string | null
          short_description?: string | null
          slug?: string | null
          star_rating?: number | null
          state?: string | null
          total_bookings?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          verified_at?: string | null
          video_url?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          amenities?: string[] | null
          average_rating?: number | null
          cancellation_policy?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          email?: string | null
          featured_image?: string | null
          host_id?: string | null
          house_rules?: string | null
          id?: string | null
          images?: string[] | null
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          location?: unknown
          longitude?: number | null
          name?: string | null
          nearby_attractions?: Json | null
          phone?: string | null
          policies?: Json | null
          postal_code?: string | null
          short_description?: string | null
          slug?: string | null
          star_rating?: number | null
          state?: string | null
          total_bookings?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          verified_at?: string | null
          video_url?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotels_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "host_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      active_messages: {
        Row: {
          contact_data: Json | null
          content: string | null
          conversation_id: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deleted_for_everyone: boolean | null
          deletion_reason: string | null
          delivered_to: string[] | null
          duration_seconds: number | null
          edited_at: string | null
          file_name: string | null
          file_size: number | null
          forward_from: string | null
          id: string | null
          is_deleted: boolean | null
          is_edited: boolean | null
          location_data: Json | null
          media_url: string | null
          message_type: string | null
          reactions: Json | null
          read_by: string[] | null
          reply_to_id: string | null
          sender_id: string | null
          thumbnail_url: string | null
        }
        Insert: {
          contact_data?: Json | null
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_for_everyone?: boolean | null
          deletion_reason?: string | null
          delivered_to?: string[] | null
          duration_seconds?: number | null
          edited_at?: string | null
          file_name?: string | null
          file_size?: number | null
          forward_from?: string | null
          id?: string | null
          is_deleted?: boolean | null
          is_edited?: boolean | null
          location_data?: Json | null
          media_url?: string | null
          message_type?: string | null
          reactions?: Json | null
          read_by?: string[] | null
          reply_to_id?: string | null
          sender_id?: string | null
          thumbnail_url?: string | null
        }
        Update: {
          contact_data?: Json | null
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_for_everyone?: boolean | null
          deletion_reason?: string | null
          delivered_to?: string[] | null
          duration_seconds?: number | null
          edited_at?: string | null
          file_name?: string | null
          file_size?: number | null
          forward_from?: string | null
          id?: string | null
          is_deleted?: boolean | null
          is_edited?: boolean | null
          location_data?: Json | null
          media_url?: string | null
          message_type?: string | null
          reactions?: Json | null
          read_by?: string[] | null
          reply_to_id?: string | null
          sender_id?: string | null
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "active_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_forward_from_fkey"
            columns: ["forward_from"]
            isOneToOne: false
            referencedRelation: "active_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_forward_from_fkey"
            columns: ["forward_from"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "active_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      active_social_posts: {
        Row: {
          allowed_viewers: string[] | null
          comment_count: number | null
          content: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          expires_at: string | null
          feeling_activity: string | null
          id: string | null
          is_active: boolean | null
          like_count: number | null
          location: Json | null
          media_urls: string[] | null
          post_type: string | null
          share_count: number | null
          shared_post_id: string | null
          tagged_users: string[] | null
          updated_at: string | null
          user_id: string | null
          view_count: number | null
          visibility: string | null
        }
        Insert: {
          allowed_viewers?: string[] | null
          comment_count?: number | null
          content?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          expires_at?: string | null
          feeling_activity?: string | null
          id?: string | null
          is_active?: boolean | null
          like_count?: number | null
          location?: Json | null
          media_urls?: string[] | null
          post_type?: string | null
          share_count?: number | null
          shared_post_id?: string | null
          tagged_users?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          view_count?: number | null
          visibility?: string | null
        }
        Update: {
          allowed_viewers?: string[] | null
          comment_count?: number | null
          content?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          expires_at?: string | null
          feeling_activity?: string | null
          id?: string | null
          is_active?: boolean | null
          like_count?: number | null
          location?: Json | null
          media_urls?: string[] | null
          post_type?: string | null
          share_count?: number | null
          shared_post_id?: string | null
          tagged_users?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          view_count?: number | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_shared_post_id_fkey"
            columns: ["shared_post_id"]
            isOneToOne: false
            referencedRelation: "active_social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_shared_post_id_fkey"
            columns: ["shared_post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_shared_post_id_fkey"
            columns: ["shared_post_id"]
            isOneToOne: false
            referencedRelation: "social_posts_with_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      active_user_profiles: {
        Row: {
          age_group: string | null
          areas_of_interest: string[] | null
          avatar: string | null
          avatar_url: string | null
          body_weight: number | null
          created_at: string | null
          date_of_birth: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          email: string | null
          first_name: string | null
          gender: string | null
          height: number | null
          id: string | null
          is_active: boolean | null
          is_phone_verified: boolean | null
          last_login_at: string | null
          last_name: string | null
          marital_status: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          age_group?: string | null
          areas_of_interest?: string[] | null
          avatar?: string | null
          avatar_url?: string | null
          body_weight?: number | null
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          height?: number | null
          id?: string | null
          is_active?: boolean | null
          is_phone_verified?: boolean | null
          last_login_at?: string | null
          last_name?: string | null
          marital_status?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          age_group?: string | null
          areas_of_interest?: string[] | null
          avatar?: string | null
          avatar_url?: string | null
          body_weight?: number | null
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          height?: number | null
          id?: string | null
          is_active?: boolean | null
          is_phone_verified?: boolean | null
          last_login_at?: string | null
          last_name?: string | null
          marital_status?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      post_comments_with_profiles: {
        Row: {
          avatar_url: string | null
          content: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          first_name: string | null
          id: string | null
          is_edited: boolean | null
          last_name: string | null
          like_count: number | null
          parent_comment_id: string | null
          post_id: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments_with_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "active_social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts_with_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts_with_profiles: {
        Row: {
          allowed_viewers: string[] | null
          avatar_url: string | null
          comment_count: number | null
          content: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          expires_at: string | null
          feeling_activity: string | null
          first_name: string | null
          id: string | null
          is_active: boolean | null
          last_name: string | null
          like_count: number | null
          location: Json | null
          media_urls: string[] | null
          post_type: string | null
          share_count: number | null
          shared_post_id: string | null
          tagged_users: string[] | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
          view_count: number | null
          visibility: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_shared_post_id_fkey"
            columns: ["shared_post_id"]
            isOneToOne: false
            referencedRelation: "active_social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_shared_post_id_fkey"
            columns: ["shared_post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_shared_post_id_fkey"
            columns: ["shared_post_id"]
            isOneToOne: false
            referencedRelation: "social_posts_with_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_hotels_search: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          description: string | null
          host_id: string | null
          id: string | null
          is_active: boolean | null
          is_verified: boolean | null
          latitude: number | null
          longitude: number | null
          name: string | null
          state: string | null
          total_reviews: number | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          description?: string | null
          host_id?: string | null
          id?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          state?: string | null
          total_reviews?: number | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          description?: string | null
          host_id?: string | null
          id?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          state?: string | null
          total_reviews?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hotels_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "host_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      v_room_availability_summary: {
        Row: {
          available_rooms: number | null
          base_price: number | null
          hotel_id: string | null
          id: string | null
          name: string | null
          total_rooms: number | null
        }
        Relationships: [
          {
            foreignKeyName: "room_types_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "active_hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_types_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_types_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "v_hotels_search"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      analyze_function_classification: {
        Args: never
        Returns: {
          high_confidence: number
          low_confidence: number
          medium_confidence: number
          railway_recommended: number
          supabase_recommended: number
          total_functions: number
        }[]
      }
      assess_migration_readiness: {
        Args: never
        Returns: {
          avg_complexity_score: number
          estimated_effort_hours: number
          function_count: number
          high_priority_count: number
          module_type: string
          readiness_score: number
        }[]
      }
      calculate_platform_recommendation: {
        Args: {
          business_criticality: string
          compute_intensity: number
          db_intensity: number
          io_intensity: number
          memory_intensity: number
          security_level: string
          traffic_pattern: string
        }
        Returns: {
          confidence: number
          reasoning: string
          recommended_platform: string
        }[]
      }
      check_acid_compliance: {
        Args: never
        Returns: {
          compliance_score: number
          function_name: string
          has_error_handling: boolean
          has_row_locking: boolean
        }[]
      }
      check_migration_readiness: {
        Args: never
        Returns: {
          critical_dependencies: number
          module: string
          platform: string
          readiness_score: number
          tables_pending: number
          tables_ready: number
        }[]
      }
      check_security_compliance: {
        Args: never
        Returns: {
          recommendation: string
          security_issue: string
          severity: string
          table_name: string
        }[]
      }
      create_post_comment: {
        Args: {
          p_content: string
          p_post_id: string
          p_tenant_id?: string
          p_user_id: string
        }
        Returns: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }[]
      }
      create_role_specific_profile: {
        Args: { p_role_name: string; p_user_id: string }
        Returns: undefined
      }
      create_social_post: {
        Args: {
          p_content: string
          p_media_urls?: string[]
          p_tenant_id?: string
          p_user_id: string
          p_visibility?: string
        }
        Returns: {
          content: string
          created_at: string
          id: string
          media_urls: string[]
          updated_at: string
          user_id: string
          visibility: string
        }[]
      }
      credit_wallet: {
        Args: { p_amount: number; p_user_id: string }
        Returns: number
      }
      debit_wallet: {
        Args: { p_amount: number; p_user_id: string }
        Returns: number
      }
      decrypt_sensitive_data: {
        Args: { encrypted_data: string }
        Returns: string
      }
      disablelongtransactions: { Args: never; Returns: string }
      document_table_relationships: {
        Args: { target_table: string }
        Returns: {
          constraint_name: string
          foreign_key_column: string
          on_delete_action: string
          on_update_action: string
          referenced_column: string
          related_table: string
          relationship_type: string
        }[]
      }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      encrypt_sensitive_data: { Args: { data: string }; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      find_nearby_couriers: {
        Args: {
          limit_count?: number
          radius_km?: number
          search_lat: number
          search_lng: number
        }
        Returns: {
          availability_status: Database["public"]["Enums"]["courier_availability_status"]
          courier_code: string
          courier_id: string
          distance_km: number
          first_name: string
          is_online: boolean
          last_name: string
          phone_number: string
          rating: number
          vehicle_type: string
        }[]
      }
      find_nearby_drivers:
        | {
            Args: {
              radius_km: number
              target_lat: number
              target_lng: number
              vehicle_type_filter?: string
            }
            Returns: {
              distance_km: number
              last_location: unknown
              rating: number
              total_rides: number
              user_id: string
              vehicle_type: string
            }[]
          }
        | {
            Args: {
              search_radius_km?: number
              user_lat: number
              user_lng: number
            }
            Returns: {
              distance_km: number
              driver_id: string
              driver_name: string
              rating: number
              vehicle_type: string
            }[]
          }
      generate_assignment_number: { Args: never; Returns: string }
      generate_courier_code: { Args: never; Returns: string }
      generate_module_summary: {
        Args: never
        Returns: {
          high_traffic_tables: number
          module: string
          recommended_platform: string
          table_count: number
          total_compute_intensity: number
          total_database_intensity: number
        }[]
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_branch_summary: { Args: { p_branch_id: string }; Returns: Json }
      get_business_categories: { Args: never; Returns: Json }
      get_category_breakdown: { Args: never; Returns: Json }
      get_giga_dashboard_stats: {
        Args: { end_date?: string; start_date?: string }
        Returns: Json
      }
      get_national_summary: { Args: never; Returns: Json }
      get_nipost_access_level: { Args: { uid: string }; Returns: string }
      get_nipost_role: { Args: { uid: string }; Returns: string }
      get_nipost_state_id: { Args: { uid: string }; Returns: string }
      get_platform_setting:
        | {
            Args: {
              default_value?: string
              setting_category: string
              setting_key: string
            }
            Returns: string
          }
        | { Args: { setting_key: string }; Returns: string }
      get_pmg_state: { Args: { uid: string }; Returns: string }
      get_sales_comparison: {
        Args: { current_period_end?: string; current_period_start?: string }
        Returns: Json
      }
      get_state_summary: { Args: { p_state_id: string }; Returns: Json }
      get_user_access_level: {
        Args: { uid: string }
        Returns: {
          access_level: string
          branch_id: string
          state_id: string
        }[]
      }
      get_wallet_balance: { Args: { p_user_id: string }; Returns: number }
      gettransactionid: { Args: never; Returns: unknown }
      has_permission: {
        Args: { required_permission: string }
        Returns: boolean
      }
      has_role: { Args: { required_roles: string[] }; Returns: boolean }
      is_admin_user: { Args: never; Returns: boolean }
      is_courier: { Args: { uid: string }; Returns: boolean }
      is_dop: { Args: { uid: string }; Returns: boolean }
      is_module_admin: { Args: { uid: string }; Returns: boolean }
      is_postmaster_general: { Args: { uid: string }; Returns: boolean }
      is_regional_manager: { Args: { uid: string }; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
      mask_sensitive_data: {
        Args: { data: string; mask_type?: string }
        Returns: string
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      toggle_post_like: {
        Args: { p_post_id: string; p_tenant_id?: string; p_user_id: string }
        Returns: {
          liked: boolean
        }[]
      }
      unlockrows: { Args: { "": string }; Returns: number }
      update_courier_location: {
        Args: { courier_uuid: string; lat: number; lng: number }
        Returns: boolean
      }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      courier_availability_status: "available" | "busy" | "offline" | "on_break"
      delivery_exception_type:
        | "address_not_found"
        | "recipient_unavailable"
        | "damaged_package"
        | "weather_delay"
        | "vehicle_breakdown"
        | "traffic_delay"
        | "security_issue"
        | "other"
      delivery_status:
        | "pending"
        | "assigned"
        | "picked_up"
        | "in_transit"
        | "out_for_delivery"
        | "delivered"
        | "failed"
        | "cancelled"
        | "returned"
      notification_status: "pending" | "sent" | "delivered" | "failed" | "read"
      notification_type: "email" | "sms" | "push" | "in_app"
      user_role:
        | "user"
        | "admin"
        | "moderator"
        | "driver"
        | "merchant"
        | "hotel_manager"
      user_status: "active" | "inactive" | "suspended" | "pending_verification"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      courier_availability_status: ["available", "busy", "offline", "on_break"],
      delivery_exception_type: [
        "address_not_found",
        "recipient_unavailable",
        "damaged_package",
        "weather_delay",
        "vehicle_breakdown",
        "traffic_delay",
        "security_issue",
        "other",
      ],
      delivery_status: [
        "pending",
        "assigned",
        "picked_up",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "failed",
        "cancelled",
        "returned",
      ],
      notification_status: ["pending", "sent", "delivered", "failed", "read"],
      notification_type: ["email", "sms", "push", "in_app"],
      user_role: [
        "user",
        "admin",
        "moderator",
        "driver",
        "merchant",
        "hotel_manager",
      ],
      user_status: ["active", "inactive", "suspended", "pending_verification"],
    },
  },
} as const
