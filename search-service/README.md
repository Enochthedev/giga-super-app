# Search Service

Comprehensive search functionality for the Giga platform, providing unified
search across hotels, products, drivers, posts, and users with advanced
filtering, caching, and real-time capabilities.

## Features

### Core Search Capabilities

- **Universal Search**: Search across all content types with a single query
- **Category-Specific Search**: Dedicated endpoints for hotels, products,
  drivers, posts, and users
- **Advanced Filtering**: Price ranges, ratings, locations, dates, and custom
  filters
- **Autocomplete & Suggestions**: Real-time search suggestions and query
  completion
- **Geospatial Search**: Location-based search with radius filtering for drivers
  and hotels
- **Faceted Search**: Dynamic facets for categories, brands, price ranges, and
  more

### Performance & Scalability

- **Redis Caching**: Intelligent caching with configurable TTL based on data
  type
- **Connection Pooling**: Optimized database connections to Supabase
- **Rate Limiting**: User-based rate limiting with different tiers
- **Pagination**: Efficient pagination for large result sets
- **Response Compression**: Gzip compression for faster response times

### Security & Monitoring

- **JWT Authentication**: Optional and required authentication endpoints
- **Role-Based Access**: Admin-only endpoints for cache management and
  statistics
- **Request Logging**: Comprehensive logging with request tracing
- **Health Checks**: Kubernetes-compatible health, readiness, and liveness
  probes
- **Performance Monitoring**: Detailed metrics and execution time tracking

## API Endpoints

### Universal Search

```
GET /api/v1/search
```

Search across all categories with unified results.

**Query Parameters:**

- `q` (required): Search query string
- `category`: Filter by category (all, hotels, products, drivers, posts, users)
- `location`: Location filter
- `min_price`, `max_price`: Price range filters
- `page`, `limit`: Pagination
- `sort`: Sort by (relevance, price, rating, created_at, distance)
- `order`: Sort order (asc, desc)

**Example:**

```bash
curl "http://localhost:3007/api/v1/search?q=luxury&category=hotels&location=Lagos&min_price=100&max_price=500"
```

### Hotel Search

```
GET /api/v1/search/hotels
GET /api/v1/search/hotels/popular
GET /api/v1/search/hotels/nearby
```

**Advanced Filters:**

- Star rating, amenities, check-in/check-out dates
- Guest count, room types
- Location-based search with coordinates

### Product Search

```
GET /api/v1/search/products
GET /api/v1/search/products/categories
GET /api/v1/search/products/trending
GET /api/v1/search/products/brands
```

**Advanced Filters:**

- Brand, condition (new/used/refurbished)
- Category, price range
- Stock availability

### Driver Search

```
GET /api/v1/search/drivers
GET /api/v1/search/drivers/nearby
GET /api/v1/search/drivers/vehicle-types
POST /api/v1/search/drivers/estimate-fare
```

**Advanced Filters:**

- Vehicle type, rating minimum
- Real-time location with radius
- Availability status

### Autocomplete

```
GET /api/v1/search/suggestions
```

Get search suggestions for autocomplete functionality.

### Admin Endpoints

```
DELETE /api/v1/search/cache    # Clear search cache (admin only)
GET /api/v1/search/stats       # Service statistics (admin only)
```

### Health Checks

```
GET /api/v1/health             # Basic health check
GET /api/v1/health/detailed    # Detailed health with dependencies
GET /api/v1/health/ready       # Kubernetes readiness probe
GET /api/v1/health/live        # Kubernetes liveness probe
GET /api/v1/health/metrics     # Service metrics
```

## Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": {
    "query": "luxury hotels",
    "category": "hotels",
    "total_results": 150,
    "results": [...],
    "facets": {...},
    "suggestions": [...]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8,
    "has_previous": false,
    "has_next": true
  },
  "metadata": {
    "timestamp": "2024-01-10T10:00:00Z",
    "request_id": "req_123",
    "execution_time_ms": 45,
    "cached": false,
    "version": "1.0.0"
  }
}
```

## Environment Variables

### Required

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
REDIS_URL=redis://localhost:6379
```

### Optional

```env
NODE_ENV=development
SEARCH_SERVICE_PORT=3007
LOG_LEVEL=info
CORS_ORIGIN=*
SEARCH_SERVICE_API_KEY=your_api_key
```

## Installation & Setup

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
npm start
```

### Docker

```bash
# Build Docker image
docker build -t search-service .

# Run container
docker run -p 3007:3007 \
  -e SUPABASE_URL=your_url \
  -e SUPABASE_SERVICE_ROLE_KEY=your_key \
  -e REDIS_URL=redis://redis:6379 \
  search-service
```

### Railway Deployment

```bash
# Deploy to Railway
railway up

# Set environment variables in Railway dashboard
railway variables set SUPABASE_URL=your_url
railway variables set SUPABASE_SERVICE_ROLE_KEY=your_key
```

## Architecture

### Service Structure

```
search-service/
├── src/
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utilities (database, cache, validation, logging)
│   ├── middleware/      # Express middleware (auth, logging, error handling)
│   ├── routes/          # API route handlers
│   └── index.ts         # Main application entry point
├── tests/               # Test files
├── logs/                # Log files
└── dist/                # Compiled JavaScript (production)
```

### Key Components

#### Database Service

- Handles all database operations with Supabase
- Implements search logic for each content type
- Provides relevance scoring and sorting
- Supports geospatial queries for location-based search

#### Cache Service

- Redis-based caching with intelligent TTL
- Cache key generation and invalidation
- Performance monitoring and statistics
- Automatic cache warming for popular queries

#### Authentication Middleware

- JWT token validation via Supabase Auth
- Optional and required authentication modes
- Role-based access control
- API key authentication for service-to-service calls

#### Validation & Security

- Zod-based input validation
- SQL injection prevention
- Rate limiting with user-based quotas
- Request sanitization and size limits

## Performance Considerations

### Caching Strategy

- **Search Results**: 5 minutes (general), 30 seconds (location-based)
- **Autocomplete**: 10 minutes
- **Static Data**: 1 hour (categories, vehicle types)
- **Real-time Data**: 30 seconds (driver locations)

### Database Optimization

- Connection pooling (10 concurrent connections)
- Efficient query patterns with proper indexing
- Soft delete filtering for all queries
- Pagination to limit result sets

### Monitoring & Alerting

- Request/response time tracking
- Cache hit/miss ratios
- Error rate monitoring
- Database connection health
- Memory and CPU usage metrics

## Testing

### Unit Tests

```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

### Integration Tests

```bash
npm run test:integration   # API endpoint tests
```

### Load Testing

```bash
npm run test:load          # Performance testing
```

## Contributing

1. Follow TypeScript strict mode
2. Use snake_case for API parameters
3. Include comprehensive error handling
4. Add tests for new features
5. Update documentation
6. Follow the established logging patterns

## Troubleshooting

### Common Issues

**Cache Connection Failed**

- Verify Redis URL and connection
- Check Redis server status
- Review network connectivity

**Database Connection Issues**

- Validate Supabase URL and keys
- Check service role permissions
- Verify network access to Supabase

**High Response Times**

- Monitor cache hit rates
- Check database query performance
- Review connection pool usage
- Analyze slow query logs

**Rate Limiting**

- Adjust rate limits in middleware
- Implement user-specific quotas
- Monitor request patterns

### Debugging

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# Check service health
curl http://localhost:3007/api/v1/health/detailed

# Monitor cache statistics
curl http://localhost:3007/api/v1/search/stats
```

## License

MIT License - see LICENSE file for details.
