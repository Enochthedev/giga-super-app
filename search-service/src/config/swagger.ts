// eslint-disable-next-line @typescript-eslint/no-var-requires
const swaggerJsdoc = require('swagger-jsdoc');

const options: Record<string, unknown> = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Giga Search Service API',
      version: '1.0.0',
      description: `
## Search Service API

Comprehensive search functionality for the Giga platform including:
- **Hotels**: Search hotels by location, amenities, price, ratings
- **Products**: Search e-commerce products with filters
- **Drivers**: Find available drivers by location and vehicle type
- **Universal Search**: Cross-entity search across the platform

### Features
- Full-text search with relevance scoring
- Geo-spatial queries for location-based results
- Faceted search with filters and aggregations
- Auto-complete and suggestions
- Search analytics and trending queries

### Caching
Results are cached using Redis for improved performance.
Cache TTL varies by query type (5-15 minutes).

### Rate Limiting
- Default: 100 requests per 15 minutes per IP
- Authenticated users: 200 requests per 15 minutes

### Response Format
\`\`\`json
{
  "success": true,
  "data": [...],
  "metadata": { "total": 100, "page": 1, "limit": 20 },
  "facets": { "category": [...], "price_range": [...] }
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
      { name: 'Search', description: 'Universal search endpoints' },
      { name: 'Hotels', description: 'Hotel search endpoints' },
      { name: 'Products', description: 'Product search endpoints' },
      { name: 'Drivers', description: 'Driver search endpoints' },
      {
        name: 'Admin Search',
        description: 'Protected admin search endpoints - requires moderator or admin role',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token from Supabase Auth (optional - enhances personalization)',
        },
      },
      schemas: {
        // Universal search
        SearchResult: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
            type: {
              type: 'string',
              enum: ['hotel', 'product', 'driver', 'user'],
              example: 'hotel',
            },
            title: { type: 'string', example: 'Transcorp Hilton Abuja' },
            description: { type: 'string', example: '5-star luxury hotel in the heart of Abuja' },
            score: { type: 'number', description: 'Relevance score', example: 0.95 },
            highlight: { type: 'string', description: 'Highlighted match snippet' },
            metadata: { type: 'object', additionalProperties: true },
          },
        },
        // Hotel search
        HotelSearchResult: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Transcorp Hilton Abuja' },
            description: { type: 'string', example: 'Premier 5-star hotel with stunning views' },
            location: { type: 'string', example: 'Maitama, Abuja' },
            coordinates: { $ref: '#/components/schemas/GeoLocation' },
            rating: { type: 'number', minimum: 1, maximum: 5, example: 4.7 },
            review_count: { type: 'integer', example: 2450 },
            price_per_night: { type: 'number', example: 85000 },
            price_range: {
              type: 'string',
              enum: ['$', '$$', '$$$', '$$$$', '$$$$$'],
              example: '$$$$',
            },
            currency: { type: 'string', example: 'NGN' },
            amenities: {
              type: 'array',
              items: { type: 'string' },
              example: ['WiFi', 'Pool', 'Gym', 'Spa'],
            },
            images: { type: 'array', items: { type: 'string', format: 'uri' } },
            distance_km: {
              type: 'number',
              description: 'Distance from search location',
              example: 2.5,
            },
            available_rooms: { type: 'integer', example: 15 },
          },
        },
        // Product search
        ProductSearchResult: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Samsung Galaxy S24 Ultra' },
            description: { type: 'string', example: 'Latest flagship smartphone with AI features' },
            price: { type: 'number', example: 1850000 },
            original_price: {
              type: 'number',
              description: 'Price before discount',
              example: 2000000,
            },
            discount_percent: { type: 'integer', example: 8 },
            currency: { type: 'string', example: 'NGN' },
            category: { type: 'string', example: 'Electronics > Phones' },
            vendor: { type: 'string', example: 'Jumia Official' },
            vendor_id: { type: 'string', format: 'uuid' },
            rating: { type: 'number', example: 4.5 },
            review_count: { type: 'integer', example: 328 },
            in_stock: { type: 'boolean', example: true },
            stock_quantity: { type: 'integer', example: 25 },
            images: { type: 'array', items: { type: 'string', format: 'uri' } },
            tags: {
              type: 'array',
              items: { type: 'string' },
              example: ['smartphone', 'samsung', 'android'],
            },
          },
        },
        // Driver search
        DriverSearchResult: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Adebayo Johnson' },
            avatar_url: { type: 'string', format: 'uri' },
            vehicle_type: {
              type: 'string',
              enum: ['sedan', 'suv', 'van', 'motorcycle', 'tricycle'],
              example: 'sedan',
            },
            vehicle_model: { type: 'string', example: 'Toyota Corolla 2022' },
            vehicle_plate: { type: 'string', example: 'ABC-123-XY' },
            rating: { type: 'number', minimum: 1, maximum: 5, example: 4.8 },
            total_trips: { type: 'integer', example: 1250 },
            distance_km: { type: 'number', example: 1.2 },
            eta_minutes: { type: 'integer', example: 5 },
            estimated_fare: { type: 'number', example: 2500 },
            is_available: { type: 'boolean', example: true },
            location: { $ref: '#/components/schemas/GeoLocation' },
          },
        },
        // Query and filter schemas
        SearchQuery: {
          type: 'object',
          properties: {
            q: {
              type: 'string',
              description: 'Search query string',
              example: 'luxury hotel abuja',
            },
            page: { type: 'integer', default: 1, example: 1 },
            limit: { type: 'integer', default: 20, maximum: 100, example: 20 },
            sort: {
              type: 'string',
              enum: ['relevance', 'price_asc', 'price_desc', 'rating', 'distance', 'newest'],
              default: 'relevance',
            },
            filters: { type: 'object', additionalProperties: true },
          },
        },
        HotelSearchFilters: {
          type: 'object',
          properties: {
            location: { type: 'string', example: 'Lagos' },
            lat: { type: 'number', example: 6.5244 },
            lng: { type: 'number', example: 3.3792 },
            radius_km: { type: 'number', default: 10, example: 5 },
            check_in: { type: 'string', format: 'date', example: '2024-03-15' },
            check_out: { type: 'string', format: 'date', example: '2024-03-18' },
            guests: { type: 'integer', minimum: 1, example: 2 },
            rooms: { type: 'integer', minimum: 1, example: 1 },
            min_price: { type: 'number', example: 20000 },
            max_price: { type: 'number', example: 100000 },
            min_rating: { type: 'number', minimum: 1, maximum: 5, example: 4 },
            amenities: { type: 'array', items: { type: 'string' }, example: ['WiFi', 'Pool'] },
            property_type: { type: 'string', enum: ['hotel', 'resort', 'apartment', 'guesthouse'] },
          },
        },
        ProductSearchFilters: {
          type: 'object',
          properties: {
            category: { type: 'string', example: 'Electronics' },
            min_price: { type: 'number' },
            max_price: { type: 'number' },
            vendor_id: { type: 'string', format: 'uuid' },
            in_stock: { type: 'boolean', default: true },
            min_rating: { type: 'number' },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
        DriverSearchFilters: {
          type: 'object',
          properties: {
            lat: { type: 'number', example: 6.5244 },
            lng: { type: 'number', example: 3.3792 },
            radius_km: { type: 'number', default: 5 },
            vehicle_type: {
              type: 'string',
              enum: ['sedan', 'suv', 'van', 'motorcycle', 'tricycle'],
            },
            min_rating: { type: 'number', minimum: 1, maximum: 5 },
          },
        },
        GeoLocation: {
          type: 'object',
          properties: {
            lat: { type: 'number', format: 'double', example: 6.5244 },
            lng: { type: 'number', format: 'double', example: 3.3792 },
          },
        },
        // Response schemas
        SearchResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'array', items: { $ref: '#/components/schemas/SearchResult' } },
            metadata: {
              type: 'object',
              properties: {
                total: { type: 'integer', example: 150 },
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 20 },
                pages: { type: 'integer', example: 8 },
                query_time_ms: { type: 'integer', example: 45 },
                cached: { type: 'boolean', example: false },
              },
            },
            facets: { $ref: '#/components/schemas/SearchFacets' },
          },
        },
        SearchFacets: {
          type: 'object',
          properties: {
            categories: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  value: { type: 'string' },
                  count: { type: 'integer' },
                },
              },
              example: [
                { value: 'Luxury', count: 45 },
                { value: 'Budget', count: 32 },
              ],
            },
            price_ranges: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  min: { type: 'number' },
                  max: { type: 'number' },
                  count: { type: 'integer' },
                },
              },
            },
            amenities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  value: { type: 'string' },
                  count: { type: 'integer' },
                },
              },
            },
            ratings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  rating: { type: 'integer' },
                  count: { type: 'integer' },
                },
              },
            },
          },
        },
        AutocompleteResponse: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: { type: 'string' },
                  type: { type: 'string', enum: ['query', 'hotel', 'product', 'location'] },
                  highlight: { type: 'string' },
                },
              },
              example: [
                { text: 'Hilton Lagos', type: 'hotel', highlight: '<em>Hilton</em> Lagos' },
                { text: 'Hotels in Lagos', type: 'query', highlight: 'Hotels in <em>Lagos</em>' },
              ],
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
                code: { type: 'string', example: 'INVALID_QUERY' },
                message: { type: 'string', example: 'Search query cannot be empty' },
              },
            },
          },
        },
        // Admin Search Schemas
        AdminPaginationParams: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1, example: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20, example: 20 },
            sort: { type: 'string', description: 'Field to sort by', example: 'created_at' },
            order: { type: 'string', enum: ['asc', 'desc'], default: 'desc', example: 'desc' },
          },
        },
        AdminUserSearchRequest: {
          allOf: [
            { $ref: '#/components/schemas/AdminPaginationParams' },
            {
              type: 'object',
              properties: {
                q: {
                  type: 'string',
                  description: 'Search query for name, email, phone',
                  example: 'john',
                },
                email: {
                  type: 'string',
                  description: 'Filter by email',
                  example: 'john@example.com',
                },
                phone: { type: 'string', description: 'Filter by phone', example: '+234' },
                is_active: { type: 'boolean', description: 'Filter by active status' },
                is_phone_verified: { type: 'boolean', description: 'Filter by phone verification' },
              },
            },
          ],
        },
        AdminUserSearchResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                results: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      email: { type: 'string' },
                      phone: { type: 'string' },
                      first_name: { type: 'string' },
                      last_name: { type: 'string' },
                      avatar_url: { type: 'string' },
                      is_active: { type: 'boolean' },
                      is_phone_verified: { type: 'boolean' },
                      last_login_at: { type: 'string', format: 'date-time' },
                      created_at: { type: 'string', format: 'date-time' },
                    },
                  },
                },
                total: { type: 'integer' },
              },
            },
            pagination: { $ref: '#/components/schemas/AdminPaginationResponse' },
            metadata: { $ref: '#/components/schemas/AdminMetadata' },
          },
        },
        AdminVendorSearchRequest: {
          allOf: [
            { $ref: '#/components/schemas/AdminPaginationParams' },
            {
              type: 'object',
              properties: {
                q: { type: 'string', description: 'Search query for business name' },
                business_name: { type: 'string', description: 'Filter by business name' },
                is_verified: { type: 'boolean', description: 'Filter by verification status' },
                is_active: { type: 'boolean', description: 'Filter by active status' },
                min_rating: {
                  type: 'number',
                  minimum: 0,
                  maximum: 5,
                  description: 'Minimum rating',
                },
              },
            },
          ],
        },
        AdminVendorSearchResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                results: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        format: 'uuid',
                        description: 'Vendor ID (same as user_id)',
                      },
                      business_name: { type: 'string' },
                      business_registration: { type: 'string' },
                      is_verified: { type: 'boolean' },
                      is_active: { type: 'boolean' },
                      average_rating: { type: 'number' },
                      total_sales: { type: 'number' },
                      commission_rate: { type: 'number' },
                      created_at: { type: 'string', format: 'date-time' },
                    },
                  },
                },
                total: { type: 'integer' },
              },
            },
            pagination: { $ref: '#/components/schemas/AdminPaginationResponse' },
            metadata: { $ref: '#/components/schemas/AdminMetadata' },
          },
        },
        AdminDriverSearchRequest: {
          allOf: [
            { $ref: '#/components/schemas/AdminPaginationParams' },
            {
              type: 'object',
              properties: {
                q: { type: 'string', description: 'Search query for license number' },
                license_number: { type: 'string', description: 'Filter by license number' },
                is_online: { type: 'boolean', description: 'Filter by online status' },
                is_verified: { type: 'boolean', description: 'Filter by verification status' },
                min_rating: { type: 'number', minimum: 0, maximum: 5 },
                subscription_tier: { type: 'string', description: 'Filter by subscription tier' },
              },
            },
          ],
        },
        AdminDriverSearchResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                results: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      user_id: { type: 'string', format: 'uuid' },
                      license_number: { type: 'string' },
                      vehicle_info: {
                        type: 'object',
                        description: 'JSON object with vehicle details',
                      },
                      is_online: { type: 'boolean' },
                      rating: { type: 'number' },
                      total_rides: { type: 'integer' },
                      is_verified: { type: 'boolean' },
                      subscription_tier: { type: 'string' },
                      created_at: { type: 'string', format: 'date-time' },
                    },
                  },
                },
                total: { type: 'integer' },
              },
            },
            pagination: { $ref: '#/components/schemas/AdminPaginationResponse' },
            metadata: { $ref: '#/components/schemas/AdminMetadata' },
          },
        },
        AdminBookingSearchRequest: {
          allOf: [
            { $ref: '#/components/schemas/AdminPaginationParams' },
            {
              type: 'object',
              properties: {
                q: { type: 'string', description: 'Search by booking number' },
                booking_number: { type: 'string' },
                user_id: { type: 'string', format: 'uuid' },
                hotel_id: { type: 'string', format: 'uuid' },
                booking_status: {
                  type: 'string',
                  enum: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'],
                },
                payment_status: { type: 'string', enum: ['pending', 'paid', 'refunded', 'failed'] },
                check_in_from: { type: 'string', format: 'date' },
                check_in_to: { type: 'string', format: 'date' },
              },
            },
          ],
        },
        AdminBookingSearchResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                results: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      booking_number: { type: 'string' },
                      user_id: { type: 'string', format: 'uuid' },
                      hotel_id: { type: 'string', format: 'uuid' },
                      booking_status: { type: 'string' },
                      check_in_date: { type: 'string', format: 'date' },
                      check_out_date: { type: 'string', format: 'date' },
                      guest_count: {
                        type: 'object',
                        description: 'JSON object with guest details',
                      },
                      total_amount: { type: 'number' },
                      payment_status: { type: 'string' },
                      created_at: { type: 'string', format: 'date-time' },
                    },
                  },
                },
                total: { type: 'integer' },
              },
            },
            pagination: { $ref: '#/components/schemas/AdminPaginationResponse' },
            metadata: { $ref: '#/components/schemas/AdminMetadata' },
          },
        },
        AdminOrderSearchRequest: {
          allOf: [
            { $ref: '#/components/schemas/AdminPaginationParams' },
            {
              type: 'object',
              properties: {
                q: { type: 'string', description: 'Search by order number' },
                order_number: { type: 'string' },
                user_id: { type: 'string', format: 'uuid' },
                status: {
                  type: 'string',
                  enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
                },
                payment_status: { type: 'string', enum: ['pending', 'paid', 'refunded', 'failed'] },
                min_amount: { type: 'number' },
                max_amount: { type: 'number' },
              },
            },
          ],
        },
        AdminOrderSearchResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                results: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      order_number: { type: 'string' },
                      user_id: { type: 'string', format: 'uuid' },
                      status: { type: 'string' },
                      payment_status: { type: 'string' },
                      total_amount: { type: 'number' },
                      shipping_address: { type: 'object' },
                      created_at: { type: 'string', format: 'date-time' },
                    },
                  },
                },
                total: { type: 'integer' },
              },
            },
            pagination: { $ref: '#/components/schemas/AdminPaginationResponse' },
            metadata: { $ref: '#/components/schemas/AdminMetadata' },
          },
        },
        AdminTransactionSearchRequest: {
          allOf: [
            { $ref: '#/components/schemas/AdminPaginationParams' },
            {
              type: 'object',
              properties: {
                q: { type: 'string', description: 'Search by reference' },
                reference_id: { type: 'string', description: 'Filter by reference ID' },
                user_id: { type: 'string', format: 'uuid' },
                payment_method: { type: 'string' },
                payment_status: {
                  type: 'string',
                  enum: ['pending', 'success', 'failed', 'refunded'],
                },
                payment_type: {
                  type: 'string',
                  description: 'Filter by payment type (hotel_booking, ecommerce, taxi, etc.)',
                },
                min_amount: { type: 'number' },
                max_amount: { type: 'number' },
              },
            },
          ],
        },
        AdminTransactionSearchResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                results: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      reference_id: { type: 'string' },
                      provider_reference: { type: 'string' },
                      user_id: { type: 'string', format: 'uuid' },
                      amount: { type: 'number' },
                      currency: { type: 'string' },
                      payment_method: { type: 'string' },
                      payment_status: { type: 'string' },
                      payment_type: { type: 'string' },
                      created_at: { type: 'string', format: 'date-time' },
                    },
                  },
                },
                total: { type: 'integer' },
              },
            },
            pagination: { $ref: '#/components/schemas/AdminPaginationResponse' },
            metadata: { $ref: '#/components/schemas/AdminMetadata' },
          },
        },
        AdminRideSearchRequest: {
          allOf: [
            { $ref: '#/components/schemas/AdminPaginationParams' },
            {
              type: 'object',
              properties: {
                passenger_id: {
                  type: 'string',
                  format: 'uuid',
                  description: 'Filter by passenger UUID',
                },
                driver_id: { type: 'string', format: 'uuid' },
                status: {
                  type: 'string',
                  enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'],
                },
                min_fare: { type: 'number' },
                max_fare: { type: 'number' },
              },
            },
          ],
        },
        AdminRideSearchResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                results: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      ride_number: { type: 'string' },
                      passenger_id: { type: 'string', format: 'uuid' },
                      driver_id: { type: 'string', format: 'uuid' },
                      status: { type: 'string' },
                      pickup_location: { type: 'object' },
                      dropoff_location: { type: 'object' },
                      final_amount: { type: 'number' },
                      total_fare: { type: 'number' },
                      distance_km: { type: 'number' },
                      estimated_duration_minutes: { type: 'integer' },
                      rating: { type: 'number' },
                      created_at: { type: 'string', format: 'date-time' },
                    },
                  },
                },
                total: { type: 'integer' },
              },
            },
            pagination: { $ref: '#/components/schemas/AdminPaginationResponse' },
            metadata: { $ref: '#/components/schemas/AdminMetadata' },
          },
        },
        AdminPaginationResponse: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 150 },
            total_pages: { type: 'integer', example: 8 },
          },
        },
        AdminMetadata: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time' },
            request_id: { type: 'string' },
            execution_time_ms: { type: 'integer' },
            cached: { type: 'boolean' },
            version: { type: 'string', example: '1.0.0' },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Unauthorized - Authentication required for personalized results',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: {
                  code: 'AUTHENTICATION_REQUIRED',
                  message: 'Login required for this feature',
                },
              },
            },
          },
        },
        BadRequestError: {
          description: 'Bad Request - Invalid search parameters',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: { code: 'INVALID_PARAMETERS', message: 'Invalid date range specified' },
              },
            },
          },
        },
        TooManyRequests: {
          description: 'Too Many Requests - Rate limit exceeded',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: {
                  code: 'RATE_LIMIT_EXCEEDED',
                  message: 'Too many requests, please try again later',
                },
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
                error: { code: 'SEARCH_ERROR', message: 'Search service temporarily unavailable' },
              },
            },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  // Support both development (src/*.ts) and production (dist/*.js)
  apis: ['./src/routes/*.ts', './src/index.ts', './dist/routes/*.js', './dist/index.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
