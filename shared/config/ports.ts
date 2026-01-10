/**
 * Centralized port configuration for all services
 * All services should import from here instead of hardcoding ports
 */

export const SERVICE_PORTS = {
  API_GATEWAY: parseInt(process.env.API_GATEWAY_PORT || '3000', 10),
  SOCIAL_SERVICE: parseInt(process.env.SOCIAL_SERVICE_PORT || '3001', 10),
  PAYMENT_QUEUE_SERVICE: parseInt(process.env.PAYMENT_QUEUE_SERVICE_PORT || '3002', 10),
  DELIVERY_SERVICE: parseInt(process.env.DELIVERY_SERVICE_PORT || '3003', 10),
  NOTIFICATIONS_SERVICE: parseInt(process.env.NOTIFICATIONS_SERVICE_PORT || '3004', 10),
  ADMIN_SERVICE: parseInt(process.env.ADMIN_SERVICE_PORT || '3005', 10),
  TAXI_REALTIME_SERVICE: parseInt(process.env.TAXI_REALTIME_SERVICE_PORT || '3006', 10),
  SEARCH_SERVICE: parseInt(process.env.SEARCH_SERVICE_PORT || '3007', 10),
} as const;

export const SERVICE_URLS = {
  API_GATEWAY: process.env.API_GATEWAY_URL || `http://localhost:${SERVICE_PORTS.API_GATEWAY}`,
  SOCIAL_SERVICE: process.env.SOCIAL_SERVICE_URL || `http://localhost:${SERVICE_PORTS.SOCIAL_SERVICE}`,
  PAYMENT_QUEUE_SERVICE: process.env.PAYMENT_QUEUE_SERVICE_URL || `http://localhost:${SERVICE_PORTS.PAYMENT_QUEUE_SERVICE}`,
  DELIVERY_SERVICE: process.env.DELIVERY_SERVICE_URL || `http://localhost:${SERVICE_PORTS.DELIVERY_SERVICE}`,
  NOTIFICATIONS_SERVICE: process.env.NOTIFICATIONS_SERVICE_URL || `http://localhost:${SERVICE_PORTS.NOTIFICATIONS_SERVICE}`,
  ADMIN_SERVICE: process.env.ADMIN_SERVICE_URL || `http://localhost:${SERVICE_PORTS.ADMIN_SERVICE}`,
  TAXI_REALTIME_SERVICE: process.env.TAXI_REALTIME_SERVICE_URL || `http://localhost:${SERVICE_PORTS.TAXI_REALTIME_SERVICE}`,
  SEARCH_SERVICE: process.env.SEARCH_SERVICE_URL || `http://localhost:${SERVICE_PORTS.SEARCH_SERVICE}`,
} as const;

export type ServiceName = keyof typeof SERVICE_PORTS;
