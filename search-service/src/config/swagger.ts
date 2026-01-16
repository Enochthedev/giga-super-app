import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
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
    ],
    components: {
      schemas: {
        SearchResult: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['hotel', 'product', 'driver', 'user'] },
            title: { type: 'string' },
            description: { type: 'string' },
            score: { type: 'number' },
            metadata: { type: 'object' },
          },
        },
        HotelSearchResult: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            location: { type: 'string' },
            rating: { type: 'number' },
            price_range: { type: 'string' },
            amenities: { type: 'array', items: { type: 'string' } },
            images: { type: 'array', items: { type: 'string', format: 'uri' } },
          },
        },
        ProductSearchResult: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number' },
            category: { type: 'string' },
            vendor: { type: 'string' },
            in_stock: { type: 'boolean' },
            images: { type: 'array', items: { type: 'string', format: 'uri' } },
          },
        },
        DriverSearchResult: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            vehicle_type: { type: 'string' },
            rating: { type: 'number' },
            distance: { type: 'number' },
            eta_minutes: { type: 'integer' },
            is_available: { type: 'boolean' },
          },
        },
        SearchQuery: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search query string' },
            page: { type: 'integer', default: 1 },
            limit: { type: 'integer', default: 20, maximum: 100 },
            sort: {
              type: 'string',
              enum: ['relevance', 'price_asc', 'price_desc', 'rating', 'distance'],
            },
            filters: { type: 'object' },
          },
        },
        SearchResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: { $ref: '#/components/schemas/SearchResult' } },
            metadata: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
                query_time_ms: { type: 'integer' },
              },
            },
            facets: { type: 'object' },
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
  },
  apis: ['./src/routes/*.ts', './src/index.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
