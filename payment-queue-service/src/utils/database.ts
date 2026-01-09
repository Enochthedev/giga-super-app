import { createClient } from '@supabase/supabase-js';
import { config } from '@/config';
import logger from './logger';

// Initialize Supabase client with service role key
export const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('nipost_financial_ledger').select('id').limit(1);
    
    if (error) {
      logger.error('Database connection test failed', { error: error.message });
      return false;
    }
    
    logger.info('Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection test error', { error });
    return false;
  }
};

export default supabase;
