// eslint-disable-next-line @typescript-eslint/no-var-requires
const swaggerJsdoc = require('swagger-jsdoc');

const options: Record<string, unknown> = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Giga Admin Service API',
      version: '1.0.0',
      description: `
## Admin Aggregation Service API

This service provides multi-tenant administrative functionality for the Giga platform with hierarchical access control:

### Access Levels
- **National**: Full access to all states and branches (National HQ)
- **State**: Access to specific state and its branches (State Centers)
- **Branch**: Access to specific branch only (Local Branches)

### Features
- **Dashboard Analytics**: Real-time metrics at each hierarchy level
- **Financial Reporting**: Revenue, commissions, and transaction summaries
- **Audit Trail**: Comprehensive logging of all administrative actions
- **User Management**: Permission-based access control

### Authentication
All endpoints require a valid JWT token with appropriate permissions.
The token must contain user role and access level information.

### Response Format
All responses follow a consistent format:
\`\`\`json
{
  "success": true|false,
  "data": {...} | [...],
  "error": "Error message if applicable",
  "pagination": { "page": 1, "limit": 20, "total": 100, "pages": 5 }
}
\`\`\`
      `,
      contact: {
        name: 'Giga Platform Team',
        email: 'api@giga.com',
      },
    },
    servers: [
      {
        url: '/api/admin',
        description: 'Admin API',
      },
    ],
    tags: [
      { name: 'Health', description: 'Service health checks' },
      { name: 'National', description: 'National-level administrative endpoints' },
      { name: 'State', description: 'State-level administrative endpoints' },
      { name: 'Branch', description: 'Branch-level administrative endpoints' },
      { name: 'Audit', description: 'Audit trail and logging' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token with admin permissions',
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
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Error message' },
          },
        },
        DashboardSummary: {
          type: 'object',
          properties: {
            totalTransactions: { type: 'integer' },
            totalRevenue: { type: 'number' },
            totalCommission: { type: 'number' },
            byModule: {
              type: 'object',
              properties: {
                hotel: { type: 'number' },
                taxi: { type: 'number' },
                ecommerce: { type: 'number' },
              },
            },
          },
        },
        FinancialSummary: {
          type: 'object',
          properties: {
            totalTransactions: { type: 'integer' },
            totalRevenue: { type: 'number' },
            totalCommission: { type: 'number' },
            byModule: { type: 'object' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            module: { type: 'string', enum: ['hotel', 'taxi', 'ecommerce'] },
            gross_amount: { type: 'number' },
            commission_amount: { type: 'number' },
            payment_status: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        AuditLog: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            admin_id: { type: 'string', format: 'uuid' },
            admin_name: { type: 'string' },
            action_type: { type: 'string' },
            resource_type: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            pages: { type: 'integer' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/index.ts', './src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
