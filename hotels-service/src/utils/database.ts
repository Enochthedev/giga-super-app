/**
 * Database utilities for Booking Service
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class DatabaseService {
  public supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      db: { schema: 'public' },
      auth: { persistSession: false },
    });
  }

  /**
   * Create a client with user's auth token for RLS
   */
  createUserClient(authToken: string): SupabaseClient {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_ANON_KEY!;

    return createClient(supabaseUrl, supabaseKey, {
      db: { schema: 'public' },
      auth: { persistSession: false },
      global: {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    });
  }
}

export const databaseService = new DatabaseService();
