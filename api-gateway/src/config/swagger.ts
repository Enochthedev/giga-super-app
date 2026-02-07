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
        url: 'https://giga-giga-production.up.railway.app',
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
        // Authentication schemas
        AuthError: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'invalid_grant' },
            error_description: { type: 'string', example: 'Invalid login credentials' },
            message: { type: 'string', example: 'Invalid login credentials' },
          },
        },
        AuthSession: {
          type: 'object',
          properties: {
            access_token: { type: 'string', description: 'JWT access token' },
            token_type: { type: 'string', example: 'bearer' },
            expires_in: {
              type: 'integer',
              example: 3600,
              description: 'Token lifetime in seconds',
            },
            expires_at: { type: 'integer', description: 'Unix timestamp when token expires' },
            refresh_token: { type: 'string', description: 'Token to refresh the access token' },
            user: { $ref: '#/components/schemas/AuthUser' },
          },
        },
        AuthUser: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            email_confirmed_at: { type: 'string', format: 'date-time' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            app_metadata: {
              type: 'object',
              properties: {
                provider: { type: 'string', example: 'email' },
                role: { type: 'string', example: 'user' },
              },
            },
            user_metadata: {
              type: 'object',
              properties: {
                first_name: { type: 'string' },
                last_name: { type: 'string' },
                phone: { type: 'string' },
              },
            },
          },
        },
        // Common response schemas
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
        // ========== HOTEL SCHEMAS ==========
        Hotel: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Transcorp Hilton Abuja' },
            description: { type: 'string' },
            address: { type: 'string', example: '1 Aguiyi Ironsi Street, Maitama' },
            city: { type: 'string', example: 'Abuja' },
            state: { type: 'string', example: 'FCT' },
            country: { type: 'string', example: 'Nigeria' },
            latitude: { type: 'number', example: 9.0765 },
            longitude: { type: 'number', example: 7.4985 },
            rating: { type: 'number', minimum: 1, maximum: 5, example: 4.7 },
            review_count: { type: 'integer', example: 2450 },
            star_rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
            amenities: {
              type: 'array',
              items: { type: 'string' },
              example: ['WiFi', 'Pool', 'Gym', 'Spa', 'Restaurant'],
            },
            images: { type: 'array', items: { type: 'string', format: 'uri' } },
            price_per_night: { type: 'number', example: 85000 },
            currency: { type: 'string', example: 'NGN' },
            is_active: { type: 'boolean', example: true },
          },
        },
        HotelSearchRequest: {
          type: 'object',
          properties: {
            city: { type: 'string', example: 'Lagos' },
            check_in: { type: 'string', format: 'date', example: '2024-03-15' },
            check_out: { type: 'string', format: 'date', example: '2024-03-18' },
            guests: { type: 'integer', minimum: 1, example: 2 },
            rooms: { type: 'integer', minimum: 1, example: 1 },
            min_price: { type: 'number' },
            max_price: { type: 'number' },
            amenities: { type: 'array', items: { type: 'string' } },
            star_rating: { type: 'integer', minimum: 1, maximum: 5 },
          },
        },
        HotelReview: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            hotel_id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            user_name: { type: 'string', example: 'John D.' },
            rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
            title: { type: 'string', example: 'Excellent stay!' },
            comment: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        RoomAvailability: {
          type: 'object',
          properties: {
            room_type: { type: 'string', example: 'Deluxe Room' },
            available: { type: 'boolean', example: true },
            rooms_left: { type: 'integer', example: 5 },
            price_per_night: { type: 'number', example: 85000 },
            total_price: { type: 'number', example: 255000 },
            amenities: { type: 'array', items: { type: 'string' } },
          },
        },
        BookingPrice: {
          type: 'object',
          properties: {
            room_price: { type: 'number', example: 255000 },
            taxes: { type: 'number', example: 12750 },
            service_fee: { type: 'number', example: 5000 },
            total: { type: 'number', example: 272750 },
            currency: { type: 'string', example: 'NGN' },
            nights: { type: 'integer', example: 3 },
          },
        },
        // ========== RIDE/TAXI SCHEMAS ==========
        Ride: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            rider_id: { type: 'string', format: 'uuid' },
            driver_id: { type: 'string', format: 'uuid' },
            status: {
              type: 'string',
              enum: ['requested', 'accepted', 'arrived', 'started', 'completed', 'cancelled'],
              example: 'started',
            },
            pickup_address: { type: 'string', example: 'Victoria Island, Lagos' },
            pickup_lat: { type: 'number', example: 6.4281 },
            pickup_lng: { type: 'number', example: 3.4219 },
            dropoff_address: { type: 'string', example: 'Ikeja, Lagos' },
            dropoff_lat: { type: 'number', example: 6.6018 },
            dropoff_lng: { type: 'number', example: 3.3515 },
            vehicle_type: {
              type: 'string',
              enum: ['standard', 'comfort', 'premium', 'xl'],
              example: 'comfort',
            },
            estimated_fare: { type: 'number', example: 3500 },
            final_fare: { type: 'number' },
            distance_km: { type: 'number', example: 12.5 },
            duration_minutes: { type: 'integer', example: 35 },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        RideRequest: {
          type: 'object',
          required: ['pickup_lat', 'pickup_lng', 'dropoff_lat', 'dropoff_lng'],
          properties: {
            pickup_address: { type: 'string', example: 'Victoria Island, Lagos' },
            pickup_lat: { type: 'number', example: 6.4281 },
            pickup_lng: { type: 'number', example: 3.4219 },
            dropoff_address: { type: 'string', example: 'Ikeja, Lagos' },
            dropoff_lat: { type: 'number', example: 6.6018 },
            dropoff_lng: { type: 'number', example: 3.3515 },
            vehicle_type: {
              type: 'string',
              enum: ['standard', 'comfort', 'premium', 'xl'],
              default: 'standard',
            },
            payment_method: { type: 'string', enum: ['cash', 'card', 'wallet'], default: 'cash' },
          },
        },
        RideEstimate: {
          type: 'object',
          properties: {
            vehicle_type: { type: 'string', example: 'comfort' },
            estimated_fare: { type: 'number', example: 3500 },
            estimated_duration: {
              type: 'integer',
              description: 'Duration in minutes',
              example: 35,
            },
            estimated_distance: { type: 'number', description: 'Distance in km', example: 12.5 },
            surge_multiplier: { type: 'number', example: 1.0 },
            currency: { type: 'string', example: 'NGN' },
          },
        },
        NearbyDriver: {
          type: 'object',
          properties: {
            driver_id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Adebayo Johnson' },
            rating: { type: 'number', example: 4.8 },
            vehicle_type: { type: 'string', example: 'comfort' },
            vehicle_model: { type: 'string', example: 'Toyota Corolla 2022' },
            vehicle_plate: { type: 'string', example: 'ABC-123-XY' },
            distance_km: { type: 'number', example: 1.2 },
            eta_minutes: { type: 'integer', example: 5 },
            latitude: { type: 'number' },
            longitude: { type: 'number' },
          },
        },
        // ========== CART/E-COMMERCE SCHEMAS ==========
        Cart: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            items: { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
            subtotal: { type: 'number', example: 45000 },
            delivery_fee: { type: 'number', example: 1500 },
            total: { type: 'number', example: 46500 },
            currency: { type: 'string', example: 'NGN' },
            item_count: { type: 'integer', example: 3 },
          },
        },
        CartItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            product_id: { type: 'string', format: 'uuid' },
            product_name: { type: 'string', example: 'Samsung Galaxy S24' },
            product_image: { type: 'string', format: 'uri' },
            quantity: { type: 'integer', example: 1 },
            unit_price: { type: 'number', example: 1850000 },
            total_price: { type: 'number', example: 1850000 },
            vendor_id: { type: 'string', format: 'uuid' },
            vendor_name: { type: 'string', example: 'Jumia Official' },
          },
        },
        AddToCartRequest: {
          type: 'object',
          required: ['product_id', 'quantity'],
          properties: {
            product_id: { type: 'string', format: 'uuid' },
            quantity: { type: 'integer', minimum: 1, example: 1 },
            variant_id: { type: 'string', format: 'uuid' },
          },
        },
        CheckoutRequest: {
          type: 'object',
          required: ['address_id', 'payment_method'],
          properties: {
            address_id: { type: 'string', format: 'uuid' },
            payment_method: {
              type: 'string',
              enum: ['card', 'bank_transfer', 'wallet', 'pay_on_delivery'],
              example: 'card',
            },
            use_wallet_balance: { type: 'boolean', default: false },
            coupon_code: { type: 'string' },
            delivery_notes: { type: 'string' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            order_number: { type: 'string', example: 'ORD-2024-ABC123' },
            user_id: { type: 'string', format: 'uuid' },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
              example: 'confirmed',
            },
            items: { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
            subtotal: { type: 'number' },
            delivery_fee: { type: 'number' },
            discount: { type: 'number' },
            total: { type: 'number' },
            payment_status: { type: 'string', enum: ['pending', 'paid', 'failed', 'refunded'] },
            delivery_address: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        // ========== USER SCHEMAS ==========
        UserProfile: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            phone: { type: 'string', example: '+2348012345678' },
            first_name: { type: 'string', example: 'John' },
            last_name: { type: 'string', example: 'Doe' },
            avatar_url: { type: 'string', format: 'uri' },
            roles: { type: 'array', items: { type: 'string' }, example: ['user', 'driver'] },
            active_role: { type: 'string', example: 'user' },
            wallet_balance: { type: 'number', example: 15000 },
            is_verified: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        UpdateProfileRequest: {
          type: 'object',
          properties: {
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            phone: { type: 'string' },
            avatar_url: { type: 'string', format: 'uri' },
          },
        },
        Address: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            label: { type: 'string', example: 'Home' },
            address_line1: { type: 'string', example: '123 Victoria Island' },
            address_line2: { type: 'string' },
            city: { type: 'string', example: 'Lagos' },
            state: { type: 'string', example: 'Lagos' },
            postal_code: { type: 'string' },
            country: { type: 'string', example: 'Nigeria' },
            latitude: { type: 'number' },
            longitude: { type: 'number' },
            is_default: { type: 'boolean', example: true },
          },
        },
        AddAddressRequest: {
          type: 'object',
          required: ['label', 'address_line1', 'city', 'state'],
          properties: {
            label: { type: 'string', example: 'Office' },
            address_line1: { type: 'string' },
            address_line2: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            postal_code: { type: 'string' },
            country: { type: 'string', default: 'Nigeria' },
            latitude: { type: 'number' },
            longitude: { type: 'number' },
            is_default: { type: 'boolean', default: false },
          },
        },
        // ========== CALL SCHEMAS ==========
        Call: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            caller_id: { type: 'string', format: 'uuid' },
            receiver_id: { type: 'string', format: 'uuid' },
            status: {
              type: 'string',
              enum: ['ringing', 'answered', 'declined', 'ended', 'missed'],
              example: 'answered',
            },
            type: { type: 'string', enum: ['voice', 'video'], example: 'voice' },
            started_at: { type: 'string', format: 'date-time' },
            ended_at: { type: 'string', format: 'date-time' },
            duration_seconds: { type: 'integer' },
          },
        },
        InitiateCallRequest: {
          type: 'object',
          required: ['receiver_id', 'type'],
          properties: {
            receiver_id: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['voice', 'video'], default: 'voice' },
            context: {
              type: 'string',
              enum: ['ride', 'delivery', 'support'],
              description: 'Call context',
            },
            context_id: { type: 'string', format: 'uuid', description: 'Related ride/delivery ID' },
          },
        },
        // ========== ROLE SCHEMAS ==========
        RoleApplication: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            role: {
              type: 'string',
              enum: ['driver', 'vendor', 'hotel_manager', 'courier'],
              example: 'driver',
            },
            status: {
              type: 'string',
              enum: ['pending', 'approved', 'rejected'],
              example: 'pending',
            },
            documents: { type: 'array', items: { type: 'string', format: 'uri' } },
            submitted_at: { type: 'string', format: 'date-time' },
            reviewed_at: { type: 'string', format: 'date-time' },
            reviewer_notes: { type: 'string' },
          },
        },
        ApplyForRoleRequest: {
          type: 'object',
          required: ['role'],
          properties: {
            role: { type: 'string', enum: ['driver', 'vendor', 'hotel_manager', 'courier'] },
            documents: {
              type: 'array',
              items: { type: 'string', format: 'uri' },
              description: 'URLs of uploaded documents',
            },
            additional_info: { type: 'object', description: 'Role-specific information' },
          },
        },
        // ========== MEDIA SCHEMAS ==========
        MediaUploadResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            url: {
              type: 'string',
              format: 'uri',
              example: 'https://storage.supabase.co/bucket/file.jpg',
            },
            public_url: { type: 'string', format: 'uri' },
            path: { type: 'string' },
            size: { type: 'integer' },
            mime_type: { type: 'string', example: 'image/jpeg' },
          },
        },
        // ========== SUPPORT SCHEMAS ==========
        SupportTicket: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            subject: { type: 'string', example: 'Issue with ride payment' },
            description: { type: 'string' },
            category: { type: 'string', enum: ['ride', 'order', 'payment', 'account', 'other'] },
            status: { type: 'string', enum: ['open', 'in_progress', 'resolved', 'closed'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
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
