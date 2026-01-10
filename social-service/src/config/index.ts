import { ServiceConfig } from '../types';

/**
 * Validates and retrieves an environment variable
 * @param key - Environment variable name
 * @param defaultValue - Optional default value
 * @returns The environment variable value
 * @throws Error if required variable is missing
 */
function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Validates and retrieves a numeric environment variable
 * @param key - Environment variable name
 * @param defaultValue - Default numeric value
 * @returns The parsed numeric value
 */
function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  return parsed;
}

/**
 * Centralized configuration for the social service
 * All configuration is loaded from environment variables with validation
 */
const config: ServiceConfig = {
  // Server Configuration
  port: getEnvNumber('PORT', 3001),
  nodeEnv: getEnvVar('NODE_ENV', 'development'),

  // Supabase Configuration
  supabase: {
    url: getEnvVar('SUPABASE_URL'),
    serviceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
    anonKey: getEnvVar('SUPABASE_ANON_KEY'),
  },

  // JWT Configuration
  jwt: {
    secret: getEnvVar('JWT_SECRET'),
  },

  // Cache Configuration
  cache: {
    ttl: getEnvNumber('CACHE_TTL', 300), // 5 minutes
    maxKeys: getEnvNumber('CACHE_MAX_KEYS', 1000),
  },

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 60000), // 1 minute
    maxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
  },

  // Pagination Configuration
  pagination: {
    defaultLimit: getEnvNumber('PAGINATION_DEFAULT_LIMIT', 20),
    maxLimit: getEnvNumber('PAGINATION_MAX_LIMIT', 100),
  },

  // Logging Configuration
  logging: {
    level: getEnvVar('LOG_LEVEL', 'info'),
    format: getEnvVar('LOG_FORMAT', 'json'),
  },

  // Social-Specific Configuration
  social: {
    maxMediaUploads: getEnvNumber('MAX_MEDIA_UPLOADS', 10),
    maxContentLength: getEnvNumber('MAX_CONTENT_LENGTH', 5000),
    maxCommentLength: getEnvNumber('MAX_COMMENT_LENGTH', 2000),
    storyExpirationHours: getEnvNumber('STORY_EXPIRATION_HOURS', 24),
    trendingTimeframeHours: getEnvNumber('TRENDING_TIMEFRAME_HOURS', 24),
  },
};

/**
 * Validates the configuration on startup
 * @throws Error if configuration is invalid
 */
export function validateConfig(): void {
  // Validate port range
  if (config.port < 1 || config.port > 65535) {
    throw new Error('Port must be between 1 and 65535');
  }

  // Validate environment
  const validEnvironments = ['development', 'staging', 'production', 'test'];
  if (!validEnvironments.includes(config.nodeEnv)) {
    throw new Error(
      `NODE_ENV must be one of: ${validEnvironments.join(', ')}`
    );
  }

  // Validate URLs
  try {
    new URL(config.supabase.url);
  } catch {
    throw new Error('SUPABASE_URL must be a valid URL');
  }

  // Validate cache settings
  if (config.cache.ttl < 0) {
    throw new Error('CACHE_TTL must be non-negative');
  }

  if (config.cache.maxKeys < 1) {
    throw new Error('CACHE_MAX_KEYS must be at least 1');
  }

  // Validate rate limiting
  if (config.rateLimit.windowMs < 1000) {
    throw new Error('RATE_LIMIT_WINDOW_MS must be at least 1000ms');
  }

  if (config.rateLimit.maxRequests < 1) {
    throw new Error('RATE_LIMIT_MAX_REQUESTS must be at least 1');
  }

  // Validate pagination
  if (config.pagination.defaultLimit < 1) {
    throw new Error('PAGINATION_DEFAULT_LIMIT must be at least 1');
  }

  if (config.pagination.maxLimit < config.pagination.defaultLimit) {
    throw new Error(
      'PAGINATION_MAX_LIMIT must be greater than or equal to PAGINATION_DEFAULT_LIMIT'
    );
  }

  // Validate social settings
  if (config.social.maxMediaUploads < 1) {
    throw new Error('MAX_MEDIA_UPLOADS must be at least 1');
  }

  if (config.social.maxContentLength < 100) {
    throw new Error('MAX_CONTENT_LENGTH must be at least 100 characters');
  }

  if (config.social.maxCommentLength < 50) {
    throw new Error('MAX_COMMENT_LENGTH must be at least 50 characters');
  }

  if (config.social.storyExpirationHours < 1) {
    throw new Error('STORY_EXPIRATION_HOURS must be at least 1 hour');
  }

  if (config.social.trendingTimeframeHours < 1) {
    throw new Error('TRENDING_TIMEFRAME_HOURS must be at least 1 hour');
  }
}

// Validate configuration on module load
validateConfig();

export default config;
