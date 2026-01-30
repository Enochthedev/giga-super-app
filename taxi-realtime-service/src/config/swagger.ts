import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Taxi Realtime Service API',
      version: '1.0.0',
      description: `
## Taxi Realtime Service API

Real-time taxi tracking and trip management using WebSockets (Socket.IO).

### Features
- **Driver Tracking**: Real-time location updates every 5 seconds
- **Trip Management**: Request, accept, and manage taxi trips
- **Rider/Driver Matching**: Find nearby available drivers
- **Live ETA Updates**: Dynamic arrival time calculations

### WebSocket Connection
Connect via Socket.IO at \`wss://giga-giga-production.up.railway.app\` with JWT auth:
\`\`\`javascript
const socket = io('wss://giga-giga-production.up.railway.app', {
  auth: { token: 'your-jwt-token' }
});
\`\`\`

### Socket.IO Events

#### Driver Events
| Event | Direction | Description |
|-------|-----------|-------------|
| \`driver:location:update\` | Client → Server | Update driver location |
| \`driver:available\` | Broadcast | Driver became available |

#### Rider Events
| Event | Direction | Description |
|-------|-----------|-------------|
| \`rider:request:nearby-drivers\` | Client → Server | Find nearby drivers |
| \`rider:nearby-drivers\` | Server → Client | List of nearby drivers |
| \`rider:track:driver\` | Client → Server | Start tracking a driver |

#### Trip Events
| Event | Direction | Description |
|-------|-----------|-------------|
| \`trip:request\` | Client → Server | Request a new trip |
| \`trip:request:received\` | Server → Driver | Trip request for driver |
| \`trip:accept\` | Client → Server | Driver accepts trip |
| \`trip:accepted\` | Server → Rider | Trip was accepted |
| \`trip:status:update\` | Client → Server | Update trip status |
| \`trip:status:changed\` | Broadcast | Trip status changed |

### Trip Status Flow
\`\`\`
requested → accepted → driver_arrived → in_progress → completed
                  ↘ cancelled        ↘ cancelled
\`\`\`

### Rate Limiting
- Location updates: 100/minute per driver
- Trip requests: 10/minute per rider
      `,
      contact: {
        name: 'Giga Platform Team',
        email: 'api@giga.com',
      },
    },
    servers: [
      {
        url: '/',
        description: 'Root',
      },
    ],
    tags: [
      { name: 'Health', description: 'Service health checks' },
      { name: 'Drivers', description: 'Driver management and availability' },
      { name: 'Trips', description: 'Trip lifecycle management' },
      { name: 'Tracking', description: 'Real-time location tracking' },
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
        // Core entities
        Driver: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
            user_id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'John Driver' },
            phone: { type: 'string', example: '+2348012345678' },
            vehicle_type: {
              type: 'string',
              enum: ['sedan', 'suv', 'van', 'motorcycle', 'tricycle'],
              example: 'sedan',
            },
            vehicle_plate: { type: 'string', example: 'ABC-123-XY' },
            rating: { type: 'number', minimum: 1, maximum: 5, example: 4.8 },
            total_trips: { type: 'integer', example: 256 },
            is_available: { type: 'boolean', example: true },
            is_verified: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        DriverLocation: {
          type: 'object',
          required: ['driver_id', 'latitude', 'longitude'],
          properties: {
            driver_id: { type: 'string', format: 'uuid' },
            latitude: { type: 'number', format: 'double', example: 6.5244 },
            longitude: { type: 'number', format: 'double', example: 3.3792 },
            heading: { type: 'number', description: 'Direction in degrees (0-360)', example: 45 },
            speed: { type: 'number', description: 'Speed in km/h', example: 35.5 },
            accuracy: { type: 'number', description: 'GPS accuracy in meters', example: 10 },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        GeoLocation: {
          type: 'object',
          required: ['lat', 'lng'],
          properties: {
            lat: { type: 'number', format: 'double', example: 6.5244 },
            lng: { type: 'number', format: 'double', example: 3.3792 },
          },
        },
        Trip: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            rider_id: { type: 'string', format: 'uuid' },
            driver_id: { type: 'string', format: 'uuid' },
            status: {
              type: 'string',
              enum: [
                'requested',
                'accepted',
                'driver_arrived',
                'in_progress',
                'completed',
                'cancelled',
              ],
              example: 'in_progress',
            },
            pickup_location: { $ref: '#/components/schemas/GeoLocation' },
            pickup_address: { type: 'string', example: 'Victoria Island, Lagos' },
            dropoff_location: { $ref: '#/components/schemas/GeoLocation' },
            dropoff_address: { type: 'string', example: 'Ikeja, Lagos' },
            estimated_fare: { type: 'number', example: 3500.0 },
            final_fare: { type: 'number', example: 3750.0 },
            distance_km: { type: 'number', example: 15.5 },
            duration_minutes: { type: 'integer', example: 35 },
            created_at: { type: 'string', format: 'date-time' },
            started_at: { type: 'string', format: 'date-time' },
            completed_at: { type: 'string', format: 'date-time' },
          },
        },
        TripRequest: {
          type: 'object',
          required: ['driverId', 'pickupLat', 'pickupLng', 'dropoffLat', 'dropoffLng'],
          properties: {
            driverId: { type: 'string', format: 'uuid' },
            pickupLat: { type: 'number', format: 'double', example: 6.5244 },
            pickupLng: { type: 'number', format: 'double', example: 3.3792 },
            dropoffLat: { type: 'number', format: 'double', example: 6.6018 },
            dropoffLng: { type: 'number', format: 'double', example: 3.3515 },
            pickupAddress: { type: 'string', example: 'Victoria Island, Lagos' },
            dropoffAddress: { type: 'string', example: 'Ikeja, Lagos' },
          },
        },
        NearbyDriver: {
          type: 'object',
          properties: {
            driver: { $ref: '#/components/schemas/Driver' },
            location: { $ref: '#/components/schemas/GeoLocation' },
            distance_km: { type: 'number', example: 1.5 },
            eta_minutes: { type: 'integer', example: 5 },
          },
        },
        NearbyDriversRequest: {
          type: 'object',
          required: ['lat', 'lng'],
          properties: {
            lat: { type: 'number', format: 'double', example: 6.5244 },
            lng: { type: 'number', format: 'double', example: 3.3792 },
            radius: { type: 'number', description: 'Search radius in km', default: 5, example: 3 },
            vehicleType: {
              type: 'string',
              enum: ['sedan', 'suv', 'van', 'motorcycle', 'tricycle'],
            },
          },
        },
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
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'TRIP_NOT_FOUND' },
                message: { type: 'string', example: 'Trip not found' },
              },
            },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'healthy' },
            service: { type: 'string', example: 'taxi-realtime-service' },
            version: { type: 'string', example: '1.0.0' },
            uptime: { type: 'number', description: 'Uptime in seconds' },
            redis: { type: 'string', enum: ['connected', 'disconnected'] },
            activeDrivers: { type: 'integer', example: 45 },
            activeRiders: { type: 'integer', example: 120 },
            timestamp: { type: 'string', format: 'date-time' },
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
                error: { code: 'FORBIDDEN', message: 'Only drivers can perform this action' },
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
                error: { code: 'NOT_FOUND', message: 'Trip not found' },
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
                error: { code: 'VALIDATION_ERROR', message: 'Invalid coordinates' },
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
  apis: ['./src/index.ts', './src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
