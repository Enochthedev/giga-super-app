import swaggerJsdoc from 'swagger-jsdoc';

import { config } from './index.js';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'GIGA Platform API Gateway',
      version: '2.0.0',
      description: `
# GIGA Platform API Gateway

The central API Gateway for the GIGA platform, routing requests to appropriate microservices.

## 🌐 Service Architecture

The API Gateway routes requests to the following services:

### 🔐 Authentication (Supabase)
- **Login/Logout**: JWT-based authentication
- **User Management**: Profile and permissions

### 📊 Dashboard & Admin (Railway)
- **Dashboard Statistics**: Revenue, orders, visitors, conversion
- **Business Modules**: E-commerce, taxi, hotel, media
- **Postal Monitoring**: Staff and operations management
- **Advertisement Management**: Ad review and approval

### 🏪 Business Services (Supabase + Railway)
- **E-commerce**: Products, orders, vendors
- **Hotels**: Bookings, rooms, reviews
- **Taxi**: Rides, drivers, tracking
- **Payments**: Transactions, wallets, escrow

### 🔄 Real-time Services (Railway)
- **Social Media**: Posts, comments, likes, feed
- **Notifications**: Push, email, SMS
- **Search**: Hotels, products, content
- **Delivery**: Courier tracking, route optimization

## 🔐 Authentication

All protected endpoints require JWT authentication:
\`\`\`
Authorization: Bearer <jwt_token>
\`\`\`

Get JWT token from login endpoint:
\`\`\`
POST /api/v1/auth/token
\`\`\`

## 📋 Response Format

All responses follow a consistent format:
\`\`\`json
{
  "success": true|false,
  "data": {...} | [...],
  "error": "Error message if applicable",
  "pagination": { "page": 1, "limit": 20, "total": 100, "pages": 5 }
}
\`\`\`

## 🔍 Pagination & Search

Most list endpoints support:
- **Pagination**: \`?page=1&limit=20\`
- **Search**: \`?search=keyword\`
- **Filtering**: \`?status=active&region=lagos\`

## 🚀 Service Health

Check service health at:
- **Gateway Health**: \`GET /health\`
- **All Services**: \`GET /health/services\`
      `,
      contact: {
        name: 'GIGA Platform Team',
        email: 'api@giga.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'https://your-api-gateway.railway.app',
        description: 'Production API Gateway',
      },
      {
        url: `http://localhost:${config.port}`,
        description: 'Local development server',
      },
    ],
    tags: [
      { name: 'Health', description: 'API Gateway and service health checks' },
      { name: 'Authentication', description: 'User authentication via Supabase Auth' },
      { name: 'Dashboard', description: 'GIGA Dashboard statistics (routed to Admin Service)' },
      {
        name: 'Business Modules',
        description: 'E-commerce, taxi, hotel, media (routed to Admin Service)',
      },
      {
        name: 'Postal Monitoring',
        description: 'Postal staff management (routed to Admin Service)',
      },
      {
        name: 'Manager Operations',
        description: 'Post office manager endpoints (routed to Admin Service)',
      },
      {
        name: 'Advertisement Management',
        description: 'Ad review workflow (routed to Admin Service)',
      },
      { name: 'Admin Panel', description: 'Administrative settings (routed to Admin Service)' },
      { name: 'Social Media', description: 'Social features (routed to Social Service)' },
      { name: 'Hotels', description: 'Hotel bookings (routed to Supabase)' },
      { name: 'E-commerce', description: 'Products and orders (routed to Supabase)' },
      { name: 'Taxi', description: 'Ride services (routed to Supabase)' },
      { name: 'Payments', description: 'Payment processing (routed to Supabase)' },
      { name: 'Search', description: 'Search functionality (routed to Search Service)' },
      {
        name: 'Notifications',
        description: 'Notification system (routed to Notifications Service)',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token from Supabase Auth',
        },
        ApiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'apikey',
          description: 'Supabase API key for direct Supabase calls',
        },
      },
      parameters: {
        Page: {
          in: 'query',
          name: 'page',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1,
          },
          description: 'Page number for pagination',
        },
        Limit: {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
          },
          description: 'Number of items per page',
        },
      },
      responses: {
        BadRequest: {
          description: 'Bad request - invalid parameters',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: { type: 'string', example: 'Invalid request parameters' },
                },
              },
            },
          },
        },
        Unauthorized: {
          description: 'Unauthorized - invalid or missing JWT token',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: { type: 'string', example: 'Authentication required' },
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
                  error: { type: 'string', example: 'Insufficient permissions' },
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
                  error: { type: 'string', example: 'Resource not found' },
                },
              },
            },
          },
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  error: { type: 'string', example: 'Internal server error' },
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
                  error: { type: 'string', example: 'Service temporarily unavailable' },
                },
              },
            },
          },
        },
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 20 },
                total: { type: 'integer', example: 150 },
                pages: { type: 'integer', example: 8 },
              },
            },
          },
        },
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
      },
    },
    security: [{ BearerAuth: [] }, { ApiKey: [] }],
  },
  apis: [
    './src/routes/*.ts',
    './src/middleware/*.ts',
    // Include external API documentation
    '../docs/api/GIGA_DASHBOARD_SWAGGER.yaml',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
