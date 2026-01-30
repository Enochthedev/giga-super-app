// eslint-disable-next-line @typescript-eslint/no-var-requires
const swaggerJsdoc = require('swagger-jsdoc');

const options: Record<string, unknown> = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'GIGA Dashboard & Admin Service API',
      version: '2.1.2',
      description: `
## GIGA Dashboard & Admin Service API

This service provides comprehensive dashboard analytics and administrative functionality for the GIGA platform.

### 🎯 GIGA Dashboard API
Complete dashboard API with statistics, business modules, and management features:
- **Dashboard Statistics**: Revenue, orders, visitors, conversion rates
- **Business Modules**: E-commerce, taxi, hotel, media management
- **Postal Monitoring**: Staff and operations management
- **Advertisement Management**: Ad review and approval workflow

### 🔐 Authentication
All endpoints require JWT authentication via Supabase Auth:
\`\`\`
Authorization: Bearer <jwt_token>
\`\`\`

### 🌐 Base URLs
- **API Gateway**: https://your-api-gateway.railway.app
- **Direct Service**: https://your-admin-service.railway.app

### 📊 Access Levels
- **National**: Full access to all data and statistics
- **State**: Access to state-specific data only  
- **Branch**: Access to branch-specific data only
- **Manager**: Limited access to assigned region/branch

### 📋 Response Format
All responses follow a consistent format:
\`\`\`json
{
  "success": true|false,
  "data": {...} | [...],
  "error": "Error message if applicable",
  "pagination": { "page": 1, "limit": 20, "total": 100, "pages": 5 }
}
\`\`\`

### 🔍 Pagination & Search
Most list endpoints support:
- **Pagination**: \`?page=1&limit=20\`
- **Search**: \`?search=keyword\`
- **Filtering**: \`?status=active&region=lagos\`
      `,
      contact: {
        name: 'GIGA Platform Team',
        email: 'api@giga.com',
      },
    },
    servers: [
      {
        url: 'https://your-api-gateway.railway.app',
        description: 'API Gateway (Recommended)',
      },
      {
        url: 'https://your-admin-service.railway.app',
        description: 'Direct Admin Service',
      },
      {
        url: 'http://localhost:3000',
        description: 'Local Development (API Gateway)',
      },
      {
        url: 'http://localhost:3005',
        description: 'Local Development (Admin Service)',
      },
    ],
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Dashboard', description: 'GIGA Dashboard statistics and analytics' },
      { name: 'Business Modules', description: 'E-commerce, taxi, hotel, media management' },
      { name: 'Postal Monitoring', description: 'Postal staff and operations management' },
      { name: 'Manager Operations', description: 'Post office manager specific endpoints' },
      { name: 'Advertisement Management', description: 'Ad review and approval workflow' },
      { name: 'Admin Panel', description: 'Administrative categories and settings' },
      { name: 'NIPOST Admin', description: 'Legacy NIPOST administrative endpoints' },
      { name: 'Health', description: 'Service health checks' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token from Supabase Auth (required for all endpoints)',
        },
      },
      schemas: {
        // Response schemas
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
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Error message' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            pagination: { $ref: '#/components/schemas/Pagination' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 150 },
            pages: { type: 'integer', example: 8 },
          },
        },

        // Dashboard schemas
        DashboardStats: {
          type: 'object',
          properties: {
            revenue: {
              type: 'object',
              properties: {
                value: { type: 'number', example: 125000.5 },
                change: { type: 'string', example: '+22%' },
                trend: { type: 'string', enum: ['up', 'down'], example: 'up' },
              },
            },
            orders: {
              type: 'object',
              properties: {
                value: { type: 'integer', example: 1250 },
                change: { type: 'string', example: '+15%' },
                trend: { type: 'string', enum: ['up', 'down'], example: 'up' },
              },
            },
            visitors: {
              type: 'object',
              properties: {
                value: { type: 'integer', example: 15500 },
                change: { type: 'string', example: '+49%' },
                trend: { type: 'string', enum: ['up', 'down'], example: 'up' },
              },
            },
            conversion: {
              type: 'object',
              properties: {
                value: { type: 'number', example: 28.5 },
                change: { type: 'string', example: '+1.9%' },
                trend: { type: 'string', enum: ['up', 'down'], example: 'up' },
              },
            },
          },
        },
        SalesComparison: {
          type: 'object',
          properties: {
            current_period: {
              type: 'object',
              properties: {
                sales: { type: 'number', example: 125000.5 },
                start_date: { type: 'string', format: 'date', example: '2026-01-01' },
                end_date: { type: 'string', format: 'date', example: '2026-01-29' },
              },
            },
            previous_period: {
              type: 'object',
              properties: {
                sales: { type: 'number', example: 98000.25 },
                start_date: { type: 'string', format: 'date', example: '2025-12-03' },
                end_date: { type: 'string', format: 'date', example: '2025-12-31' },
              },
            },
            change: {
              type: 'object',
              properties: {
                amount: { type: 'number', example: 27000.25 },
                percentage: { type: 'number', example: 27.55 },
                trend: { type: 'string', enum: ['up', 'down'], example: 'up' },
              },
            },
          },
        },
        CategoryBreakdown: {
          type: 'object',
          properties: {
            ecommerce: {
              type: 'object',
              properties: {
                revenue: { type: 'number', example: 45000.0 },
                orders: { type: 'integer', example: 450 },
                vendors: { type: 'integer', example: 125 },
              },
            },
            hotel: {
              type: 'object',
              properties: {
                revenue: { type: 'number', example: 35000.0 },
                bookings: { type: 'integer', example: 180 },
                hotels: { type: 'integer', example: 45 },
              },
            },
            taxi: {
              type: 'object',
              properties: {
                revenue: { type: 'number', example: 25000.0 },
                rides: { type: 'integer', example: 850 },
                drivers: { type: 'integer', example: 200 },
              },
            },
            media: {
              type: 'object',
              properties: {
                content_items: { type: 'integer', example: 1250 },
                social_posts: { type: 'integer', example: 3500 },
                engagement: { type: 'integer', example: 15000 },
              },
            },
          },
        },

        // Business module schemas
        Trader: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            business_name: { type: 'string', example: 'Lagos Electronics Store' },
            business_description: { type: 'string', example: 'Electronics and gadgets retailer' },
            total_sales: { type: 'number', example: 125000.5 },
            total_orders: { type: 'integer', example: 450 },
            average_rating: { type: 'number', example: 4.5 },
            is_verified: { type: 'boolean', example: true },
            is_active: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' },
            user_profiles: {
              type: 'object',
              properties: {
                first_name: { type: 'string', example: 'John' },
                last_name: { type: 'string', example: 'Doe' },
                email: { type: 'string', example: 'john@example.com' },
                avatar_url: { type: 'string', example: 'https://example.com/avatar.jpg' },
              },
            },
          },
        },
        Driver: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            license_number: { type: 'string', example: 'LIC123456789' },
            vehicle_type: { type: 'string', example: 'sedan' },
            vehicle_model: { type: 'string', example: 'Toyota Camry' },
            vehicle_year: { type: 'integer', example: 2020 },
            is_verified: { type: 'boolean', example: true },
            is_active: { type: 'boolean', example: true },
            rating: { type: 'number', example: 4.8 },
            total_trips: { type: 'integer', example: 1250 },
            total_earnings: { type: 'number', example: 85000.0 },
            created_at: { type: 'string', format: 'date-time' },
            user_profiles: {
              type: 'object',
              properties: {
                first_name: { type: 'string', example: 'Jane' },
                last_name: { type: 'string', example: 'Smith' },
                email: { type: 'string', example: 'jane@example.com' },
                phone: { type: 'string', example: '+2348012345678' },
                avatar_url: { type: 'string', example: 'https://example.com/avatar.jpg' },
              },
            },
          },
        },
        Hotel: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Grand Lagos Hotel' },
            description: { type: 'string', example: 'Luxury hotel in Victoria Island' },
            address: { type: 'string', example: '123 Victoria Island, Lagos' },
            city: { type: 'string', example: 'Lagos' },
            state: { type: 'string', example: 'Lagos State' },
            rating: { type: 'number', example: 4.7 },
            total_rooms: { type: 'integer', example: 150 },
            available_rooms: { type: 'integer', example: 45 },
            is_verified: { type: 'boolean', example: true },
            is_active: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' },
            user_profiles: {
              type: 'object',
              properties: {
                first_name: { type: 'string', example: 'Michael' },
                last_name: { type: 'string', example: 'Johnson' },
                email: { type: 'string', example: 'michael@grandlagos.com' },
                phone: { type: 'string', example: '+2348012345678' },
              },
            },
          },
        },
        MediaContent: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            filename: { type: 'string', example: 'product-image.jpg' },
            file_type: { type: 'string', example: 'image' },
            file_size: { type: 'integer', example: 1024000 },
            mime_type: { type: 'string', example: 'image/jpeg' },
            storage_path: { type: 'string', example: '/uploads/images/product-image.jpg' },
            is_public: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' },
            user_profiles: {
              type: 'object',
              properties: {
                first_name: { type: 'string', example: 'Sarah' },
                last_name: { type: 'string', example: 'Wilson' },
                email: { type: 'string', example: 'sarah@example.com' },
              },
            },
          },
        },
        PostalStaff: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            staff_id: { type: 'string', example: 'NIPOST001234' },
            first_name: { type: 'string', example: 'David' },
            last_name: { type: 'string', example: 'Okafor' },
            email: { type: 'string', example: 'david.okafor@nipost.gov.ng' },
            phone: { type: 'string', example: '+2348012345678' },
            position: { type: 'string', example: 'Postal Officer' },
            department: { type: 'string', example: 'Operations' },
            office_location: { type: 'string', example: 'Lagos Central Post Office' },
            region: { type: 'string', example: 'Lagos' },
            is_active: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Advertisement: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            campaign_name: { type: 'string', example: 'Summer Sale Campaign' },
            campaign_type: { type: 'string', example: 'banner' },
            budget: { type: 'number', example: 50000.0 },
            start_date: { type: 'string', format: 'date', example: '2026-02-01' },
            end_date: { type: 'string', format: 'date', example: '2026-02-28' },
            status: {
              type: 'string',
              enum: ['pending', 'approved', 'rejected'],
              example: 'pending',
            },
            created_at: { type: 'string', format: 'date-time' },
            advertiser_profiles: {
              type: 'object',
              properties: {
                business_name: { type: 'string', example: 'Tech Solutions Ltd' },
                contact_email: { type: 'string', example: 'contact@techsolutions.com' },
                contact_phone: { type: 'string', example: '+2348012345678' },
              },
            },
          },
        },
        BusinessCategory: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'ecommerce' },
            name: { type: 'string', example: 'E-commerce' },
            description: { type: 'string', example: 'Online marketplace and trading' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            order_number: { type: 'string', example: 'ORD-2026-001234' },
            total_amount: { type: 'number', example: 15000.0 },
            status: { type: 'string', example: 'pending' },
            created_at: { type: 'string', format: 'date-time' },
            user_profiles: {
              type: 'object',
              properties: {
                first_name: { type: 'string', example: 'Alice' },
                last_name: { type: 'string', example: 'Brown' },
                email: { type: 'string', example: 'alice@example.com' },
              },
            },
          },
        },
        // NIPOST Admin schemas
        NationalDashboard: {
          type: 'object',
          properties: {
            totalRevenue: {
              type: 'number',
              example: 15000000.5,
              description: 'Total revenue across all states',
            },
            totalTransactions: {
              type: 'integer',
              example: 4500,
              description: 'Total number of completed transactions',
            },
            totalCommission: {
              type: 'number',
              example: 750000.25,
              description: 'Total commission earned',
            },
            stateCount: { type: 'integer', example: 37, description: 'Number of active states' },
            branchCount: { type: 'integer', example: 774, description: 'Total number of branches' },
            byModule: {
              type: 'object',
              properties: {
                hotel: { type: 'number', example: 5000000.0 },
                taxi: { type: 'number', example: 4500000.0 },
                ecommerce: { type: 'number', example: 5500000.5 },
              },
            },
          },
          example: {
            totalRevenue: 15000000.5,
            totalTransactions: 4500,
            totalCommission: 750000.25,
            stateCount: 37,
            branchCount: 774,
            byModule: { hotel: 5000000.0, taxi: 4500000.0, ecommerce: 5500000.5 },
          },
        },
        FinancialSummary: {
          type: 'object',
          properties: {
            totalTransactions: {
              type: 'integer',
              example: 1250,
              description: 'Number of completed transactions',
            },
            totalRevenue: {
              type: 'number',
              example: 5000000.0,
              description: 'Total gross revenue',
            },
            totalCommission: {
              type: 'number',
              example: 250000.0,
              description: 'Total commission amount',
            },
            byModule: {
              type: 'object',
              properties: {
                hotel: { type: 'number', example: 100000.0 },
                taxi: { type: 'number', example: 75000.0 },
                ecommerce: { type: 'number', example: 75000.0 },
              },
            },
          },
          example: {
            totalTransactions: 1250,
            totalRevenue: 5000000.0,
            totalCommission: 250000.0,
            byModule: { hotel: 100000.0, taxi: 75000.0, ecommerce: 75000.0 },
          },
        },
        StateInfo: {
          type: 'object',
          properties: {
            state_id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            state_name: { type: 'string', example: 'Lagos State' },
          },
        },
        BranchInfo: {
          type: 'object',
          properties: {
            branch_id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
            branch_name: { type: 'string', example: 'Victoria Island Post Office' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            reference_number: { type: 'string', example: 'TXN-2026-001234' },
            module: { type: 'string', enum: ['hotel', 'taxi', 'ecommerce'], example: 'hotel' },
            gross_amount: { type: 'number', example: 25000.0 },
            commission_amount: { type: 'number', example: 1250.0 },
            net_amount: { type: 'number', example: 23750.0 },
            payment_status: {
              type: 'string',
              enum: ['pending', 'completed', 'failed', 'refunded'],
              example: 'completed',
            },
            payment_method: { type: 'string', example: 'card' },
            customer_name: { type: 'string', example: 'John Doe' },
            customer_email: { type: 'string', example: 'john@example.com' },
            branch_id: { type: 'string', format: 'uuid' },
            state_id: { type: 'string', format: 'uuid' },
            created_at: { type: 'string', format: 'date-time', example: '2026-01-29T10:30:00Z' },
          },
        },
        BranchAnalytics: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['day', 'week', 'month'], example: 'week' },
            transactions: {
              type: 'integer',
              example: 150,
              description: 'Transaction count in period',
            },
            revenue: { type: 'number', example: 500000.0, description: 'Total revenue in period' },
            commission: {
              type: 'number',
              example: 25000.0,
              description: 'Total commission in period',
            },
            byModule: {
              type: 'object',
              properties: {
                hotel: {
                  type: 'object',
                  properties: {
                    count: { type: 'integer', example: 50 },
                    revenue: { type: 'number', example: 200000.0 },
                  },
                },
                taxi: {
                  type: 'object',
                  properties: {
                    count: { type: 'integer', example: 75 },
                    revenue: { type: 'number', example: 150000.0 },
                  },
                },
                ecommerce: {
                  type: 'object',
                  properties: {
                    count: { type: 'integer', example: 25 },
                    revenue: { type: 'number', example: 150000.0 },
                  },
                },
              },
            },
          },
          example: {
            period: 'week',
            transactions: 150,
            revenue: 500000.0,
            commission: 25000.0,
            byModule: {
              hotel: { count: 50, revenue: 200000.0 },
              taxi: { count: 75, revenue: 150000.0 },
              ecommerce: { count: 25, revenue: 150000.0 },
            },
          },
        },
        ManagerDashboardStats: {
          type: 'object',
          properties: {
            totalRevenue: { type: 'number', example: 500000.0 },
            totalOrders: { type: 'integer', example: 150 },
            avgOrderValue: { type: 'number', example: 3333.33 },
            recentActivity: {
              type: 'array',
              items: { $ref: '#/components/schemas/Transaction' },
            },
          },
        },
        AdCampaign: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            campaign_name: { type: 'string', example: 'Summer Sale Campaign' },
            campaign_type: {
              type: 'string',
              enum: ['banner', 'video', 'native', 'sponsored'],
              example: 'banner',
            },
            budget: { type: 'number', example: 50000.0 },
            start_date: { type: 'string', format: 'date', example: '2026-02-01' },
            end_date: { type: 'string', format: 'date', example: '2026-02-28' },
            status: {
              type: 'string',
              enum: ['pending', 'approved', 'rejected', 'active', 'completed'],
              example: 'pending',
            },
            review_notes: { type: 'string', example: 'Pending review' },
            reviewed_by: { type: 'string', format: 'uuid', nullable: true },
            reviewed_at: { type: 'string', format: 'date-time', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            advertiser_profiles: {
              type: 'object',
              properties: {
                business_name: { type: 'string', example: 'Tech Solutions Ltd' },
                contact_email: { type: 'string', example: 'ads@techsolutions.com' },
                contact_phone: { type: 'string', example: '+2348012345678' },
              },
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Unauthorized - invalid or missing JWT token',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: 'Invalid token',
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Forbidden - insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: 'National access required',
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: 'Resource not found',
              },
            },
          },
        },
        BadRequestError: {
          description: 'Bad request - validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: 'Invalid request parameters',
              },
            },
          },
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
              example: {
                success: false,
                error: 'An unexpected error occurred',
              },
            },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/index.ts', './src/routes/*.ts', './src/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
