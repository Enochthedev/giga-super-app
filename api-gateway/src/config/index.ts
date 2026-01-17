import dotenv from 'dotenv';

dotenv.config();

// Helper to ensure URL has protocol
const ensureProtocol = (url: string | undefined): string | undefined => {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Railway internal URLs use http
  return `http://${url}`;
};

export const config = {
  // Server
  port: parseInt(process.env.PORT ?? process.env.API_GATEWAY_PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  trustProxy: process.env.TRUST_PROXY === 'true',

  // CORS
  corsOrigin: process.env.CORS_ORIGIN ?? '*',

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10), // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '100', 10),

  // Supabase
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',

  // Service URLs
  services: {
    social: ensureProtocol(
      process.env.SOCIAL_SERVICE_URL ??
        `http://localhost:${process.env.SOCIAL_SERVICE_PORT ?? '3001'}`
    ),
    payment: ensureProtocol(
      process.env.PAYMENT_QUEUE_SERVICE_URL ??
        `http://localhost:${process.env.PAYMENT_QUEUE_SERVICE_PORT ?? '3002'}`
    ),
    delivery: ensureProtocol(
      process.env.DELIVERY_SERVICE_URL ??
        `http://localhost:${process.env.DELIVERY_SERVICE_PORT ?? '3003'}`
    ),
    notifications: ensureProtocol(
      process.env.NOTIFICATIONS_SERVICE_URL ??
        `http://localhost:${process.env.NOTIFICATIONS_SERVICE_PORT ?? '3004'}`
    ),
    admin: ensureProtocol(
      process.env.ADMIN_SERVICE_URL ??
        `http://localhost:${process.env.ADMIN_SERVICE_PORT ?? '3005'}`
    ),
    taxiRealtime: ensureProtocol(
      process.env.TAXI_REALTIME_SERVICE_URL ??
        `http://localhost:${process.env.TAXI_REALTIME_SERVICE_PORT ?? '3006'}`
    ),
    search: ensureProtocol(
      process.env.SEARCH_SERVICE_URL ??
        `http://localhost:${process.env.SEARCH_SERVICE_PORT ?? '3007'}`
    ),
    ads: ensureProtocol(process.env.ADS_SERVICE_URL),
    media: ensureProtocol(process.env.MEDIA_SERVICE_URL),
    communication: ensureProtocol(process.env.COMMUNICATION_SERVICE_URL),
    hotelExtended: ensureProtocol(process.env.HOTEL_EXTENDED_SERVICE_URL),
    taxiExtended: ensureProtocol(process.env.TAXI_EXTENDED_SERVICE_URL),
    ecommerceExtended: ensureProtocol(process.env.ECOMMERCE_EXTENDED_SERVICE_URL),
  },

  // Health Check
  healthCheckTimeoutMs: parseInt(process.env.HEALTH_CHECK_TIMEOUT_MS ?? '5000', 10),
  serviceTimeoutMs: parseInt(process.env.SERVICE_TIMEOUT_MS ?? '5000', 10),

  // Logging
  logLevel: process.env.LOG_LEVEL ?? 'info',
} as const;

export type Config = typeof config;
