import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { logger } from './logger';

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private supabase: SupabaseClient;

  private constructor() {
    const supabaseUrl = process.env['SUPABASE_URL'];
    const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required Supabase configuration');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: {
        schema: 'public',
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          'x-application-name': 'delivery-service',
        },
      },
    });

    logger.info('Database connection initialized', {
      url: supabaseUrl,
      service: 'delivery-service',
    });
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public getClient(): SupabaseClient {
    return this.supabase;
  }

  public async testConnection(): Promise<boolean> {
    try {
      const { data: _data, error } = await this.supabase
        .from('courier_profiles')
        .select('id')
        .limit(1);

      if (error) {
        logger.error('Database connection test failed', { error: error.message });
        return false;
      }

      logger.info('Database connection test successful');
      return true;
    } catch (error) {
      logger.error('Database connection test error', { error });
      return false;
    }
  }

  public async executeQuery<T>(query: () => Promise<{ data: T | null; error: any }>): Promise<T> {
    try {
      const { data, error } = await query();

      if (error) {
        logger.error('Database query error', { error: error.message });
        throw new Error(`Database error: ${error.message}`);
      }

      return data as T;
    } catch (error) {
      logger.error('Database query execution failed', { error });
      throw error;
    }
  }

  public async executeTransaction<T>(
    operations: ((client: SupabaseClient) => Promise<T>)[]
  ): Promise<T[]> {
    const results: T[] = [];

    try {
      // Note: Supabase doesn't support explicit transactions in the client
      // We'll execute operations sequentially and handle rollback manually if needed
      for (const operation of operations) {
        const result = await operation(this.supabase);
        results.push(result);
      }

      return results;
    } catch (error) {
      logger.error('Transaction failed', { error, completedOperations: results.length });
      throw error;
    }
  }
}

// Export singleton instance
export const database = DatabaseConnection.getInstance();
export const supabase = database.getClient();
