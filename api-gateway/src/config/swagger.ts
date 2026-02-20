import swaggerJsdoc from 'swagger-jsdoc';

import { config } from './index.js';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'GIGA API Gateway',
      version: '2.0.0',
      description: `
# GIGA API Gateway

The central API Gateway for the GIGA platform. This gateway routes requests to appropriate microservices.

## 🔀 Service Routing

Use the dropdown above to switch between different service APIs:

| Service | Description | Prefix |
|---------|-------------|--------|
| **API Gateway** | Health checks, auth proxy, service discovery | \`/health\`, \`/auth\` |
| **Social Service** | Posts, comments, likes, feed, stories | \`/api/v1/social/*\` |
| **Admin Service** | Dashboard, business modules, postal monitoring | \`/api/*\` (dashboard routes) |
| **Search Service** | Hotel and product search | \`/api/v1/search/*\` |
| **Delivery Service** | Courier tracking, packages | \`/api/v1/delivery/*\` |
| **Payment Queue** | Payment processing, webhooks | \`/api/v1/payment-queue/*\` |
| **Notifications** | Push, email, SMS alerts | \`/api/v1/notifications/*\` |
| **Taxi Realtime** | Driver locations, ride matching | \`/api/v1/taxi-realtime/*\` |

## � Authentication

All protected endpoints require JWT authentication:
\`\`\`
Authorization: Bearer <jwt_token>
\`\`\`

Get JWT token from Supabase Auth:
\`\`\`
POST /auth/v1/token?grant_type=password
\`\`\`

## � Supabase Functions

Many endpoints are proxied to Supabase Edge Functions:
- User management: \`/api/v1/user/*\`
- Hotels: \`/api/v1/hotels/*\`
- Rides: \`/api/v1/rides/*\`
- Payments: \`/api/v1/payments/*\`
- And more...

These are routed through the gateway but executed on Supabase.
      `,
      contact: {
        name: 'GIGA Platform Team',
        email: 'api@giga.com',
      },
    },
    servers: [
      {
        url: 'https://giga-giga-production.up.railway.app',
        description: 'Production API Gateway',
      },
      {
        url: `http://localhost:${config.port}`,
        description: 'Local development server',
      },
    ],
    tags: [
      { name: 'Health', description: 'Gateway and service health checks' },
      { name: 'Authentication', description: 'Auth proxy to Supabase' },
      { name: 'Documentation', description: 'Service documentation hub' },
      { name: 'Services', description: 'Service registry and status' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token from Supabase Auth',
        },
      },
      parameters: {
        Page: {
          in: 'query',
          name: 'page',
          schema: { type: 'integer', default: 1, minimum: 1 },
          description: 'Page number',
        },
        Limit: {
          in: 'query',
          name: 'limit',
          schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
          description: 'Items per page',
        },
      },
      responses: {
        Unauthorized: {
          description: 'Unauthorized - invalid or missing JWT token',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: {
                    type: 'object',
                    properties: {
                      code: { type: 'string', example: 'AUTHENTICATION_ERROR' },
                      message: { type: 'string', example: 'Authentication required' },
                    },
                  },
                },
              },
            },
          },
        },
        Forbidden: {
          description: 'Forbidden - insufficient permissions',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: {
                    type: 'object',
                    properties: {
                      code: { type: 'string', example: 'FORBIDDEN' },
                      message: { type: 'string', example: 'Access denied' },
                    },
                  },
                },
              },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: {
                    type: 'object',
                    properties: {
                      code: { type: 'string', example: 'NOT_FOUND' },
                      message: { type: 'string', example: 'Resource not found' },
                    },
                  },
                },
              },
            },
          },
        },
        BadRequest: {
          description: 'Bad Request',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: {
                    type: 'object',
                    properties: {
                      code: { type: 'string', example: 'BAD_REQUEST' },
                      message: { type: 'string', example: 'Invalid input' },
                    },
                  },
                },
              },
            },
          },
        },
        ServiceUnavailable: {
          description: 'Service temporarily unavailable',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: {
                    type: 'object',
                    properties: {
                      code: { type: 'string', example: 'SERVICE_UNAVAILABLE' },
                      message: { type: 'string', example: 'Service temporarily unavailable' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      schemas: {
        ServiceHealth: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Admin Service' },
            platform: { type: 'string', enum: ['supabase', 'railway'], example: 'railway' },
            healthy: { type: 'boolean', example: true },
            status: { type: 'integer', example: 200 },
            responseTime: { type: 'string', example: '45ms' },
            lastCheck: { type: 'string', format: 'date-time' },
          },
        },
        // Placeholders for missing schemas
        UpdateProfileRequest: { type: 'object' },
        MediaUploadResponse: { type: 'object' },
        AddAddressRequest: { type: 'object' },
        ApplyForRoleRequest: { type: 'object' },
        RideRequest: { type: 'object' },
        PaginatedResponse: { type: 'object' },
        AddToCartRequest: { type: 'object' },
        CheckoutRequest: { type: 'object' },
        InitiateCallRequest: { type: 'object' },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  // Only include gateway-specific routes
  apis: ['./src/routes/*.ts', './dist/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
