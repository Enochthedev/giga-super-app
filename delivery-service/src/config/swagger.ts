// eslint-disable-next-line @typescript-eslint/no-var-requires
const swaggerJsdoc = require('swagger-jsdoc');

const options: Record<string, unknown> = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Giga Delivery Service API',
      version: '1.0.0',
      description: `
## Delivery & Logistics Service API

Real-time delivery tracking and logistics management for the Giga platform.

### Features
- **Package Management**: Create, track, and manage delivery packages
- **Courier Management**: Assign and manage delivery couriers
- **Real-time Tracking**: WebSocket-based live location updates
- **Route Optimization**: Intelligent route planning using Google Maps
- **Assignment Engine**: Automatic courier assignment based on proximity

### WebSocket Events
Connect to \`/ws\` for real-time updates:
- \`location_update\`: Courier location changes
- \`status_update\`: Package status changes
- \`assignment_update\`: New assignment notifications

### Tracking States
1. **pending**: Package created, awaiting pickup
2. **assigned**: Courier assigned
3. **picked_up**: Package collected
4. **in_transit**: En route to destination
5. **delivered**: Successfully delivered
6. **failed**: Delivery failed
7. **returned**: Package returned to sender

### Response Format
\`\`\`json
{
  "success": true,
  "data": {...},
  "metadata": {
    "timestamp": "ISO8601",
    "request_id": "uuid",
    "version": "1.0.0"
  }
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
        url: '/api/v1',
        description: 'API v1',
      },
    ],
    tags: [
      { name: 'Health', description: 'Service health checks' },
      { name: 'Packages', description: 'Package management' },
      { name: 'Tracking', description: 'Real-time package tracking' },
      { name: 'Couriers', description: 'Courier management' },
      { name: 'Assignments', description: 'Delivery assignments' },
      { name: 'Scheduler', description: 'Scheduled deliveries' },
      { name: 'WebSocket', description: 'Real-time WebSocket endpoints' },
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
      schemas: {
        // Package schemas
        Package: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
            tracking_number: { type: 'string', example: 'GDL-2024-ABC123' },
            sender_id: { type: 'string', format: 'uuid' },
            sender_name: { type: 'string', example: 'John Sender' },
            sender_phone: { type: 'string', example: '+2348012345678' },
            recipient_name: { type: 'string', example: 'Jane Recipient' },
            recipient_phone: { type: 'string', example: '+2348087654321' },
            pickup_address: { type: 'string', example: '123 Victoria Island, Lagos' },
            delivery_address: { type: 'string', example: '456 Ikeja, Lagos' },
            pickup_location: { $ref: '#/components/schemas/GeoLocation' },
            delivery_location: { $ref: '#/components/schemas/GeoLocation' },
            status: {
              type: 'string',
              enum: [
                'pending',
                'assigned',
                'picked_up',
                'in_transit',
                'delivered',
                'failed',
                'returned',
              ],
              example: 'in_transit',
            },
            weight_kg: { type: 'number', example: 2.5 },
            dimensions: { type: 'string', example: '30x20x15 cm' },
            package_type: {
              type: 'string',
              enum: ['document', 'parcel', 'fragile', 'food'],
              example: 'parcel',
            },
            special_instructions: { type: 'string', example: 'Handle with care, fragile items' },
            estimated_delivery: { type: 'string', format: 'date-time' },
            actual_delivery: { type: 'string', format: 'date-time' },
            delivery_fee: { type: 'number', example: 1500 },
            payment_status: {
              type: 'string',
              enum: ['pending', 'paid', 'failed'],
              example: 'paid',
            },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        CreatePackageRequest: {
          type: 'object',
          required: ['recipient_name', 'recipient_phone', 'pickup_address', 'delivery_address'],
          properties: {
            recipient_name: { type: 'string', example: 'Jane Recipient' },
            recipient_phone: { type: 'string', example: '+2348087654321' },
            pickup_address: { type: 'string', example: '123 Victoria Island, Lagos' },
            delivery_address: { type: 'string', example: '456 Ikeja, Lagos' },
            pickup_lat: { type: 'number', example: 6.4281 },
            pickup_lng: { type: 'number', example: 3.4219 },
            delivery_lat: { type: 'number', example: 6.6018 },
            delivery_lng: { type: 'number', example: 3.3515 },
            weight_kg: { type: 'number', example: 2.5 },
            dimensions: { type: 'string', example: '30x20x15 cm' },
            package_type: {
              type: 'string',
              enum: ['document', 'parcel', 'fragile', 'food'],
              default: 'parcel',
            },
            special_instructions: { type: 'string' },
            scheduled_pickup: { type: 'string', format: 'date-time' },
            express_delivery: { type: 'boolean', default: false },
          },
        },
        PackageResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: '#/components/schemas/Package' },
            estimated_fee: { type: 'number', example: 1500 },
            estimated_time: { type: 'string', example: '45-60 minutes' },
          },
        },
        // Courier schemas
        Courier: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Samuel Courier' },
            phone: { type: 'string', example: '+2348012345678' },
            avatar_url: { type: 'string', format: 'uri' },
            vehicle_type: {
              type: 'string',
              enum: ['bike', 'motorcycle', 'car', 'van', 'truck'],
              example: 'motorcycle',
            },
            vehicle_plate: { type: 'string', example: 'LG-123-ABC' },
            current_location: { $ref: '#/components/schemas/GeoLocation' },
            status: {
              type: 'string',
              enum: ['available', 'busy', 'offline'],
              example: 'available',
            },
            rating: { type: 'number', minimum: 1, maximum: 5, example: 4.8 },
            total_deliveries: { type: 'integer', example: 450 },
            is_verified: { type: 'boolean', example: true },
            max_weight_kg: { type: 'number', description: 'Maximum weight capacity', example: 50 },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        NearbyCourer: {
          type: 'object',
          properties: {
            courier: { $ref: '#/components/schemas/Courier' },
            distance_km: { type: 'number', example: 1.2 },
            eta_minutes: { type: 'integer', example: 8 },
          },
        },
        // Assignment schemas
        Assignment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            package_id: { type: 'string', format: 'uuid' },
            courier_id: { type: 'string', format: 'uuid' },
            status: {
              type: 'string',
              enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
              example: 'accepted',
            },
            assigned_at: { type: 'string', format: 'date-time' },
            accepted_at: { type: 'string', format: 'date-time' },
            picked_up_at: { type: 'string', format: 'date-time' },
            completed_at: { type: 'string', format: 'date-time' },
            rejection_reason: { type: 'string' },
          },
        },
        AssignCourierRequest: {
          type: 'object',
          required: ['package_id', 'courier_id'],
          properties: {
            package_id: { type: 'string', format: 'uuid' },
            courier_id: { type: 'string', format: 'uuid' },
            priority: { type: 'string', enum: ['normal', 'urgent'], default: 'normal' },
          },
        },
        // Tracking schemas
        GeoLocation: {
          type: 'object',
          properties: {
            latitude: { type: 'number', format: 'double', example: 6.5244 },
            longitude: { type: 'number', format: 'double', example: 3.3792 },
          },
        },
        TrackingEvent: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            package_id: { type: 'string', format: 'uuid' },
            status: { type: 'string', example: 'in_transit' },
            location: { $ref: '#/components/schemas/GeoLocation' },
            address: { type: 'string', example: 'Surulere, Lagos' },
            description: { type: 'string', example: 'Package is en route to destination' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        TrackingResponse: {
          type: 'object',
          properties: {
            package: { $ref: '#/components/schemas/Package' },
            courier: { $ref: '#/components/schemas/Courier' },
            current_location: { $ref: '#/components/schemas/GeoLocation' },
            events: {
              type: 'array',
              items: { $ref: '#/components/schemas/TrackingEvent' },
            },
            eta_minutes: { type: 'integer', example: 25 },
          },
        },
        // Fee calculation
        DeliveryFeeRequest: {
          type: 'object',
          required: ['pickup_lat', 'pickup_lng', 'delivery_lat', 'delivery_lng'],
          properties: {
            pickup_lat: { type: 'number', example: 6.4281 },
            pickup_lng: { type: 'number', example: 3.4219 },
            delivery_lat: { type: 'number', example: 6.6018 },
            delivery_lng: { type: 'number', example: 3.3515 },
            weight_kg: { type: 'number', example: 2.5 },
            package_type: { type: 'string', enum: ['document', 'parcel', 'fragile', 'food'] },
            express_delivery: { type: 'boolean', default: false },
          },
        },
        DeliveryFeeResponse: {
          type: 'object',
          properties: {
            distance_km: { type: 'number', example: 12.5 },
            base_fee: { type: 'number', example: 500 },
            distance_fee: { type: 'number', example: 625 },
            weight_fee: { type: 'number', example: 125 },
            express_fee: { type: 'number', example: 0 },
            total_fee: { type: 'number', example: 1250 },
            currency: { type: 'string', example: 'NGN' },
            estimated_time: { type: 'string', example: '30-45 minutes' },
          },
        },
        // Standard responses
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            metadata: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                request_id: { type: 'string', format: 'uuid' },
                version: { type: 'string', example: '1.0.0' },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'PACKAGE_NOT_FOUND' },
                message: { type: 'string', example: 'Package with this tracking number not found' },
              },
            },
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
      },
      responses: {
        UnauthorizedError: {
          description: 'Unauthorized - Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: { code: 'AUTHENTICATION_REQUIRED', message: 'Valid JWT token required' },
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Forbidden - Insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: { code: 'FORBIDDEN', message: 'You can only track your own packages' },
              },
            },
          },
        },
        NotFoundError: {
          description: 'Not Found - Resource does not exist',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: {
                  code: 'PACKAGE_NOT_FOUND',
                  message: 'Package with tracking number GDL-2024-ABC123 not found',
                },
              },
            },
          },
        },
        BadRequestError: {
          description: 'Bad Request - Invalid input',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Recipient phone number is required' },
              },
            },
          },
        },
        InternalServerError: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
              },
            },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts', './src/index.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
