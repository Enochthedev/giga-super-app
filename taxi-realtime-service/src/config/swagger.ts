import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Taxi Realtime Service API',
      version: '2.0.0',
      description: `
## Taxi Realtime Service

Real-time taxi tracking and ride management service with REST API and WebSocket support.

### Base URLs
- **REST API**: \`https://taxi-realtime.giga.railway.app/api\`
- **WebSocket**: \`wss://taxi-realtime.giga.railway.app\`
- **Swagger UI**: \`/api-docs\`

### Authentication
All protected endpoints require JWT Bearer token from Supabase Auth:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

### WebSocket Connection
\`\`\`javascript
const socket = io('wss://taxi-realtime.giga.railway.app', {
  auth: { token: 'your-jwt-token' }
});
\`\`\`

### WebSocket Events

#### Driver Events (emit)
| Event | Payload | Description |
|-------|---------|-------------|
| \`driver:location:update\` | \`{ lat, lng }\` | Update driver location |
| \`trip:accept\` | \`{ tripId }\` | Accept a trip request |
| \`trip:status:update\` | \`{ tripId, status }\` | Update trip status |

#### Driver Events (listen)
| Event | Payload | Description |
|-------|---------|-------------|
| \`trip:new-request\` | \`{ tripId, riderId, pickupLocation, dropoffLocation }\` | New trip request |
| \`trip:accept:confirmed\` | \`{ tripId }\` | Trip acceptance confirmed |

#### Rider Events (emit)
| Event | Payload | Description |
|-------|---------|-------------|
| \`rider:request:nearby-drivers\` | \`{ lat, lng, radius }\` | Find nearby drivers |
| \`trip:request\` | \`{ driverId, pickupLat, pickupLng, dropoffLat, dropoffLng }\` | Request a trip |
| \`rider:track:driver\` | \`{ driverId }\` | Start tracking driver |
| \`rider:untrack:driver\` | \`{ driverId }\` | Stop tracking driver |

#### Rider Events (listen)
| Event | Payload | Description |
|-------|---------|-------------|
| \`rider:nearby-drivers\` | \`{ drivers: [...] }\` | List of nearby drivers |
| \`trip:request:sent\` | \`{ tripId }\` | Trip request created |
| \`trip:accepted\` | \`{ tripId, driverId }\` | Trip was accepted |
| \`driver:location\` | \`{ driverId, lat, lng, timestamp }\` | Driver location update |
| \`trip:status\` | \`{ tripId, status, timestamp }\` | Trip status changed |
      `,
      contact: { name: 'Giga Platform Team', email: 'api@giga.com' },
    },
    servers: [
      { url: '/', description: 'Current Server' },
      { url: 'https://taxi-realtime.giga.railway.app', description: 'Production' },
    ],
    tags: [
      { name: 'Health', description: 'Service health endpoints' },
      { name: 'Drivers', description: 'Driver profile and location management' },
      { name: 'Rides', description: 'Ride request and management' },
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
        Driver: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            license_number: { type: 'string', example: 'DRV-12345' },
            vehicle_info: {
              type: 'object',
              properties: {
                make: { type: 'string', example: 'Toyota' },
                model: { type: 'string', example: 'Camry' },
                year: { type: 'integer', example: 2020 },
                color: { type: 'string', example: 'Black' },
                plate_number: { type: 'string', example: 'ABC-123-XY' },
              },
            },
            is_online: { type: 'boolean', example: true },
            is_verified: { type: 'boolean', example: true },
            rating: { type: 'number', minimum: 1, maximum: 5, example: 4.8 },
            total_rides: { type: 'integer', example: 256 },
            vehicle_type: { type: 'string', enum: ['standard', 'premium', 'suv', 'motorcycle'] },
            current_location: { $ref: '#/components/schemas/GeoLocation' },
            user: { $ref: '#/components/schemas/UserProfile' },
          },
        },
        UserProfile: {
          type: 'object',
          properties: {
            first_name: { type: 'string', example: 'John' },
            last_name: { type: 'string', example: 'Doe' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', example: '+2348012345678' },
            avatar_url: { type: 'string', format: 'uri' },
          },
        },
        GeoLocation: {
          type: 'object',
          required: ['latitude', 'longitude'],
          properties: {
            latitude: { type: 'number', format: 'double', example: 6.5244 },
            longitude: { type: 'number', format: 'double', example: 3.3792 },
          },
        },
        NearbyDriver: {
          type: 'object',
          allOf: [{ $ref: '#/components/schemas/Driver' }],
          properties: {
            distance_km: { type: 'number', example: 1.5 },
            eta_minutes: { type: 'integer', example: 5 },
          },
        },
        Ride: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            ride_number: { type: 'string', example: 'RIDE-ABC123' },
            passenger_id: { type: 'string', format: 'uuid' },
            driver_id: { type: 'string', format: 'uuid' },
            status: {
              type: 'string',
              enum: [
                'requested',
                'accepted',
                'arrived',
                'picked_up',
                'in_progress',
                'completed',
                'cancelled',
                'no_show',
              ],
              example: 'in_progress',
            },
            pickup_location: { $ref: '#/components/schemas/GeoLocation' },
            pickup_address: { type: 'string', example: 'Victoria Island, Lagos' },
            dropoff_location: { $ref: '#/components/schemas/GeoLocation' },
            dropoff_address: { type: 'string', example: 'Ikeja, Lagos' },
            distance_km: { type: 'number', example: 12.5 },
            estimated_duration_minutes: { type: 'integer', example: 30 },
            base_fare: { type: 'number', example: 500 },
            total_fare: { type: 'number', example: 2350 },
            final_amount: { type: 'number', example: 2350 },
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            review_comment: { type: 'string' },
            passenger_notes: { type: 'string' },
            driver_eta_minutes: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
            accepted_at: { type: 'string', format: 'date-time' },
            pickup_time: { type: 'string', format: 'date-time' },
            dropoff_time: { type: 'string', format: 'date-time' },
            completed_at: { type: 'string', format: 'date-time' },
            cancelled_at: { type: 'string', format: 'date-time' },
            cancellation_reason: { type: 'string' },
          },
        },
        FareEstimate: {
          type: 'object',
          properties: {
            distance_km: { type: 'number', example: 12.5 },
            duration_minutes: { type: 'integer', example: 30 },
            base_fare: { type: 'number', example: 500 },
            distance_fare: { type: 'number', example: 1250 },
            time_fare: { type: 'number', example: 600 },
            estimated_total: { type: 'number', example: 2350 },
            currency: { type: 'string', example: 'NGN' },
            vehicle_type: { type: 'string', example: 'standard' },
            using_google_maps: {
              type: 'boolean',
              description:
                'Indicates if Google Maps API was used (true) or fallback Haversine formula (false)',
              example: true,
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Invalid input' },
              },
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: { code: 'NOT_FOUND', message: 'Resource not found' },
              },
            },
          },
        },
        ValidationError: {
          description: 'Invalid input',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Invalid input' },
              },
            },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          security: [],
          responses: {
            200: {
              description: 'Service is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'healthy' },
                      service: { type: 'string', example: 'taxi-realtime-service' },
                      timestamp: { type: 'string', format: 'date-time' },
                      uptime: { type: 'number', example: 3600 },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/drivers/profile': {
        get: {
          tags: ['Drivers'],
          summary: 'Get current driver profile',
          description: "Returns the authenticated driver's full profile including user details",
          responses: {
            200: {
              description: 'Driver profile',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { $ref: '#/components/schemas/Driver' },
                    },
                  },
                },
              },
            },
            401: { $ref: '#/components/responses/UnauthorizedError' },
            404: { $ref: '#/components/responses/NotFoundError' },
          },
        },
      },
      '/api/drivers/availability': {
        put: {
          tags: ['Drivers'],
          summary: 'Update driver availability',
          description: 'Toggle driver online/offline status',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['is_online'],
                  properties: {
                    is_online: { type: 'boolean', description: 'Set to true to go online' },
                  },
                },
                example: { is_online: true },
              },
            },
          },
          responses: {
            200: {
              description: 'Availability updated',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { $ref: '#/components/schemas/Driver' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
            401: { $ref: '#/components/responses/UnauthorizedError' },
          },
        },
      },
      '/api/drivers/location': {
        put: {
          tags: ['Drivers'],
          summary: 'Update driver location',
          description:
            "Update driver's current GPS coordinates. Call every 5 seconds while online.",
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['latitude', 'longitude'],
                  properties: {
                    latitude: { type: 'number', format: 'double', example: 6.5244 },
                    longitude: { type: 'number', format: 'double', example: 3.3792 },
                    heading: {
                      type: 'number',
                      description: 'Direction 0-360 degrees',
                      example: 45,
                    },
                    speed: { type: 'number', description: 'Speed in km/h', example: 35.5 },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Location updated' },
            401: { $ref: '#/components/responses/UnauthorizedError' },
          },
        },
      },
      '/api/drivers/nearby': {
        get: {
          tags: ['Drivers'],
          summary: 'Find nearby drivers',
          description:
            'Find available drivers within a radius. Returns drivers sorted by distance.',
          parameters: [
            {
              name: 'latitude',
              in: 'query',
              required: true,
              schema: { type: 'number' },
              description: 'User latitude',
            },
            {
              name: 'longitude',
              in: 'query',
              required: true,
              schema: { type: 'number' },
              description: 'User longitude',
            },
            {
              name: 'radius',
              in: 'query',
              schema: { type: 'number', default: 5 },
              description: 'Search radius in km',
            },
            {
              name: 'vehicle_type',
              in: 'query',
              schema: { type: 'string', enum: ['standard', 'premium', 'suv', 'motorcycle'] },
              description: 'Filter by vehicle type',
            },
          ],
          responses: {
            200: {
              description: 'List of nearby drivers',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { type: 'array', items: { $ref: '#/components/schemas/NearbyDriver' } },
                      count: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/drivers/{driverId}': {
        get: {
          tags: ['Drivers'],
          summary: 'Get driver by ID',
          description: "Get a specific driver's public profile",
          security: [],
          parameters: [
            {
              name: 'driverId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            200: {
              description: 'Driver profile',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { $ref: '#/components/schemas/Driver' },
                    },
                  },
                },
              },
            },
            404: { $ref: '#/components/responses/NotFoundError' },
          },
        },
      },
      '/api/rides/estimate': {
        post: {
          tags: ['Rides'],
          summary: 'Get fare estimate',
          description:
            'Calculate fare estimate for a ride using Google Maps API (with fallback to Haversine formula). No authentication required.',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['pickup_lat', 'pickup_lng', 'dropoff_lat', 'dropoff_lng'],
                  properties: {
                    pickup_lat: { type: 'number', example: 6.5244 },
                    pickup_lng: { type: 'number', example: 3.3792 },
                    dropoff_lat: { type: 'number', example: 6.6018 },
                    dropoff_lng: { type: 'number', example: 3.3515 },
                    vehicle_type: {
                      type: 'string',
                      enum: ['standard', 'premium', 'suv'],
                      default: 'standard',
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Fare estimate with Google Maps integration status',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        allOf: [
                          { $ref: '#/components/schemas/FareEstimate' },
                          {
                            type: 'object',
                            properties: {
                              using_google_maps: {
                                type: 'boolean',
                                description:
                                  'True if Google Maps API was used, false if fallback calculation',
                                example: true,
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                  example: {
                    success: true,
                    data: {
                      distance_km: 8.5,
                      duration_minutes: 22,
                      base_fare: 500,
                      distance_fare: 850,
                      time_fare: 440,
                      estimated_total: 1790,
                      currency: 'NGN',
                      vehicle_type: 'standard',
                      using_google_maps: true,
                    },
                  },
                },
              },
            },
            400: { $ref: '#/components/responses/ValidationError' },
          },
        },
      },
      '/api/rides/active': {
        get: {
          tags: ['Rides'],
          summary: 'Get active ride',
          description:
            'Get the current active ride for the authenticated user (as passenger or driver). Returns empty object if no active ride.',
          responses: {
            200: {
              description: 'Active ride details or empty object',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        oneOf: [
                          {
                            type: 'object',
                            properties: {
                              ride: { $ref: '#/components/schemas/Ride' },
                              driver: { $ref: '#/components/schemas/Driver' },
                              passenger: { $ref: '#/components/schemas/UserProfile' },
                            },
                          },
                          { type: 'object', example: {} },
                        ],
                      },
                      message: { type: 'string', example: 'No active ride found' },
                    },
                  },
                  examples: {
                    'with-ride': {
                      summary: 'Active ride found',
                      value: {
                        success: true,
                        data: {
                          ride: {
                            id: '123e4567-e89b-12d3-a456-426614174000',
                            status: 'in_progress',
                            pickup_address: 'Victoria Island, Lagos',
                            dropoff_address: 'Ikeja, Lagos',
                          },
                          driver: {
                            user_id: 'driver-uuid',
                            vehicle_info: { make: 'Toyota', model: 'Camry' },
                            rating: 4.8,
                          },
                        },
                      },
                    },
                    'no-ride': {
                      summary: 'No active ride',
                      value: {
                        success: true,
                        data: {},
                        message: 'No active ride found',
                      },
                    },
                  },
                },
              },
            },
            401: { $ref: '#/components/responses/UnauthorizedError' },
          },
        },
      },
      '/api/rides/requests': {
        get: {
          tags: ['Rides'],
          summary: 'Get available ride requests (Driver)',
          description:
            'Get list of available ride requests for drivers. Only verified drivers can access this endpoint.',
          parameters: [
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 20, maximum: 100 },
              description: 'Maximum number of requests to return',
            },
          ],
          responses: {
            200: {
              description: 'List of available ride requests',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'array',
                        items: {
                          allOf: [
                            { $ref: '#/components/schemas/Ride' },
                            {
                              type: 'object',
                              properties: {
                                passenger: { $ref: '#/components/schemas/UserProfile' },
                              },
                            },
                          ],
                        },
                      },
                      count: { type: 'integer', description: 'Number of available requests' },
                    },
                  },
                },
              },
            },
            401: { $ref: '#/components/responses/UnauthorizedError' },
            403: {
              description: 'Not a verified driver',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                  example: {
                    success: false,
                    error: {
                      code: 'FORBIDDEN',
                      message: 'Only verified drivers can view ride requests',
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/rides': {
        post: {
          tags: ['Rides'],
          summary: 'Request a ride',
          description: 'Create a new ride request',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['pickup_lat', 'pickup_lng', 'dropoff_lat', 'dropoff_lng'],
                  properties: {
                    pickup_lat: { type: 'number', example: 6.5244 },
                    pickup_lng: { type: 'number', example: 3.3792 },
                    pickup_address: { type: 'string', example: 'Victoria Island, Lagos' },
                    dropoff_lat: { type: 'number', example: 6.6018 },
                    dropoff_lng: { type: 'number', example: 3.3515 },
                    dropoff_address: { type: 'string', example: 'Ikeja, Lagos' },
                    driver_id: {
                      type: 'string',
                      format: 'uuid',
                      description: 'Request specific driver',
                    },
                    scheduled_time: {
                      type: 'string',
                      format: 'date-time',
                      description: 'For scheduled rides',
                    },
                    passenger_notes: { type: 'string', example: 'I am at the main entrance' },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Ride created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { $ref: '#/components/schemas/Ride' },
                    },
                  },
                },
              },
            },
            401: { $ref: '#/components/responses/UnauthorizedError' },
            400: { $ref: '#/components/responses/ValidationError' },
          },
        },
      },
      '/api/rides/history': {
        get: {
          tags: ['Rides'],
          summary: 'Get ride history',
          description: 'Get paginated ride history for the authenticated user',
          parameters: [
            {
              name: 'role',
              in: 'query',
              schema: { type: 'string', enum: ['passenger', 'driver'], default: 'passenger' },
              description: 'Filter by role',
            },
            {
              name: 'status',
              in: 'query',
              schema: { type: 'string' },
              description: 'Filter by status',
            },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          ],
          responses: {
            200: {
              description: 'Ride history',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { type: 'array', items: { $ref: '#/components/schemas/Ride' } },
                      pagination: {
                        type: 'object',
                        properties: {
                          total: { type: 'integer' },
                          limit: { type: 'integer' },
                          offset: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
              },
            },
            401: { $ref: '#/components/responses/UnauthorizedError' },
          },
        },
      },
      '/api/rides/{rideId}': {
        get: {
          tags: ['Rides'],
          summary: 'Get ride details',
          description: 'Get full details of a specific ride including driver and passenger info',
          parameters: [
            {
              name: 'rideId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            200: {
              description: 'Ride details',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { $ref: '#/components/schemas/Ride' },
                    },
                  },
                },
              },
            },
            401: { $ref: '#/components/responses/UnauthorizedError' },
            403: { $ref: '#/components/responses/ForbiddenError' },
            404: { $ref: '#/components/responses/NotFoundError' },
          },
        },
      },
      '/api/rides/{rideId}/status': {
        put: {
          tags: ['Rides'],
          summary: 'Update ride status',
          description:
            'Update the status of a ride. Status flow: requested → accepted → arrived → picked_up → in_progress → completed',
          parameters: [
            {
              name: 'rideId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: {
                    status: {
                      type: 'string',
                      enum: [
                        'accepted',
                        'arrived',
                        'picked_up',
                        'in_progress',
                        'completed',
                        'cancelled',
                        'no_show',
                      ],
                    },
                    cancellation_reason: {
                      type: 'string',
                      description: 'Required when status is cancelled',
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Status updated',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { $ref: '#/components/schemas/Ride' },
                    },
                  },
                },
              },
            },
            401: { $ref: '#/components/responses/UnauthorizedError' },
            403: { $ref: '#/components/responses/ForbiddenError' },
            404: { $ref: '#/components/responses/NotFoundError' },
          },
        },
      },
      '/api/rides/{rideId}/accept': {
        post: {
          tags: ['Rides'],
          summary: 'Accept a ride (Driver)',
          description: 'Driver accepts a ride request. Only verified drivers can accept rides.',
          parameters: [
            {
              name: 'rideId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    driver_eta_minutes: {
                      type: 'integer',
                      description: 'Estimated arrival time in minutes',
                      example: 5,
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Ride accepted',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { $ref: '#/components/schemas/Ride' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
            400: {
              description: 'Ride unavailable',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                  example: {
                    success: false,
                    error: { code: 'RIDE_UNAVAILABLE', message: 'Ride is no longer available' },
                  },
                },
              },
            },
            401: { $ref: '#/components/responses/UnauthorizedError' },
            403: { $ref: '#/components/responses/ForbiddenError' },
          },
        },
      },
      '/api/rides/{rideId}/start': {
        post: {
          tags: ['Rides'],
          summary: 'Start a ride (Driver)',
          description:
            'Driver starts the ride after picking up the passenger. Updates status to in_progress.',
          parameters: [
            {
              name: 'rideId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            200: {
              description: 'Ride started',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { $ref: '#/components/schemas/Ride' },
                      message: { type: 'string', example: 'Ride started successfully' },
                    },
                  },
                },
              },
            },
            400: {
              description: 'Invalid state',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                  example: {
                    success: false,
                    error: {
                      code: 'INVALID_STATE',
                      message: 'Cannot start ride with status: completed',
                    },
                  },
                },
              },
            },
            401: { $ref: '#/components/responses/UnauthorizedError' },
            403: {
              description: 'Not the assigned driver',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                  example: {
                    success: false,
                    error: {
                      code: 'FORBIDDEN',
                      message: 'Only the assigned driver can start this ride',
                    },
                  },
                },
              },
            },
            404: { $ref: '#/components/responses/NotFoundError' },
          },
        },
      },
      '/api/rides/{rideId}/complete': {
        post: {
          tags: ['Rides'],
          summary: 'Complete a ride (Driver)',
          description:
            'Driver completes the ride after dropping off passenger. Calculates final fare and creates driver earnings record.',
          parameters: [
            {
              name: 'rideId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    dropoff_lat: {
                      type: 'number',
                      description: 'Actual dropoff latitude',
                      example: 6.6018,
                    },
                    dropoff_lng: {
                      type: 'number',
                      description: 'Actual dropoff longitude',
                      example: 3.3515,
                    },
                    actual_distance_km: {
                      type: 'number',
                      description: 'Actual distance traveled',
                      example: 12.8,
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Ride completed with fare breakdown',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { $ref: '#/components/schemas/Ride' },
                      fare_details: {
                        type: 'object',
                        properties: {
                          total: { type: 'number', example: 2350 },
                          distance_km: { type: 'number', example: 12.5 },
                          duration_minutes: { type: 'integer', example: 30 },
                          base_fare: { type: 'number', example: 500 },
                          driver_earning: {
                            type: 'number',
                            description: 'Driver commission (80%)',
                            example: 1880,
                          },
                          platform_fee: {
                            type: 'number',
                            description: 'Platform commission (20%)',
                            example: 470,
                          },
                        },
                      },
                      message: { type: 'string', example: 'Ride completed successfully' },
                    },
                  },
                },
              },
            },
            400: {
              description: 'Invalid state',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                  example: {
                    success: false,
                    error: { code: 'INVALID_STATE', message: 'Ride is not in progress' },
                  },
                },
              },
            },
            401: { $ref: '#/components/responses/UnauthorizedError' },
            403: { $ref: '#/components/responses/ForbiddenError' },
            404: { $ref: '#/components/responses/NotFoundError' },
          },
        },
      },
      '/api/rides/{rideId}/cancel': {
        post: {
          tags: ['Rides'],
          summary: 'Cancel a ride',
          description:
            'Cancel a ride. Passengers may be charged a cancellation fee if cancelled after grace period. Sends real-time notification to the other party.',
          parameters: [
            {
              name: 'rideId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    reason: {
                      type: 'string',
                      description: 'Reason for cancellation',
                      example: 'Change of plans',
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Ride cancelled',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { $ref: '#/components/schemas/Ride' },
                      fee_charged: {
                        type: 'number',
                        description: 'Cancellation fee charged (if applicable)',
                        example: 200,
                      },
                      message: { type: 'string', example: 'Ride cancelled successfully' },
                    },
                  },
                },
              },
            },
            400: {
              description: 'Invalid state',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                  example: {
                    success: false,
                    error: { code: 'INVALID_STATE', message: 'Ride is already completed' },
                  },
                },
              },
            },
            401: { $ref: '#/components/responses/UnauthorizedError' },
            403: { $ref: '#/components/responses/ForbiddenError' },
            404: { $ref: '#/components/responses/NotFoundError' },
          },
        },
      },
      '/api/rides/{rideId}/reject': {
        post: {
          tags: ['Rides'],
          summary: 'Reject a ride request (Driver)',
          description:
            'Driver rejects a ride request. This is logged for analytics but does not affect the ride status.',
          parameters: [
            {
              name: 'rideId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    reason: {
                      type: 'string',
                      description: 'Reason for rejection',
                      example: 'Too far from pickup location',
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Ride rejected',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      message: { type: 'string', example: 'Ride rejected' },
                    },
                  },
                },
              },
            },
            401: { $ref: '#/components/responses/UnauthorizedError' },
            403: {
              description: 'Not a driver',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                  example: {
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Only drivers can reject rides' },
                  },
                },
              },
            },
          },
        },
      },
      '/api/rides/{rideId}/rate': {
        post: {
          tags: ['Rides'],
          summary: 'Rate a ride',
          description: "Passenger rates a completed ride. Updates driver's average rating.",
          parameters: [
            {
              name: 'rideId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['rating'],
                  properties: {
                    rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
                    review_comment: { type: 'string', example: 'Great driver, very professional!' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Rating submitted',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { $ref: '#/components/schemas/Ride' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
            400: {
              description: 'Invalid state',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                  example: {
                    success: false,
                    error: { code: 'INVALID_STATE', message: 'Can only rate completed rides' },
                  },
                },
              },
            },
            401: { $ref: '#/components/responses/UnauthorizedError' },
            403: { $ref: '#/components/responses/ForbiddenError' },
            404: { $ref: '#/components/responses/NotFoundError' },
          },
        },
      },
    },
  },
  // Support both development (src/*.ts) and production (dist/*.js)
  apis: ['./src/routes/*.ts', './dist/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
