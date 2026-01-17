/**
 * Port configuration for Search Service
 */

export const SERVICE_PORTS = {
  SEARCH_SERVICE: parseInt(process.env.PORT || process.env.SEARCH_SERVICE_PORT || '3007', 10),
} as const;
