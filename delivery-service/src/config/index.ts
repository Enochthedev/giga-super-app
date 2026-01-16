import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface ServiceConfig {
  port: number;
  nodeEnv: string;
  supabase: {
    url: string;
    serviceRoleKey: string;
    anonKey: string;
  };
  database: {
    poolSize: number;
    timeout: number;
  };
  jwt: {
    secret: string;
  };
  googleMaps: {
    apiKey: string;
  };
  cache: {
    ttl: number;
    maxKeys: number;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  logging: {
    level: string;
    format: string;
  };
  delivery: {
    defaultRadiusKm: number;
    maxRadiusKm: number;
    courierLocationUpdateIntervalMs: number;
    routeOptimizationEnabled: boolean;
  };
  notifications: {
    enablePush: boolean;
    enableSms: boolean;
    enableEmail: boolean;
  };
  pagination: {
    defaultLimit: number;
    maxLimit: number;
  };
}

const config: ServiceConfig = {
  port: parseInt(process.env['PORT'] || '3003', 10),
  nodeEnv: process.env['NODE_ENV'] || 'development',

  supabase: {
    url: process.env['SUPABASE_URL'] || '',
    serviceRoleKey: process.env['SUPABASE_SERVICE_ROLE_KEY'] || '',
    anonKey: process.env['SUPABASE_ANON_KEY'] || '',
  },

  database: {
    poolSize: parseInt(process.env['DB_POOL_SIZE'] || '10', 10),
    timeout: parseInt(process.env['DB_TIMEOUT'] || '30000', 10),
  },

  jwt: {
    secret: process.env['JWT_SECRET'] || 'fallback-secret-key',
  },

  googleMaps: {
    apiKey: process.env['GOOGLE_MAPS_API_KEY'] || '',
  },

  cache: {
    ttl: parseInt(process.env['CACHE_TTL'] || '300', 10),
    maxKeys: parseInt(process.env['CACHE_MAX_KEYS'] || '1000', 10),
  },

  rateLimit: {
    windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100', 10),
  },

  logging: {
    level: process.env['LOG_LEVEL'] || 'info',
    format: process.env['LOG_FORMAT'] || 'json',
  },

  delivery: {
    defaultRadiusKm: parseFloat(process.env['DEFAULT_DELIVERY_RADIUS_KM'] || '10'),
    maxRadiusKm: parseFloat(process.env['MAX_DELIVERY_RADIUS_KM'] || '50'),
    courierLocationUpdateIntervalMs: parseInt(
      process.env['COURIER_LOCATION_UPDATE_INTERVAL_MS'] || '30000',
      10
    ),
    routeOptimizationEnabled: process.env['ROUTE_OPTIMIZATION_ENABLED'] === 'true',
  },

  notifications: {
    enablePush: process.env['ENABLE_PUSH_NOTIFICATIONS'] === 'true',
    enableSms: process.env['ENABLE_SMS_NOTIFICATIONS'] === 'true',
    enableEmail: process.env['ENABLE_EMAIL_NOTIFICATIONS'] === 'true',
  },

  pagination: {
    defaultLimit: parseInt(process.env['PAGINATION_DEFAULT_LIMIT'] || '20', 10),
    maxLimit: parseInt(process.env['PAGINATION_MAX_LIMIT'] || '100', 10),
  },
};

// Validate required configuration (warn but don't crash in development)
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET'];

// Optional but recommended env vars
const recommendedEnvVars = ['GOOGLE_MAPS_API_KEY'];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
const missingRecommended = recommendedEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  const message = `Missing required environment variables: ${missingEnvVars.join(', ')}`;
  if (config.nodeEnv === 'production') {
    throw new Error(message);
  } else {
    console.warn(`[WARNING] ${message}`);
  }
}

if (missingRecommended.length > 0) {
  console.warn(
    `[WARNING] Missing recommended environment variables: ${missingRecommended.join(', ')}. Some features may be disabled.`
  );
}

export default config;
