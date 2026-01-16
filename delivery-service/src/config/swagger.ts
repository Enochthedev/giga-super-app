import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
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
        },
      },
      schemas: {
        Package: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            tracking_number: { type: 'string' },
            sender_id: { type: 'string', format: 'uuid' },
            recipient_name: { type: 'string' },
            recipient_phone: { type: 'string' },
            pickup_address: { type: 'string' },
            delivery_address: { type: 'string' },
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
            },
            weight_kg: { type: 'number' },
            dimensions: { type: 'string' },
            special_instructions: { type: 'string' },
            estimated_delivery: { type: 'string', format: 'date-time' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        CreatePackageRequest: {
          type: 'object',
          required: ['recipient_name', 'recipient_phone', 'pickup_address', 'delivery_address'],
          properties: {
            recipient_name: { type: 'string' },
            recipient_phone: { type: 'string' },
            pickup_address: { type: 'string' },
            delivery_address: { type: 'string' },
            weight_kg: { type: 'number' },
            dimensions: { type: 'string' },
            special_instructions: { type: 'string' },
            scheduled_pickup: { type: 'string', format: 'date-time' },
          },
        },
        Courier: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            phone: { type: 'string' },
            vehicle_type: { type: 'string', enum: ['bike', 'motorcycle', 'car', 'van', 'truck'] },
            current_location: { $ref: '#/components/schemas/GeoLocation' },
            status: { type: 'string', enum: ['available', 'busy', 'offline'] },
            rating: { type: 'number' },
            total_deliveries: { type: 'integer' },
          },
        },
        Assignment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            package_id: { type: 'string', format: 'uuid' },
            courier_id: { type: 'string', format: 'uuid' },
            status: {
              type: 'string',
              enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
            },
            assigned_at: { type: 'string', format: 'date-time' },
            accepted_at: { type: 'string', format: 'date-time' },
            completed_at: { type: 'string', format: 'date-time' },
          },
        },
        GeoLocation: {
          type: 'object',
          properties: {
            latitude: { type: 'number' },
            longitude: { type: 'number' },
          },
        },
        TrackingEvent: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            package_id: { type: 'string', format: 'uuid' },
            status: { type: 'string' },
            location: { $ref: '#/components/schemas/GeoLocation' },
            description: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
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
